import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { GripVertical, Plus, X, Save, Loader2, Zap, BookOpen, Brain, RefreshCw, CheckCircle2, AlertCircle, Play, Pencil, Trash2, Eye, EyeOff, MessageSquarePlus } from "lucide-react";
import { api } from "~/lib/api";
import type { AiChatSetting, AiChatStats } from "~/lib/types";
import AiChatPanel from "~/components/user/AiChatPanel";

// --- Tone mapping ---
const TONE_TO_LABEL: Record<AiChatSetting["tone"], string> = {
  casual: "カジュアル",
  formal: "フォーマル",
  friendly: "フレンドリー",
};

const LABEL_TO_TONE: Record<string, AiChatSetting["tone"]> = {
  "カジュアル": "casual",
  "フォーマル": "formal",
  "フレンドリー": "friendly",
};

// --- Types ---
type PageKey = "top" | "list" | "detail";

interface PromptConfig {
  id: number;
  enabled: boolean;
  prompt: string;
  tone: string;
}

// --- Sub Components ---

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className={`w-10 h-5 rounded-full transition relative shrink-0 ${
        checked ? "bg-indigo-600" : "bg-switch-background"
      }`}
    >
      <div
        className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm ${
          checked ? "left-5.5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function SubTabs({
  active,
  onChange,
}: {
  active: PageKey;
  onChange: (key: PageKey) => void;
}) {
  const pages: { key: PageKey; label: string }[] = [
    { key: "top", label: "トップページ" },
    { key: "list", label: "店舗一覧" },
    { key: "detail", label: "店舗詳細" },
  ];
  return (
    <div className="flex border-b border-border">
      {pages.map((p) => (
        <button
          key={p.key}
          onClick={() => onChange(p.key)}
          className={`px-4 py-2.5 text-[13px] transition border-b-2 -mb-px ${
            active === p.key
              ? "border-indigo-600 text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}


function SaveToast({ message }: { message: string }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg shadow-lg text-[13px] flex items-center gap-2">
        <Save className="w-3.5 h-3.5" />
        {message}
      </div>
    </div>
  );
}

// --- Main Component ---
export function AIChatSettingsPage() {
  const [activeTab, setActiveTab] = useState("prompts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const [promptSubTab, setPromptSubTab] = useState<PageKey>("top");
  const [promptConfigs, setPromptConfigs] = useState<Record<PageKey, PromptConfig>>({
    top: { id: 0, enabled: true, prompt: "", tone: "フレンドリー" },
    list: { id: 0, enabled: true, prompt: "", tone: "カジュアル" },
    detail: { id: 0, enabled: true, prompt: "", tone: "フォーマル" },
  });

  const updatePromptConfig = (
    page: PageKey,
    field: keyof Omit<PromptConfig, "id">,
    value: string | boolean
  ) => {
    setPromptConfigs((prev) => ({
      ...prev,
      [page]: { ...prev[page], [field]: value },
    }));
  };

  const [suggestSubTab, setSuggestSubTab] = useState<PageKey>("top");
  const [suggestButtons, setSuggestButtons] = useState<Record<PageKey, string[]>>({
    top: [],
    list: [],
    detail: [],
  });

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const updateButtons = (page: PageKey, newButtons: string[]) => {
    setSuggestButtons((prev) => ({ ...prev, [page]: newButtons }));
  };

  const handleDragStart = (idx: number) => {
    setDragIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const page = suggestSubTab;
    const items = [...suggestButtons[page]];
    const [removed] = items.splice(dragIdx, 1);
    items.splice(idx, 0, removed);
    updateButtons(page, items);
    setDragIdx(idx);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
  };

  // Limits state (connected to API)
  const [dailyLimit, setDailyLimit] = useState("50");
  const [monthlyLimit, setMonthlyLimit] = useState("500");
  const [ipLimit, setIpLimit] = useState("10");
  const [globalDailyLimit, setGlobalDailyLimit] = useState("10000");
  const [limitMessage, setLimitMessage] = useState(
    "本日のチャット上限に達しました。明日またご利用ください。"
  );
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState<AiChatStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fine-tuning state
  const [ftStatus, setFtStatus] = useState<{
    openai_configured: boolean;
    current_model: string | null;
    training_data_exists: boolean;
    training_data_size: number;
    training_pair_count: number;
    store_count: number;
  } | null>(null);
  const [ftLoading, setFtLoading] = useState(false);
  const [ftGenerating, setFtGenerating] = useState(false);
  const [ftStarting, setFtStarting] = useState(false);
  const [ftJobs, setFtJobs] = useState<any[]>([]);
  const [ftPolling, setFtPolling] = useState(false);
  const [ftMessage, setFtMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Training data state
  type TrainingPair = { index: number; user: string; assistant: string };
  const [ftPairs, setFtPairs] = useState<TrainingPair[]>([]);
  const [ftPairsLoaded, setFtPairsLoaded] = useState(false);
  const [ftDataExpanded, setFtDataExpanded] = useState(false);
  const [ftEditingIndex, setFtEditingIndex] = useState<number | null>(null);
  const [ftEditUser, setFtEditUser] = useState("");
  const [ftEditAssistant, setFtEditAssistant] = useState("");
  const [ftSavingPair, setFtSavingPair] = useState(false);
  const [ftAddingNew, setFtAddingNew] = useState(false);
  const [ftNewUser, setFtNewUser] = useState("");
  const [ftNewAssistant, setFtNewAssistant] = useState("");

  const tabs = [
    { key: "prompts", label: "プロンプト" },
    { key: "suggest", label: "サジェスト" },
    { key: "limits", label: "利用制限" },
    { key: "stats", label: "統計" },
    { key: "finetune", label: "学習" },
  ];

  const currentPrompt = promptConfigs[promptSubTab];
  const currentButtons = suggestButtons[suggestSubTab];

  // --- Fetch settings on mount ---
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await api.get<AiChatSetting[]>("/admin/ai-chat/settings");

      const newConfigs = { ...promptConfigs };
      const newButtons = { ...suggestButtons };

      for (const s of settings) {
        const key = s.page_type as PageKey;
        newConfigs[key] = {
          id: s.id,
          enabled: s.enabled,
          prompt: s.system_prompt,
          tone: TONE_TO_LABEL[s.tone] ?? "フレンドリー",
        };
        newButtons[key] = s.suggest_buttons ?? [];
      }

      setPromptConfigs(newConfigs);
      setSuggestButtons(newButtons);
    } catch (err) {
      const message = err instanceof Error ? err.message : "設定の取得に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // --- Fetch stats when stats tab is activated ---
  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await api.get<AiChatStats>("/admin/ai-chat/stats");
      setStats(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "統計の取得に失敗しました";
      setError(message);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "stats" && !stats) {
      fetchStats();
    }
  }, [activeTab, stats, fetchStats]);

  // --- Fetch limits ---
  const fetchLimits = useCallback(async () => {
    try {
      setLimitsLoading(true);
      const data = await api.get<{
        user_daily_limit: number;
        user_monthly_limit: number;
        ip_daily_limit: number;
        global_daily_limit: number;
        limit_reached_message: string;
      }>("/admin/ai-chat/limits");
      setDailyLimit(String(data.user_daily_limit));
      setMonthlyLimit(String(data.user_monthly_limit));
      setIpLimit(String(data.ip_daily_limit));
      setGlobalDailyLimit(String(data.global_daily_limit));
      setLimitMessage(data.limit_reached_message);
    } catch (err) {
      const message = err instanceof Error ? err.message : "制限設定の取得に失敗しました";
      setError(message);
    } finally {
      setLimitsLoading(false);
    }
  }, []);

  const [limitsFetched, setLimitsFetched] = useState(false);
  useEffect(() => {
    if (activeTab === "limits" && !limitsFetched) {
      setLimitsFetched(true);
      fetchLimits();
    }
  }, [activeTab, limitsFetched, fetchLimits]);

  // --- Fine-tuning functions ---
  const fetchFtStatus = useCallback(async () => {
    try {
      setFtLoading(true);
      const data = await api.get<any>("/admin/ai-chat/fine-tuning/status");
      setFtStatus(data);
    } catch {
      // silent
    } finally {
      setFtLoading(false);
    }
  }, []);

  const fetchFtJobs = useCallback(async () => {
    try {
      setFtPolling(true);
      const data = await api.get<any>("/admin/ai-chat/fine-tuning/job");
      if (data.success && data.jobs) {
        setFtJobs(data.jobs);
      }
    } catch {
      // silent
    } finally {
      setFtPolling(false);
    }
  }, []);

  const [ftFetched, setFtFetched] = useState(false);
  useEffect(() => {
    if (activeTab === "finetune" && !ftFetched) {
      setFtFetched(true);
      fetchFtStatus();
      fetchFtJobs();
    }
  }, [activeTab, ftFetched, fetchFtStatus, fetchFtJobs]);

  const handleGenerateData = async () => {
    try {
      setFtGenerating(true);
      setFtMessage(null);
      const data = await api.post<any>("/admin/ai-chat/fine-tuning/generate");
      if (data.success) {
        setFtMessage({ type: "success", text: data.message });
        fetchFtStatus();
      } else {
        setFtMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "生成に失敗しました" });
    } finally {
      setFtGenerating(false);
    }
  };

  const handleStartTraining = async () => {
    try {
      setFtStarting(true);
      setFtMessage(null);
      const data = await api.post<any>("/admin/ai-chat/fine-tuning/start");
      if (data.success) {
        setFtMessage({ type: "success", text: data.message });
        fetchFtJobs();
      } else {
        setFtMessage({ type: "error", text: data.message });
      }
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "開始に失敗しました" });
    } finally {
      setFtStarting(false);
    }
  };

  const handleApplyModel = async (modelId: string) => {
    try {
      setFtMessage(null);
      const data = await api.put<any>("/admin/ai-chat/fine-tuning/model", { model_id: modelId });
      if (data.success) {
        setFtMessage({ type: "success", text: data.message });
        fetchFtStatus();
      }
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "更新に失敗しました" });
    }
  };

  const fetchFtPairs = useCallback(async () => {
    try {
      const data = await api.get<{ pairs: TrainingPair[] }>("/admin/ai-chat/fine-tuning/data");
      setFtPairs(data.pairs);
      setFtPairsLoaded(true);
    } catch {
      // silent
    }
  }, []);

  const handleSavePair = async (index: number) => {
    try {
      setFtSavingPair(true);
      await api.put("/admin/ai-chat/fine-tuning/data", { index, user: ftEditUser, assistant: ftEditAssistant });
      setFtPairs(prev => prev.map(p => p.index === index ? { ...p, user: ftEditUser, assistant: ftEditAssistant } : p));
      setFtEditingIndex(null);
      showToast("更新しました");
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "更新に失敗しました" });
    } finally {
      setFtSavingPair(false);
    }
  };

  const handleDeletePair = async (index: number) => {
    try {
      await api.delete(`/admin/ai-chat/fine-tuning/data/${index}`);
      setFtPairs(prev => prev.filter(p => p.index !== index).map((p, i) => ({ ...p, index: i })));
      fetchFtStatus();
      showToast("削除しました");
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "削除に失敗しました" });
    }
  };

  const handleAddPair = async () => {
    if (!ftNewUser.trim() || !ftNewAssistant.trim()) return;
    try {
      setFtSavingPair(true);
      await api.post("/admin/ai-chat/fine-tuning/data", { user: ftNewUser, assistant: ftNewAssistant });
      setFtPairs(prev => [...prev, { index: prev.length, user: ftNewUser, assistant: ftNewAssistant }]);
      setFtNewUser("");
      setFtNewAssistant("");
      setFtAddingNew(false);
      fetchFtStatus();
      showToast("追加しました");
    } catch (err) {
      setFtMessage({ type: "error", text: err instanceof Error ? err.message : "追加に失敗しました" });
    } finally {
      setFtSavingPair(false);
    }
  };

  // --- Save limits ---
  const saveLimits = async () => {
    try {
      setSaving(true);
      await api.put("/admin/ai-chat/limits", {
        user_daily_limit: parseInt(dailyLimit, 10),
        user_monthly_limit: parseInt(monthlyLimit, 10),
        ip_daily_limit: parseInt(ipLimit, 10),
        global_daily_limit: parseInt(globalDailyLimit, 10),
        limit_reached_message: limitMessage,
      });
      showToast("保存しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Save prompt settings ---
  const savePromptConfig = async (page: PageKey) => {
    const config = promptConfigs[page];
    if (!config.id) return;
    try {
      setSaving(true);
      await api.put(`/admin/ai-chat/settings/${config.id}`, {
        enabled: config.enabled,
        system_prompt: config.prompt,
        tone: LABEL_TO_TONE[config.tone] ?? "friendly",
      });
      showToast("保存しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Save suggest buttons ---
  const saveSuggestButtons = async (page: PageKey) => {
    const config = promptConfigs[page];
    if (!config.id) return;
    try {
      setSaving(true);
      await api.put(`/admin/ai-chat/settings/${config.id}`, {
        suggest_buttons: suggestButtons[page],
      });
      showToast("保存しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Derived stats data ---
  const dailyChatData = stats?.daily_stats.map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    count: d.count,
  })) ?? [];

  const tokenData = stats?.daily_stats.map((d) => ({
    date: d.date.slice(5).replace("-", "/"),
    tokens: d.total_tokens,
  })) ?? [];

  const topUsers = stats?.top_users ?? [];
  const monthlyTotal = stats?.monthly_total ?? 0;
  const monthlyTokens = stats?.monthly_tokens ?? 0;

  // Estimate cost: ~$0.002 per 1K tokens -> ~¥0.3 per 1K tokens (approx ¥150/USD)
  const estimatedCost = Math.round((monthlyTokens / 1000) * 0.3);

  // --- Mode comparison data ---
  const modeStats = stats?.mode_stats ?? [];
  const agentStats = modeStats.find((m) => m.mode === "agent");
  const finetunedStats = modeStats.find((m) => m.mode === "finetuned");

  // Build daily mode comparison chart data
  const modeDailyMap = new Map<string, { date: string; agent_count: number; finetuned_count: number; agent_tokens: number; finetuned_tokens: number }>();
  for (const d of stats?.mode_daily_stats ?? []) {
    const dateKey = d.date.slice(5).replace("-", "/");
    if (!modeDailyMap.has(dateKey)) {
      modeDailyMap.set(dateKey, { date: dateKey, agent_count: 0, finetuned_count: 0, agent_tokens: 0, finetuned_tokens: 0 });
    }
    const entry = modeDailyMap.get(dateKey)!;
    if (d.mode === "agent") {
      entry.agent_count = d.count;
      entry.agent_tokens = d.total_tokens;
    } else {
      entry.finetuned_count = d.count;
      entry.finetuned_tokens = d.total_tokens;
    }
  }
  const modeDailyData = Array.from(modeDailyMap.values());

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {toastMessage && <SaveToast message={toastMessage} />}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div>
        <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>AIチャット設定</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">AIチャットボットの動作設定を管理</p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] transition-all ${
              activeTab === tab.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Prompts */}
      {activeTab === "prompts" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SubTabs active={promptSubTab} onChange={setPromptSubTab} />
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-5 max-w-3xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-[13px]">チャット有効/無効</label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      このページでのチャット機能を切り替え
                    </p>
                  </div>
                  <Toggle
                    checked={currentPrompt.enabled}
                    onChange={() =>
                      updatePromptConfig(promptSubTab, "enabled", !currentPrompt.enabled)
                    }
                  />
                </div>

                <div>
                  <label className="block text-[13px] mb-1.5">システムプロンプト</label>
                  <textarea
                    value={currentPrompt.prompt}
                    onChange={(e) => updatePromptConfig(promptSubTab, "prompt", e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 resize-y font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {currentPrompt.prompt.length} 文字
                  </p>
                </div>

                <div>
                  <label className="block text-[13px] mb-1.5">トーン</label>
                  <select
                    value={currentPrompt.tone}
                    onChange={(e) => updatePromptConfig(promptSubTab, "tone", e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-xs"
                  >
                    <option>カジュアル</option>
                    <option>フォーマル</option>
                    <option>フレンドリー</option>
                  </select>
                </div>

                <button
                  onClick={() => savePromptConfig(promptSubTab)}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存
                </button>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-4">
                <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
                <AiChatPanel
                  pageType={promptSubTab}
                  preview
                  previewSuggestButtons={suggestButtons[promptSubTab].filter((b) => b.trim())}
                  className="max-w-sm mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Suggest */}
      {activeTab === "suggest" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SubTabs active={suggestSubTab} onChange={setSuggestSubTab} />
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px]">サジェストボタン</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    ドラッグで並び替え可能
                  </p>
                </div>

                <div className="space-y-1.5">
                  {currentButtons.map((btn, i) => (
                    <div
                      key={`${suggestSubTab}-${i}`}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 group ${
                        dragIdx === i ? "opacity-50" : ""
                      }`}
                    >
                      <div className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500 p-0.5">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-4 text-center shrink-0">
                        {i + 1}
                      </span>
                      <input
                        value={btn}
                        onChange={(e) => {
                          const updated = [...currentButtons];
                          updated[i] = e.target.value;
                          updateButtons(suggestSubTab, updated);
                        }}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                      />
                      <button
                        onClick={() =>
                          updateButtons(
                            suggestSubTab,
                            currentButtons.filter((_, idx) => idx !== i)
                          )
                        }
                        className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => updateButtons(suggestSubTab, [...currentButtons, ""])}
                  className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  追加
                </button>

                <button
                  onClick={() => saveSuggestButtons(suggestSubTab)}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存
                </button>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-4">
                <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
                <AiChatPanel
                  pageType={suggestSubTab}
                  preview
                  previewSuggestButtons={currentButtons.filter((b) => b.trim())}
                  className="max-w-sm mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Limits */}
      {activeTab === "limits" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5 max-w-2xl">
          {limitsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] mb-1.5">1ユーザー日次上限</label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">ログインユーザーの1日あたりの送信上限</p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">1ユーザー月次上限</label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">ログインユーザーの月間送信上限</p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">未ログインIP制限</label>
                  <input
                    type="number"
                    value={ipLimit}
                    onChange={(e) => setIpLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">未ログインユーザーのIPあたり1日の送信上限</p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">全体日次上限</label>
                  <input
                    type="number"
                    value={globalDailyLimit}
                    onChange={(e) => setGlobalDailyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">サービス全体の1日あたりの送信上限</p>
                </div>
              </div>

              <div>
                <label className="block text-[13px] mb-1.5">制限到達時メッセージ</label>
                <textarea
                  value={limitMessage}
                  onChange={(e) => setLimitMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                />
                <p className="text-[11px] text-muted-foreground mt-1">ユーザーに表示される制限到達時のメッセージ</p>
              </div>

              <button
                onClick={saveLimits}
                disabled={saving}
                className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                保存
              </button>
            </>
          )}
        </div>
      )}

      {/* Tab 4: Stats */}
      {activeTab === "stats" && (
        <div className="space-y-4">
          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">今月のチャット総数</p>
                  <p className="text-3xl text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>{monthlyTotal.toLocaleString()}</p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">推定APIコスト</p>
                  <p className="text-3xl text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>&yen;{estimatedCost.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm mb-4">チャット利用数の推移</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyChatData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e7e5e4", fontSize: "12px" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#6366f1"
                      strokeWidth={2}
                      dot={{ fill: "#6366f1", r: 3, strokeWidth: 0 }}
                      name="利用数"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm mb-4">ユーザー別ランキング</h3>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-muted-foreground text-[11px]">#</th>
                        <th className="text-left py-2 px-2 text-muted-foreground text-[11px]">ユーザー</th>
                        <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">回数</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user, i) => (
                        <tr key={i} className="border-b border-border last:border-0">
                          <td className="py-2 px-2 text-muted-foreground">{i + 1}</td>
                          <td className="py-2 px-2">{user.name}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">{user.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm mb-4">トークン使用量</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tokenData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e7e5e4", fontSize: "12px" }} />
                      <Bar dataKey="tokens" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="トークン数" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* ---- Mode Comparison Section ---- */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-sm font-semibold">モード別比較</h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Agent vs Fine-tuned</span>
                </div>

                {/* Summary cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] text-muted-foreground">Agent 利用数</span>
                    </div>
                    <p className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {(agentStats?.count ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Zap className="w-3.5 h-3.5 text-amber-600" />
                      <span className="text-[11px] text-muted-foreground">Agent 平均トークン</span>
                    </div>
                    <p className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {Math.round(agentStats?.avg_tokens ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] text-muted-foreground">Fine-tuned 利用数</span>
                    </div>
                    <p className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {(finetunedStats?.count ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] text-muted-foreground">Fine-tuned 平均トークン</span>
                    </div>
                    <p className="text-xl font-bold" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {Math.round(finetunedStats?.avg_tokens ?? 0).toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Daily comparison charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <h4 className="text-[13px] text-muted-foreground mb-3">利用数推移（モード別）</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={modeDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e7e5e4", fontSize: "11px" }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                        <Line type="monotone" dataKey="agent_count" stroke="#d4af37" strokeWidth={2} dot={{ r: 2 }} name="Agent" />
                        <Line type="monotone" dataKey="finetuned_count" stroke="#6366f1" strokeWidth={2} dot={{ r: 2 }} name="Fine-tuned" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div>
                    <h4 className="text-[13px] text-muted-foreground mb-3">トークン消費量（モード別）</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={modeDailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10 }} stroke="#a8a29e" axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e7e5e4", fontSize: "11px" }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: "11px" }} />
                        <Bar dataKey="agent_tokens" fill="#d4af37" radius={[3, 3, 0, 0]} name="Agent" />
                        <Bar dataKey="finetuned_tokens" fill="#6366f1" radius={[3, 3, 0, 0]} name="Fine-tuned" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab 5: Fine-tuning */}
      {activeTab === "finetune" && (
        <div className="space-y-4">
          {ftLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              {/* Status message */}
              {ftMessage && (
                <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-[13px] ${
                  ftMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}>
                  {ftMessage.type === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  {ftMessage.text}
                </div>
              )}

              {/* Current status */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">現在のモデル</p>
                  <p className="text-sm text-foreground mt-2 font-mono break-all">
                    {ftStatus?.current_model || "未設定"}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">公開店舗数</p>
                  <p className="text-3xl text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                    {ftStatus?.store_count ?? 0}
                  </p>
                </div>
                <div className="bg-card border border-border rounded-xl p-5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">訓練データ</p>
                  <p className="text-3xl text-foreground mt-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                    {ftStatus?.training_pair_count ?? 0}
                    <span className="text-sm text-muted-foreground ml-1">件</span>
                  </p>
                </div>
              </div>

              {/* OpenAI check */}
              {!ftStatus?.openai_configured && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-[13px] text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">OpenAI APIキーが未設定です</p>
                    <p className="mt-1 text-amber-700">.envファイルに OPENAI_API_KEY を設定してください。</p>
                  </div>
                </div>
              )}

              {/* Step 1: Generate training data */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</div>
                    <h3 className="text-sm font-medium">訓練データ生成</h3>
                  </div>
                  <button
                    onClick={handleGenerateData}
                    disabled={ftGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
                  >
                    {ftGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" />
                    )}
                    {ftGenerating ? "生成中..." : "データ生成"}
                  </button>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  現在のDBの店舗データ（{ftStatus?.store_count ?? 0}件）から、エリア検索・条件検索・店舗詳細・相談など10パターンの訓練データを自動生成します。
                </p>
              </div>

              {/* Training data preview/edit */}
              {ftStatus?.training_data_exists && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium">訓練データ一覧</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setFtAddingNew(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-border text-foreground hover:bg-muted transition"
                      >
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        手動追加
                      </button>
                      <button
                        onClick={() => {
                          if (!ftPairsLoaded) fetchFtPairs();
                          setFtDataExpanded(!ftDataExpanded);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] border border-border text-foreground hover:bg-muted transition"
                      >
                        {ftDataExpanded ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        {ftDataExpanded ? "閉じる" : `${ftStatus?.training_pair_count ?? 0}件を表示`}
                      </button>
                    </div>
                  </div>

                  {/* Add new pair form */}
                  {ftAddingNew && (
                    <div className="border border-indigo-200 bg-indigo-50/50 rounded-lg p-3 mb-3">
                      <div className="space-y-2">
                        <div>
                          <label className="text-[11px] text-muted-foreground font-medium">ユーザーの質問</label>
                          <input
                            value={ftNewUser}
                            onChange={e => setFtNewUser(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="例: 六本木で未経験OKのラウンジある？"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-muted-foreground font-medium">AIの回答</label>
                          <textarea
                            value={ftNewAssistant}
                            onChange={e => setFtNewAssistant(e.target.value)}
                            rows={5}
                            className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                            placeholder="AIが返すべき回答を入力..."
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => { setFtAddingNew(false); setFtNewUser(""); setFtNewAssistant(""); }}
                            className="px-3 py-1.5 rounded-lg text-[12px] border border-border hover:bg-muted transition"
                          >
                            キャンセル
                          </button>
                          <button
                            onClick={handleAddPair}
                            disabled={ftSavingPair || !ftNewUser.trim() || !ftNewAssistant.trim()}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
                          >
                            {ftSavingPair ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            追加
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Training pairs list */}
                  {ftDataExpanded && (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {!ftPairsLoaded ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        </div>
                      ) : ftPairs.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground text-center py-4">データがありません</p>
                      ) : (
                        ftPairs.map((pair) => (
                          <div key={pair.index} className="border border-border rounded-lg p-3">
                            {ftEditingIndex === pair.index ? (
                              /* Edit mode */
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[11px] text-muted-foreground font-medium">ユーザー</label>
                                  <input
                                    value={ftEditUser}
                                    onChange={e => setFtEditUser(e.target.value)}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[11px] text-muted-foreground font-medium">AI回答</label>
                                  <textarea
                                    value={ftEditAssistant}
                                    onChange={e => setFtEditAssistant(e.target.value)}
                                    rows={6}
                                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                                  />
                                </div>
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => setFtEditingIndex(null)}
                                    className="px-3 py-1.5 rounded-lg text-[12px] border border-border hover:bg-muted transition"
                                  >
                                    キャンセル
                                  </button>
                                  <button
                                    onClick={() => handleSavePair(pair.index)}
                                    disabled={ftSavingPair}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
                                  >
                                    {ftSavingPair ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    保存
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* View mode */
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">Q</span>
                                      <span className="text-[13px] text-foreground truncate">{pair.user}</span>
                                    </div>
                                    <div className="flex items-start gap-1.5">
                                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium shrink-0 mt-0.5">A</span>
                                      <span className="text-[12px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{pair.assistant}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => {
                                        setFtEditingIndex(pair.index);
                                        setFtEditUser(pair.user);
                                        setFtEditAssistant(pair.assistant);
                                      }}
                                      className="p-1.5 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
                                      title="編集"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => { if (confirm("この訓練データを削除しますか？")) handleDeletePair(pair.index); }}
                                      className="p-1.5 rounded-md hover:bg-red-50 transition text-muted-foreground hover:text-red-600"
                                      title="削除"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Start fine-tuning */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</div>
                    <h3 className="text-sm font-medium">Fine-tuning 開始</h3>
                  </div>
                  <button
                    onClick={handleStartTraining}
                    disabled={ftStarting || !ftStatus?.training_data_exists || !ftStatus?.openai_configured}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {ftStarting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    {ftStarting ? "開始中..." : "学習開始"}
                  </button>
                </div>
                <p className="text-[13px] text-muted-foreground">
                  訓練データをOpenAIにアップロードし、gpt-4o-mini のFine-tuningジョブを開始します。完了まで15〜30分かかります。
                </p>
              </div>

              {/* Step 3: Job history */}
              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</div>
                    <h3 className="text-sm font-medium">ジョブ履歴</h3>
                  </div>
                  <button
                    onClick={fetchFtJobs}
                    disabled={ftPolling}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] border border-border text-foreground hover:bg-muted transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${ftPolling ? "animate-spin" : ""}`} />
                    更新
                  </button>
                </div>

                {ftJobs.length === 0 ? (
                  <p className="text-[13px] text-muted-foreground py-4 text-center">ジョブ履歴はありません</p>
                ) : (
                  <div className="space-y-3">
                    {ftJobs.map((job: any) => (
                      <div key={job.id} className="border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] font-mono text-muted-foreground">{job.id}</span>
                          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            job.status === "succeeded"
                              ? "bg-emerald-100 text-emerald-700"
                              : job.status === "failed" || job.status === "cancelled"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {job.status === "succeeded" ? "完了" :
                             job.status === "failed" ? "失敗" :
                             job.status === "cancelled" ? "キャンセル" :
                             job.status === "running" ? "実行中" :
                             job.status === "queued" ? "待機中" :
                             job.status}
                          </span>
                        </div>
                        <div className="text-[12px] text-muted-foreground space-y-1">
                          <p>モデル: {job.model}</p>
                          {job.fine_tuned_model && (
                            <p className="text-foreground font-medium">生成モデル: {job.fine_tuned_model}</p>
                          )}
                          <p>作成: {new Date(job.created_at * 1000).toLocaleString("ja-JP")}</p>
                        </div>
                        {job.status === "succeeded" && job.fine_tuned_model && job.fine_tuned_model !== ftStatus?.current_model && (
                          <button
                            onClick={() => handleApplyModel(job.fine_tuned_model)}
                            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] bg-indigo-600 text-white hover:bg-indigo-700 transition"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            このモデルを適用
                          </button>
                        )}
                        {job.status === "succeeded" && job.fine_tuned_model === ftStatus?.current_model && (
                          <div className="mt-2 flex items-center gap-1.5 text-[12px] text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            現在適用中
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
