import { Link, useLocation } from "react-router";
import { Home, Search, MessageCircle } from "lucide-react";
import { openLineFriendAdd } from "~/lib/line";

const tabs = [
  { label: "ホーム", icon: Home, to: "/" },
  { label: "一覧", icon: Search, to: "/stores" },
  { label: "LINEで相談", icon: MessageCircle, action: "line" as const },
];

export default function BottomTabBar() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white"
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
            return (
              <button
                key={tab.label}
                type="button"
                onClick={openLineFriendAdd}
                className="flex flex-col items-center gap-0.5 px-3 py-1"
              >
                <Icon
                  size={22}
                  strokeWidth={1.8}
                  style={{ color: "rgba(20,39,46,0.62)" }}
                />
                <span
                  className="text-[11px] font-medium leading-tight"
                  style={{
                    color: "rgba(20,39,46,0.62)",
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
