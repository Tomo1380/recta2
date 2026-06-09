import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquare,
  Bot,
  KeyRound,
  LogOut,
  ChevronRight,
  Menu,
  X,
  LayoutGrid,
  MapPin,
  Loader2,
  FileText,
  Plane,
  BarChart3,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "~/lib/auth";

// permission: 表示に必要な権限キー（AdminUser::PERMISSIONS と対応）。
// superAdminOnly: super_admin のみ表示（管理ユーザー管理）。
type MenuItem = {
  path: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission?: string;
  superAdminOnly?: boolean;
};

const menuItems: MenuItem[] = [
  { path: "/admin", label: "ダッシュボード", icon: LayoutDashboard, permission: "analytics" },
  { path: "/admin/analytics", label: "アクセス解析", icon: BarChart3, permission: "analytics" },
  { path: "/admin/users", label: "ユーザー管理", icon: Users, permission: "chat" },
  { path: "/admin/shops", label: "店舗管理", icon: Building2, permission: "stores" },
  { path: "/admin/reviews", label: "口コミ管理", icon: MessageSquare, permission: "reviews" },
  { path: "/admin/ai-chat", label: "AIチャット設定", icon: Bot, permission: "ai_chat" },
  { path: "/admin/articles", label: "コラム管理", icon: FileText, permission: "articles" },
  { path: "/admin/content", label: "コンテンツ管理", icon: LayoutGrid, permission: "content" },
  { path: "/admin/area-category", label: "エリア・カテゴリ", icon: MapPin, permission: "stores" },
  { path: "/admin/relocate-voices", label: "上京者の声", icon: Plane, permission: "content" },
  { path: "/admin/admin-users", label: "管理ユーザー", icon: KeyRound, superAdminOnly: true },
];

/** その admin がメニュー項目を見られるか。 */
function canSeeMenuItem(
  item: MenuItem,
  role: string | undefined,
  permissions: string[] | undefined,
): boolean {
  if (item.superAdminOnly) return role === "super_admin";
  if (!item.permission) return true;
  return (permissions ?? []).includes(item.permission);
}

/** pathname に対応する（最長一致の）メニュー項目を返す。 */
function sectionForPath(pathname: string): MenuItem | undefined {
  return [...menuItems]
    .sort((a, b) => b.path.length - a.path.length)
    .find((m) => pathname === m.path || pathname.startsWith(m.path + "/"));
}

const breadcrumbMap: Record<string, string> = {
  "/admin": "ダッシュボード",
  "/admin/analytics": "アクセス解析",
  "/admin/users": "ユーザー管理",
  "/admin/shops": "店舗管理",
  "/admin/reviews": "口コミ管理",
  "/admin/ai-chat": "AIチャット設定",
  "/admin/articles": "コラム管理",
  "/admin/articles/new": "新規作成",
  "/admin/content": "コンテンツ管理",
  "/admin/area-category": "エリア・カテゴリ",
  "/admin/relocate-voices": "上京者の声",
  "/admin/admin-users": "管理ユーザー",
};

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; path: string }[] = [];

  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    currentPath += "/" + segments[i];

    if (breadcrumbMap[currentPath]) {
      crumbs.push({ label: breadcrumbMap[currentPath], path: currentPath });
    } else if (segments[i] === "messages" && segments[i - 2] === "users") {
      crumbs.push({ label: "メッセージ", path: currentPath });
    } else if (segments[i - 1] === "users") {
      crumbs.push({ label: "ユーザー詳細", path: currentPath });
    } else if (segments[i - 1] === "shops" && segments[i] === "new") {
      crumbs.push({ label: "店舗作成", path: currentPath });
    } else if (segments[i - 1] === "shops") {
      crumbs.push({ label: "店舗編集", path: currentPath });
    } else if (segments[i - 1] === "articles" && segments[i] !== "edit") {
      // /admin/articles/:id - intermediate, hide; /edit step adds the label
      // skip
    } else if (segments[i] === "edit" && segments[i - 2] === "articles") {
      crumbs.push({ label: "記事編集", path: currentPath });
    }
  }

  return crumbs;
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Admin panel is client-only (auth state lives in localStorage). Render a
  // stable placeholder during SSR so the server HTML matches the first
  // client render — this avoids the hydration mismatch where the server
  // emits the empty <script> stub and the client renders the real <div>.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Auth guard - redirect to login if not authenticated
  useEffect(() => {
    if (hydrated && !loading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [user, loading, navigate, hydrated]);

  // 権限で見られるメニュー（super_admin は全部）。
  const allowedMenuItems = user
    ? menuItems.filter((item) => canSeeMenuItem(item, user.role, user.permissions))
    : [];

  // 権限ガード - 権限の無いセクションを開いたら、見られる最初のページへ退避。
  useEffect(() => {
    if (!hydrated || loading || !user) return;
    const section = sectionForPath(location.pathname);
    if (!section) return; // メニュー外（/admin/login 等）は触らない
    if (canSeeMenuItem(section, user.role, user.permissions)) return;
    const first = allowedMenuItems[0];
    if (first && sectionForPath(location.pathname)?.path !== first.path) {
      navigate(first.path, { replace: true });
    }
  }, [hydrated, loading, user, location.pathname, navigate, allowedMenuItems]);

  if (!hydrated || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar
          BUG-E12: ブレイクポイントを lg (1024px) → md (768px) に下げて、
          中サイズビューポートでも常時サイドバーが見えるようにする。
          一部画面でハンバーガー固定だった原因は lg 未満で全画面が折りたたみ
          扱いだったため。 */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[240px] bg-gradient-to-b from-[#111827] to-[#030712] flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:z-auto
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-5 py-5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800 }}>R</span>
              </div>
              <div>
                <h1 className="text-gray-200 text-sm tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Recta</h1>
                <p className="text-gray-400 text-[10px] tracking-wider uppercase">Admin</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {allowedMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-[13px] ${
                    isActive
                      ? "bg-white/15 text-white"
                      : "text-gray-400 hover:bg-white/[0.07] hover:text-gray-200"
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User section */}
          <div className="px-3 pb-4 space-y-1">
            <div className="px-3 py-2.5 rounded-lg border border-white/[0.08] bg-white/[0.05]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-gray-800 text-gray-300 flex items-center justify-center text-[11px]">
                  {user.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-200 text-[13px] truncate">{user.name}</p>
                  <p className="text-gray-500 text-[11px] truncate">{user.email}</p>
                </div>
              </div>
            </div>
            <button
              onClick={async () => {
                await logout();
                navigate("/admin/login", { replace: true });
              }}
              className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-gray-400 hover:bg-white/[0.07] hover:text-gray-200 transition-all duration-150 text-[13px]"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto w-full">
        {/* Top bar */}
        <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-white/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden text-muted-foreground hover:text-foreground transition p-1 -ml-1"
              >
                <Menu className="w-5 h-5" />
              </button>
              <nav className="flex items-center gap-1 text-[13px] text-muted-foreground">
                {breadcrumbs.map((crumb, i) => (
                  <span key={crumb.path} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                    {i === breadcrumbs.length - 1 ? (
                      <span className="text-foreground">{crumb.label}</span>
                    ) : (
                      <button
                        onClick={() => navigate(crumb.path)}
                        className="hover:text-foreground transition-colors"
                      >
                        {crumb.label}
                      </button>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
