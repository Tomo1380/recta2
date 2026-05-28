import { Outlet } from "react-router";
import { UserAuthProvider } from "~/lib/user-auth";
import AmbientBackground from "~/components/user/shared/AmbientBackground";
import CompareSelectionBar from "~/components/user/shared/CompareSelectionBar";
import { LUXE, MOBILE_FRAME_WIDTH } from "~/lib/luxe-tokens";

/**
 * User-facing shell.
 *
 * 430px のモバイルカラムに固定。デスクトップではアンビエント背景の上にこの
 * フレームを中央配置する。
 *
 * BottomTabBar は撤去 (運営要望: 各ページに breadcrumb + 右下 LINE
 * フローティングでナビ代替)。CompareSelectionBar は比較トレイ専用なので残す。
 */
export default function UserLayout() {
  return (
    <UserAuthProvider>
      <div
        className="relative min-h-screen flex justify-center"
        style={{ fontFamily: LUXE.fontFamily }}
      >
        <AmbientBackground />
        <div
          className="relative z-10 flex w-full min-h-screen flex-col bg-[#f5f5f5]"
          style={{ maxWidth: MOBILE_FRAME_WIDTH }}
        >
          <Outlet />
          <CompareSelectionBar />
        </div>
      </div>
    </UserAuthProvider>
  );
}
