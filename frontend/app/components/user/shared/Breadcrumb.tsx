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
   *  "inline" = 通常配置 (コンテンツ上部、本文と一体の流れ)。 */
  variant?: "overlay" | "inline";
  className?: string;
}

const GOLD = "#d4af37";

/**
 * パンくず。BottomTabBar 撤去後のサブナビゲーションとして全ユーザー向けページで
 * 共通利用。
 *
 * inline variant は NN/g + Baymard の推奨を踏まえ:
 *   - 親階層はミュート色 (rgba(27,37,40,0.5))
 *   - 現在位置 (最後の要素) は強調 (DARK + semibold)
 *   - チェブロン (›) で進行方向を示唆
 *   - 横幅オーバー時は右端でフェード + 横スクロール
 *   - 背景は本文と一体になる #faf9f5 で「装飾しない」見せ方
 */
export function Breadcrumb({ items, variant = "inline", className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  const isOverlay = variant === "overlay";

  if (isOverlay) {
    return (
      <nav
        aria-label="パンくず"
        className={[
          "flex min-w-0 items-center gap-1.5 truncate text-[11px] rounded-full px-3 py-1.5 text-white",
          className ?? "",
        ].join(" ")}
        style={{
          backgroundColor: "rgba(0,0,0,0.4)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <span key={i} className="flex min-w-0 items-center gap-1.5">
              {item.to && !isLast ? (
                <Link to={item.to} className="shrink-0 opacity-80 hover:opacity-100 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? "truncate font-semibold" : "shrink-0 opacity-80"}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3 shrink-0 opacity-50" />}
            </span>
          );
        })}
      </nav>
    );
  }

  // inline variant — コンテンツ上、控えめ・現在位置強調・右フェード。
  // 横スクロール余地は mask-image で背景色非依存にフェードさせる
  // (各ページの背景色 #f5f5f5 / #faf9f5 / #f7f6f3 のいずれでも自然に溶ける)。
  return (
    <nav aria-label="パンくず" className={["w-full", className ?? ""].join(" ")}>
      <ol
        className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap px-4 py-2.5 text-[11.5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          fontFamily: "'Noto Sans JP', sans-serif",
          WebkitMaskImage:
            "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)",
          maskImage:
            "linear-gradient(90deg, #000 0, #000 calc(100% - 28px), transparent 100%)",
        }}
      >
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className="flex shrink-0 items-center gap-1.5">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="transition-colors hover:underline"
                  style={{ color: "rgba(27,37,40,0.5)" }}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={isLast ? "font-semibold" : ""}
                  style={{ color: isLast ? "#1b2528" : "rgba(27,37,40,0.5)" }}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  className="size-3"
                  style={{ color: GOLD, opacity: 0.55 }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
