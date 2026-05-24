import { Link, useLocation } from "react-router";
import { Home, Search } from "lucide-react";
import { openLineFriendAdd } from "~/lib/line";
import { LineIcon } from "~/components/user/shared/LineIcon";
import { LUXE, MOBILE_FRAME_WIDTH } from "~/lib/luxe-tokens";

const tabs = [
  { label: "ホーム", icon: Home, to: "/" },
  { label: "一覧", icon: Search, to: "/stores" },
  { label: "LINEで相談", action: "line" as const },
];

const LINE_GREEN = "#06C755";

/**
 * Dark luxe bottom tab bar. Three slots: Home / Stores / LINE-add CTA.
 *
 * Visual language matches the shared Footer (dark slab capped by a thin
 * gold gradient line). The LINE tab is the primary CTA so it gets the
 * filled green circle with the official LINE mark — the rest of the tabs
 * are quiet glyph+label pairs that turn gold when active.
 */
export default function BottomTabBar({ inline = false }: { inline?: boolean }) {
  const location = useLocation();

  return (
    <nav
      className={
        inline
          ? ""
          : "fixed bottom-0 left-0 right-0 z-50"
      }
      style={{
        background: LUXE.dark,
        // Faint gold seam on top — visually rhymes with the Footer edge.
        boxShadow:
          "inset 0 1px 0 rgba(212,175,55,0.18), 0 -6px 22px rgba(0,0,0,0.28)",
      }}
    >
      {/* Hairline gold sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0"
        style={{
          top: 0,
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(212,175,55,0.9) 30%, #ffe066 50%, rgba(212,175,55,0.9) 70%, transparent)",
          opacity: 0.55,
        }}
      />

      {/* On desktop the nav spans the viewport; this inner column re-aligns
          the actual tabs under the 430px mobile frame above. */}
      <div
        className="mx-auto flex items-center justify-around py-2"
        style={{ maxWidth: MOBILE_FRAME_WIDTH }}
      >
        {tabs.map((tab) => {
          if (tab.action === "line") {
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => openLineFriendAdd("tab:bottom")}
                aria-label="LINEで相談する（友だち追加）"
                className="flex flex-col items-center gap-0.5 px-3 py-1 active:scale-95 transition-transform"
              >
                <span
                  aria-hidden
                  className="relative flex items-center justify-center rounded-full"
                  style={{
                    width: 34,
                    height: 34,
                    background: `linear-gradient(135deg, ${LINE_GREEN} 0%, #04a447 100%)`,
                    boxShadow:
                      "0 2px 10px rgba(6,199,85,0.45), inset 0 0 0 1px rgba(255,255,255,0.12)",
                  }}
                >
                  <LineIcon size={20} fill="white" />
                </span>
                <span
                  className="text-[11px] font-semibold leading-tight"
                  style={{ color: LINE_GREEN }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          const isActive =
            tab.to === "/"
              ? location.pathname === "/"
              : tab.to
                ? location.pathname.startsWith(tab.to)
                : false;
          const Icon = tab.icon;
          const tint = isActive ? LUXE.gold : "rgba(255,255,255,0.55)";

          return (
            <Link
              key={tab.label}
              to={tab.to!}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon size={22} strokeWidth={1.8} style={{ color: tint }} />
              <span
                className="text-[11px] font-medium leading-tight"
                style={{ color: tint }}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
