import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Send,
  X,
  UserCheck,
  UserX,
} from "lucide-react";
import { api } from "~/lib/api";
import type { LineFriend, LineMessage, Paginated } from "~/lib/types";

export function LineMessagesPage() {
  const navigate = useNavigate();
  const { lineUserId } = useParams<{ lineUserId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friend, setFriend] = useState<LineFriend | null>(null);
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!lineUserId) return;
      try {
        if (!append) setLoading(true);
        setError(null);

        const data = await api.get<{
          friend: LineFriend;
          messages: Paginated<LineMessage>;
        }>(`/admin/line/friends/${lineUserId}/messages?page=${pageNum}&per_page=50`);

        setFriend(data.friend);

        // Messages come in desc order from API, reverse for chat display
        const newMessages = [...data.messages.data].reverse();

        if (append) {
          setMessages((prev) => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(data.messages.current_page < data.messages.last_page);
        setPage(data.messages.current_page);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "メッセージの取得に失敗しました";
        setError(message);
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
    // Scroll to bottom on initial load
    if (!loading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  const handleSend = async () => {
    if (!messageText.trim() || !lineUserId || sending) return;

    try {
      setSending(true);
      setError(null);

      await api.post("/admin/line/push", {
        line_user_id: lineUserId,
        message: messageText.trim(),
      });

      // Add message to local state immediately
      const newMessage: LineMessage = {
        id: Date.now(),
        line_user_id: lineUserId,
        user_id: null,
        direction: "outbound",
        message_type: "text",
        content: messageText.trim(),
        line_message_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "送信に失敗しました";
      setError(message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: LineMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("ja-JP");
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({
        date: formatDate(msg.created_at),
        messages: [msg],
      });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between mb-3">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate("/admin/line")}
          className="p-2 rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {friend?.picture_url ? (
            <img
              src={friend.picture_url}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              {(friend?.display_name || "?")[0]}
            </div>
          )}
          <div>
            <h2
              className="text-[15px]"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
              }}
            >
              {friend?.display_name || "名前なし"}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-mono">
                {friend?.line_user_id?.slice(0, 16)}...
              </span>
              {friend?.is_following ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <UserCheck className="w-3 h-3" />
                  フォロー中
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-red-600">
                  <UserX className="w-3 h-3" />
                  ブロック
                </span>
              )}
              {friend?.user && (
                <span className="text-indigo-600">
                  連携: {friend.user.line_display_name || friend.user.nickname || `ID: ${friend.user.id}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Load more */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={() => fetchMessages(page + 1, true)}
                className="text-[12px] text-indigo-600 hover:text-indigo-700 transition"
              >
                過去のメッセージを読み込む
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-[13px]">
              メッセージはまだありません
            </div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              {/* Date separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground px-2">
                  {group.date}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Messages for this date */}
              <div className="space-y-3">
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.direction === "outbound"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[70%] ${
                        msg.direction === "outbound"
                          ? "order-2"
                          : "order-1"
                      }`}
                    >
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-[13px] whitespace-pre-wrap ${
                          msg.direction === "outbound"
                            ? "bg-[#06C755] text-white rounded-br-sm"
                            : "bg-muted rounded-bl-sm"
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p
                        className={`text-[10px] text-muted-foreground mt-1 ${
                          msg.direction === "outbound"
                            ? "text-right"
                            : "text-left"
                        }`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {friend?.is_following && (
          <div className="border-t border-border p-3 flex items-end gap-2">
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="メッセージを入力..."
              rows={1}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#06C755]/20 focus:border-[#06C755] resize-none"
              style={{ minHeight: "40px", maxHeight: "120px" }}
            />
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || sending}
              className="p-2.5 bg-[#06C755] text-white rounded-lg hover:bg-[#05b04d] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        {friend && !friend.is_following && (
          <div className="border-t border-border p-3 text-center text-[13px] text-muted-foreground">
            このユーザーはブロックしているためメッセージを送信できません
          </div>
        )}
      </div>
    </div>
  );
}
