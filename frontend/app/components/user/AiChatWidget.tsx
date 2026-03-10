import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { MessageCircle, X, Send, Loader2, Star, MapPin } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AiChatWidgetProps {
  pageType: "top" | "list" | "detail";
  storeId?: number;
}

interface StoreCard {
  id: number;
  name: string;
  area?: string;
  hourly_min?: number;
  hourly_max?: number;
}

interface ChatMessage {
  role: "user" | "ai";
  content: string;
  stores?: StoreCard[];
}

interface ChatConfigResponse {
  enabled: boolean;
  suggest_buttons: string[];
}

interface ChatApiResponse {
  message: string;
  stores?: StoreCard[];
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

async function sendMessage(
  message: string,
  pageType: string,
  history: { role: string; content: string }[],
  storeId?: number,
): Promise<ChatApiResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      message,
      page_type: pageType,
      store_id: storeId,
      history,
    }),
  });
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
// Component
// ---------------------------------------------------------------------------

export default function AiChatWidget({ pageType, storeId }: AiChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestButtons, setSuggestButtons] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ---- Load config ----
  useEffect(() => {
    fetchConfig(pageType)
      .then((cfg) => {
        setEnabled(cfg.enabled);
        setSuggestButtons(cfg.suggest_buttons ?? []);
      })
      .catch(() => {
        // If config fails, keep widget enabled with no suggestions
      });
  }, [pageType]);

  // ---- Auto-scroll to bottom ----
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const viewport = scrollRef.current?.querySelector(
        "[data-slot='scroll-area-viewport']",
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  // ---- Focus input when opened ----
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // ---- Send handler ----
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || isLoading) return;

      const userMessage: ChatMessage = { role: "user", content: msg };
      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);

      try {
        const history = [...messages, userMessage].map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.content,
        }));

        const res = await sendMessage(msg, pageType, history, storeId);

        const aiMessage: ChatMessage = {
          role: "ai",
          content: res.message,
          stores: res.stores,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch {
        const errMessage: ChatMessage = {
          role: "ai",
          content: "申し訳ございません。エラーが発生しました。もう一度お試しください。",
        };
        setMessages((prev) => [...prev, errMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, messages, pageType, storeId],
  );

  // ---- Don't render if disabled ----
  if (!enabled) return null;

  // ---- Show suggest buttons when no messages or after last AI message ----
  const showSuggestions =
    suggestButtons.length > 0 &&
    !isLoading &&
    (messages.length === 0 ||
      messages[messages.length - 1]?.role === "ai");

  return (
    <>
      {/* ---- Floating trigger button ---- */}
      <Button
        onClick={() => setIsOpen((v) => !v)}
        className={`fixed bottom-5 right-5 z-50 size-14 rounded-full shadow-lg transition-transform duration-200 hover:scale-105 ${
          isOpen ? "scale-0 pointer-events-none" : "scale-100"
        }`}
        size="icon"
        aria-label="AIチャットを開く"
      >
        <MessageCircle className="size-6" />
      </Button>

      {/* ---- Chat panel ---- */}
      <div
        className={`fixed bottom-0 right-0 z-50 flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-xl border border-gray-200 transition-all duration-300 origin-bottom-right ${
          isOpen
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        } w-full sm:w-[400px] sm:bottom-5 sm:right-5 h-[80dvh] sm:h-[500px]`}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-primary text-primary-foreground rounded-t-2xl sm:rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <MessageCircle className="size-4" />
            AIに相談する
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-primary-foreground hover:bg-white/20"
            onClick={() => setIsOpen(false)}
            aria-label="閉じる"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* ---- Messages ---- */}
        <ScrollArea ref={scrollRef} className="flex-1 overflow-hidden">
          <div className="flex flex-col gap-3 p-4">
            {/* Welcome state */}
            {messages.length === 0 && !isLoading && (
              <div className="text-center text-sm text-muted-foreground py-6">
                お仕事探しのお手伝いをします。
                <br />
                お気軽にご質問ください!
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div key={i}>
                {/* Text bubble */}
                <div
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-gray-100 text-gray-800 rounded-bl-md"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Store cards */}
                {msg.stores && msg.stores.length > 0 && (
                  <div className="flex flex-col gap-2 mt-2 ml-1">
                    {msg.stores.map((store) => (
                      <a
                        key={store.id}
                        href={`/stores/${store.id}`}
                        className="block border border-gray-200 rounded-xl p-3 hover:border-primary/50 hover:shadow-sm transition-all bg-white"
                      >
                        <div className="font-medium text-sm text-gray-900 flex items-center gap-1.5">
                          <Star className="size-3.5 text-yellow-500 fill-yellow-500 shrink-0" />
                          {store.name}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {store.area && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="size-3 shrink-0" />
                              {store.area}
                            </span>
                          )}
                          {(store.hourly_min != null || store.hourly_max != null) && (
                            <span className="font-medium text-primary">
                              {formatWage(store.hourly_min, store.hourly_max)}
                            </span>
                          )}
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                  <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="size-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {/* Suggest buttons */}
            {showSuggestions && (
              <div className="flex flex-wrap gap-2 mt-1">
                {suggestButtons.map((label) => (
                  <Button
                    key={label}
                    variant="outline"
                    size="sm"
                    className="rounded-full text-xs h-8 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => handleSend(label)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* ---- Input area ---- */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="メッセージを入力..."
              disabled={isLoading}
              className="flex-1 rounded-full text-sm h-10"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 rounded-full shrink-0"
              disabled={!input.trim() || isLoading}
              aria-label="送信"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
