import { Outlet } from "react-router";
import { UserAuthProvider } from "~/lib/user-auth";
import AmbientBackground from "~/components/user/shared/AmbientBackground";
import UserFab from "~/components/user/shared/UserFab";
import { LUXE, MOBILE_FRAME_WIDTH } from "~/lib/luxe-tokens";

/**
 * User-facing shell.
 *
 * 430px のモバイルカラムに固定。デスクトップではアンビエント背景の上にこの
 * フレームを中央配置する。
 *
 * BottomTabBar は撤去。右下フローティング (UserFab) で
 *  - 常時 LINE 相談アイコン
 *  - 比較リストが 1 件以上のときだけ比較アイコン + 件数バッジ
 * を縦スタック表示し、タップでボトムシート展開。
 */
export default function UserLayout() {
  return (
    <UserAuthProvider>
      <div
        className="user-shell relative min-h-screen flex justify-center"
        style={{ fontFamily: LUXE.fontFamily }}
      >
        <AmbientBackground />
        <div
          className="relative z-10 flex w-full min-h-screen flex-col bg-[#f5f5f5]"
          style={{ maxWidth: MOBILE_FRAME_WIDTH }}
        >
          <Outlet />
          <UserFab />
        </div>
      </div>
    </UserAuthProvider>
  );
}
