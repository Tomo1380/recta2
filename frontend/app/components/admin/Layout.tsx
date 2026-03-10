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
  Search,
  Bell,
  LayoutGrid,
  MapPin,
  Loader2,
  MessageCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "~/lib/auth";

const menuItems = [
  { path: "/admin", label: "ダッシュボード", icon: LayoutDashboard },
  { path: "/admin/users", label: "ユーザー管理", icon: Users },
  { path: "/admin/shops", label: "店舗管理", icon: Building2 },
  { path: "/admin/reviews", label: "口コミ管理", icon: MessageSquare },
  { path: "/admin/ai-chat", label: "AIチャット設定", icon: Bot },
  { path: "/admin/content", label: "コンテンツ管理", icon: LayoutGrid },
  { path: "/admin/line", label: "LINE管理", icon: MessageCircle },
  { path: "/admin/area-category", label: "エリア・カテゴリ", icon: MapPin },
  { path: "/admin/admin-users", label: "管理ユーザー", icon: KeyRound },
];

const breadcrumbMap: Record<string, string> = {
  "/admin": "ダッシュボード",
  "/admin/users": "ユーザー管理",
  "/admin/shops": "店舗管理",
  "/admin/reviews": "口コミ管理",
  "/admin/ai-chat": "AIチャット設定",
  "/admin/content": "コンテンツ管理",
  "/admin/line": "LINE管理",
  "/admin/area-category": "エリア・カテゴリ",
  "/admin/admin-users": "管理ユーザー",
};

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; path: string }[] = [];

  if (pathname === "/admin") {
    crumbs.push({ label: "ダッシュボード", path: "/admin" });
    return crumbs;
  }

  crumbs.push({ label: "ダッシュボード", path: "/admin" });

  const segments = pathname.split("/").filter(Boolean);
  let currentPath = "";

  for (let i = 0; i < segments.length; i++) {
    currentPath += "/" + segments[i];

    if (breadcrumbMap[currentPath]) {
      crumbs.push({ label: breadcrumbMap[currentPath], path: currentPath });
    } else if (segments[i - 1] === "users") {
      crumbs.push({ label: "ユーザー詳細", path: currentPath });
    } else if (segments[i - 1] === "shops" && segments[i] === "new") {
      crumbs.push({ label: "店舗作成", path: currentPath });
    } else if (segments[i - 1] === "shops") {
      crumbs.push({ label: "店舗編集", path: currentPath });
    } else if (segments[i - 1] === "line" && segments[i] === "broadcast") {
      crumbs.push({ label: "一斉配信", path: currentPath });
    } else if (segments[i - 1] === "line" && segments[i + 1] === "messages") {
      // skip the lineUserId segment itself
    } else if (segments[i] === "messages" && segments[i - 2] === "line") {
      crumbs.push({ label: "メッセージ", path: currentPath });
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

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Auth guard - redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate("/admin/login", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[240px] bg-gradient-to-b from-[#111827] to-[#030712] flex flex-col shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        lg:relative lg:translate-x-0 lg:z-auto
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
              className="lg:hidden text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2 space-y-0.5">
            {menuItems.map((item) => (
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
                className="lg:hidden text-muted-foreground hover:text-foreground transition p-1 -ml-1"
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
            <div className="flex items-center gap-1">
              <button className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground">
                <Search className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
              </button>
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
