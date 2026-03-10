import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Star, MessageSquare, User, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { api } from "~/lib/api";
import type { User as UserType } from "~/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function statusLabel(status: string): "有効" | "停止" {
  return status === "active" ? "有効" : "停止";
}

function reviewStatusLabel(status: string): string {
  if (status === "published") return "公開";
  if (status === "unpublished") return "非公開";
  return "削除";
}

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<UserType>(`/admin/users/${id}`)
      .then((res) => {
        if (!cancelled) setUser(res);
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
          <p className="text-muted-foreground">ユーザーが見つかりませんでした</p>
        </div>
      </div>
    );
  }

  const displayStatus = statusLabel(user.status);
  const lineIcon = user.line_display_name?.charAt(0) ?? "?";
  const lineName = user.line_display_name || "Unknown";
  const reviews = user.reviews ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/admin/users")}
          className="p-1.5 rounded-lg hover:bg-muted transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>ユーザー詳細</h2>
          <p className="text-[13px] text-muted-foreground">ID: {id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column - Profile Card */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-2xl mb-4">
            {lineIcon}
          </div>
          <h3 className="text-foreground">{lineName}</h3>
          <p className="text-[12px] text-muted-foreground mt-1 font-mono">{user.line_user_id || "—"}</p>
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
            {toggling ? "処理中..." : user.status === "active" ? "アカウント停止" : "有効化"}
          </button>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              プロフィール情報
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "ニックネーム", value: user.nickname || "—" },
                { label: "年齢", value: user.age ? `${user.age}歳` : "—" },
                { label: "希望エリア", value: user.preferred_area || "—" },
                { label: "希望業種", value: user.preferred_category || "—" },
                { label: "経験", value: user.experience || "—" },
                { label: "登録日", value: formatDate(user.created_at) },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/40 p-3">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="mt-1 text-[13px] text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm mb-4 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              口コミ投稿履歴
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">店舗名</th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">評価</th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">投稿日</th>
                    <th className="text-left py-2 px-3 text-muted-foreground text-[11px] uppercase tracking-wider">ステータス</th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((r) => (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                      <td className="py-2.5 px-3">{r.store?.name || "—"}</td>
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
                          <div className={`w-1.5 h-1.5 rounded-full ${r.status === "published" ? "bg-emerald-500" : "bg-stone-300"}`} />
                          <span className="text-[12px] text-muted-foreground">{reviewStatusLabel(r.status)}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
