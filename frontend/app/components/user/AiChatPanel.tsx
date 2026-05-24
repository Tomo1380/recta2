import { useState, useEffect, useRef, useCallback } from "react";
import { openLineFriendAdd } from "~/lib/line";
import { LineIcon } from "~/components/user/shared/LineIcon";
import {
  Send,
  Loader2,
  Star,
  MapPin,
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Hash,
  Wrench,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Follow-up suggestion generator (client-side, replaces server-side logic)
// ---------------------------------------------------------------------------

function generateFollowUps(
  pageType: "top" | "list" | "detail",
  userMessage: string,
  aiResponse: string,
): string[] {
  if (pageType === "detail") {
    return ["体入の流れと時給", "バック・保証の詳細", "実際の雰囲気は？"];
  }

  const combined = userMessage + " " + aiResponse;
  const discussed = {
    area: /六本木|新宿|銀座|渋谷|池袋|恵比寿|麻布|表参道|歌舞伎町/.test(combined),
    salary: /時給|給料|給与|バック|稼/.test(combined),
    beginner: /未経験|初めて|初心者/.test(combined),
    trial: /体入|体験入店/.test(combined),
    norma: /ノルマ/.test(combined),
    guarantee: /保証/.test(combined),
  };

  const suggestions: string[] = [];
  if (!discussed.trial) suggestions.push("体入できるお店");
  if (!discussed.salary) suggestions.push("高時給ランキング");
  if (!discussed.beginner) suggestions.push("未経験でも安心なお店");
  if (!discussed.norma) suggestions.push("ノルマなしのお店");
  if (!discussed.guarantee) suggestions.push("保証制度があるお店");

  return suggestions.slice(0, 3).length > 0
    ? suggestions.slice(0, 3)
    : ["未経験OKのお店", "高時給のお店", "体入できるお店"];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StoreInfo {
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  hourly_min?: number;
  hourly_max?: number;
  feature_tags?: string[];
  description?: string;
  business_hours?: string;
  same_day_trial?: boolean;
  trial_hourly?: string | number | null;
}

interface AiChatPanelProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
  storeName?: string;
  /** Store data for detail page intro summary */
  storeInfo?: StoreInfo;
  className?: string;
  /** Preview mode: disables API calls, uses provided suggest buttons */
  preview?: boolean;
  /** Override suggest buttons (used in preview mode) */
  previewSuggestButtons?: string[];
}

interface StoreCard {
  id: number;
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  hourly_min?: number;
  hourly_max?: number;
  description?: string;
  images?: { url: string; order?: number }[];
}

interface MessageMeta {
  mode: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  response_ms: number;
  tool_calls: number;
  model?: string;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  stores?: StoreCard[];
  follow_ups?: string[];
  meta?: MessageMeta;
  showLineCta?: boolean;
  /** ストリーミング中の AI 応答であることを示す。true の間はタイプライターカーソルを出す */
  streaming?: boolean;
  /** ストリーミング中に Function Calling 等の中間ステータスを出す（"店舗を検索しています…" 等） */
  streamingStatus?: string;
}

type ChatMode = "agent" | "finetuned";

interface ChatConfigResponse {
  enabled: boolean;
  suggest_buttons: string[];
}

interface ChatApiResponse {
  message: string;
  stores?: StoreCard[];
  follow_ups?: string[];
  meta?: MessageMeta;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchConfig(pageType: string): Promise<ChatConfigResponse> {
  const res = await fetch(`/api/chat/config?page_type=${pageType}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Failed to fetch chat config");
  return res.json();
}

interface LimitError {
  message: string;
  limit_type: string;
}

interface StreamHandlers {
  onStatus?: (label: string) => void;
  onDelta: (delta: string) => void;
  onDone: (payload: Pick<ChatApiResponse, "stores" | "follow_ups" | "meta">) => void;
}

/**
 * Server-Sent Events 版の sendMessage。
 *
 * 旧 sendMessage は POST → 完成JSONを一括受信していた（数秒間カーソル点滅のまま）。
 * これは `/api/chat/stream` から SSE で逐次受信し、status / text / done / error
 * イベントごとにハンドラを呼ぶ。タイプライター表示はフロント側で `onDelta` を
 * メッセージ末尾に追記していくだけで実現できる。
 *
 * リジェクト規約:
 * - 429 (limit) → `Error & { limitType }` を throw（旧版と互換）
 * - error イベント → 同じく Error を throw
 * - その他HTTPエラー → Error を throw
 */
async function streamMessage(
  message: string,
  pageType: string,
  history: { role: string; content: string }[],
  mode: ChatMode,
  storeId: number | undefined,
  userArea: string | undefined,
  signal: AbortSignal,
  handlers: StreamHandlers,
): Promise<void> {
  const token = typeof window !== "undefined" ? localStorage.getItem("user_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      page_type: pageType,
      store_id: storeId,
      history,
      mode,
      user_area: userArea,
    }),
    signal,
  });

  if (res.status === 429) {
    const data: LimitError = await res.json().catch(() => ({ message: "上限に達しました", limit_type: "unknown" }));
    const err = new Error(data.message) as Error & { limitType?: string };
    err.limitType = data.limit_type;
    throw err;
  }
  if (!res.ok || !res.body) {
    throw new Error("Failed to open chat stream");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  // SSE フレームは "\n\n" 区切り。`event:` と `data:` 行をペアで取り出す。
  const handleFrame = (frame: string) => {
    let event = "message";
    const dataLines: string[] = [];
    for (const raw of frame.split("\n")) {
      if (!raw) continue;
      if (raw.startsWith(":")) continue; // SSE コメント
      const idx = raw.indexOf(":");
      const field = idx >= 0 ? raw.slice(0, idx) : raw;
      const value = idx >= 0 ? raw.slice(idx + 1).trimStart() : "";
      if (field === "event") event = value;
      else if (field === "data") dataLines.push(value);
    }
    if (dataLines.length === 0) return;
    const dataStr = dataLines.join("\n");
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(dataStr);
    } catch {
      return;
    }
    switch (event) {
      case "status":
        handlers.onStatus?.(String(payload.label ?? ""));
        break;
      case "text":
        if (typeof payload.delta === "string") handlers.onDelta(payload.delta);
        break;
      case "done":
        handlers.onDone({
          stores: (payload.stores ?? []) as ChatApiResponse["stores"],
          follow_ups: (payload.follow_ups ?? []) as ChatApiResponse["follow_ups"],
          meta: payload.meta as ChatApiResponse["meta"],
        });
        break;
      case "error": {
        const err = new Error(String(payload.message ?? "stream error")) as Error & { limitType?: string };
        if (typeof payload.limit_type === "string") err.limitType = payload.limit_type;
        throw err;
      }
      default:
        break;
    }
  };

  // handleFrame が throw した場合 or abort された場合でも reader を必ず解放する。
  // releaseLock せずに gc されると接続が宙ぶらりんで残り、ブラウザの fetch
  // pool を消費し続ける。
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      // 完成したフレーム（"\n\n" で終わるもの）を順次処理。
      let sepIdx: number;
      while ((sepIdx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, sepIdx);
        buf = buf.slice(sepIdx + 2);
        handleFrame(frame);
      }
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // 既に解放済みなら無視
    }
  }
}

function formatWage(min?: number, max?: number): string {
  if (min == null && max == null) return "";
  const fmt = (n: number) => n.toLocaleString();
  if (min != null && max != null) return `${fmt(min)}~${fmt(max)}円/h`;
  if (min != null) return `${fmt(min)}円~/h`;
  return `~${fmt(max!)}円/h`;
}

// ---------------------------------------------------------------------------
// Suggest action buttons data
// ---------------------------------------------------------------------------

const SUGGEST_ACTIONS = [
  {
    title: "質問する",
    subtitle: "AIに直接聞いてみる",
    chips: ["未経験でも大丈夫？", "ノルマなしのお店は？", "給与の相場を教えて", "日払いできる？", "昼職と掛け持ちできる？"],
  },
  {
    title: "状況を話す",
    subtitle: "自分の状況をAIに伝える",
    chips: ["週2〜3日だけ働きたい", "昼職があって夜も働きたい", "人見知りでも大丈夫？", "子育て中でも働ける？", "体験入店が怖い"],
  },
  {
    title: "不安を解消",
    subtitle: "本音の心配をそのまま",
    chips: ["バレないか心配", "安全なお店を探したい", "初日の流れは？", "面接はどんな感じ？", "体験入店って何？"],
  },
  {
    title: "条件で絞る",
    subtitle: "希望条件をそのまま入力",
    chips: ["渋谷・恵比寿エリア", "月収50万以上", "送迎あり", "個室あり", "ノルマなし・自由出勤"],
  },
];

// ---------------------------------------------------------------------------
// Intro animation script (per page type)
// ---------------------------------------------------------------------------

function formatCurrencyShort(n?: number) {
  if (!n) return "";
  return n.toLocaleString();
}

function getIntroScript(
  pageType: string,
  storeName?: string,
  storeInfo?: StoreInfo,
) {
  if (pageType === "detail" && storeInfo) {
    const s = storeInfo;
    const hourly =
      s.hourly_min && s.hourly_max
        ? `時給${formatCurrencyShort(s.hourly_min)}〜${formatCurrencyShort(s.hourly_max)}円`
        : "";
    const location = [s.area, s.nearest_station].filter(Boolean).join("・");
    const tags = (s.feature_tags ?? []).slice(0, 4).join("、");
    const trial = s.same_day_trial
      ? `体入OK${s.trial_hourly ? `（体入時給: ${s.trial_hourly}）` : ""}`
      : "";

    let summary = `${s.name}の情報をまとめますね！\n\n`;
    if (s.category && location) summary += `${s.category} ／ ${location}\n`;
    if (hourly) summary += `${hourly}\n`;
    if (s.business_hours) summary += `営業: ${s.business_hours}\n`;
    if (trial) summary += `${trial}\n`;
    if (tags) summary += `特徴: ${tags}\n`;
    summary += `\n気になることがあれば何でも聞いてくださいね。`;

    return {
      userMessage: `${s.name}について教えて`,
      aiMessage: summary,
    };
  }
  if (pageType === "detail" && storeName) {
    return {
      userMessage: `${storeName}について教えて`,
      aiMessage: `${storeName}の情報をお伝えしますね！時給や待遇、雰囲気など気になることがあれば何でも聞いてください。`,
    };
  }
  if (pageType === "list") {
    return {
      userMessage: "条件に合うお店を探したいです",
      aiMessage:
        "お任せください！エリアや時給、雰囲気などの希望を教えていただければ、ぴったりのお店をお探しします。",
    };
  }
  return {
    userMessage: "Rectaで良いお店みつかりますか？",
    aiMessage:
      "こんにちは！Rectaへようこそ。\nお仕事探しや業界についてのご相談、何でもお気軽にお聞きください！",
  };
}

// ---------------------------------------------------------------------------
// Meta badge component
// ---------------------------------------------------------------------------

function MetaBadge({ meta }: { meta: MessageMeta }) {
  return (
    <div className="mt-1.5 ml-8 flex flex-wrap items-center gap-1.5">
      {/* Mode */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor:
            meta.mode === "agent"
              ? "rgba(212,175,55,0.12)"
              : "rgba(99,102,241,0.12)",
          color: meta.mode === "agent" ? "#D4AF37" : "#6366f1",
        }}
      >
        {meta.mode === "agent" ? (
          <Zap className="size-2.5" />
        ) : (
          <BookOpen className="size-2.5" />
        )}
        {meta.mode === "agent" ? "Agent" : "Fine-tuned"}
      </span>

      {/* Tokens */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        style={{
          backgroundColor: "rgba(27,37,40,0.06)",
          color: "rgba(27,37,40,0.5)",
        }}
      >
        <Hash className="size-2.5" />
        {meta.total_tokens.toLocaleString()} tok
      </span>

      {/* Response time */}
      <span
        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
        style={{
          backgroundColor: "rgba(27,37,40,0.06)",
          color: "rgba(27,37,40,0.5)",
        }}
      >
        <Clock className="size-2.5" />
        {meta.response_ms >= 1000
          ? `${(meta.response_ms / 1000).toFixed(1)}s`
          : `${meta.response_ms}ms`}
      </span>

      {/* Tool calls (agent mode only) */}
      {meta.tool_calls > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
          style={{
            backgroundColor: "rgba(212,175,55,0.08)",
            color: "#9a7a20",
          }}
        >
          <Wrench className="size-2.5" />
          {meta.tool_calls} tool{meta.tool_calls > 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggest actions carousel (touch-scroll on mobile, arrow buttons on PC)
// ---------------------------------------------------------------------------

function SuggestActionsCarousel({
  actions,
  isLoading,
  onSend,
}: {
  actions: typeof SUGGEST_ACTIONS;
  isLoading: boolean;
  onSend: (text: string) => void;
}) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -150 : 150, behavior: "smooth" });
  };

  const selectedChips = actions[selectedIdx]?.chips ?? [];

  return (
    <div>
      {/* Category tabs */}
      <div className="relative group">
        <style>{`.suggest-carousel::-webkit-scrollbar { display: none; }`}</style>
        <div
          ref={scrollContainerRef}
          className="suggest-carousel flex gap-2 px-5 pb-2 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {actions.map((action, idx) => {
            const active = selectedIdx === idx;
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => setSelectedIdx(idx)}
                disabled={isLoading}
                className="flex shrink-0 flex-col items-start gap-px rounded-[10px] bg-white pl-3 pr-3 py-[7px] text-left transition-all hover:shadow-md disabled:opacity-50"
                style={{
                  border: active
                    ? "0.5px solid rgba(27,37,40,0.22)"
                    : "0.5px solid rgba(27,37,40,0.15)",
                  boxShadow: active
                    ? "0px 1.5px 6px rgba(27,37,40,0.13), 0px 0.5px 2px rgba(27,37,40,0.08)"
                    : "none",
                }}
              >
                <span
                  className="text-[11px] leading-tight whitespace-nowrap"
                  style={{
                    color: active ? "#1b2528" : "rgba(27,37,40,0.7)",
                    fontWeight: active ? 500 : 400,
                  }}
                >
                  {action.title}
                </span>
                <span
                  className="text-[9px] leading-tight whitespace-nowrap"
                  style={{
                    color: active ? "rgba(27,37,40,0.45)" : "rgba(27,37,40,0.32)",
                    letterSpacing: "0.18px",
                  }}
                >
                  {action.subtitle}
                </span>
              </button>
            );
          })}
        </div>

        {/* Left arrow (PC hover) */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            className="absolute left-1 top-1/2 -translate-y-1/2 hidden sm:flex size-7 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            style={{ border: "0.5px solid rgba(27,37,40,0.12)" }}
          >
            <ChevronLeft className="size-4" style={{ color: "rgba(27,37,40,0.6)" }} />
          </button>
        )}

        {/* Right arrow (PC hover) */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            className="absolute right-1 top-1/2 -translate-y-1/2 hidden sm:flex size-7 items-center justify-center rounded-full bg-white/90 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
            style={{ border: "0.5px solid rgba(27,37,40,0.12)" }}
          >
            <ChevronRight className="size-4" style={{ color: "rgba(27,37,40,0.6)" }} />
          </button>
        )}

        {/* Right fade hint */}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(270deg, white 0%, transparent 100%)" }}
          />
        )}

        {/* Left fade hint */}
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute left-0 top-0 bottom-0 w-10"
            style={{ background: "linear-gradient(90deg, white 0%, transparent 100%)" }}
          />
        )}
      </div>

      {/* Chips grid */}
      <div style={{ padding: "0 20px 14px" }}>
        <div style={{ overflowX: "auto", overflowY: "visible", scrollbarWidth: "none" as const, padding: "3px", margin: "-3px" }}>
          <div style={{ display: "grid", gridTemplateRows: "repeat(2, 30px)", gridAutoFlow: "column", gridAutoColumns: "max-content", gap: "8px" }}>
            {selectedChips.map((chip, i) => (
              <button
                key={chip}
                type="button"
                onClick={() => onSend(chip)}
                disabled={isLoading}
                className="flex items-center justify-center rounded-full bg-white transition-all active:scale-95 hover:shadow-md disabled:opacity-50"
                style={{
                  height: "30px",
                  padding: "0 13px",
                  border: "none",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px 0.5px rgba(27,37,40,0.07)",
                  fontSize: "11px",
                  color: "#1b2528",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AiChatPanel({
  pageType,
  storeId,
  storeName,
  storeInfo,
  className,
  preview = false,
  previewSuggestButtons,
}: AiChatPanelProps) {
  const introScript = getIntroScript(pageType, storeName, storeInfo);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestButtons, setSuggestButtons] = useState<string[]>([]);
  const [followUpButtons, setFollowUpButtons] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<ChatMode>("agent");
  const [limitReached, setLimitReached] = useState(false);

  // Intro animation state
  const [introPhase, setIntroPhase] = useState<
    "idle" | "typing-user" | "show-user" | "typing-ai" | "show-ai" | "done"
  >("idle");
  const [introUserText, setIntroUserText] = useState("");
  const [introAiText, setIntroAiText] = useState("");
  const [introPlayed, setIntroPlayed] = useState(false);

  const [userArea, setUserArea] = useState<string>("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // SSE 接続を持つ AbortController を保持し、unmount or 新規送信時にキャンセルする。
  // これがないと、ユーザーが画面遷移しても fetch が裏で生き続け、reader が
  // chunk を待ち続ける（memory leak + 不要な PHP-FPM ワーカ占有）。
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // ---- Detect user area from geolocation (best-effort, once) ----
  useEffect(() => {
    if (preview) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=ja`,
          );
          const data = await res.json();
          const area =
            data?.address?.city ||
            data?.address?.town ||
            data?.address?.county ||
            data?.address?.state ||
            "";
          if (area) setUserArea(area);
        } catch {
          // silently ignore
        }
      },
      () => {
        // permission denied or error — default to empty (Tokyo assumed)
      },
      { timeout: 5000 },
    );
  }, []);

  // ---- Load config ----
  useEffect(() => {
    if (preview) return;
    fetchConfig(pageType)
      .then((cfg) => {
        setEnabled(cfg.enabled);
        setSuggestButtons(cfg.suggest_buttons ?? []);
      })
      .catch(() => {});
  }, [pageType, preview]);

  // In preview mode, use previewSuggestButtons directly
  const activeSuggestButtons = preview ? (previewSuggestButtons ?? []) : suggestButtons;

  // ---- Intro animation: IntersectionObserver ----
  useEffect(() => {
    if (introPlayed || messages.length > 0) return;

    // In preview mode, start intro immediately
    if (preview) {
      if (introPhase === "idle") setIntroPhase("typing-user");
      return;
    }

    const el = panelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && introPhase === "idle") {
          setIntroPhase("typing-user");
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [introPlayed, introPhase, messages.length, preview]);

  // ---- Intro animation: typewriter effect ----
  useEffect(() => {
    if (introPhase === "typing-user") {
      const fullText = introScript.userMessage;
      let i = 0;
      const interval = setInterval(() => {
        i++;
        setIntroUserText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setTimeout(() => setIntroPhase("show-user"), 300);
        }
      }, 50);
      return () => clearInterval(interval);
    }

    if (introPhase === "show-user") {
      const timer = setTimeout(() => setIntroPhase("typing-ai"), 800);
      return () => clearTimeout(timer);
    }

    if (introPhase === "typing-ai") {
      const timer = setTimeout(() => setIntroPhase("show-ai"), 1200);
      return () => clearTimeout(timer);
    }

    if (introPhase === "show-ai") {
      const fullText = introScript.aiMessage;
      let i = 0;
      const interval = setInterval(() => {
        i += 2;
        setIntroAiText(fullText.slice(0, i));
        if (i >= fullText.length) {
          clearInterval(interval);
          setIntroAiText(fullText);
          setTimeout(() => {
            setIntroPhase("done");
            setIntroPlayed(true);
          }, 500);
        }
      }, 30);
      return () => clearInterval(interval);
    }
  }, [introPhase]);

  // ---- Auto-scroll ----
  // Once the user has sent at least one message, keep the latest user message
  // pinned near the top of the chat viewport — even as the AI reply streams in
  // below. Without this, new AI tokens push the question off-screen and the
  // user has to scroll back up to remember what they asked.
  // Before any user message exists (intro animation, suggestion chips), fall
  // back to bottom-scroll so the latest content stays visible.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const userCount = messages.filter((m) => m.role === "user").length;

    requestAnimationFrame(() => {
      if (userCount > 0) {
        const userNodes = el.querySelectorAll<HTMLElement>('[data-msg-role="user"]');
        const lastUser = userNodes[userNodes.length - 1];
        if (lastUser) {
          const target = lastUser.offsetTop - el.offsetTop - 12;
          el.scrollTo({
            top: target,
            // Smooth on the first jump, instant during streaming so the
            // pinned position doesn't fight the layout shift.
            behavior: Math.abs(el.scrollTop - target) > 4 ? "smooth" : "auto",
          });
          return;
        }
      }
      el.scrollTop = el.scrollHeight;
    });
  }, [messages, isLoading]);

  // ---- Send handler ----
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isLoading || limitReached || preview) return;

      if (introPhase !== "done" && introPhase !== "idle") {
        setIntroPhase("done");
        setIntroPlayed(true);
      }

      const userMessage: ChatMessage = { role: "user", content: msg };
      // 受信用 AI 吹き出しを先に追加して、以後 delta を末尾に追記する
      const placeholder: ChatMessage = { role: "ai", content: "", streaming: true };
      setMessages((prev) => [...prev, userMessage, placeholder]);
      setInput("");
      setIsLoading(true);

      // 既存ストリームが残っていればキャンセル（連打や遷移後の再送信に備える）
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      // サーバ側で [STORE:ID] は既に除去済みなので、フロントでは LINE 定型句のみ削除する。
      // 毎 chunk フル文字列に対して regex を回すと O(n²) になるため、対象を絞ることが重要。
      const cleanText = (s: string) =>
        s
          .replace(/\n*もっと詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .replace(/\n*より詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "");

      let accumulated = "";

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

        await streamMessage(
          msg,
          pageType,
          history,
          mode,
          storeId,
          userArea,
          controller.signal,
          {
            onStatus: (label) => {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai" && last.streaming) {
                  next[next.length - 1] = { ...last, streamingStatus: label };
                }
                return next;
              });
            },
            onDelta: (delta) => {
              accumulated += delta;
              const visible = cleanText(accumulated).trimStart();
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai" && last.streaming) {
                  next[next.length - 1] = { ...last, content: visible, streamingStatus: undefined };
                }
                return next;
              });
            },
            onDone: ({ stores, follow_ups, meta }) => {
              const finalText = cleanText(accumulated).trim();
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "ai") {
                  next[next.length - 1] = {
                    ...last,
                    content: finalText,
                    stores,
                    follow_ups,
                    meta,
                    showLineCta: true,
                    streaming: false,
                    streamingStatus: undefined,
                  };
                }
                return next;
              });
              setFollowUpButtons(generateFollowUps(pageType, input, finalText));
            },
          },
        );
      } catch (err) {
        const error = err as Error & { limitType?: string };
        const isLimit = !!error.limitType;
        setMessages((prev) => {
          const next = [...prev];
          // ストリーミング中の placeholder を差し替える
          const last = next[next.length - 1];
          const errContent = isLimit
            ? error.message
            : "申し訳ございません。エラーが発生しました。もう一度お試しください。";
          if (last?.role === "ai" && last.streaming) {
            next[next.length - 1] = { role: "ai", content: errContent };
          } else {
            next.push({ role: "ai", content: errContent });
          }
          return next;
        });
        if (isLimit) setLimitReached(true);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pageType, storeId, introPhase, mode, userArea, limitReached, preview],
  );

  if (!enabled) return null;

  const hasMessages = messages.length > 0;
  const showIntro =
    !hasMessages &&
    introPhase !== "idle" &&
    (introPhase !== "done" || introPlayed);

  const showFollowUp =
    followUpButtons.length > 0 &&
    !isLoading &&
    messages.length > 0 &&
    messages[messages.length - 1]?.role === "ai";

  // Category-chips carousel (the hardcoded "状況を話す / 不安を解消 / 条件で絞る /
  // 私を診断" 4-card display) is intentionally disabled: the admin-managed
  // suggest_buttons are the single source of truth for top-page suggestions.
  // Keeping the SUGGEST_ACTIONS constant in case we want it back as a marketing
  // splash, but it no longer renders.
  const showCategoryChips = false;

  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-[14px] ${className ?? ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(212,175,55,0.28)",
        boxShadow: "0px 4px 16px rgba(0,0,0,0.12), 0px 1px 4px rgba(0,0,0,0.08)",
        position: "relative",
        zIndex: 3,
        isolation: "isolate",
      }}
    >
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex size-[22px] shrink-0 items-center justify-center rounded-[10px]"
            style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
          >
            <Sparkles className="size-3.5 text-white" />
          </div>
          <span
            className="text-[14px] font-bold"
            style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
          >
            Recta AI
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Mode toggle */}
          <button
            type="button"
            onClick={() => setMode(mode === "agent" ? "finetuned" : "agent")}
            className="rounded-full px-2 py-0.5 text-[9px] font-semibold transition-colors"
            style={{
              backgroundColor: mode === "agent" ? "rgba(212,175,55,0.12)" : "rgba(99,102,241,0.12)",
              color: mode === "agent" ? "#D4AF37" : "#6366f1",
              border: `0.5px solid ${mode === "agent" ? "rgba(212,175,55,0.3)" : "rgba(99,102,241,0.3)"}`,
            }}
          >
            {mode === "agent" ? "Agent" : "FT"}
          </button>
        </div>
      </div>

      {/* ---- Intro greeting (chat bubble style with typing animation) ---- */}
      {!hasMessages && introPhase !== "idle" && (
        <div
          className="flex flex-col gap-3 px-4 py-3.5"
          style={{
            backgroundColor: "#faf9f7",
            borderTop: "1px solid rgba(27,37,40,0.05)",
            borderBottom: "1px solid rgba(27,37,40,0.05)",
          }}
        >
          {/* User bubble */}
          {(introPhase === "show-user" || introPhase === "typing-ai" || introPhase === "show-ai" || introPhase === "done") && (
            <div className="flex justify-end">
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                style={{
                  backgroundColor: "#eae7e3",
                  color: "rgba(27,37,40,0.88)",
                  boxShadow: "0px 1px 3px rgba(27,37,40,0.06)",
                }}
              >
                {introPhase === "show-user" ? introUserText : introScript.userMessage}
              </div>
            </div>
          )}
          {/* Typing dots */}
          {(introPhase === "typing-user") && (
            <div className="flex justify-end">
              <div
                className="px-3.5 py-2.5 rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                style={{ backgroundColor: "#eae7e3" }}
              >
                <div className="flex items-center gap-1 py-0.5">
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: "rgba(27,37,40,0.35)" }} />
                </div>
              </div>
            </div>
          )}
          {/* AI typing dots */}
          {introPhase === "typing-ai" && (
            <div className="flex justify-start">
              <div
                className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
              >
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div
                className="px-3.5 py-2.5 rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                style={{ backgroundColor: "white", border: "0.5px solid rgba(212,175,55,0.25)", boxShadow: "0px 2px 8px rgba(27,37,40,0.07)" }}
              >
                <div className="flex items-center gap-1 py-0.5">
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                  <span className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]" style={{ backgroundColor: "rgba(212,175,55,0.5)" }} />
                </div>
              </div>
            </div>
          )}
          {/* AI bubble */}
          {(introPhase === "show-ai" || introPhase === "done") && (
            <div className="flex justify-start">
              <div
                className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
              >
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div
                className="max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                style={{
                  backgroundColor: "white",
                  color: "#1b2528",
                  border: "0.5px solid rgba(212,175,55,0.25)",
                  boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                }}
              >
                {introAiText}
                {introPhase === "show-ai" && (
                  <span
                    className="inline-block w-0.5 h-3.5 ml-0.5 align-text-bottom animate-pulse"
                    style={{ backgroundColor: "rgba(212,175,55,0.4)" }}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- Suggest actions (top page only) ---- */}
      {showCategoryChips && (
        <div className="pt-3">
          <SuggestActionsCarousel
            actions={SUGGEST_ACTIONS}
            isLoading={isLoading}
            onSend={handleSend}
          />
        </div>
      )}

      {/* ---- Quick question pills ----
          管理画面で編集できる suggest_buttons を表示。トップページでも
          カテゴリチップの下に並べて、編集が画面に反映されるようにする。 */}
      {!hasMessages && activeSuggestButtons.length > 0 && (
        <div className="px-5 pt-2 pb-4">
          <div className="flex flex-wrap gap-2">
            {activeSuggestButtons.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="flex items-center justify-center rounded-full bg-white px-3.5 py-1.5 text-[11px] transition-all hover:shadow-md disabled:opacity-50"
                style={{
                  color: "#1b2528",
                  boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px rgba(27,37,40,0.07)",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ---- Messages area ---- */}
      {hasMessages && (
        <div
          ref={scrollRef}
          className="max-h-[360px] overflow-y-auto"
          style={{
            scrollBehavior: "smooth",
            backgroundColor: "#faf9f7",
            borderTop: "1px solid rgba(27,37,40,0.05)",
            borderBottom: "1px solid rgba(27,37,40,0.05)",
          }}
        >
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {messages.map((msg, i) => {
              const isLimitMsg = limitReached && msg.role === "ai" && i === messages.length - 1;
              return (
              <div key={i} data-msg-role={msg.role}>
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "ai" && (
                    <div
                      className="mr-2 mt-auto flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                      style={{
                        background: isLimitMsg
                          ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                          : "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)",
                      }}
                    >
                      {isLimitMsg ? <AlertTriangle className="size-3.5 text-white" /> : <Sparkles className="size-3.5 text-white" />}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-3.5 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-bl-[18px] rounded-br-[4px] rounded-tl-[18px] rounded-tr-[18px]"
                        : "rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: "#eae7e3",
                            color: "rgba(27,37,40,0.88)",
                            boxShadow: "0px 1px 3px rgba(27,37,40,0.06)",
                          }
                        : isLimitMsg
                          ? {
                              backgroundColor: "#fffbeb",
                              color: "#92400e",
                              border: "1px solid rgba(245,158,11,0.35)",
                              boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                            }
                          : {
                              backgroundColor: "white",
                              color: "#1b2528",
                              border: "0.5px solid rgba(212,175,55,0.25)",
                              boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                            }
                    }
                  >
                    {msg.role === "ai" && msg.streaming && !msg.content ? (
                      // Streaming placeholder: dots + optional status label (e.g. "店舗を検索しています…")
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1" aria-hidden>
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                          <span
                            className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                            style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                          />
                        </span>
                        {msg.streamingStatus && (
                          <span className="text-[11px]" style={{ color: "rgba(27,37,40,0.55)" }}>
                            {msg.streamingStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <>
                        {msg.content}
                        {msg.role === "ai" && msg.streaming && (
                          <span
                            aria-hidden
                            className="inline-block w-[2px] h-[1em] align-text-bottom ml-[2px]"
                            style={{
                              backgroundColor: "rgba(27,37,40,0.55)",
                              animation: "rectaChatCursor 1s steps(2) infinite",
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Meta info badge — hidden on top page where category chips exist */}
                {msg.role === "ai" && msg.meta && pageType !== "top" && (
                  <MetaBadge meta={msg.meta} />
                )}

                {/* Store cards (max 3) */}
                {(msg.stores ?? []).length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 ml-8">
                    {(msg.stores ?? []).slice(0, 3).map((store) => {
                      const imgUrl = store.images?.[0]?.url;
                      return (
                        <a
                          key={store.id}
                          href={`/stores/${store.id}`}
                          className="flex gap-3 rounded-[10px] p-2.5 transition-all hover:shadow-sm"
                          style={{
                            border: "1px solid rgba(27,37,40,0.1)",
                            backgroundColor: "#ffffff",
                          }}
                        >
                          {/* Thumbnail */}
                          <div
                            className="shrink-0 rounded-[8px] overflow-hidden"
                            style={{
                              width: 110,
                              height: 81,
                              backgroundColor: "rgba(27,37,40,0.06)",
                            }}
                          >
                            {imgUrl ? (
                              <img
                                src={imgUrl}
                                alt={store.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center">
                                <Star
                                  className="size-6"
                                  style={{ color: "rgba(27,37,40,0.15)" }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                            <div
                              className="text-[13px] font-bold leading-tight truncate"
                              style={{ color: "#1b2528" }}
                            >
                              {store.name}
                            </div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                              {(store.hourly_min != null || store.hourly_max != null) && (
                                <span className="font-medium" style={{ color: "#D4AF37" }}>
                                  {formatWage(store.hourly_min, store.hourly_max)}
                                </span>
                              )}
                              {store.nearest_station && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="size-2.5 shrink-0" />
                                  {store.nearest_station}
                                </span>
                              )}
                              {!store.nearest_station && store.area && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="size-2.5 shrink-0" />
                                  {store.area}
                                </span>
                              )}
                            </div>
                            {store.description && (
                              <p
                                className="text-[10px] leading-snug mt-0.5 line-clamp-2"
                                style={{ color: "rgba(27,37,40,0.55)" }}
                              >
                                {store.description}
                              </p>
                            )}
                          </div>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* LINE CTA card — shown when stores are returned OR AI mentioned LINE */}
                {msg.role === "ai" && msg.showLineCta && (
                  <div className="mt-2 ml-8">
                    <div
                      className="rounded-[16px] px-4 py-3.5"
                      style={{ backgroundColor: "#f3f2ee" }}
                    >
                      <p
                        className="text-[13px] leading-relaxed mb-2.5"
                        style={{ color: "rgba(27,37,40,0.7)" }}
                      >
                        より詳しい最新の情報を聞きたい場合{"\n"}
                        <span className="font-medium" style={{ color: "#1b2528" }}>
                          LINE登録して直接ご相談下さい！
                        </span>
                      </p>
                      <button
                        type="button"
                        onClick={() => openLineFriendAdd("chat:line-cta")}
                        aria-label="LINE公式で直接相談する（友だち追加）"
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#06C755" }}
                      >
                        <LineIcon size={18} />
                        LINE公式で直接相談する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}

            {/* Streaming cursor keyframes (kept inline so this component is self-contained) */}
            <style>{`@keyframes rectaChatCursor{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

            {/* Follow-up pills */}
            {showFollowUp && (
              <div className="flex flex-wrap gap-2 mt-1">
                {followUpButtons.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSend(label)}
                    className="rounded-full bg-white px-3.5 py-1.5 text-[11px] transition-all hover:shadow-md"
                    style={{
                      color: "#1b2528",
                      boxShadow: "0px 1px 4px rgba(27,37,40,0.13), 0px 0px 0px rgba(27,37,40,0.07)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Chat input ---- */}
      <div className="px-4 pb-3 pt-3">
        <form
          className="flex items-center gap-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div
            className="relative flex flex-1 items-center gap-2.5 rounded-[16px] px-4"
            style={{
              backgroundColor: "#f4f3f1",
              height: "48px",
              border: "1.5px solid rgba(27,37,40,0.12)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitReached ? "利用上限に達しました" : "何でも聞いてください…"}
              disabled={isLoading || limitReached}
              className="h-full w-full bg-transparent text-[13px] outline-none disabled:opacity-50"
              style={{
                color: "#1b2528",
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || limitReached}
              className="flex size-8 shrink-0 items-center justify-center rounded-xl transition-all disabled:opacity-30 active:scale-90"
              style={{
                background: input.trim() && !isLoading && !limitReached
                  ? "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)"
                  : "rgba(27,37,40,0.1)",
              }}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2
                  className="size-3.5 animate-spin"
                  style={{ color: input.trim() ? "white" : "rgba(27,37,40,0.35)" }}
                />
              ) : (
                <Send
                  className="size-3.5"
                  style={{ color: input.trim() && !limitReached ? "white" : "rgba(27,37,40,0.35)" }}
                />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
