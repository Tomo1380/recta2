import { Outlet, Link } from "react-router";
import { UserAuthProvider, useUserAuth } from "~/lib/user-auth";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { LogIn } from "lucide-react";

function UserHeaderAuth() {
  const { isAuthenticated, user, loading } = useUserAuth();

  if (loading) {
    return (
      <div className="size-8 animate-pulse rounded-full bg-white/20" />
    );
  }

  if (isAuthenticated && user) {
    return (
      <Link
        to="/mypage"
        className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Avatar className="size-7 border border-white/30">
          <AvatarImage
            src={user.line_picture_url ?? undefined}
            alt={user.nickname ?? user.line_display_name ?? "User"}
          />
          <AvatarFallback className="text-xs">
            {(user.nickname ?? user.line_display_name ?? "U").charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:inline">マイページ</span>
      </Link>
    );
  }

  return (
    <Link
      to="/login"
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      <LogIn className="size-4" />
      <span>ログイン</span>
    </Link>
  );
}

function UserLayoutInner() {
  return (
    <>
      {/* Floating header auth button */}
      <div className="pointer-events-none fixed right-0 top-0 z-50 p-3">
        <div className="pointer-events-auto">
          <UserHeaderAuth />
        </div>
      </div>
      <Outlet />
    </>
  );
}

export default function UserLayout() {
  return (
    <UserAuthProvider>
      <UserLayoutInner />
    </UserAuthProvider>
  );
}
