import { useState, useEffect, useCallback } from "react";
import { Plus, X, Shield, Loader2 } from "lucide-react";
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

// 付与できる権限（バックエンド AdminUser::PERMISSIONS と対応）。
const PERMISSION_OPTIONS: { key: string; label: string }[] = [
  { key: "analytics", label: "ダッシュボード・解析" },
  { key: "chat", label: "ユーザー対応・チャット" },
  { key: "stores", label: "店舗管理・エリア/カテゴリ" },
  { key: "reviews", label: "口コミ管理" },
  { key: "ai_chat", label: "AIチャット設定" },
  { key: "articles", label: "コラム管理" },
  { key: "content", label: "コンテンツ・上京者の声" },
];

// FB で挙がった「担当」をワンタップで設定できるプリセット。
const PERMISSION_PRESETS: { label: string; keys: string[] }[] = [
  { label: "チャット担当", keys: ["chat"] },
  { label: "店舗担当", keys: ["stores"] },
  { label: "コラム担当", keys: ["articles"] },
  { label: "全機能", keys: PERMISSION_OPTIONS.map((p) => p.key) },
];

const permissionLabel = (key: string) =>
  PERMISSION_OPTIONS.find((p) => p.key === key)?.label ?? key;

/** 権限の付与 UI（プリセット + 個別チェック）。一般管理者の作成/編集で使う。 */
function PermissionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (key: string) =>
    onChange(value.includes(key) ? value.filter((k) => k !== key) : [...value, key]);

  return (
    <div>
      <label className="block text-[13px] mb-1.5">権限（担当範囲）</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {PERMISSION_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.keys)}
            className="px-2 py-1 rounded-md text-[11px] border border-border hover:bg-muted transition"
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {PERMISSION_OPTIONS.map((opt) => (
          <label key={opt.key} className="flex items-center gap-2 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={value.includes(opt.key)}
              onChange={() => toggle(opt.key)}
              className="accent-indigo-600"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePassword, setInvitePassword] = useState("password123");
  const [inviteRole, setInviteRole] = useState("一般管理者");
  const [invitePermissions, setInvitePermissions] = useState<string[]>(["chat"]);
  const [submitting, setSubmitting] = useState(false);
  // 編集モーダル
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<AdminUser["role"]>("admin");
  const [editStatus, setEditStatus] = useState<AdminUser["status"]>("active");
  const [editPassword, setEditPassword] = useState("");
  const [editPermissions, setEditPermissions] = useState<string[]>([]);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const openEdit = (admin: AdminUser) => {
    setEditTarget(admin);
    setEditName(admin.name);
    setEditEmail(admin.email);
    setEditRole(admin.role);
    setEditStatus(admin.status);
    setEditPassword("");
    setEditPermissions(admin.permissions ?? []);
  };

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
      const role = inviteRole === "スーパー管理者" ? "super_admin" : "admin";
      await api.post("/admin/admin-users", {
        name: inviteName,
        email: inviteEmail,
        password: invitePassword,
        role,
        // super_admin は全権限なので permissions は送らない
        ...(role === "admin" ? { permissions: invitePermissions } : {}),
      });
      setShowModal(false);
      setInviteName("");
      setInviteEmail("");
      setInvitePassword("password123");
      setInviteRole("一般管理者");
      setInvitePermissions(["chat"]);
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

  const handleSaveEdit = async () => {
    if (!editTarget || !editName || !editEmail) return;
    try {
      setEditSubmitting(true);
      const payload: Record<string, unknown> = {
        name: editName,
        email: editEmail,
        role: editRole,
        status: editStatus,
      };
      // パスワードは入力があったときだけ送る (空なら現状維持)
      if (editPassword) payload.password = editPassword;
      // super_admin は全権限なので permissions は送らない
      if (editRole === "admin") payload.permissions = editPermissions;
      await api.put(`/admin/admin-users/${editTarget.id}`, payload);
      setEditTarget(null);
      setEditPassword("");
      await fetchAdmins();
    } catch (e) {
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setEditSubmitting(false);
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
                    {admin.role === "super_admin" ? (
                      <div className="mt-1 text-[10px] text-muted-foreground">全機能</div>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {(admin.permissions ?? []).length === 0 ? (
                          <span className="text-[10px] text-amber-600">権限なし</span>
                        ) : (
                          (admin.permissions ?? []).map((p) => (
                            <span
                              key={p}
                              className="px-1.5 py-0.5 rounded bg-muted text-[10px] text-muted-foreground"
                            >
                              {permissionLabel(p)}
                            </span>
                          ))
                        )}
                      </div>
                    )}
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
                      <button
                        onClick={() => openEdit(admin)}
                        className="text-[12px] text-muted-foreground hover:text-foreground transition px-2 py-1 rounded-md hover:bg-muted"
                      >
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
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-3 text-[12px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  {admin.role === "super_admin" && <Shield className="w-3 h-3" />}
                  {roleLabel(admin.role)}
                </span>
                <span>·</span>
                <span>{formatDate(admin.last_login_at)}</span>
              </div>
              <button
                onClick={() => openEdit(admin)}
                className="text-[12px] text-indigo-600 hover:text-indigo-700 transition px-2 py-1 rounded-md hover:bg-muted"
              >
                編集
              </button>
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
                  placeholder="email@recta2.jp"
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
                <p className="text-[11px] text-muted-foreground mt-1">
                  スーパー管理者は全機能＋管理ユーザー管理が可能です。
                </p>
              </div>
              {inviteRole === "一般管理者" && (
                <PermissionPicker value={invitePermissions} onChange={setInvitePermissions} />
              )}
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

      {/* Edit Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-foreground">管理ユーザーを編集</h3>
                <p className="text-[13px] text-muted-foreground mt-0.5">{editTarget.name} の情報を変更</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1 rounded-md hover:bg-muted transition">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] mb-1.5">名前</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="氏名"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] mb-1.5">メールアドレス</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="email@recta2.jp"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[13px] mb-1.5">ロール</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as AdminUser["role"])}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="super_admin">スーパー管理者</option>
                    <option value="admin">一般管理者</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[13px] mb-1.5">ステータス</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as AdminUser["status"])}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    <option value="active">有効</option>
                    <option value="inactive">無効</option>
                  </select>
                </div>
              </div>
              {editRole === "admin" ? (
                <PermissionPicker value={editPermissions} onChange={setEditPermissions} />
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  スーパー管理者は全機能＋管理ユーザー管理が可能です。
                </p>
              )}
              <div>
                <label className="block text-[13px] mb-1.5">
                  新しいパスワード
                  <span className="text-muted-foreground ml-1">（変更する場合のみ入力 / 8文字以上）</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="変更しない場合は空欄"
                  autoComplete="new-password"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setEditTarget(null)}
                className="px-4 py-2 rounded-lg text-[13px] border border-border hover:bg-muted transition"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={editSubmitting || !editName || !editEmail || (!!editPassword && editPassword.length < 8)}
                className="px-4 py-2 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {editSubmitting ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
