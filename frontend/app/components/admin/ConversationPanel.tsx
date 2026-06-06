import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Send } from "lucide-react";
import { api } from "~/lib/api";
import type { LineMessage, Paginated } from "~/lib/types";

/**
 * LINEトークのやりとり部分 (メッセージ一覧 + 送信)。人物詳細の右カラムに埋め込む。
 * line_user_id 基準なので、アプリ User 未連携の友だちでも会話できる。
 */
export function ConversationPanel({
  lineUserId,
  isFollowing,
}: {
  lineUserId: string;
  isFollowing: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      try {
        if (!append) setLoading(true);
        const data = await api.get<{ messages: Paginated<LineMessage> }>(
          `/admin/line-friends/${encodeURIComponent(lineUserId)}/messages?page=${pageNum}&per_page=50`
        );
        const next = [...data.messages.data].reverse();
        setMessages((prev) => (append ? [...next, ...prev] : next));
        setHasMore(data.messages.current_page < data.messages.last_page);
        setPage(data.messages.current_page);
      } catch (err) {
        setError(err instanceof Error ? err.message : "メッセージの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    },
    [lineUserId]
  );

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    if (!loading) endRef.current?.scrollIntoView({ behavior: "auto" });
  }, [loading]);

  const handleSend = async () => {
    if (!messageText.trim() || sending) return;
    try {
      setSending(true);
      setError(null);
      await api.post(`/admin/line-friends/push`, { line_user_id: lineUserId, message: messageText.trim() });
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          line_user_id: lineUserId,
          user_id: null,
          direction: "outbound",
          message_type: "text",
          content: messageText.trim(),
          line_message_id: null,
          read_at: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as LineMessage,
      ]);
      setMessageText("");
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (s: string) =>
    new Date(s).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  const groups: { date: string; items: LineMessage[] }[] = [];
  let cur = "";
  for (const m of messages) {
    const d = new Date(m.created_at).toLocaleDateString("ja-JP");
    if (d !== cur) {
      cur = d;
      groups.push({ date: formatDate(m.created_at), items: [m] });
    } else {
      groups[groups.length - 1].items.push(m);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[420px]">
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-3 py-2 text-[12px] text-red-700">{error}</div>
      )}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {hasMore && (
              <div className="text-center">
                <button onClick={() => fetchMessages(page + 1, true)} className="text-[12px] text-indigo-600 hover:text-indigo-700">
                  過去のメッセージを読み込む
                </button>
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-[13px]">メッセージはまだありません</div>
            )}
            {groups.map((g) => (
              <div key={g.date}>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-[11px] text-muted-foreground px-2">{g.date}</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-2">
                  {g.items.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[78%] ${m.direction === "outbound" ? "order-2" : "order-1"}`}>
                        <div className={`px-3 py-1.5 rounded-2xl text-[12.5px] whitespace-pre-wrap ${m.direction === "outbound" ? "bg-[#06C755] text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                          {m.content}
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-0.5 ${m.direction === "outbound" ? "text-right" : "text-left"}`}>
                          {formatTime(m.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </>
        )}
      </div>
      {isFollowing ? (
        <div className="border-t border-border p-2.5 flex items-end gap-2">
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] resize-none"
            style={{ minHeight: "40px", maxHeight: "120px" }}
          />
          <button
            onClick={handleSend}
            disabled={!messageText.trim() || sending}
            className="p-2.5 bg-[#06C755] text-white rounded-lg hover:bg-[#05b04d] transition disabled:opacity-40 shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="border-t border-border p-3 text-center text-[12px] text-muted-foreground">
          ブロック中のため送信できません
        </div>
      )}
    </div>
  );
}
