import { useState, useEffect, useRef, useCallback } from "react";
import { openLineFriendAdd } from "~/lib/line";
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
// Types
// ---------------------------------------------------------------------------

interface AiChatPanelProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
  storeName?: string;
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

async function sendMessage(
  message: string,
  pageType: string,
  history: { role: string; content: string }[],
  mode: ChatMode,
  storeId?: number,
  userArea?: string,
): Promise<ChatApiResponse> {
  // Include user token if available for optional auth
  const token = typeof window !== "undefined" ? localStorage.getItem("user_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/chat", {
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
  });

  if (res.status === 429) {
    const data: LimitError = await res.json();
    const err = new Error(data.message) as Error & { limitType?: string };
    err.limitType = data.limit_type;
    throw err;
  }

  if (!res.ok) throw new Error("Failed to send message");
  return res.json();
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

function getIntroScript(pageType: string, storeName?: string) {
  if (pageType === "detail" && storeName) {
    return {
      userMessage: `${storeName}ってどんなお店ですか？`,
      aiMessage: `${storeName}についてお答えします！時給や待遇、雰囲気など気になることがあれば何でも聞いてくださいね。`,
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
      "はい、ご安心ください！Rectaには全国1,200件以上のお店が掲載されており、条件に合った求人をAIが丁寧にご提案します。",
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
  className,
  preview = false,
  previewSuggestButtons,
}: AiChatPanelProps) {
  const introScript = getIntroScript(pageType, storeName);
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

  // ---- Auto-scroll to bottom ----
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

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
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

        const res = await sendMessage(msg, pageType, history, mode, storeId, userArea);

        // Strip LINE boilerplate from AI text (CTA card handles it visually)
        const cleanedMessage = res.message
          .replace(/\n*もっと詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .replace(/\n*より詳しく知りたい方は、?LINEで担当者に直接相談できます[！!]?\s*/g, "")
          .trim();

        const aiMessage: ChatMessage = {
          role: "ai",
          content: cleanedMessage,
          stores: res.stores,
          follow_ups: res.follow_ups,
          meta: res.meta,
          showLineCta: true,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setFollowUpButtons(res.follow_ups ?? []);
      } catch (err) {
        const error = err as Error & { limitType?: string };
        if (error.limitType) {
          // Usage limit reached
          const limitMessage: ChatMessage = {
            role: "ai",
            content: error.message,
          };
          setMessages((prev) => [...prev, limitMessage]);
          setLimitReached(true);
        } else {
          const errMessage: ChatMessage = {
            role: "ai",
            content:
              "申し訳ございません。エラーが発生しました。もう一度お試しください。",
          };
          setMessages((prev) => [...prev, errMessage]);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pageType, storeId, introPhase, mode, userArea, limitReached],
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

  // Whether category chips are shown (top page, no messages yet)
  const showCategoryChips = !hasMessages && pageType === "top";

  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-[16px] ${className ?? ""}`}
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid rgba(73,100,110,0.2)",
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

      {/* ---- Intro greeting (Figma-style beige box with typing animation) ---- */}
      {!hasMessages && introPhase !== "idle" && (
        <div
          className="mx-3 rounded-[16px] px-3 py-2.5"
          style={{ backgroundColor: "#f3f2ee" }}
        >
          {/* Typing dots while AI is "thinking" */}
          {(introPhase === "typing-user" || introPhase === "show-user" || introPhase === "typing-ai") && (
            <div className="flex items-center gap-1 py-1">
              <span
                className="size-1.5 rounded-full animate-bounce [animation-delay:0ms]"
                style={{ backgroundColor: "rgba(27,37,40,0.35)" }}
              />
              <span
                className="size-1.5 rounded-full animate-bounce [animation-delay:150ms]"
                style={{ backgroundColor: "rgba(27,37,40,0.35)" }}
              />
              <span
                className="size-1.5 rounded-full animate-bounce [animation-delay:300ms]"
                style={{ backgroundColor: "rgba(27,37,40,0.35)" }}
              />
            </div>
          )}
          {/* AI text streaming in */}
          {(introPhase === "show-ai" || introPhase === "done") && (
            <p
              className="whitespace-pre-line text-[13px] leading-[1.35]"
              style={{ color: "#1b2528", fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              {introAiText}
              {introPhase === "show-ai" && (
                <span
                  className="inline-block w-0.5 h-3.5 ml-0.5 align-text-bottom animate-pulse"
                  style={{ backgroundColor: "rgba(27,37,40,0.4)" }}
                />
              )}
            </p>
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

      {/* ---- Quick question pills (hidden when category chips are shown) ---- */}
      {!hasMessages && !showCategoryChips && activeSuggestButtons.length > 0 && (
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
          }}
        >
          <div className="flex flex-col gap-3 px-4 py-3.5">
            {messages.map((msg, i) => {
              const isLimitMsg = limitReached && msg.role === "ai" && i === messages.length - 1;
              return (
              <div key={i}>
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
                    {msg.content}
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
                        onClick={openLineFriendAdd}
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#06C755" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        LINE公式で直接相談する
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-end gap-2">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)",
                  }}
                >
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <div
                  className="rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1"
                  style={{
                    backgroundColor: "white",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                  }}
                >
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:0ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:150ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                  <span
                    className="size-2 rounded-full animate-bounce [animation-delay:300ms]"
                    style={{ backgroundColor: "rgba(27,37,40,0.3)" }}
                  />
                </div>
              </div>
            )}

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
            className="relative flex flex-1 items-center rounded-[16px] px-4"
            style={{
              backgroundColor: "#ffffff",
              height: "32px",
              border: "1px solid rgba(0,0,0,0.2)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitReached ? "利用上限に達しました" : "何でも聞いてください"}
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
              className="flex size-8 shrink-0 items-center justify-center rounded-[14px] transition-opacity disabled:opacity-30"
              style={{
                backgroundColor: "rgba(27,37,40,0.1)",
              }}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2
                  className="size-3.5 animate-spin"
                  style={{ color: "rgba(27,37,40,0.35)" }}
                />
              ) : (
                <Send
                  className="size-3.5"
                  style={{ color: "rgba(27,37,40,0.35)" }}
                />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
