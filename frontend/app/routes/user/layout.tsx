import { Outlet } from "react-router";
import { UserAuthProvider } from "~/lib/user-auth";
import AmbientBackground from "~/components/user/shared/AmbientBackground";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import CompareSelectionBar from "~/components/user/shared/CompareSelectionBar";
import { BOTTOM_TAB_HEIGHT, LUXE, MOBILE_FRAME_WIDTH } from "~/lib/luxe-tokens";

/**
 * User-facing shell.
 *
 * The whole user site is locked to a 430px mobile column. On desktop the
 * viewport is filled with an ambient dark/gold background that sits *behind*
 * the centered frame — so anyone visiting on a laptop still sees the brand
 * world rather than two big black bars.
 *
 * BottomTabBar and CompareSelectionBar live here (not in each page) so they
 * render exactly once, inside the centered frame, and we don't have to repeat
 * the `pb-[68px]` and `<BottomTabBar />` ritual in every page component.
 *
 * Note: the admin shop preview renders `StoreDetailPage` outside this layout,
 * so the BottomTabBar/CompareSelectionBar don't leak into admin views.
 */
export default function UserLayout() {
  return (
    <UserAuthProvider>
      <div
        className="relative min-h-screen flex justify-center"
        style={{ fontFamily: LUXE.fontFamily }}
      >
        {/* Desktop-only ambient brand world. Hidden on mobile by the centered frame. */}
        <AmbientBackground />

        {/* Centered mobile-first column. Everything user-facing renders inside this. */}
        <div
          className="relative z-10 flex w-full min-h-screen flex-col bg-[#f5f5f5]"
          style={{
            maxWidth: MOBILE_FRAME_WIDTH,
            paddingBottom: BOTTOM_TAB_HEIGHT,
          }}
        >
          <Outlet />
          <BottomTabBar />
          <CompareSelectionBar />
        </div>
      </div>
    </UserAuthProvider>
  );
}
