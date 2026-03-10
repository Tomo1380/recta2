import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  Star,
  MessageSquare,
  User,
  Loader2,
  MessageCircle,
  Send,
  ExternalLink,
} from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "~/lib/api";
import type { User as UserType, UserShowResponse, LineMessage } from "~/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: string): "\u6709\u52B9" | "\u505C\u6B62" {
  return status === "active" ? "\u6709\u52B9" : "\u505C\u6B62";
}

function reviewStatusLabel(status: string): string {
  if (status === "published") return "\u516C\u958B";
  if (status === "unpublished") return "\u975E\u516C\u958B";
  return "\u524A\u9664";
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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<UserShowResponse>(`/admin/users/${id}`)
      .then((res) => {
        if (!cancelled) {
          setUser(res.user);
          setLineMessages(res.line_messages);
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
      // Add the message to the local list
      const newMsg: LineMessage = {
        id: Date.now(),
        line_user_id: user.line_user_id || "",
        user_id: user.id,
        direction: "outbound",
        message_type: "text",
        content: messageText.trim(),
        line_message_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLineMessages((prev) => [newMsg, ...prev]);
      setMessageText("");
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: unknown) {
      const errorObj = err as { error?: string };
      setSendError(errorObj?.error || "\u30E1\u30C3\u30BB\u30FC\u30B8\u306E\u9001\u4FE1\u306B\u5931\u6557\u3057\u307E\u3057\u305F");
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
            \u30E6\u30FC\u30B6\u30FC\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F
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
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/admin/users")} className="p-1.5 rounded-lg hover:bg-muted transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            \u30E6\u30FC\u30B6\u30FC\u8A73\u7D30
          </h2>
          <p className="text-[13px] text-muted-foreground">ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
          {user.line_picture_url ? (
            <img
              src={user.line_picture_url}
              alt={user.line_display_name || ""}
              className="w-16 h-16 rounded-xl object-cover mb-4"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl mb-4">
              {user.line_display_name?.charAt(0) ?? "?"}
            </div>
          )}
          <h3 className="text-foreground">{user.line_display_name || "Unknown"}</h3>
          <p className="text-[12px] text-muted-foreground mt-1 font-mono">{user.line_user_id || "\u2014"}</p>
          <div className="flex items-center gap-1.5 mt-3">
            <div className={`w-1.5 h-1.5 rounded-full ${user.status === "active" ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-[13px] text-muted-foreground">{displayStatus}</span>
          </div>
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className={`mt-4 w-full py-2 rounded-lg text-[13px] transition border ${
              user.status === "active"
                ? "border-red-200 text-red-600 hover:bg-red-50"
                : "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
            } disabled:opacity-50`}
          >
            {toggling ? "\u51E6\u7406\u4E2D..." : user.status === "active" ? "\u30A2\u30AB\u30A6\u30F3\u30C8\u505C\u6B62" : "\u6709\u52B9\u5316"}
          </button>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Profile Info */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              \u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u60C5\u5831
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0", value: user.nickname || "\u2014" },
                { label: "\u5E74\u9F62", value: user.age ? `${user.age}\u6B73` : "\u2014" },
                { label: "\u5E0C\u671B\u30A8\u30EA\u30A2", value: user.preferred_area || "\u2014" },
                { label: "\u5E0C\u671B\u696D\u7A2E", value: user.preferred_category || "\u2014" },
                { label: "\u7D4C\u9A13", value: user.experience || "\u2014" },
                { label: "\u767B\u9332\u65E5", value: formatDate(user.created_at) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="mt-1 text-[13px] text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* LINE Section */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm mb-4 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-muted-foreground" />
              LINE\u9023\u643A
            </h3>

            {/* LINE Friend Status */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  \u53CB\u3060\u3061\u30B9\u30C6\u30FC\u30BF\u30B9
                </p>
                <p className="mt-1 text-[13px]">
                  {isLineFriend ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      \u53CB\u3060\u3061
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-stone-500">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      \u672A\u53CB\u3060\u3061
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  \u30D5\u30A9\u30ED\u30FC\u65E5
                </p>
                <p className="mt-1 text-[13px] text-foreground">
                  {lineFriend?.followed_at ? formatDate(lineFriend.followed_at) : "\u2014"}
                </p>
              </div>
              {lineFriend && !lineFriend.is_following && lineFriend.unfollowed_at && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                    \u30D6\u30ED\u30C3\u30AF\u65E5
                  </p>
                  <p className="mt-1 text-[13px] text-foreground">{formatDate(lineFriend.unfollowed_at)}</p>
                </div>
              )}
            </div>

            {/* LINE Message Send Form */}
            {isLineFriend && (
              <div className="mb-4">
                <p className="text-[12px] text-muted-foreground mb-2">LINE\u30E1\u30C3\u30BB\u30FC\u30B8\u9001\u4FE1</p>
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
                    placeholder="\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u5165\u529B..."
                    className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    disabled={sending}
                  />
                  <button
                    onClick={sendLineMessage}
                    disabled={sending || !messageText.trim()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-[13px] hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    \u9001\u4FE1
                  </button>
                </div>
                {sendError && <p className="text-[12px] text-red-500 mt-1.5">{sendError}</p>}
                {sendSuccess && (
                  <p className="text-[12px] text-emerald-600 mt-1.5">
                    \u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u9001\u4FE1\u3057\u307E\u3057\u305F
                  </p>
                )}
              </div>
            )}

            {/* Recent LINE Messages */}
            {lineMessages.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] text-muted-foreground">
                    \u6700\u8FD1\u306E\u30E1\u30C3\u30BB\u30FC\u30B8
                  </p>
                  {user.line_user_id && (
                    <button
                      onClick={() => navigate(`/admin/line/${user.line_user_id}/messages`)}
                      className="text-[12px] text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition"
                    >
                      \u5168\u3066\u898B\u308B
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {lineMessages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      className={`rounded-lg p-2.5 text-[13px] ${
                        msg.direction === "outbound"
                          ? "bg-indigo-50 border border-indigo-100 ml-8"
                          : "bg-muted/40 border border-border mr-8"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase">
                          {msg.direction === "outbound" ? "\u904B\u55B6" : "\u30E6\u30FC\u30B6\u30FC"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDateTime(msg.created_at)}</span>
                      </div>
                      <p className="text-foreground">{msg.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                \u30E1\u30C3\u30BB\u30FC\u30B8\u5C65\u6B74\u306F\u3042\u308A\u307E\u305B\u3093
              </p>
            )}
          </div>

          {/* Reviews */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              \u53E3\u30B3\u30DF\u6295\u7A3F\u5C65\u6B74
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u5E97\u8217\u540D
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u8A55\u4FA1
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u6295\u7A3F\u65E5
                    </th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u30B9\u30C6\u30FC\u30BF\u30B9
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                        <td className="py-2.5 px-3">{r.store?.name || "\u2014"}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, j) => (
                              <Star
                                key={j}
                                className={`w-3 h-3 ${
                                  j < r.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{formatDate(r.created_at)}</td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <div
                              className={`w-1.5 h-1.5 rounded-full ${
                                r.status === "published" ? "bg-emerald-500" : "bg-stone-300"
                              }`}
                            />
                            <span className="text-[12px] text-muted-foreground">{reviewStatusLabel(r.status)}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-muted-foreground text-[12px]">
                        \u53E3\u30B3\u30DF\u306F\u307E\u3060\u3042\u308A\u307E\u305B\u3093
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
