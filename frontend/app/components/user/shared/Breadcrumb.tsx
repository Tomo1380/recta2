import { Link } from "react-router";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  /** 表示テキスト */
  label: string;
  /** リンク先 (省略時は現在位置 = 最後の要素として強調表示) */
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** "overlay" = ダーク背景の上に半透明ピル風 (店舗詳細トップ画像用)。
   *  "inline" = 通常配置 (ページ本文の上部用)。 */
  variant?: "overlay" | "inline";
  className?: string;
}

/**
 * パンくず。BottomTabBar 撤去後のサブナビゲーションとして全ユーザー向けページで
 * 共通利用。最後の要素はリンク無し (= 現在位置)。
 */
export function Breadcrumb({ items, variant = "inline", className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const isOverlay = variant === "overlay";
  return (
    <nav
      aria-label="パンくず"
      className={[
        "flex min-w-0 items-center gap-1.5 truncate text-[11px]",
        isOverlay
          ? "rounded-full px-3 py-1.5 text-white"
          : "px-4 py-2 text-[rgba(27,37,40,0.65)]",
        className ?? "",
      ].join(" ")}
      style={
        isOverlay
          ? {
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
            }
          : undefined
      }
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex min-w-0 items-center gap-1.5">
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="shrink-0 opacity-80 hover:opacity-100 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={isLast ? "truncate font-semibold" : "shrink-0 opacity-80"}
              >
                {item.label}
              </span>
            )}
            {!isLast && (
              <ChevronRight
                className={[
                  "size-3 shrink-0",
                  isOverlay ? "opacity-50" : "opacity-40",
                ].join(" ")}
              />
            )}
          </span>
        );
      })}
    </nav>
  );
}
