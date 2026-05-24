import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { GitCompareArrows, X } from "lucide-react";
import {
  clearCompareTray,
  COMPARE_MAX_ITEMS,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";

/**
 * 比較選択中バー — 1件以上選択された瞬間に画面下に floating 表示。
 *
 * 旧 CompareReadyBar は「2件揃ったら自動遷移」のため2件専用の表示だったが、
 * 新 UX (最大4件まで選んで横スクロール比較) に合わせて、選択数 1〜4 で
 * 常時表示するように刷新。各サムネチップに×を付けて個別解除も可能にした。
 *
 * - 比較ページ (/compare/*) 上では非表示
 * - 0件のときも非表示
 * - 1件のみのときは「比較する」ボタンを disabled（あと1件促し）
 */

const GOLD = "#D4AF37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

export default function CompareSelectionBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tray, setTray] = useState<CompareTrayItem[]>([]);

  useEffect(() => {
    setTray(getCompareTray());
    return subscribeCompareTray(() => setTray(getCompareTray()));
  }, []);

  const isComparePage = location.pathname.startsWith("/compare/");
  if (isComparePage || tray.length === 0) return null;

  const canCompare = tray.length >= 2;

  return (
    <div
      role="region"
      aria-label="比較選択中"
      className="fixed left-0 right-0 z-50 px-3"
      style={{ bottom: 76 }}
    >
      <div
        className="mx-auto w-full max-w-[430px] rounded-2xl p-2.5"
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
          border: `1px solid ${GOLD}80`,
          boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
          fontFamily: J,
        }}
      >
        {/* Top row: 件数表示 + クリア */}
        <div className="flex items-center justify-between mb-2 px-0.5">
          <div className="flex items-center gap-1.5">
            <GitCompareArrows
              size={14}
              style={{ color: GOLD }}
              aria-hidden
            />
            <span style={{ color: "white", fontSize: 11.5, fontWeight: 700 }}>
              比較リスト {tray.length}/{COMPARE_MAX_ITEMS}
            </span>
          </div>
          <button
            type="button"
            onClick={() => clearCompareTray()}
            aria-label="比較リストを全てクリア"
            className="text-[10.5px] underline active:opacity-70"
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(255,255,255,0.65)",
              cursor: "pointer",
              padding: 0,
            }}
          >
            クリア
          </button>
        </div>

        {/* サムネチップ列 — 横スクロール、各チップに ×ボタン */}
        <ul
          className="flex gap-1.5 overflow-x-auto pb-1"
          style={{ scrollbarWidth: "none" }}
        >
          {tray.map((item) => (
            <li
              key={item.id}
              className="relative shrink-0 rounded-lg overflow-hidden"
              style={{ width: 56, height: 56, background: "rgba(255,255,255,0.08)" }}
            >
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="w-full h-full flex items-center justify-center"
                  style={{ color: GOLD, fontWeight: 700, fontSize: 18 }}
                >
                  {item.name.charAt(0)}
                </span>
              )}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 px-1 py-0.5"
                style={{
                  background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.85))",
                  fontSize: 8,
                  color: "white",
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </span>
              <button
                type="button"
                onClick={() => removeFromCompareTray(item.id)}
                aria-label={`${item.name} を比較から外す`}
                className="absolute top-0.5 right-0.5 inline-flex items-center justify-center rounded-full active:scale-90"
                style={{
                  width: 16,
                  height: 16,
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={9} aria-hidden />
              </button>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="mt-2">
          <button
            type="button"
            disabled={!canCompare}
            onClick={() => {
              const ids = tray.map((t) => t.id).join(",");
              navigate(`/compare/${ids}`);
            }}
            aria-label={canCompare ? `${tray.length}件を比較する` : "あと1件追加してください"}
            className="w-full py-2.5 rounded-lg active:scale-[0.99] transition-transform disabled:opacity-50"
            style={{
              background: canCompare ? GOLD : "rgba(212,175,55,0.4)",
              color: DARK,
              fontWeight: 700,
              fontSize: 12.5,
              cursor: canCompare ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {canCompare ? `比較する（${tray.length}件） ▸` : "あと1件追加してください"}
          </button>
        </div>
      </div>
    </div>
  );
}
