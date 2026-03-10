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
import { GripVertical, Plus, X, MessageCircle, Bot, Save, Loader2, Zap, BookOpen } from "lucide-react";
import { api } from "~/lib/api";
import type { AiChatSetting, AiChatStats } from "~/lib/types";

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

function SuggestPreview({ buttons }: { buttons: string[] }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-4">
      <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wider">Preview</p>
      <div className="bg-white rounded-lg border border-border shadow-sm max-w-sm mx-auto overflow-hidden">
        <div className="bg-foreground text-white px-4 py-2.5 flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span className="text-[13px]">Recta Chat</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center shrink-0">
              <Bot className="w-3.5 h-3.5 text-stone-500" />
            </div>
            <div className="bg-stone-50 rounded-lg rounded-tl-sm px-3 py-2 text-[13px]">
              こんにちは！何かお手伝いできることはありますか？
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-8">
            {buttons
              .filter((b) => b.trim())
              .map((btn, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 border border-border text-foreground rounded-full text-[11px] cursor-default hover:bg-indigo-50 transition"
                >
                  {btn}
                </span>
              ))}
          </div>
        </div>
        <div className="border-t border-border px-4 py-2.5 flex items-center gap-2">
          <div className="flex-1 bg-stone-50 rounded-md px-3 py-1.5 text-[11px] text-muted-foreground">
            メッセージを入力...
          </div>
          <div className="w-6 h-6 bg-foreground rounded-md flex items-center justify-center">
            <MessageCircle className="w-3 h-3 text-white" />
          </div>
        </div>
      </div>
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

  const tabs = [
    { key: "prompts", label: "プロンプト" },
    { key: "suggest", label: "サジェスト" },
    { key: "limits", label: "利用制限" },
    { key: "stats", label: "統計" },
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
          <div className="p-5 space-y-5 max-w-3xl">
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

              <SuggestPreview buttons={currentButtons} />
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
    </div>
  );
}
