import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import {
  ArrowLeft,
  Loader2,
  Send,
  X,
  UserCheck,
  UserX,
  Pencil,
  Check,
} from "lucide-react";
import { api } from "~/lib/api";
import type { LineFriend, LineMessage, Paginated } from "~/lib/types";

/**
 * LINE トーク画面。line_user_id 基準なので、アプリ User に未連携の友だち
 * (LINE ログインせずメッセージしただけの人) でもトーク・送信・名前編集ができる
 * (2026-06-06 FB: 「全て表示でトークが迷子」「Unknown」「登録名を変更したい」の根治)。
 */
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

  // 表示名 (admin_name) の編集
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fetchMessages = useCallback(
    async (pageNum = 1, append = false) => {
      if (!lineUserId) return;
      try {
        if (!append) setLoading(true);
        setError(null);

        const data = await api.get<{
          friend: LineFriend | null;
          messages: Paginated<LineMessage>;
        }>(`/admin/line-friends/${encodeURIComponent(lineUserId)}/messages?page=${pageNum}&per_page=50`);

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
    if (!loading && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [loading]);

  const handleSend = async () => {
    if (!messageText.trim() || !lineUserId || sending) return;
    try {
      setSending(true);
      setError(null);

      await api.post(`/admin/line-friends/push`, {
        line_user_id: lineUserId,
        message: messageText.trim(),
      });

      const newMessage: LineMessage = {
        id: Date.now(),
        line_user_id: lineUserId,
        user_id: friend?.user_id ?? null,
        direction: "outbound",
        message_type: "text",
        content: messageText.trim(),
        line_message_id: null,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      setMessageText("");
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  const startEditName = () => {
    setNameDraft(friend?.admin_name ?? "");
    setEditingName(true);
  };

  const saveName = async () => {
    if (!lineUserId || savingName) return;
    try {
      setSavingName(true);
      setError(null);
      const res = await api.put<{ person: { admin_name: string | null; display_name: string | null } }>(
        `/admin/line-friends/${encodeURIComponent(lineUserId)}/name`,
        { admin_name: nameDraft.trim() || null }
      );
      setFriend((prev) =>
        prev ? { ...prev, admin_name: res.person.admin_name, display_name: res.person.display_name } : prev
      );
      setEditingName(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "表示名の保存に失敗しました");
    } finally {
      setSavingName(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" });

  // Group messages by date
  const groupedMessages: { date: string; messages: LineMessage[] }[] = [];
  let currentDate = "";
  for (const msg of messages) {
    const date = new Date(msg.created_at).toLocaleDateString("ja-JP");
    if (date !== currentDate) {
      currentDate = date;
      groupedMessages.push({ date: formatDate(msg.created_at), messages: [msg] });
    } else {
      groupedMessages[groupedMessages.length - 1].messages.push(msg);
    }
  }

  // 表示名: 管理用の別名 (admin_name) 優先 → LINE名 → なし
  const displayName = friend?.admin_name || friend?.display_name || "名前なし";
  // 元の LINE 名 (admin_name と別なら併記して「元はこの名前」と分かるように)
  const lineName = friend?.display_name;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  const canSend = friend?.is_following !== false; // 未取得(null)でも送れるようにする

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between mb-3">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => navigate("/admin/users")} className="p-2 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {friend?.picture_url ? (
            <img src={friend.picture_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
              {displayName[0]}
            </div>
          )}
          <div className="min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  placeholder="管理用の表示名"
                  className="px-2 py-1 rounded-md border border-border bg-white text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button onClick={saveName} disabled={savingName} className="p-1.5 rounded-md bg-indigo-600 text-white disabled:opacity-50">
                  {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => setEditingName(false)} className="p-1.5 rounded-md hover:bg-muted">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <h2 className="text-[15px] truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                  {displayName}
                </h2>
                <button onClick={startEditName} aria-label="表示名を編集" className="p-1 rounded-md hover:bg-muted text-muted-foreground">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
              {/* 元の LINE 名 (別名を付けていても本来の名前が分かるように) */}
              {lineName && friend?.admin_name && (
                <span>LINE名: {lineName}</span>
              )}
              {friend?.is_following ? (
                <span className="inline-flex items-center gap-0.5 text-emerald-600">
                  <UserCheck className="w-3 h-3" />フォロー中
                </span>
              ) : friend ? (
                <span className="inline-flex items-center gap-0.5 text-red-600">
                  <UserX className="w-3 h-3" />ブロック
                </span>
              ) : null}
              {friend?.user ? (
                <span className="text-indigo-600">
                  連携ユーザー: {friend.user.line_display_name || friend.user.nickname || `ID: ${friend.user.id}`}
                </span>
              ) : (
                <span className="text-amber-600">未連携（LINEログインなし）</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {hasMore && (
            <div className="text-center">
              <button onClick={() => fetchMessages(page + 1, true)} className="text-[12px] text-indigo-600 hover:text-indigo-700 transition">
                過去のメッセージを読み込む
              </button>
            </div>
          )}

          {messages.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-[13px]">メッセージはまだありません</div>
          )}

          {groupedMessages.map((group) => (
            <div key={group.date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[11px] text-muted-foreground px-2">{group.date}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                {group.messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] ${msg.direction === "outbound" ? "order-2" : "order-1"}`}>
                      <div className={`px-3.5 py-2 rounded-2xl text-[13px] whitespace-pre-wrap ${msg.direction === "outbound" ? "bg-[#06C755] text-white rounded-br-sm" : "bg-muted rounded-bl-sm"}`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-muted-foreground mt-1 ${msg.direction === "outbound" ? "text-right" : "text-left"}`}>
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
        {canSend ? (
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
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          <div className="border-t border-border p-3 text-center text-[13px] text-muted-foreground">
            このユーザーはブロックしているためメッセージを送信できません
          </div>
        )}
      </div>
    </div>
  );
}
