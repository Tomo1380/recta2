import { useEffect, useState } from "react";
import { GitCompareArrows, Check, X } from "lucide-react";
import {
  addToCompareTray,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";

/**
 * 「この店舗と比較する」トグル。
 *
 * 挙動：
 * - tray にこの店舗が **未追加** → ボタン押下で追加。tray が満杯になったら自動で `/compare/:a/:b` に遷移。
 * - tray にこの店舗が **既に追加済** → 「比較リストに追加済」表示＋取り消しチップ。
 *
 * RecentlyViewedStores の直下に配置することを想定（フィードバック原文準拠）。
 */
interface CompareToggleProps {
  storeId: number;
  storeName: string;
  storeArea?: string;
  storeCategory?: string;
  storeImageUrl?: string;
}

const GOLD = "#D4AF37";
const DARK = "#1b2528";

export default function CompareToggle({
  storeId,
  storeName,
  storeArea,
  storeCategory,
  storeImageUrl,
}: CompareToggleProps) {
  const [tray, setTray] = useState<CompareTrayItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTray(getCompareTray());
    setHydrated(true);
    return subscribeCompareTray(() => setTray(getCompareTray()));
  }, []);

  // SSR/hydration ガード：初回レンダリングではボタンを描かない（localStorage 参照前なのでチラつき防止）
  if (!hydrated) {
    return <div aria-hidden style={{ minHeight: 56 }} />;
  }

  const inTray = tray.some((s) => s.id === storeId);
  const partner = tray.find((s) => s.id !== storeId);

  const onAdd = () => {
    // 即遷移はしない（誤タップ事故防止）。2 件揃ったら
    // CompareReadyBar が画面下にフローティング表示され、ユーザー操作で遷移する。
    addToCompareTray({
      id: storeId,
      name: storeName,
      area: storeArea,
      category: storeCategory,
      image_url: storeImageUrl,
    });
  };

  const onRemove = () => {
    removeFromCompareTray(storeId);
  };

  if (inTray) {
    return (
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-3"
        style={{
          background: "white",
          border: `1px dashed ${GOLD}99`,
          boxShadow: "0 2px 10px rgba(212,175,55,0.08)",
        }}
      >
        <span
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${GOLD}1a` }}
          aria-hidden
        >
          <Check size={18} style={{ color: GOLD }} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-semibold leading-tight" style={{ color: DARK }}>
            比較リストに追加済み
          </p>
          <p className="text-[10.5px] mt-0.5 leading-snug" style={{ color: "rgba(27,37,40,0.55)" }}>
            {partner
              ? `あと1件選ぶと「${partner.name}」と並べて比較できます`
              : "他の店舗ページからもう1件選んでください"}
          </p>
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="この店舗を比較リストから外す"
          className="shrink-0 p-2 rounded-md active:scale-95 transition-transform"
          style={{ background: "transparent", cursor: "pointer", color: "rgba(27,37,40,0.5)" }}
        >
          <X size={16} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      aria-label="この店舗を比較リストに追加する"
      className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
      style={{
        background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
        border: `1px solid ${GOLD}59`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
        cursor: "pointer",
      }}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: `${GOLD}26`, border: `1px solid ${GOLD}59` }}
        aria-hidden
      >
        <GitCompareArrows size={20} strokeWidth={1.8} style={{ color: GOLD }} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[13.5px] font-bold leading-tight" style={{ color: "white" }}>
          この店舗と比較する
        </span>
        <span className="block text-[10.5px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
          {tray.length === 0
            ? "気になる店舗を2件選んで、スペックを並べてチェック"
            : `「${tray[0].name}」と並べて比較します`}
        </span>
      </span>
      <span
        className="text-[10px] font-semibold tracking-wider shrink-0 px-2 py-1 rounded"
        style={{ background: `${GOLD}26`, color: GOLD, letterSpacing: "0.08em" }}
        aria-hidden
      >
        {tray.length === 0 ? "1/2" : "2/2 ▸"}
      </span>
    </button>
  );
}
