import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  Star,
  MapPin,
  HelpCircle,
  MessageSquare,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Zap,
  BookOpen,
  Clock,
  Hash,
  Wrench,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiChatPanelProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
  storeName?: string;
  className?: string;
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
    icon: HelpCircle,
    title: "質問する",
    subtitle: "AIに直接聞いてみる",
    message: "お仕事について質問があります",
  },
  {
    icon: MessageSquare,
    title: "状況を話す",
    subtitle: "自分の状況をAIに伝える",
    message: "今の状況についてお話しします",
  },
  {
    icon: Shield,
    title: "不安を解消",
    subtitle: "本音の心配をそのまま",
    message: "不安な点を相談したいです",
  },
  {
    icon: SlidersHorizontal,
    title: "条件で絞る",
    subtitle: "希望条件をそのまま入力",
    message: "希望条件でお店を探したいです",
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
          color: meta.mode === "agent" ? "#9a7a20" : "#6366f1",
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
// Component
// ---------------------------------------------------------------------------

export default function AiChatPanel({
  pageType,
  storeId,
  storeName,
  className,
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
    fetchConfig(pageType)
      .then((cfg) => {
        setEnabled(cfg.enabled);
        setSuggestButtons(cfg.suggest_buttons ?? []);
      })
      .catch(() => {});
  }, [pageType]);

  // ---- Intro animation: IntersectionObserver ----
  useEffect(() => {
    if (introPlayed || messages.length > 0) return;

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
  }, [introPlayed, introPhase, messages.length]);

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
      if (!msg || isLoading || limitReached) return;

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

        const aiMessage: ChatMessage = {
          role: "ai",
          content: res.message,
          stores: res.stores,
          follow_ups: res.follow_ups,
          meta: res.meta,
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

  return (
    <div
      ref={panelRef}
      className={`overflow-hidden rounded-[16px] bg-white ${className ?? ""}`}
      style={{
        border: "1px solid rgba(27,37,40,0.08)",
        boxShadow:
          "0px 4px 24px rgba(0,0,0,0.06), 0px 1px 4px rgba(0,0,0,0.03)",
      }}
    >
      {/* ---- Header with mode switch ---- */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <h3
              className="text-[17px] font-bold"
              style={{ color: "#1b2528" }}
            >
              AIに相談する
            </h3>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #c5a028 100%)",
              }}
            >
              NEW
            </span>
          </div>

          {/* Mode toggle */}
          <div
            className="flex rounded-full p-0.5"
            style={{
              backgroundColor: "rgba(27,37,40,0.06)",
              border: "1px solid rgba(27,37,40,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("agent")}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
              style={{
                backgroundColor:
                  mode === "agent" ? "white" : "transparent",
                color:
                  mode === "agent" ? "#d4af37" : "rgba(27,37,40,0.45)",
                boxShadow:
                  mode === "agent"
                    ? "0px 1px 3px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              <Zap className="size-2.5" />
              Agent
            </button>
            <button
              type="button"
              onClick={() => setMode("finetuned")}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition-all"
              style={{
                backgroundColor:
                  mode === "finetuned" ? "white" : "transparent",
                color:
                  mode === "finetuned"
                    ? "#6366f1"
                    : "rgba(27,37,40,0.45)",
                boxShadow:
                  mode === "finetuned"
                    ? "0px 1px 3px rgba(0,0,0,0.1)"
                    : "none",
              }}
            >
              <BookOpen className="size-2.5" />
              Fine-tuned
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: "#d4af37" }}
          />
          <span
            className="text-xs"
            style={{ color: "rgba(27,37,40,0.5)" }}
          >
            Recta AI
          </span>
          <span
            className="text-[10px] ml-1"
            style={{ color: "rgba(27,37,40,0.3)" }}
          >
            — {mode === "agent" ? "Function Calling" : "Tuned Model"}
          </span>
        </div>
      </div>

      {/* ---- Intro animation ---- */}
      {showIntro && !hasMessages && (
        <div className="px-5 pb-3">
          <div className="flex flex-col gap-3">
            {(introPhase === "typing-user" ||
              introPhase === "show-user" ||
              introPhase === "typing-ai" ||
              introPhase === "show-ai" ||
              introPhase === "done") && (
              <div className="flex justify-end">
                <div
                  className="max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    backgroundColor: "#f5f5f5",
                    color: "rgba(27,37,40,0.88)",
                  }}
                >
                  {introPhase === "typing-user"
                    ? introUserText
                    : introScript.userMessage}
                  {introPhase === "typing-user" && (
                    <span
                      className="inline-block w-0.5 h-4 ml-0.5 align-text-bottom animate-pulse"
                      style={{ backgroundColor: "rgba(27,37,40,0.4)" }}
                    />
                  )}
                </div>
              </div>
            )}

            {introPhase === "typing-ai" && (
              <div className="flex items-end gap-2">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #d4af37 0%, #9a7a20 100%)",
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

            {(introPhase === "show-ai" || introPhase === "done") && (
              <div className="flex items-end gap-2">
                <div
                  className="flex size-6 shrink-0 items-center justify-center rounded-[10px]"
                  style={{
                    background:
                      "linear-gradient(135deg, #d4af37 0%, #9a7a20 100%)",
                  }}
                >
                  <Sparkles className="size-3.5 text-white" />
                </div>
                <div
                  className="max-w-[80%] rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px] px-4 py-2.5 text-[13px] leading-relaxed"
                  style={{
                    backgroundColor: "white",
                    color: "#1b2528",
                    border: "1px solid rgba(212,175,55,0.25)",
                    boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                  }}
                >
                  {introAiText}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ---- Suggest actions ---- */}
      {!hasMessages && (
        <div className="px-5 pb-3">
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-5 px-5">
            {SUGGEST_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => handleSend(action.message)}
                  disabled={isLoading}
                  className="flex shrink-0 items-center gap-2 rounded-[10px] bg-white px-3 py-2 text-left transition-all hover:shadow-md disabled:opacity-50"
                  style={{
                    border: "0.5px solid rgba(27,37,40,0.22)",
                    boxShadow:
                      "0px 1.5px 6px rgba(27,37,40,0.13), 0px 0.5px 2px rgba(27,37,40,0.08)",
                  }}
                >
                  <Icon
                    className="size-3.5 shrink-0"
                    style={{ color: "#d4af37" }}
                  />
                  <div className="min-w-0">
                    <div
                      className="text-[11px] font-medium leading-tight whitespace-nowrap"
                      style={{ color: "#1b2528" }}
                    >
                      {action.title}
                    </div>
                    <div
                      className="text-[9px] leading-tight whitespace-nowrap"
                      style={{
                        color: "rgba(27,37,40,0.45)",
                        letterSpacing: "0.18px",
                      }}
                    >
                      {action.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- Quick question pills ---- */}
      {!hasMessages && suggestButtons.length > 0 && (
        <div className="px-5 pb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {suggestButtons.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors hover:opacity-80 disabled:opacity-50"
                style={{
                  backgroundColor: "rgba(200,96,128,0.12)",
                  color: "#c86080",
                }}
              >
                <span
                  className="inline-block size-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: "#c86080" }}
                />
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
          style={{ scrollBehavior: "smooth" }}
        >
          <div className="flex flex-col gap-3 px-5 pb-3">
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
                          : "linear-gradient(135deg, #d4af37 0%, #9a7a20 100%)",
                      }}
                    >
                      {isLimitMsg ? <AlertTriangle className="size-3.5 text-white" /> : <Sparkles className="size-3.5 text-white" />}
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-[13px] whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "rounded-2xl rounded-br-md text-white"
                        : "rounded-bl-[18px] rounded-br-[18px] rounded-tl-[4px] rounded-tr-[18px]"
                    }`}
                    style={
                      msg.role === "user"
                        ? {
                            background:
                              "linear-gradient(135deg, #d4af37 0%, #c5a028 100%)",
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
                              border: "1px solid rgba(212,175,55,0.25)",
                              boxShadow: "0px 2px 8px rgba(27,37,40,0.07)",
                            }
                    }
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Meta info badge (for AI messages) */}
                {msg.role === "ai" && msg.meta && (
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
                                <span className="font-medium" style={{ color: "#d4af37" }}>
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

                {/* LINE CTA card (always shown after AI response with stores) */}
                {msg.role === "ai" && (msg.stores ?? []).length > 0 && (
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
                        onClick={() => {
                          /* LINE add friend handler */
                        }}
                        className="flex w-full items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: "#06C755" }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                          <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                        </svg>
                        LINEで直接相談する
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
                      "linear-gradient(135deg, #d4af37 0%, #9a7a20 100%)",
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
                    className="rounded-full px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                    style={{
                      backgroundColor: "rgba(200,96,128,0.12)",
                      color: "#c86080",
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

      {/* ---- Divider ---- */}
      <div
        className="mx-4 h-px"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(27,37,40,0.07) 18%, rgba(27,37,40,0.07) 82%, rgba(0,0,0,0) 100%)",
        }}
      />

      {/* ---- Chat input ---- */}
      <div className="px-4 pb-4 pt-3">
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
              backgroundColor: "#f4f3f1",
              height: "48px",
              border: "1px solid rgba(27,37,40,0.32)",
              boxShadow: "0px 0px 0px rgba(27,37,40,0.06)",
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={limitReached ? "利用上限に達しました" : "あなたも話しかけてみてください…"}
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
