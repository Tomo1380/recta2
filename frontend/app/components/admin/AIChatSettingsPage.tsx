import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { AiChatHistoryTab } from "~/components/admin/AiChatHistoryTab";
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
} from "recharts";
import {
  Plus,
  X,
  Save,
  Loader2,
  Zap,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { api } from "~/lib/api";
import type { AiChatSetting, AiChatStats } from "~/lib/types";
import AiChatPanel, {
  type SuggestCategory,
  type SuggestDisplayMode,
} from "~/components/user/AiChatPanel";

// --- Tone mapping ---
const TONE_TO_LABEL: Record<AiChatSetting["tone"], string> = {
  casual: "カジュアル",
  formal: "フォーマル",
  friendly: "フレンドリー",
};

const LABEL_TO_TONE: Record<string, AiChatSetting["tone"]> = {
  カジュアル: "casual",
  フォーマル: "formal",
  フレンドリー: "friendly",
};

// --- Tabs ---
type TabKey = "basic" | "suggest" | "limit" | "knowledge" | "stats" | "history";
const TABS: { key: TabKey; label: string }[] = [
  { key: "basic", label: "基本設定" },
  { key: "suggest", label: "サジェスト" },
  { key: "limit", label: "利用制限" },
  { key: "knowledge", label: "業界ナレッジ" },
  { key: "stats", label: "統計" },
  { key: "history", label: "履歴" },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

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
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab: TabKey =
    tabFromUrl && VALID_TABS.has(tabFromUrl) ? (tabFromUrl as TabKey) : "basic";

  const [activeTab, setActiveTabState] = useState<TabKey>(initialTab);

  // Sync URL → state when the URL changes (e.g. browser back, redirect)
  useEffect(() => {
    if (tabFromUrl && VALID_TABS.has(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabFromUrl]);

  const setActiveTab = (next: TabKey) => {
    setActiveTabState(next);
    const params = new URLSearchParams(searchParams);
    params.set("tab", next);
    setSearchParams(params, { replace: true });
  };

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const [promptSubTab, setPromptSubTab] = useState<PageKey>("top");
  const [promptConfigs, setPromptConfigs] = useState<
    Record<PageKey, PromptConfig>
  >({
    top: { id: 0, enabled: true, prompt: "", tone: "フレンドリー" },
    list: { id: 0, enabled: true, prompt: "", tone: "カジュアル" },
    detail: { id: 0, enabled: true, prompt: "", tone: "フォーマル" },
  });

  const updatePromptConfig = (
    page: PageKey,
    field: keyof Omit<PromptConfig, "id">,
    value: string | boolean,
  ) => {
    setPromptConfigs((prev) => ({
      ...prev,
      [page]: { ...prev[page], [field]: value },
    }));
  };

  const [suggestSubTab, setSuggestSubTab] = useState<PageKey>("top");
  const [suggestCategories, setSuggestCategories] = useState<
    Record<PageKey, SuggestCategory[]>
  >({
    top: [],
    list: [],
    detail: [],
  });
  const [suggestDisplayModes, setSuggestDisplayModes] = useState<
    Record<PageKey, SuggestDisplayMode>
  >({
    top: "categorized",
    list: "categorized",
    detail: "categorized",
  });

  const updateDisplayMode = (page: PageKey, mode: SuggestDisplayMode) => {
    setSuggestDisplayModes((prev) => ({ ...prev, [page]: mode }));
  };

  const updateCategories = (
    page: PageKey,
    next: SuggestCategory[],
  ) => {
    setSuggestCategories((prev) => ({ ...prev, [page]: next }));
  };

  const updateCategoryAt = (
    page: PageKey,
    idx: number,
    patch: Partial<SuggestCategory>,
  ) => {
    const cats = suggestCategories[page];
    const next = cats.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    updateCategories(page, next);
  };

  // Generate a stable-ish category id from current state. Backend caps id at
  // 32 chars; we use a short prefix + timestamp tail.
  const newCategoryId = () =>
    `cat${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

  const addCategory = (page: PageKey) => {
    const cats = suggestCategories[page];
    if (cats.length >= 6) return; // backend max:6
    updateCategories(page, [
      ...cats,
      {
        id: newCategoryId(),
        label: "新しいカテゴリ",
        sub: "",
        chips: [""],
      },
    ]);
  };

  const removeCategoryAt = (page: PageKey, idx: number) => {
    const cats = suggestCategories[page];
    updateCategories(
      page,
      cats.filter((_, i) => i !== idx),
    );
  };

  const moveCategory = (page: PageKey, idx: number, dir: -1 | 1) => {
    const cats = [...suggestCategories[page]];
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    [cats[idx], cats[target]] = [cats[target], cats[idx]];
    updateCategories(page, cats);
  };

  const addChip = (page: PageKey, catIdx: number) => {
    const cats = suggestCategories[page];
    const cat = cats[catIdx];
    if (!cat || cat.chips.length >= 10) return; // backend max:10
    updateCategoryAt(page, catIdx, { chips: [...cat.chips, ""] });
  };

  const updateChip = (
    page: PageKey,
    catIdx: number,
    chipIdx: number,
    value: string,
  ) => {
    const cat = suggestCategories[page][catIdx];
    if (!cat) return;
    const chips = cat.chips.map((c, i) => (i === chipIdx ? value : c));
    updateCategoryAt(page, catIdx, { chips });
  };

  const removeChip = (page: PageKey, catIdx: number, chipIdx: number) => {
    const cat = suggestCategories[page][catIdx];
    if (!cat) return;
    const chips = cat.chips.filter((_, i) => i !== chipIdx);
    updateCategoryAt(page, catIdx, { chips });
  };

  // Limits state (connected to API)
  const [dailyLimit, setDailyLimit] = useState("50");
  const [monthlyLimit, setMonthlyLimit] = useState("500");
  const [ipLimit, setIpLimit] = useState("10");
  const [globalDailyLimit, setGlobalDailyLimit] = useState("10000");
  const [limitMessage, setLimitMessage] = useState(
    "本日のチャット上限に達しました。明日またご利用ください。",
  );
  const [limitsLoading, setLimitsLoading] = useState(false);

  // Stats state
  const [stats, setStats] = useState<AiChatStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Knowledge state
  type KnowledgeArticle = {
    id: number;
    category: string;
    slug: string;
    title: string;
    keywords: string[];
    content: string;
    sort_order: number;
    is_active: boolean;
  };
  const [knowledgeArticles, setKnowledgeArticles] = useState<
    KnowledgeArticle[]
  >([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeFetched, setKnowledgeFetched] = useState(false);
  const [knowledgeCategory, setKnowledgeCategory] = useState("all");
  const [knowledgeEditing, setKnowledgeEditing] =
    useState<KnowledgeArticle | null>(null);
  const [knowledgeAdding, setKnowledgeAdding] = useState(false);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeForm, setKnowledgeForm] = useState({
    title: "",
    category: "用語解説",
    keywords: "",
    content: "",
    is_active: true,
  });

  const KNOWLEDGE_CATEGORIES = ["用語解説", "働き方", "手続き", "比較", "マナー"];

  const currentPrompt = promptConfigs[promptSubTab];
  const currentCategories = suggestCategories[suggestSubTab];

  // --- Fetch settings on mount ---
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await api.get<AiChatSetting[]>(
        "/admin/ai-chat/settings",
      );

      const newConfigs: Record<PageKey, PromptConfig> = {
        top: { id: 0, enabled: true, prompt: "", tone: "フレンドリー" },
        list: { id: 0, enabled: true, prompt: "", tone: "カジュアル" },
        detail: { id: 0, enabled: true, prompt: "", tone: "フォーマル" },
      };
      const newCategories: Record<PageKey, SuggestCategory[]> = {
        top: [],
        list: [],
        detail: [],
      };
      const newModes: Record<PageKey, SuggestDisplayMode> = {
        top: "categorized",
        list: "categorized",
        detail: "categorized",
      };

      for (const s of settings) {
        const key = s.page_type as PageKey;
        newConfigs[key] = {
          id: s.id,
          enabled: s.enabled,
          prompt: s.system_prompt ?? "",
          tone: TONE_TO_LABEL[s.tone as keyof typeof TONE_TO_LABEL] ?? "フレンドリー",
        };
        // Backend types suggest_categories as unknown[] (jsonb). At runtime
        // it is always [{id,label,sub,chips:string[]}] when set via this
        // same admin UI / seeder.
        newCategories[key] = (s.suggest_categories ?? []) as SuggestCategory[];

        const raw = (s as { suggest_display_mode?: string }).suggest_display_mode;
        newModes[key] =
          raw === "off" || raw === "chips_only" || raw === "categorized"
            ? raw
            : "categorized";
      }

      setPromptConfigs(newConfigs);
      setSuggestCategories(newCategories);
      setSuggestDisplayModes(newModes);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "設定の取得に失敗しました";
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
      const message =
        err instanceof Error ? err.message : "統計の取得に失敗しました";
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
      const message =
        err instanceof Error ? err.message : "制限設定の取得に失敗しました";
      setError(message);
    } finally {
      setLimitsLoading(false);
    }
  }, []);

  const [limitsFetched, setLimitsFetched] = useState(false);
  useEffect(() => {
    if (activeTab === "limit" && !limitsFetched) {
      setLimitsFetched(true);
      fetchLimits();
    }
  }, [activeTab, limitsFetched, fetchLimits]);

  // Knowledge fetch
  const fetchKnowledge = useCallback(async () => {
    try {
      setKnowledgeLoading(true);
      const data = await api.get<KnowledgeArticle[]>(
        "/admin/ai-chat/knowledge",
      );
      setKnowledgeArticles(data);
    } catch {
      /* silent */
    } finally {
      setKnowledgeLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "knowledge" && !knowledgeFetched) {
      setKnowledgeFetched(true);
      fetchKnowledge();
    }
  }, [activeTab, knowledgeFetched, fetchKnowledge]);

  const handleKnowledgeSave = async () => {
    try {
      setKnowledgeSaving(true);
      const payload = {
        title: knowledgeForm.title,
        category: knowledgeForm.category,
        keywords: knowledgeForm.keywords
          .split(",")
          .map((k: string) => k.trim())
          .filter(Boolean),
        content: knowledgeForm.content,
        is_active: knowledgeForm.is_active,
      };

      if (knowledgeEditing) {
        await api.put(
          `/admin/ai-chat/knowledge/${knowledgeEditing.id}`,
          payload,
        );
      } else {
        await api.post("/admin/ai-chat/knowledge", payload);
      }
      setKnowledgeEditing(null);
      setKnowledgeAdding(false);
      setKnowledgeForm({
        title: "",
        category: "用語解説",
        keywords: "",
        content: "",
        is_active: true,
      });
      await fetchKnowledge();
    } catch {
      /* silent */
    } finally {
      setKnowledgeSaving(false);
    }
  };

  const handleKnowledgeDelete = async (id: number) => {
    if (!confirm("このナレッジ記事を削除しますか？")) return;
    try {
      await api.delete(`/admin/ai-chat/knowledge/${id}`);
      await fetchKnowledge();
    } catch {
      /* silent */
    }
  };

  const handleKnowledgeToggle = async (article: KnowledgeArticle) => {
    try {
      await api.put(`/admin/ai-chat/knowledge/${article.id}`, {
        is_active: !article.is_active,
      });
      await fetchKnowledge();
    } catch {
      /* silent */
    }
  };

  const startEditKnowledge = (article: KnowledgeArticle) => {
    setKnowledgeEditing(article);
    setKnowledgeAdding(false);
    setKnowledgeForm({
      title: article.title,
      category: article.category,
      keywords: article.keywords.join(", "),
      content: article.content,
      is_active: article.is_active,
    });
  };

  const filteredKnowledge =
    knowledgeCategory === "all"
      ? knowledgeArticles
      : knowledgeArticles.filter((a) => a.category === knowledgeCategory);

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

  // --- Save suggest categories ---
  const saveSuggestCategories = async (page: PageKey) => {
    const config = promptConfigs[page];
    if (!config.id) return;

    // Strip empty chips before POSTing — the backend validates
    // chips.* required|string, so blank rows would 422.
    const cleaned: SuggestCategory[] = suggestCategories[page]
      .map((cat) => ({
        ...cat,
        sub: cat.sub?.trim() ? cat.sub.trim() : null,
        chips: cat.chips.map((c) => c.trim()).filter((c) => c.length > 0),
      }))
      .filter((cat) => cat.label.trim() && cat.chips.length > 0);

    try {
      setSaving(true);
      await api.put(`/admin/ai-chat/settings/${config.id}`, {
        suggest_categories: cleaned,
        suggest_display_mode: suggestDisplayModes[page],
      });
      // Reflect the cleaned shape locally so subsequent edits don't keep
      // empty rows around.
      updateCategories(page, cleaned);
      showToast("保存しました");
    } catch (err) {
      const message = err instanceof Error ? err.message : "保存に失敗しました";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  // --- Derived stats data ---
  const dailyChatData =
    stats?.daily_stats.map((d) => ({
      date: d.date.slice(5).replace("-", "/"),
      count: d.count,
    })) ?? [];

  const tokenData =
    stats?.daily_stats.map((d) => ({
      date: d.date.slice(5).replace("-", "/"),
      tokens: d.total_tokens,
    })) ?? [];

  const topUsers = stats?.top_users ?? [];
  const monthlyTotal = stats?.monthly_total ?? 0;
  const monthlyTokens = stats?.monthly_tokens ?? 0;

  // 単価（USD per 1M tokens, 2026-05 基準）。
  //   Agent モード: Gemini 3.1 Flash-Lite  in $0.10 / out $0.40
  // USD→JPY は 1ドル=150円で換算。トークン内訳が無いため
  // 合計トークンを入力:出力=1:1 と仮定して概算する。
  const PRICE = { input: 0.10, output: 0.40 };
  const USD_TO_JPY = 150;
  const estimatedCost = (() => {
    const half = monthlyTokens / 2;
    const usd =
      (half / 1_000_000) * PRICE.input + (half / 1_000_000) * PRICE.output;
    return Math.round(usd * USD_TO_JPY);
  })();

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
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div>
        <h2
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 700,
          }}
        >
          AIチャット設定
        </h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          AIチャットボットの動作設定・学習データ・利用状況をすべてここから管理
        </p>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg w-fit overflow-x-auto max-w-full">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-md text-[13px] transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Basic */}
      {activeTab === "basic" && (
        <div className="space-y-5">
          {/* Page-specific prompt/tone/enable */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <SubTabs active={promptSubTab} onChange={setPromptSubTab} />
            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="space-y-5 max-w-3xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[13px]">
                        チャット有効/無効
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        このページでのチャット機能を切り替え
                      </p>
                    </div>
                    <Toggle
                      checked={currentPrompt.enabled}
                      onChange={() =>
                        updatePromptConfig(
                          promptSubTab,
                          "enabled",
                          !currentPrompt.enabled,
                        )
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] mb-1.5">
                      システムプロンプト
                    </label>
                    <textarea
                      value={currentPrompt.prompt}
                      onChange={(e) =>
                        updatePromptConfig(
                          promptSubTab,
                          "prompt",
                          e.target.value,
                        )
                      }
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
                      onChange={(e) =>
                        updatePromptConfig(promptSubTab, "tone", e.target.value)
                      }
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
                  <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wider">
                    Preview
                  </p>
                  <AiChatPanel
                    pageType={promptSubTab}
                    preview
                    previewSuggestCategories={suggestCategories[promptSubTab]
                      .map((c) => ({
                        ...c,
                        chips: c.chips.filter((chip) => chip.trim()),
                      }))
                      .filter((c) => c.label.trim() && c.chips.length > 0)}
                    previewSuggestDisplayMode={suggestDisplayModes[promptSubTab]}
                    className="max-w-sm mx-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Mode info */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-medium">チャットモード</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                AIチャットは Agent モード（Function Calling
                で店舗検索）で動作します。ユーザーの質問に応じて DB
                から店舗を検索し、業界ナレッジを参照して回答します。
              </p>
            </div>

            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-[11px] text-muted-foreground">
                  Agent モード
                </span>
              </div>
              <p className="text-[12px] text-foreground">
                メイン。DBから店舗検索して回答
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Suggest */}
      {activeTab === "suggest" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <SubTabs active={suggestSubTab} onChange={setSuggestSubTab} />
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px]">表示モード</label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    このページのチャットでサジェスト UI をどう出すか
                  </p>
                  <div className="mt-2 flex gap-2">
                    {(
                      [
                        {
                          value: "categorized",
                          label: "タブあり",
                          desc: "L1 タブ + L2 チップ",
                        },
                        {
                          value: "chips_only",
                          label: "チップのみ",
                          desc: "タブを隠してチップだけ並べる",
                        },
                        {
                          value: "off",
                          label: "非表示",
                          desc: "サジェストを出さない",
                        },
                      ] as const
                    ).map((opt) => {
                      const active =
                        suggestDisplayModes[suggestSubTab] === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            updateDisplayMode(suggestSubTab, opt.value)
                          }
                          className={`flex-1 px-3 py-2 rounded-lg border text-[12px] text-left transition ${
                            active
                              ? "border-indigo-400 bg-indigo-50 text-indigo-900"
                              : "border-border bg-white text-foreground hover:bg-muted/30"
                          }`}
                        >
                          <div className="font-medium">{opt.label}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            {opt.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {suggestDisplayModes[suggestSubTab] !== "off" && (
                  <div>
                    <label className="block text-[13px]">
                      サジェストカテゴリ
                    </label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {suggestDisplayModes[suggestSubTab] === "categorized"
                        ? "L1: カテゴリタブ(label/sub) → L2: 質問チップ。最大 6 カテゴリ・各 10 チップまで。"
                        : "チップのみモード。label/sub はユーザー画面に表示されません (将来タブありに戻す場合のために保持してください)。"}
                    </p>
                  </div>
                )}

                {suggestDisplayModes[suggestSubTab] !== "off" && (
                <div className="space-y-3">
                  {currentCategories.map((cat, catIdx) => (
                    <div
                      key={`${suggestSubTab}-${catIdx}`}
                      className="border border-border rounded-lg bg-white"
                    >
                      {/* Category header (label / sub / move / delete) */}
                      <div className="flex items-center gap-2 p-3 border-b border-border">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              moveCategory(suggestSubTab, catIdx, -1)
                            }
                            disabled={catIdx === 0}
                            className="text-stone-300 hover:text-stone-600 disabled:opacity-30"
                            aria-label="上へ"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              moveCategory(suggestSubTab, catIdx, 1)
                            }
                            disabled={catIdx === currentCategories.length - 1}
                            className="text-stone-300 hover:text-stone-600 disabled:opacity-30"
                            aria-label="下へ"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">
                              タブ表示名 (label)
                              {suggestDisplayModes[suggestSubTab] ===
                                "chips_only" && (
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                  (非表示モード中)
                                </span>
                              )}
                            </label>
                            <input
                              value={cat.label}
                              onChange={(e) =>
                                updateCategoryAt(suggestSubTab, catIdx, {
                                  label: e.target.value,
                                })
                              }
                              maxLength={40}
                              placeholder="例: 質問する"
                              className={`w-full px-3 py-1.5 rounded-lg border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 ${
                                suggestDisplayModes[suggestSubTab] ===
                                "chips_only"
                                  ? "bg-muted/40 text-muted-foreground"
                                  : "bg-white"
                              }`}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-muted-foreground mb-0.5">
                              サブテキスト (sub) — 任意
                              {suggestDisplayModes[suggestSubTab] ===
                                "chips_only" && (
                                <span className="ml-1 text-[9px] text-muted-foreground">
                                  (非表示モード中)
                                </span>
                              )}
                            </label>
                            <input
                              value={cat.sub ?? ""}
                              onChange={(e) =>
                                updateCategoryAt(suggestSubTab, catIdx, {
                                  sub: e.target.value,
                                })
                              }
                              maxLength={60}
                              placeholder="例: AIに直接聞いてみる"
                              className={`w-full px-3 py-1.5 rounded-lg border border-border text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 ${
                                suggestDisplayModes[suggestSubTab] ===
                                "chips_only"
                                  ? "bg-muted/40 text-muted-foreground"
                                  : "bg-white"
                              }`}
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            removeCategoryAt(suggestSubTab, catIdx)
                          }
                          className="p-1 text-stone-300 hover:text-red-500"
                          aria-label="カテゴリを削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Chips list */}
                      <div className="p-3 space-y-1.5">
                        <p className="text-[10px] text-muted-foreground">
                          質問チップ ({cat.chips.length}/10)
                        </p>
                        {cat.chips.map((chip, chipIdx) => (
                          <div
                            key={`${suggestSubTab}-${catIdx}-${chipIdx}`}
                            className="flex items-center gap-2 group"
                          >
                            <span className="text-[11px] text-muted-foreground w-4 text-center shrink-0">
                              {chipIdx + 1}
                            </span>
                            <input
                              value={chip}
                              onChange={(e) =>
                                updateChip(
                                  suggestSubTab,
                                  catIdx,
                                  chipIdx,
                                  e.target.value,
                                )
                              }
                              maxLength={80}
                              placeholder="例: 未経験でも大丈夫？"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                removeChip(suggestSubTab, catIdx, chipIdx)
                              }
                              className="p-1 text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                              aria-label="チップを削除"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addChip(suggestSubTab, catIdx)}
                          disabled={cat.chips.length >= 10}
                          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          チップを追加
                        </button>
                      </div>
                    </div>
                  ))}

                  {currentCategories.length === 0 && (
                    <p className="text-[12px] text-muted-foreground py-4 text-center border border-dashed border-border rounded-lg">
                      まだカテゴリが登録されていません。「カテゴリを追加」から作成してください。
                    </p>
                  )}
                </div>
                )}

                {suggestDisplayModes[suggestSubTab] !== "off" && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => addCategory(suggestSubTab)}
                    disabled={currentCategories.length >= 6}
                    className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition disabled:opacity-40"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    カテゴリを追加
                  </button>
                  <span className="text-[11px] text-muted-foreground">
                    ({currentCategories.length}/6)
                  </span>
                </div>
                )}

                <button
                  type="button"
                  onClick={() => saveSuggestCategories(suggestSubTab)}
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  保存
                </button>
              </div>

              <div className="bg-muted/40 border border-border rounded-lg p-4">
                <p className="text-[11px] text-muted-foreground mb-3 uppercase tracking-wider">
                  Preview
                </p>
                <AiChatPanel
                  pageType={suggestSubTab}
                  preview
                  previewSuggestCategories={currentCategories
                    .map((c) => ({
                      ...c,
                      chips: c.chips.filter((chip) => chip.trim()),
                    }))
                    .filter((c) => c.label.trim() && c.chips.length > 0)}
                  previewSuggestDisplayMode={suggestDisplayModes[suggestSubTab]}
                  className="max-w-sm mx-auto"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Limit */}
      {activeTab === "limit" && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-5 max-w-2xl">
          {limitsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] mb-1.5">
                    1ユーザー日次上限
                  </label>
                  <input
                    type="number"
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    ログインユーザーの1日あたりの送信上限
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">
                    1ユーザー月次上限
                  </label>
                  <input
                    type="number"
                    value={monthlyLimit}
                    onChange={(e) => setMonthlyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    ログインユーザーの月間送信上限
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">
                    未ログインIP制限
                  </label>
                  <input
                    type="number"
                    value={ipLimit}
                    onChange={(e) => setIpLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    未ログインユーザーのIPあたり1日の送信上限
                  </p>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">
                    全体日次上限
                  </label>
                  <input
                    type="number"
                    value={globalDailyLimit}
                    onChange={(e) => setGlobalDailyLimit(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    サービス全体の1日あたりの送信上限
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[13px] mb-1.5">
                  制限到達時メッセージ
                </label>
                <textarea
                  value={limitMessage}
                  onChange={(e) => setLimitMessage(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  ユーザーに表示される制限到達時のメッセージ
                </p>
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

      {/* Tab: Knowledge */}
      {activeTab === "knowledge" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] text-amber-900 flex items-start gap-2">
            <span className="inline-flex items-center rounded-md bg-amber-200/70 px-2 py-0.5 text-[11px] font-semibold text-amber-900 shrink-0 mt-[1px]">
              推論時に参照
            </span>
            <p className="leading-relaxed">
              ここのナレッジは Agent モードの推論時に <code className="rounded bg-amber-100 px-1 text-[11px]">get_industry_knowledge</code> ツール経由で動的に参照されます。業界知識の質問を受けると、AI がこのナレッジベースを検索して回答に利用します。
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[15px] font-semibold">業界ナレッジ管理</h3>
              <p className="text-[12px] text-muted-foreground mt-0.5">
                AIチャットのAgentモードが業界知識の質問に回答する際に参照するナレッジベースです
              </p>
            </div>
            <button
              onClick={() => {
                setKnowledgeAdding(true);
                setKnowledgeEditing(null);
                setKnowledgeForm({
                  title: "",
                  category: "用語解説",
                  keywords: "",
                  content: "",
                  is_active: true,
                });
              }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-medium text-primary-foreground hover:opacity-90"
            >
              <Plus size={14} />
              追加
            </button>
          </div>

          <div className="flex gap-1.5 flex-wrap">
            {["all", ...KNOWLEDGE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setKnowledgeCategory(cat)}
                className={`rounded-full px-3 py-1 text-[12px] transition-all ${
                  knowledgeCategory === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat === "all" ? "すべて" : cat}
              </button>
            ))}
          </div>

          {(knowledgeAdding || knowledgeEditing) && (
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h4 className="text-[13px] font-semibold">
                {knowledgeEditing ? "ナレッジ編集" : "ナレッジ追加"}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[12px] text-muted-foreground">
                    タイトル
                  </label>
                  <input
                    type="text"
                    value={knowledgeForm.title}
                    onChange={(e) =>
                      setKnowledgeForm({
                        ...knowledgeForm,
                        title: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px]"
                    placeholder="例: ノルマとは？"
                  />
                </div>
                <div>
                  <label className="text-[12px] text-muted-foreground">
                    カテゴリ
                  </label>
                  <select
                    value={knowledgeForm.category}
                    onChange={(e) =>
                      setKnowledgeForm({
                        ...knowledgeForm,
                        category: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px]"
                  >
                    {KNOWLEDGE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground">
                  キーワード（カンマ区切り、AIがトピックマッチに使用）
                </label>
                <input
                  type="text"
                  value={knowledgeForm.keywords}
                  onChange={(e) =>
                    setKnowledgeForm({
                      ...knowledgeForm,
                      keywords: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px]"
                  placeholder="例: ノルマ, norma, 売上目標"
                />
              </div>
              <div>
                <label className="text-[12px] text-muted-foreground">内容</label>
                <textarea
                  value={knowledgeForm.content}
                  onChange={(e) =>
                    setKnowledgeForm({
                      ...knowledgeForm,
                      content: e.target.value,
                    })
                  }
                  rows={5}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px]"
                  placeholder="AIが回答の参考にする記事内容を記入..."
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={knowledgeForm.is_active}
                    onChange={(e) =>
                      setKnowledgeForm({
                        ...knowledgeForm,
                        is_active: e.target.checked,
                      })
                    }
                  />
                  有効
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setKnowledgeAdding(false);
                      setKnowledgeEditing(null);
                    }}
                    className="rounded-lg border border-border px-3 py-1.5 text-[12px] hover:bg-muted"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleKnowledgeSave}
                    disabled={
                      knowledgeSaving ||
                      !knowledgeForm.title ||
                      !knowledgeForm.content ||
                      !knowledgeForm.keywords
                    }
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {knowledgeSaving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Save size={12} />
                    )}
                    保存
                  </button>
                </div>
              </div>
            </div>
          )}

          {knowledgeLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : filteredKnowledge.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-[13px]">
              ナレッジ記事がありません
            </div>
          ) : (
            <div className="space-y-2">
              {filteredKnowledge.map((article) => (
                <div
                  key={article.id}
                  className={`bg-card border border-border rounded-xl p-4 transition-all ${
                    !article.is_active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[13px] font-semibold">
                          {article.title}
                        </h4>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                          {article.category}
                        </span>
                        {!article.is_active && (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] text-destructive">
                            無効
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {article.keywords.map((kw, i) => (
                          <span
                            key={i}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground line-clamp-2">
                        {article.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleKnowledgeToggle(article)}
                        className="rounded-lg p-1.5 hover:bg-muted"
                        title={article.is_active ? "無効にする" : "有効にする"}
                      >
                        {article.is_active ? (
                          <Eye size={14} />
                        ) : (
                          <EyeOff size={14} />
                        )}
                      </button>
                      <button
                        onClick={() => startEditKnowledge(article)}
                        className="rounded-lg p-1.5 hover:bg-muted"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleKnowledgeDelete(article.id)}
                        className="rounded-lg p-1.5 hover:bg-muted text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-muted/50 rounded-xl p-4 text-[12px] text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">ナレッジの仕組み</p>
            <p>
              Agentモードで「ノルマって何？」「体入の流れは？」等の業界知識の質問を受けた時、AIが自動的にこのナレッジベースを検索して回答に利用します。
            </p>
            <p>
              キーワードはAIのトピックマッチに使われます。ユーザーが使いそうな言い回しや略語も追加しておくと精度が上がります。
            </p>
          </div>
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === "history" && <AiChatHistoryTab />}

      {activeTab === "stats" && (
        <div className="space-y-4">
          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <>
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  今月のチャット総数
                </p>
                <p
                  className="text-3xl text-foreground mt-2"
                  style={{
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontWeight: 700,
                  }}
                >
                  {monthlyTotal.toLocaleString()}
                  <span className="text-[12px] text-muted-foreground font-normal ml-2">
                    / トークン {monthlyTokens.toLocaleString()}
                  </span>
                </p>
                <p className="text-[12px] text-muted-foreground mt-3">
                  推定APIコスト（今月）:{" "}
                  <span className="font-mono text-foreground">
                    &yen;{estimatedCost.toLocaleString()}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Agent (Gemini 3.1 Flash-Lite): 入力 $0.10 / 出力 $0.40 (per 1M
                  tokens)・1USD = 150 JPY 換算（概算）
                </p>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm mb-4">チャット利用数の推移</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={dailyChatData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e7e5e4"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      stroke="#a8a29e"
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#a8a29e"
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        border: "1px solid #e7e5e4",
                        fontSize: "12px",
                      }}
                    />
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
                        <th className="text-left py-2 px-2 text-muted-foreground text-[11px]">
                          #
                        </th>
                        <th className="text-left py-2 px-2 text-muted-foreground text-[11px]">
                          ユーザー
                        </th>
                        <th className="text-right py-2 px-2 text-muted-foreground text-[11px]">
                          回数
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user, i) => (
                        <tr
                          key={i}
                          className="border-b border-border last:border-0"
                        >
                          <td className="py-2 px-2 text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="py-2 px-2">{user.name}</td>
                          <td className="py-2 px-2 text-right text-muted-foreground">
                            {user.count}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm mb-4">トークン使用量</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={tokenData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#e7e5e4"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        stroke="#a8a29e"
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#a8a29e"
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "8px",
                          border: "1px solid #e7e5e4",
                          fontSize: "12px",
                        }}
                      />
                      <Bar
                        dataKey="tokens"
                        fill="#8b5cf6"
                        radius={[4, 4, 0, 0]}
                        name="トークン数"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
