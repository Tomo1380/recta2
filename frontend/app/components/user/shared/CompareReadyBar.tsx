import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { GitCompareArrows, X } from "lucide-react";
import {
  clearCompareTray,
  getCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";

/**
 * Compare ready bar — tray が 2 件揃ったときに画面下にフローティング表示し、
 * 「比較する」ボタンを押すと /compare/:a/:b へ遷移する。
 *
 * フィードバック原文「即決できない人に2件並べて選ばせる」に対し、
 * CompareToggle 押下で自動遷移していたが、誤タップで意図せず遷移する事故が
 * verify で確認されたため、明示的なユーザー確認を挟む設計に変更した。
 *
 * Layout（root）にマウントしておくと、どのページにいても tray が満杯になり次第
 * 表示される。比較ページ自体では非表示。
 */

const GOLD = "#D4AF37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

export default function CompareReadyBar() {
  const navigate = useNavigate();
  // SPA 遷移後も path 変化を React が検知できるよう `useLocation` を使う。
  // `window.location.pathname` の直読みは history 更新でレンダーされず、
  // /compare/* に遷移しても bar が居座る不具合になる。
  const location = useLocation();
  const [tray, setTray] = useState<CompareTrayItem[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setTray(getCompareTray());
    return subscribeCompareTray(() => {
      setTray(getCompareTray());
      // tray が更新されたら dismiss をリセット（ユーザーが意図的に変更したと見なす）
      setDismissed(false);
    });
  }, []);

  // 比較ページ自体や、tray が 2 件未満、または dismiss 済みなら非表示
  const isComparePage = location.pathname.startsWith("/compare/");
  if (isComparePage || tray.length < 2 || dismissed) return null;

  const [a, b] = tray;

  return (
    <div
      role="region"
      aria-label="比較準備完了"
      className="fixed left-0 right-0 z-50 px-3"
      // BottomTabBar (68px) のすぐ上に重ねる
      style={{ bottom: 76 }}
    >
      <div
        className="mx-auto w-full max-w-[430px] rounded-2xl flex items-center gap-2 px-3 py-2.5"
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
          border: `1px solid ${GOLD}80`,
          boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
          fontFamily: J,
        }}
      >
        <span
          aria-hidden
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${GOLD}26`, border: `1px solid ${GOLD}59` }}
        >
          <GitCompareArrows size={18} style={{ color: GOLD }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold leading-tight" style={{ color: "white" }}>
            2件選びました
          </p>
          <p
            className="text-[10.5px] leading-tight mt-0.5"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            <span className="truncate inline-block max-w-[120px] align-bottom">{a.name}</span>
            <span aria-hidden> × </span>
            <span className="truncate inline-block max-w-[120px] align-bottom">{b.name}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/compare/${a.id}/${b.id}`)}
          aria-label={`${a.name} と ${b.name} を比較する`}
          className="shrink-0 px-3 py-2 rounded-md active:scale-95 transition-transform"
          style={{
            background: GOLD,
            color: DARK,
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
            border: "none",
          }}
        >
          比較する ▸
        </button>
        <button
          type="button"
          onClick={() => {
            // dismiss は今回の表示だけ。tray は残しておく（再表示は tray 変更時のみ）
            setDismissed(true);
          }}
          aria-label="この通知を閉じる"
          className="shrink-0 p-1.5 rounded-md active:scale-90 transition-transform"
          style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
        >
          <X size={14} aria-hidden />
        </button>
      </div>
      {/* clear all 補助 */}
      <div className="mx-auto w-full max-w-[430px] mt-1.5 text-center">
        <button
          type="button"
          onClick={() => clearCompareTray()}
          className="text-[10.5px] underline"
          style={{
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.7)",
            cursor: "pointer",
            fontFamily: J,
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
          }}
        >
          選択をリセット
        </button>
      </div>
    </div>
  );
}
