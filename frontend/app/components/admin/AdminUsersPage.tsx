import { useState, useEffect, useCallback } from "react";
import { Plus, X, RotateCcw, Shield, Loader2 } from "lucide-react";
import { api } from "~/lib/api";
import type { AdminUser, Paginated } from "~/lib/types";

const roleLabel = (role: AdminUser["role"]) =>
  role === "super_admin" ? "スーパー管理者" : "一般管理者";

const statusLabel = (status: AdminUser["status"]) =>
  status === "active" ? "有効" : "無効";

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("password123");
  const [inviteRole, setInviteRole] = useState("一般管理者");
  const [submitting, setSubmitting] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get<Paginated<AdminUser>>("/admin/admin-users");
      setAdmins(res.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleInvite = async () => {
    if (!inviteName || !inviteEmail || !invitePassword) return;
    try {
      setSubmitting(true);
      await api.post("/admin/admin-users", {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role: inviteRole === "スーパー管理者" ? "super_admin" : "admin",
      });
      setShowModal(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("password123");
      setInviteRole("一般管理者");
      await fetchAdmins();
    } catch (e) {
      alert(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: AdminUser) => {
    try {
      const newStatus = admin.status === "active" ? "inactive" : "active";
      await api.put(`/admin/admin-users/${admin.id}`, { status: newStatus });
      await fetchAdmins();
    } catch (e) {
      alert(e instanceof Error ? e.message : "ステータスの変更に失敗しました");
    }
  };

  const handleResetPassword = async () => {
    if (!showPasswordModal || !newPassword) return;
    try {
      await api.put(`/admin/admin-users/${showPasswordModal.id}/reset-password`, {
        password: newPassword,
      });
      setShowPasswordModal(null);
      setNewPassword("");
      alert("パスワードをリセットしました");
    } catch (e) {
      alert(e instanceof Error ? e.message : "パスワードリセットに失敗しました");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-[13px] text-red-500">{error}</p>
        <button
          onClick={fetchAdmins}
          className="text-[13px] text-indigo-600 hover:underline"
        >
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>管理ユーザー</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">管理画面へのアクセス権限を管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          招待する
        </button>
      </div>

      {/* Desktop Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">ユーザー</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">メール</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">ロール</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">最終ログイン</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">ステータス</th>
                <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin) => (
                <tr key={admin.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[11px]">
                        {admin.name[0]}
                      </div>
                      <span>{admin.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{admin.email}</td>
                  <td className="py-2.5 px-4">
                    <span className="flex items-center gap-1 text-[12px] text-muted-foreground">
                      {admin.role === "super_admin" && <Shield className="w-3 h-3" />}
                      {roleLabel(admin.role)}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-muted-foreground">{formatDate(admin.last_login_at)}</td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${admin.status === "active" ? "bg-emerald-500" : "bg-stone-400"}`} />
                      <span className="text-[12px] text-muted-foreground">{statusLabel(admin.status)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-1">
                      <button className="text-[12px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md hover:bg-muted">
                        編集
                      </button>
                      <button
                        onClick={() => handleToggleStatus(admin)}
                        className={`text-[12px] px-2 py-1 rounded-md transition ${
                          admin.status === "active"
                            ? "text-red-500 hover:bg-red-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        {admin.status === "active" ? "無効化" : "有効化"}
                      </button>
                      <button
                        onClick={() => { setShowPasswordModal(admin); setNewPassword(""); }}
                        className="p-1 rounded-md hover:bg-muted transition"
                        title="パスワードリセット"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-2">
        {admins.map((admin) => (
          <div key={admin.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[12px]">
                  {admin.name[0]}
                </div>
                <div>
                  <p className="text-[13px]">{admin.name}</p>
                  <p className="text-[11px] text-muted-foreground">{admin.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${admin.status === "active" ? "bg-emerald-500" : "bg-stone-400"}`} />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3 text-[12px] text-muted-foreground">
              <span className="flex items-center gap-1">
                {admin.role === "super_admin" && <Shield className="w-3 h-3" />}
                {roleLabel(admin.role)}
              </span>
              <span>·</span>
              <span>{formatDate(admin.last_login_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-foreground">管理ユーザーを招待</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">新しい管理者を招待します</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-md hover:bg-muted transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] mb-1.5">名前</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="氏名"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@recta.jp"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5">パスワード</label>
                <input
                  type="password"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="初期パスワード"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5">ロール</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option>スーパー管理者</option>
                  <option>一般管理者</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-[13px] border border-border hover:bg-muted transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleInvite}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin inline mr-1" />
                ) : null}
                招待メールを送信
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Reset Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPasswordModal(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-foreground">パスワードリセット</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{showPasswordModal.name} のパスワードを変更</p>
              </div>
              <button onClick={() => setShowPasswordModal(null)} className="p-1 rounded-md hover:bg-muted transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[13px] mb-1.5">新しいパスワード</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="新しいパスワードを入力"
                className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPasswordModal(null)}
                className="px-4 py-2 rounded-lg text-[13px] border border-border hover:bg-muted transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleResetPassword}
                disabled={!newPassword}
                className="px-4 py-2 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                リセット
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
