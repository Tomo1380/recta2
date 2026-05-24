import { Link, useLocation } from "react-router";
import { Home, Search, MessageCircle } from "lucide-react";
import { openLineFriendAdd } from "~/lib/line";

const tabs = [
  { label: "ホーム", icon: Home, to: "/" },
  { label: "一覧", icon: Search, to: "/stores" },
  { label: "LINEで相談", icon: MessageCircle, action: "line" as const },
];

export default function BottomTabBar({ inline = false }: { inline?: boolean }) {
  const location = useLocation();

  return (
    <nav
      className={
        inline
          ? "bg-white"
          : "fixed bottom-0 left-0 right-0 z-50 bg-white"
      }
      style={{ borderTop: "1px solid rgba(27,37,40,0.08)" }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around py-2">
        {tabs.map((tab) => {
          const isActive =
            tab.to === "/"
              ? location.pathname === "/"
              : tab.to
                ? location.pathname.startsWith(tab.to)
                : false;

          const Icon = tab.icon;

          if (tab.action === "line") {
            // LINE tab is the primary CTA — paint it in LINE green with a
            // pulsing indicator so it reads as the action, not just a tab.
            const LINE_GREEN = "#06C755";
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
                    boxShadow: "0 2px 8px rgba(6,199,85,0.35)",
                  }}
                >
                  <Icon size={18} strokeWidth={2.2} style={{ color: "white" }} aria-hidden />
                  <span
                    aria-hidden
                    className="absolute"
                    style={{
                      top: -1,
                      right: -1,
                      width: 8,
                      height: 8,
                    }}
                  >
                    <span
                      className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: LINE_GREEN }}
                    />
                    <span
                      className="relative inline-flex h-full w-full rounded-full"
                      style={{ background: LINE_GREEN, boxShadow: "0 0 0 1.5px white" }}
                    />
                  </span>
                </span>
                <span
                  className="text-[11px] font-semibold leading-tight"
                  style={{
                    color: LINE_GREEN,
                    fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.label}
              to={tab.to!}
              className="flex flex-col items-center gap-0.5 px-3 py-1"
            >
              <Icon
                size={22}
                strokeWidth={1.8}
                style={{ color: isActive ? "#D4AF37" : "rgba(20,39,46,0.62)" }}
              />
              <span
                className="text-[11px] font-medium leading-tight"
                style={{
                  color: isActive ? "#D4AF37" : "rgba(20,39,46,0.62)",
                  fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
                }}
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
