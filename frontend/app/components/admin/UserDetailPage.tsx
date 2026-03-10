import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  Loader2,
  MessageCircle,
  Send,
  ExternalLink,
  StickyNote,
  Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { api } from "~/lib/api";
import type { User as UserType, UserShowResponse, LineMessage } from "~/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): "有効" | "停止" {
  return status === "active" ? "有効" : "停止";
}

function reviewStatusLabel(status: string): string {
  if (status === "published") return "公開";
  if (status === "unpublished") return "非公開";
  return "削除";
}

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—";
  const now = new Date();
  const d = new Date(dateStr);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "たった今";
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}時間前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}日前`;
  const diffMonth = Math.floor(diffDay / 30);
  return `${diffMonth}ヶ月前`;
}

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [lineMessages, setLineMessages] = useState<LineMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<UserShowResponse>(`/admin/users/${id}`)
      .then((res) => {
        if (!cancelled) {
          setUser(res.user);
          setLineMessages(res.line_messages);
          setNotes(res.user.admin_notes || "");
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const toggleStatus = async () => {
    if (!user || toggling) return;
    const newStatus = user.status === "active" ? "suspended" : "active";
    setToggling(true);
    try {
      await api.put(`/admin/users/${user.id}/status`, { status: newStatus });
      setUser((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch {
      // ignore
    } finally {
      setToggling(false);
    }
  };

  const saveNotes = async () => {
    if (!user || savingNotes) return;
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await api.put(`/admin/users/${user.id}/notes`, { admin_notes: notes || null });
      setUser((prev) => (prev ? { ...prev, admin_notes: notes || null } : prev));
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSavingNotes(false);
    }
  };

  const sendLineMessage = async () => {
    if (!user || !messageText.trim() || sending) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(false);
    try {
      await api.post(`/admin/users/${user.id}/line-message`, {
        message: messageText.trim(),
      });
      setSendSuccess(true);
      const newMsg: LineMessage = {
        id: Date.now(),
        line_user_id: user.line_user_id || "",
        user_id: user.id,
        direction: "outbound",
        message_type: "text",
        content: messageText.trim(),
        line_message_id: null,
        read_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLineMessages((prev) => [newMsg, ...prev]);
      setMessageText("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: unknown) {
      const errorObj = err as { error?: string };
      setSendError(errorObj?.error || "メッセージの送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/admin/users")} className="p-1.5 rounded-lg hover:bg-muted transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="text-muted-foreground">
            ユーザーが見つかりませんでした
          </p>
        </div>
      </div>
    );
  }

  const displayStatus = statusLabel(user.status);
  const reviews = user.reviews ?? [];
  const lineFriend = user.line_friend;
  const isLineFriend = user.is_line_friend;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/users")} className="p-1.5 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            ユーザー詳細
          </h2>
          <p className="text-[13px] text-muted-foreground">ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Profile + Notes */}
        <div className="space-y-4">
          {/* Profile Card */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              {user.line_picture_url ? (
                <img
                  src={user.line_picture_url}
                  alt={user.line_display_name || ""}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl flex-shrink-0">
                  {user.line_display_name?.charAt(0) ?? "?"}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-foreground truncate">{user.line_display_name || "Unknown"}</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
                  <span className="text-[12px] text-muted-foreground">{displayStatus}</span>
                  {isLineFriend ? (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                      <MessageCircle className="w-2.5 h-2.5" />
                      友だち
                    </span>
                  ) : (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[11px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-full">
                      未友だち
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="space-y-2 text-[13px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">LINE ID</span>
                <span className="text-foreground font-mono text-[11px] truncate ml-2 max-w-[160px]">{user.line_user_id || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">登録日</span>
                <span className="text-foreground">{formatDate(user.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">最終ログイン</span>
                <span className="text-foreground">{user.last_login_at ? timeAgo(user.last_login_at) : "未ログイン"}</span>
              </div>
              {lineFriend?.followed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">フォロー日</span>
                  <span className="text-foreground">{formatDate(lineFriend.followed_at)}</span>
                </div>
              )}
              {lineFriend && !lineFriend.is_following && lineFriend.unfollowed_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ブロック日</span>
                  <span className="text-red-500">{formatDate(lineFriend.unfollowed_at)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">口コミ数</span>
                <span className="text-foreground">{user.reviews_count ?? 0} 件</span>
              </div>
            </div>

            {/* Status Toggle */}
            <button
              onClick={toggleStatus}
              disabled={toggling}
              className={`mt-4 w-full py-2 rounded-lg text-[13px] transition border ${
                user.status === "active"
                  ? "border-red-200 text-red-600 hover:bg-red-50"
                  : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
              } disabled:opacity-50`}
            >
              {toggling ? "処理中..." : user.status === "active" ? "アカウント停止" : "有効化"}
            </button>
          </div>

          {/* Admin Notes */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground" />
                管理メモ
              </h3>
              <button
                onClick={saveNotes}
                disabled={savingNotes || notes === (user.admin_notes || "")}
                className="px-3 py-1 rounded-md text-[12px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-30 flex items-center gap-1"
              >
                {savingNotes ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : notesSaved ? (
                  <Check className="w-3 h-3" />
                ) : null}
                {notesSaved ? "保存済み" : "保存"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="LINEでのやり取りから得た情報をメモ&#10;（年齢、希望エリア、経験など）"
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all resize-y"
            />
          </div>

          {/* Reviews (collapsed on left) */}
          {reviews.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                口コミ ({reviews.length})
              </h3>
              <div className="space-y-2">
                {reviews.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-[13px] py-1.5 border-b border-border last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-foreground">{r.store?.name || "—"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star
                              key={j}
                              className={`w-2.5 h-2.5 ${
                                j < r.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground">{formatDate(r.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          r.status === "published" ? "bg-emerald-500" : "bg-stone-300"
                        }`}
                      />
                      <span className="text-[11px] text-muted-foreground">{reviewStatusLabel(r.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - LINE Messages (main content) */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-xl flex flex-col" style={{ minHeight: "500px" }}>
            {/* Messages Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <h3 className="text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                LINEメッセージ
              </h3>
              {lineMessages.length > 5 && (
                <button
                  onClick={() => navigate(`/admin/users/${user.id}/messages`)}
                  className="text-[12px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
                >
                  全て見る
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ maxHeight: "480px" }}>
              {lineMessages.length > 0 ? (
                <>
                  {[...lineMessages].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-[13px] ${
                          msg.direction === "outbound"
                            ? "bg-indigo-600 text-white rounded-br-md"
                            : "bg-muted/60 border border-border text-foreground rounded-bl-md"
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${
                          msg.direction === "outbound" ? "text-indigo-200" : "text-muted-foreground"
                        }`}>
                          {formatDateTime(msg.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-[13px]">メッセージ履歴はありません</p>
                  {!isLineFriend && (
                    <p className="text-[12px] mt-1">このユーザーはLINE友だちではありません</p>
                  )}
                </div>
              )}
            </div>

            {/* Message Input */}
            {isLineFriend && (
              <div className="px-5 py-3 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setSendError(null);
                      setSendSuccess(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendLineMessage();
                      }
                    }}
                    placeholder="メッセージを入力..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    disabled={sending}
                  />
                  <button
                    onClick={sendLineMessage}
                    disabled={sending || !messageText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-[13px] hover:bg-indigo-700 transition disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {sendError && <p className="text-[12px] text-red-500 mt-1.5">{sendError}</p>}
                {sendSuccess && (
                  <p className="text-[12px] text-emerald-600 mt-1.5">
                    メッセージを送信しました
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
