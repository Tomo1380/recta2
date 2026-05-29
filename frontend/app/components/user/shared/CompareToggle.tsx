import { useEffect, useState } from "react";
import { GitCompareArrows, Check, X } from "lucide-react";
import {
  addToCompareTray,
  COMPARE_MAX_ITEMS,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";

/**
 * 「この店舗と比較する」トグル。
 *
 * 店舗詳細ページの末尾に置く副次動線。メインの選択動線は店舗一覧の
 * チェックボックスだが、既に詳細を見ているユーザーがそのまま比較に
 * 追加できる導線も提供する。
 *
 * 挙動:
 * - 未追加 → 押下で tray に追加。即時遷移はせず、UserFab から
 *   ユーザーが明示的に「比較する」を押すまで待つ（誤タップ事故防止）。
 * - 追加済 → 「比較リストに追加済み」表示 + 取り消しボタン。
 * - tray 満杯 (4件) + 未追加 → disabled で「最大4件まで」表示。
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
  const trayFull = !inTray && tray.length >= COMPARE_MAX_ITEMS;
  const othersCount = tray.filter((s) => s.id !== storeId).length;

  const onAdd = () => {
    if (trayFull) return;
    // 即遷移はしない（誤タップ事故防止）。UserFab が画面下に
    // floating 表示され、ユーザーが「比較する」を押すまで待つ。
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
            比較リストに追加済み（{tray.length}/{COMPARE_MAX_ITEMS}）
          </p>
          <p className="text-[10.5px] mt-0.5 leading-snug" style={{ color: "rgba(27,37,40,0.55)" }}>
            {othersCount === 0
              ? "店舗一覧でもう1件以上選んで比較できます"
              : `他${othersCount}件と並べて比較できます`}
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
      disabled={trayFull}
      aria-label={
        trayFull
          ? `比較リストは最大${COMPARE_MAX_ITEMS}件まで`
          : "この店舗を比較リストに追加する"
      }
      className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform disabled:cursor-not-allowed"
      style={{
        background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
        border: `1px solid ${GOLD}59`,
        boxShadow: "0 4px 18px rgba(0,0,0,0.18)",
        cursor: trayFull ? "not-allowed" : "pointer",
        opacity: trayFull ? 0.55 : 1,
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
          {trayFull ? `比較リスト満員（${COMPARE_MAX_ITEMS}件）` : "この店舗を比較に追加"}
        </span>
        <span className="block text-[10.5px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.65)" }}>
          {trayFull
            ? "比較リストから外してから追加してください"
            : tray.length === 0
              ? `気になる店舗を最大${COMPARE_MAX_ITEMS}件まで並べて比較できます`
              : `既に${tray.length}件選択中 — 比較リストに加える`}
        </span>
      </span>
      <span
        className="text-[10px] font-semibold tracking-wider shrink-0 px-2 py-1 rounded"
        style={{ background: `${GOLD}26`, color: GOLD, letterSpacing: "0.08em" }}
        aria-hidden
      >
        {tray.length}/{COMPARE_MAX_ITEMS}
      </span>
    </button>
  );
}
