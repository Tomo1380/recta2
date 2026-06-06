import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { GitCompareArrows, Plus, X } from "lucide-react";
import { LineIcon } from "~/components/user/shared/LineIcon";
import { openLineFriendAdd } from "~/lib/line";
import {
  addToCompareTray,
  clearCompareTray,
  COMPARE_MAX_ITEMS,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";
import { getViewedStores } from "~/lib/viewed-stores";
import { useFabWarmUp } from "~/hooks/useFabWarmUp";

/**
 * UserFab — 全ユーザー画面共通の右下フローティングボタン群。
 *
 * 配置:
 *  - 一番下に丸い LINE ボタン (常時)
 *  - その 8px 上に丸い比較ボタン (比較トレイに 1 件以上あるときだけ)
 *
 * 操作:
 *  - LINE ボタンタップ → ボトムシート (説明 + 「LINE で相談する」CTA)
 *  - 比較ボタンタップ → ボトムシート (選択中チップ一覧 + 「比較する」)
 *  - 初回マウント時のみ LINE ボタンの左に「LINEで相談」のラベルが
 *    3 秒スライド表示 (再訪問では sessionStorage で抑止)
 *
 * 非表示:
 *  - /compare/* では比較ボタンを出さない
 *  - /login, /auth/callback では何も出さない
 *  - プレビュー時は親側で UserFab 自体を render しないこと
 */

const GOLD = "#D4AF37";
const DARK = "#1b2528";
const LINE_GREEN_FROM = "#06D660";
const LINE_GREEN_TO = "#06C755";
const J = "'Noto Sans JP',sans-serif";

type SheetMode = null | "line" | "compare";

// LINE ボタン左に常時出す吹き出しキャッチコピー。
// 求職者の不安「面接めんどう」を解消する 1 行で押下率を上げる。
const LINE_HINT_TEXT = "たった1分で体入確約";

interface AddCandidate {
  id: number;
  name: string;
  area?: string;
  category?: string;
  image_url?: string;
  source: "pickup" | "viewed";
}

interface PickupApiShape {
  id: number;
  name: string;
  area?: string;
  category?: string;
  images?: (string | { url?: string })[];
}

function pickupImage(p: PickupApiShape): string | undefined {
  const first = p.images?.[0];
  if (!first) return undefined;
  return typeof first === "string" ? first : first.url;
}

export default function UserFab() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tray, setTray] = useState<CompareTrayItem[]>([]);
  const [sheet, setSheet] = useState<SheetMode>(null);
  // LINE FAB は「温まってから」表示 (UX FB #2: 押し売り感の低減)。比較ボタンは
  // ユーザーが店を追加した時だけ出る別シグナルなので warm-up の対象外。
  const { warmed, animate: warmAnimate } = useFabWarmUp();

  useEffect(() => {
    setTray(getCompareTray());
    return subscribeCompareTray(() => setTray(getCompareTray()));
  }, []);

  // sheet 開閉中は body スクロールロック
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (sheet === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheet]);

  const path = location.pathname;
  const isHiddenRoute =
    path.startsWith("/login") || path.startsWith("/auth/callback");
  if (isHiddenRoute) return null;

  const isComparePage = path.startsWith("/compare/");
  const showCompare = !isComparePage && tray.length > 0;
  const canCompare = tray.length >= 2;

  return (
    <>
      {/* スタック本体 (右下に固定) */}
      <div
        className="fixed z-40"
        style={{
          right: "calc(env(safe-area-inset-right, 0px) + 14px)",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 14px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {/* 比較ボタン (1件以上のときだけ) */}
        {showCompare && (
          <button
            type="button"
            onClick={() => setSheet("compare")}
            aria-label={`比較リスト ${tray.length}件を開く`}
            className="relative inline-flex items-center justify-center active:scale-95 transition-transform"
            style={{
              pointerEvents: "auto",
              width: 56,
              height: 56,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
              border: `1.5px solid ${GOLD}`,
              color: "white",
              boxShadow: "0 6px 20px rgba(0,0,0,0.32), inset 0 1px 0 rgba(212,175,55,0.18)",
              cursor: "pointer",
            }}
          >
            <GitCompareArrows size={22} style={{ color: GOLD }} aria-hidden />
            {/* 件数バッジ (右上) */}
            <span
              aria-hidden
              style={{
                position: "absolute",
                top: -4,
                right: -4,
                minWidth: 22,
                height: 22,
                padding: "0 6px",
                borderRadius: 999,
                background: "#e74c3c",
                color: "white",
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: 11,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 6px rgba(231,76,60,0.45)",
                border: "1.5px solid white",
              }}
            >
              {tray.length}/{COMPARE_MAX_ITEMS}
            </span>
          </button>
        )}

        {/* LINE CTA — ダークガラス 1 枚に統一し、LINE は右端の緑円アイコンに留める。
            warm-up (スクロール/滞在) で温まってから表示する (UX FB #2)。 */}
        {warmed && (
        <button
          type="button"
          onClick={() => setSheet("line")}
          aria-label={`LINE で相談 — ${LINE_HINT_TEXT}`}
          className="inline-flex items-center active:scale-[0.97] transition-transform"
          style={{
            pointerEvents: "auto",
            height: 52,
            paddingLeft: 16,
            paddingRight: 6,
            gap: 11,
            borderRadius: 999,
            border: "1px solid rgba(212,175,55,0.55)",
            background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
            boxShadow:
              "0 8px 24px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)",
            cursor: "pointer",
            fontFamily: J,
            whiteSpace: "nowrap",
            // 生の遷移 (warm-up 達成) でだけ登場アニメ。セッション再訪の即表示では付けない。
            animation: warmAnimate ? "fab-warm-in .42s cubic-bezier(.2,.8,.2,1) both" : undefined,
          }}
        >
          {/* コピー — 数字を強調 */}
          <span style={{ display: "inline-flex", alignItems: "baseline", gap: 1, lineHeight: 1, color: "white" }}>
            <span style={{ fontWeight: 600, fontSize: 11, opacity: 0.82 }}>たった</span>
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 800,
                fontSize: 18,
                color: GOLD,
                lineHeight: 1,
                margin: "0 1px",
              }}
            >
              1
            </span>
            <span style={{ fontWeight: 700, fontSize: 11, color: GOLD }}>分</span>
            <span style={{ fontWeight: 800, fontSize: 12.5 }}>で体入確約</span>
          </span>
          {/* 右端: LINE 緑円アイコン (認知用アクセント) */}
          <span
            aria-hidden
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: `linear-gradient(135deg, ${LINE_GREEN_FROM} 0%, ${LINE_GREEN_TO} 100%)`,
              boxShadow: "0 2px 8px rgba(6,199,85,0.45)",
            }}
          >
            <LineIcon size={23} fill="white" />
          </span>
        </button>
        )}
      </div>

      {/* ボトムシート */}
      {sheet !== null && (
        <>
          {/* オーバーレイ */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setSheet(null)}
            className="fixed inset-0 z-50"
            style={{
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(2px)",
              border: "none",
              cursor: "pointer",
              animation: "fab-overlay-in .2s ease-out both",
            }}
          />
          {/* シート本体 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label={sheet === "line" ? "LINEで相談" : "店舗を比較"}
            className="fixed left-0 right-0 z-50 px-3"
            style={{
              bottom: 0,
              animation: "fab-sheet-in .28s cubic-bezier(.2,.8,.2,1) both",
              pointerEvents: "auto",
            }}
          >
            <div
              className="mx-auto w-full max-w-[430px]"
              style={{
                background: "white",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                padding: "12px 18px calc(env(safe-area-inset-bottom, 0px) + 18px)",
                boxShadow: "0 -10px 40px rgba(0,0,0,0.2)",
                fontFamily: J,
              }}
            >
              {/* グリップ */}
              <div className="flex justify-center mb-3">
                <span
                  aria-hidden
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    background: "rgba(27,37,40,0.18)",
                  }}
                />
              </div>

              {sheet === "line" ? (
                <LineSheet onOpenLine={() => {
                  openLineFriendAdd("fab:line");
                  setSheet(null);
                }} onClose={() => setSheet(null)} />
              ) : (
                <CompareSheet
                  tray={tray}
                  canCompare={canCompare}
                  onCompare={() => {
                    const ids = tray.map((t) => t.id).join(",");
                    setSheet(null);
                    navigate(`/compare/${ids}`);
                  }}
                  onRemove={(id) => removeFromCompareTray(id)}
                  onClear={() => clearCompareTray()}
                  onClose={() => setSheet(null)}
                />
              )}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fab-overlay-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes fab-sheet-in {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fab-warm-in {
          from { opacity: 0; transform: translateY(12px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="fab-warm-in"] { animation: none !important; }
        }
      `}</style>
    </>
  );
}

// ─── Sheets ────────────────────────────────────────

function LineSheet({
  onOpenLine,
  onClose,
}: {
  onOpenLine: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="flex items-start gap-3 mb-3">
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            background: `linear-gradient(135deg, ${LINE_GREEN_FROM} 0%, ${LINE_GREEN_TO} 100%)`,
            boxShadow: "0 4px 10px rgba(6,199,85,0.3)",
          }}
        >
          <LineIcon size={22} fill="white" />
        </span>
        <div className="flex-1">
          <h2 style={{ fontWeight: 700, fontSize: 16, color: DARK, margin: 0 }}>
            LINE で気軽に相談
          </h2>
          <p
            style={{
              fontSize: 12,
              color: "rgba(27,37,40,0.6)",
              margin: "4px 0 0",
              lineHeight: 1.6,
            }}
          >
            希望に合う店舗を担当者が個別にご提案します。
            <br />
            まずは LINE で友だち追加して、気軽にメッセージください。
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onOpenLine}
        className="w-full active:scale-[0.99] transition-transform"
        style={{
          background: `linear-gradient(135deg, ${LINE_GREEN_FROM} 0%, ${LINE_GREEN_TO} 100%)`,
          color: "white",
          fontWeight: 700,
          fontSize: 14,
          padding: "13px 16px",
          border: "none",
          borderRadius: 14,
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(6,199,85,0.32)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <LineIcon size={18} fill="white" />
        LINE で友だち追加して相談
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-full mt-2"
        style={{
          background: "transparent",
          color: "rgba(27,37,40,0.55)",
          fontSize: 12,
          padding: "10px",
          border: "none",
          cursor: "pointer",
        }}
      >
        閉じる
      </button>
    </>
  );
}

function useAddCandidates(open: boolean): { candidates: AddCandidate[]; loading: boolean } {
  const [candidates, setCandidates] = useState<AddCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const viewed = getViewedStores().map<AddCandidate>((v) => ({
      id: v.id,
      name: v.name,
      area: v.area,
      category: v.category,
      image_url: v.image_url,
      source: "viewed",
    }));
    setCandidates(viewed);
    setLoading(true);
    fetch("/api/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { pickup_shops?: PickupApiShape[] } | null) => {
        const pickup = (data?.pickup_shops ?? []).map<AddCandidate>((p) => ({
          id: p.id,
          name: p.name,
          area: p.area,
          category: p.category,
          image_url: pickupImage(p),
          source: "pickup",
        }));
        // viewed を優先しつつ id 重複を排除
        const seen = new Set<number>();
        const merged: AddCandidate[] = [];
        for (const item of [...viewed, ...pickup]) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          merged.push(item);
        }
        setCandidates(merged);
      })
      .catch(() => {
        /* viewed だけでも残す */
      })
      .finally(() => setLoading(false));
  }, [open]);
  return { candidates, loading };
}

function CompareSheet({
  tray,
  canCompare,
  onCompare,
  onRemove,
  onClear,
  onClose,
}: {
  tray: CompareTrayItem[];
  canCompare: boolean;
  onCompare: () => void;
  onRemove: (id: number) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const { candidates, loading } = useAddCandidates(true);
  const trayIds = new Set(tray.map((t) => t.id));
  const addable = candidates.filter((c) => !trayIds.has(c.id));
  const isFull = tray.length >= COMPARE_MAX_ITEMS;

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <GitCompareArrows size={16} style={{ color: GOLD }} aria-hidden />
          <h2 style={{ fontWeight: 700, fontSize: 15, color: DARK, margin: 0 }}>
            比較リスト {tray.length}/{COMPARE_MAX_ITEMS}
          </h2>
        </div>
        {tray.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(27,37,40,0.5)",
              fontSize: 11,
              cursor: "pointer",
              textDecoration: "underline",
              padding: 0,
            }}
          >
            全クリア
          </button>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: "rgba(27,37,40,0.5)", margin: "0 0 10px" }}>
        2 件以上選ぶと比較ページに進めます。
      </p>

      {/* 選択中チップ列 */}
      {tray.length > 0 && (
        <ul className="flex gap-2 overflow-x-auto pb-1 mb-3" style={{ scrollbarWidth: "none" }}>
          {tray.map((item) => (
            <li
              key={item.id}
              className="relative shrink-0 rounded-xl overflow-hidden"
              style={{ width: 72, height: 72, background: "rgba(27,37,40,0.06)" }}
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
                  style={{ color: GOLD, fontWeight: 700, fontSize: 22 }}
                >
                  {item.name.charAt(0)}
                </span>
              )}
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 px-1 py-0.5"
                style={{
                  background: "linear-gradient(180deg,transparent,rgba(0,0,0,0.85))",
                  fontSize: 9,
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
                onClick={() => onRemove(item.id)}
                aria-label={`${item.name} を比較から外す`}
                className="absolute top-0.5 right-0.5 inline-flex items-center justify-center rounded-full active:scale-90"
                style={{
                  width: 18,
                  height: 18,
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={10} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 追加候補 — viewed + pickup マージ */}
      {!isFull && (
        <div className="mb-3">
          <p
            style={{
              fontSize: 11,
              color: "rgba(27,37,40,0.55)",
              fontWeight: 700,
              margin: "0 0 6px",
              letterSpacing: "0.02em",
            }}
          >
            この中から追加できます
          </p>
          {addable.length === 0 ? (
            <div
              style={{
                padding: "12px",
                textAlign: "center",
                background: "rgba(27,37,40,0.03)",
                borderRadius: 10,
                color: "rgba(27,37,40,0.45)",
                fontSize: 11.5,
              }}
            >
              {loading ? "候補を読み込み中..." : "他に追加できる店舗がありません"}
            </div>
          ) : (
            <ul
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {addable.slice(0, 12).map((c) => (
                <li key={c.id} className="shrink-0" style={{ width: 88 }}>
                  <button
                    type="button"
                    onClick={() => {
                      addToCompareTray({
                        id: c.id,
                        name: c.name,
                        area: c.area,
                        category: c.category,
                        image_url: c.image_url,
                      });
                    }}
                    aria-label={`${c.name} を比較に追加`}
                    className="w-full active:scale-95 transition-transform"
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      textAlign: "left",
                    }}
                  >
                    <div
                      className="relative overflow-hidden rounded-lg"
                      style={{ aspectRatio: "1 / 1", background: "rgba(27,37,40,0.06)" }}
                    >
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt=""
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span style={{ color: GOLD, fontWeight: 700, fontSize: 24 }}>
                            {c.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      {/* 追加 + アイコン */}
                      <span
                        aria-hidden
                        className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full"
                        style={{
                          width: 22,
                          height: 22,
                          background: GOLD,
                          color: DARK,
                          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                        }}
                      >
                        <Plus size={14} strokeWidth={3} />
                      </span>
                      {/* ソース表示 (履歴 / ピックアップ) */}
                      <span
                        aria-hidden
                        style={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          padding: "1px 5px",
                          fontSize: 8.5,
                          fontWeight: 700,
                          color: "white",
                          background: c.source === "viewed" ? "rgba(0,0,0,0.55)" : "rgba(200,96,128,0.85)",
                          borderRadius: 4,
                          letterSpacing: "0.04em",
                        }}
                      >
                        {c.source === "viewed" ? "履歴" : "PR"}
                      </span>
                    </div>
                    <p
                      style={{
                        margin: "5px 0 0",
                        fontSize: 10.5,
                        fontWeight: 600,
                        color: DARK,
                        lineHeight: 1.3,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {c.name}
                    </p>
                    {c.area && (
                      <p
                        style={{
                          margin: "1px 0 0",
                          fontSize: 9.5,
                          color: "rgba(27,37,40,0.45)",
                          lineHeight: 1.2,
                        }}
                      >
                        {c.area}
                      </p>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="button"
        disabled={!canCompare}
        onClick={onCompare}
        className="w-full active:scale-[0.99] transition-transform disabled:opacity-50"
        style={{
          background: canCompare ? GOLD : "rgba(212,175,55,0.4)",
          color: DARK,
          fontWeight: 700,
          fontSize: 14,
          padding: "13px 16px",
          border: "none",
          borderRadius: 14,
          cursor: canCompare ? "pointer" : "not-allowed",
        }}
      >
        {canCompare ? `比較する（${tray.length}件） ▸` : "あと1件追加してください"}
      </button>
      <button
        type="button"
        onClick={onClose}
        className="w-full mt-2"
        style={{
          background: "transparent",
          color: "rgba(27,37,40,0.55)",
          fontSize: 12,
          padding: "10px",
          border: "none",
          cursor: "pointer",
        }}
      >
        閉じる
      </button>
    </>
  );
}
