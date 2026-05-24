import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, MapPin, Sparkles } from "lucide-react";

import Footer from "~/components/user/shared/Footer";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import LineCtaCard from "~/components/user/shared/LineCtaCard";

// ─── Constants ─────────────────────────────────────
const GOLD = "#D4AF37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

// ─── Types ─────────────────────────────────────────
interface StoreImage {
  url: string;
  order: number;
}
interface BackItem {
  label: string;
  amount: number;
}

/**
 * 比較に使うフィールドだけ最小限抜き出す。 /api/stores/:id の return shape
 * を全部受けるとノイズが多いので、ここでは比較表が触る field だけ宣言する。
 */
interface ComparableStore {
  id: number;
  name: string;
  area?: string;
  category?: string;
  nearest_station?: string;
  opening_time?: string;
  closing_time?: string;
  business_hours?: string;
  holidays?: string;
  shift_info?: string;
  hourly_min?: number;
  hourly_max?: number;
  daily_estimate?: number;
  trial_hourly?: number;
  trial_avg_hourly?: number;
  same_day_trial?: boolean;
  back_items?: BackItem[];
  norma_info?: string;
  feature_tags?: string[];
  images?: StoreImage[];
  required_documents?: { documents?: string[] } | null;
  reviews_count?: number;
  average_rating?: number;
  analysis?: {
    experience_level?: number;
    atmosphere?: number;
    drinking_style?: number;
  } | null;
}

interface CompareApiResponse {
  store: ComparableStore;
}

interface ComparePageProps {
  idA: number;
  idB: number;
}

// ─── Helpers ───────────────────────────────────────
function formatYen(value: number | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return "—";
  return `¥${value.toLocaleString()}`;
}

function pickHeroImage(store: ComparableStore): string | undefined {
  if (!store.images || store.images.length === 0) return undefined;
  const sorted = [...store.images].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return sorted[0]?.url;
}

/**
 * 「より高い側」または「条件として優位な側」をハイライトする側を返す。
 * undefined のときは両方フラット（差なし or 比較不能）。
 */
type Winner = "A" | "B" | undefined;
function higherNumber(a: number | undefined, b: number | undefined): Winner {
  if (a === undefined && b === undefined) return undefined;
  if (a === undefined) return "B";
  if (b === undefined) return "A";
  if (a === b) return undefined;
  return a > b ? "A" : "B";
}
function trueIsBetter(a: boolean | undefined, b: boolean | undefined): Winner {
  if (a === b) return undefined;
  return a ? "A" : "B";
}

// ─── Sub-components ────────────────────────────────
function CompareHeaderCell({
  store,
  side,
}: {
  store: ComparableStore;
  side: "A" | "B";
}) {
  const img = pickHeroImage(store);
  return (
    <Link
      to={`/stores/${store.id}`}
      className="block active:scale-[0.99] transition-transform"
      style={{ textDecoration: "none" }}
    >
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          aspectRatio: "1 / 1",
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
        }}
      >
        {img ? (
          <img src={img} alt={store.name} className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span style={{ fontSize: 32, fontWeight: 700, color: GOLD }}>
              {store.name.charAt(0)}
            </span>
          </div>
        )}
        <div
          className="absolute inset-0"
          aria-hidden
          style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.55) 100%)" }}
        />
        <span
          aria-hidden
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
          style={{
            background: side === "A" ? GOLD : "rgba(255,255,255,.95)",
            color: DARK,
            letterSpacing: "0.08em",
          }}
        >
          {side}
        </span>
        <div className="absolute bottom-1 left-1.5 right-1.5">
          <p
            className="text-[11.5px] font-bold leading-tight"
            style={{
              color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,.55)",
              fontFamily: J,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {store.name}
          </p>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1">
        <MapPin size={10} style={{ color: "rgba(27,37,40,0.4)" }} aria-hidden />
        <span
          className="text-[10px] truncate"
          style={{ color: "rgba(27,37,40,0.55)", fontFamily: J }}
        >
          {store.area ?? "—"}
        </span>
      </div>
    </Link>
  );
}

function CompareRow({
  label,
  valueA,
  valueB,
  winner,
}: {
  label: string;
  valueA: React.ReactNode;
  valueB: React.ReactNode;
  winner?: Winner;
}) {
  const cellBase: React.CSSProperties = {
    padding: "10px 8px",
    textAlign: "center",
    fontFamily: J,
    fontSize: "12px",
    color: DARK,
    lineHeight: 1.45,
    wordBreak: "break-word",
  };
  const winnerStyle: React.CSSProperties = {
    background: `${GOLD}1f`,
    boxShadow: `inset 0 0 0 1px ${GOLD}66`,
    borderRadius: 6,
    fontWeight: 700,
  };
  return (
    <div
      role="row"
      className="grid items-stretch"
      style={{ gridTemplateColumns: "92px 1fr 1fr", borderTop: "1px solid rgba(27,37,40,0.06)" }}
    >
      <div
        role="rowheader"
        style={{
          padding: "10px 10px",
          fontFamily: J,
          fontSize: "11px",
          color: "rgba(27,37,40,0.55)",
          background: "rgba(27,37,40,0.025)",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        role="cell"
        aria-label={winner === "A" ? `A: 優位` : undefined}
        style={{
          ...cellBase,
          ...(winner === "A" ? winnerStyle : null),
        }}
      >
        {valueA}
      </div>
      <div
        role="cell"
        aria-label={winner === "B" ? `B: 優位` : undefined}
        style={{
          ...cellBase,
          ...(winner === "B" ? winnerStyle : null),
        }}
      >
        {valueB}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="flex items-center gap-2 px-3 pt-4 pb-2"
      style={{
        fontFamily: "'Outfit','Noto Sans JP',sans-serif",
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.04em",
        color: DARK,
        margin: 0,
      }}
    >
      <span
        className="inline-block w-[3px] h-3 rounded-full"
        style={{ background: GOLD }}
        aria-hidden
      />
      {children}
    </h2>
  );
}

function CompareSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pt-6 pb-24">
      <div className="h-5 w-32 rounded mb-4" style={{ background: "rgba(27,37,40,0.08)" }} />
      <div className="grid grid-cols-2 gap-3">
        <div className="aspect-square rounded-xl" style={{ background: "rgba(27,37,40,0.08)" }} />
        <div className="aspect-square rounded-xl" style={{ background: "rgba(27,37,40,0.08)" }} />
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded" style={{ background: "rgba(27,37,40,0.05)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Main ──────────────────────────────────────────
export default function ComparePage({ idA, idB }: ComparePageProps) {
  const navigate = useNavigate();
  const [storeA, setStoreA] = useState<ComparableStore | null>(null);
  const [storeB, setStoreB] = useState<ComparableStore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Same store IDs are useless to compare. Surface as an error rather than
    // showing two identical columns.
    if (idA === idB) {
      setError("同じ店舗同士は比較できません。別の店舗を選んでください。");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchStore = (id: number) =>
      fetch(`/api/stores/${id}`).then(async (r) => {
        if (!r.ok) {
          // 404 / 5xx を区別せずまとめて「取得失敗」扱い。比較ページでは
          // 「店舗が見つからない」と表示するだけなので status の細分化は不要。
          throw new Error(String(r.status));
        }
        return (await r.json()) as CompareApiResponse;
      });

    // Promise.allSettled で各リクエストの成否を side ごとに type-safe に判定する。
    // 旧実装は "A:404" のような magic prefix string を Error.message で識別していたが、
    // 別の場所で `throw new Error("Auth failed")` 等が混入した瞬間に誤分岐するため、
    // 配列インデックスで side を識別する形に変更。
    Promise.allSettled([fetchStore(idA), fetchStore(idB)]).then(([resA, resB]) => {
      if (cancelled) return;

      if (resA.status === "rejected") {
        setError("1つ目の店舗が見つかりませんでした。");
        setLoading(false);
        return;
      }
      if (resB.status === "rejected") {
        setError("2つ目の店舗が見つかりませんでした。");
        setLoading(false);
        return;
      }
      setStoreA(resA.value.store);
      setStoreB(resB.value.store);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [idA, idB]);

  // Comparison rows (memoized so we don't recompute "winner" highlights
  // on every render).
  const rows = useMemo(() => {
    if (!storeA || !storeB) return null;

    const backTotal = (s: ComparableStore) =>
      (s.back_items ?? []).reduce((acc, b) => acc + (b.amount ?? 0), 0);

    return {
      basic: [
        {
          label: "エリア",
          valueA: storeA.area ?? "—",
          valueB: storeB.area ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "カテゴリ",
          valueA: storeA.category ?? "—",
          valueB: storeB.category ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "最寄り駅",
          valueA: storeA.nearest_station ?? "—",
          valueB: storeB.nearest_station ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "営業時間",
          valueA:
            storeA.opening_time && storeA.closing_time
              ? `${storeA.opening_time}〜${storeA.closing_time}`
              : storeA.business_hours ?? "—",
          valueB:
            storeB.opening_time && storeB.closing_time
              ? `${storeB.opening_time}〜${storeB.closing_time}`
              : storeB.business_hours ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "定休日",
          valueA: storeA.holidays ?? "—",
          valueB: storeB.holidays ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "シフト",
          valueA: storeA.shift_info ?? "—",
          valueB: storeB.shift_info ?? "—",
          winner: undefined as Winner,
        },
      ],
      salary: [
        {
          label: "時給(上限)",
          valueA: formatYen(storeA.hourly_max),
          valueB: formatYen(storeB.hourly_max),
          winner: higherNumber(storeA.hourly_max, storeB.hourly_max),
        },
        {
          label: "時給(下限)",
          valueA: formatYen(storeA.hourly_min),
          valueB: formatYen(storeB.hourly_min),
          winner: higherNumber(storeA.hourly_min, storeB.hourly_min),
        },
        {
          label: "日給目安",
          valueA: formatYen(storeA.daily_estimate),
          valueB: formatYen(storeB.daily_estimate),
          winner: higherNumber(storeA.daily_estimate, storeB.daily_estimate),
        },
        {
          label: "体験時給",
          valueA: formatYen(storeA.trial_hourly),
          valueB: formatYen(storeB.trial_hourly),
          winner: higherNumber(storeA.trial_hourly, storeB.trial_hourly),
        },
        {
          label: "バック合計",
          valueA: formatYen(backTotal(storeA)),
          valueB: formatYen(backTotal(storeB)),
          winner: higherNumber(backTotal(storeA), backTotal(storeB)),
        },
      ],
      trial: [
        {
          label: "当日体験",
          valueA: storeA.same_day_trial ? "可能" : "—",
          valueB: storeB.same_day_trial ? "可能" : "—",
          winner: trueIsBetter(storeA.same_day_trial, storeB.same_day_trial),
        },
        {
          label: "ノルマ",
          valueA: storeA.norma_info ?? "—",
          valueB: storeB.norma_info ?? "—",
          winner: undefined as Winner,
        },
        {
          label: "必要書類",
          valueA: storeA.required_documents?.documents?.length
            ? `${storeA.required_documents.documents.length}点`
            : "—",
          valueB: storeB.required_documents?.documents?.length
            ? `${storeB.required_documents.documents.length}点`
            : "—",
          winner: undefined as Winner,
        },
      ],
      analysis: [
        {
          label: "経験レベル",
          valueA:
            storeA.analysis?.experience_level !== undefined
              ? `${storeA.analysis.experience_level}%`
              : "—",
          valueB:
            storeB.analysis?.experience_level !== undefined
              ? `${storeB.analysis.experience_level}%`
              : "—",
          winner: undefined as Winner,
        },
        {
          label: "雰囲気",
          valueA:
            storeA.analysis?.atmosphere !== undefined
              ? `${storeA.analysis.atmosphere}%`
              : "—",
          valueB:
            storeB.analysis?.atmosphere !== undefined
              ? `${storeB.analysis.atmosphere}%`
              : "—",
          winner: undefined as Winner,
        },
        {
          label: "飲み度",
          valueA:
            storeA.analysis?.drinking_style !== undefined
              ? `${storeA.analysis.drinking_style}%`
              : "—",
          valueB:
            storeB.analysis?.drinking_style !== undefined
              ? `${storeB.analysis.drinking_style}%`
              : "—",
          winner: undefined as Winner,
        },
      ],
      community: [
        {
          label: "口コミ件数",
          valueA: `${storeA.reviews_count ?? 0}件`,
          valueB: `${storeB.reviews_count ?? 0}件`,
          winner: higherNumber(storeA.reviews_count, storeB.reviews_count),
        },
        {
          label: "平均評価",
          valueA: storeA.average_rating ? storeA.average_rating.toFixed(1) : "—",
          valueB: storeB.average_rating ? storeB.average_rating.toFixed(1) : "—",
          winner: higherNumber(storeA.average_rating, storeB.average_rating),
        },
      ],
    };
  }, [storeA, storeB]);

  return (
    <div
      className="min-h-screen bg-[#f5f5f5] flex justify-center"
      style={{ fontFamily: "'Outfit','Noto Sans JP',sans-serif" }}
    >
      <div className="relative w-full max-w-[430px] bg-[#f5f5f5] min-h-screen flex flex-col pb-[68px]">
        {/* Back nav */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              // シェアされた /compare/:a/:b URL で直接開かれた場合 (history.length<=1)
              // は navigate(-1) が反応しない。/stores にフォールバックして
              // 「行き止まり」を作らない。
              if (typeof window !== "undefined" && window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/stores");
              }
            }}
            aria-label="前のページに戻る"
            className="inline-flex items-center gap-1 active:scale-95 transition-transform"
            style={{
              padding: "6px 10px 6px 4px",
              color: "rgba(27,37,40,0.6)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: J,
              fontSize: "12.5px",
            }}
          >
            <ChevronLeft size={16} aria-hidden />
            <span>戻る</span>
          </button>
        </div>

        <div className="px-5 pt-1 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={18} style={{ color: GOLD }} aria-hidden />
            <h1
              style={{
                fontFamily: J,
                fontWeight: 700,
                fontSize: "17px",
                color: DARK,
                margin: 0,
              }}
            >
              店舗を比較
            </h1>
          </div>
          <p
            className="mt-1"
            style={{
              fontFamily: J,
              fontSize: "11.5px",
              color: "rgba(27,37,40,0.5)",
              margin: 0,
            }}
          >
            ゴールドのセルは「より条件が良い側」を示します。
          </p>
        </div>

        {loading && <CompareSkeleton />}

        {!loading && error && (
          <div className="px-5 pt-8">
            <div
              className="rounded-xl p-4 text-center"
              style={{
                background: "white",
                border: "1px solid rgba(27,37,40,0.08)",
                fontFamily: J,
                fontSize: "13px",
                color: "rgba(27,37,40,0.7)",
              }}
            >
              {error}
              <div className="mt-3">
                <Link
                  to="/stores"
                  className="inline-block px-4 py-2 rounded-md active:scale-95 transition-transform"
                  style={{
                    background: GOLD,
                    color: "white",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: "12px",
                  }}
                >
                  店舗一覧へ
                </Link>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && storeA && storeB && rows && (
          <div className="px-4 pt-2">
            {/* Header row: image + name for each side */}
            <div
              className="grid items-end gap-3"
              style={{ gridTemplateColumns: "92px 1fr 1fr" }}
            >
              <div />
              <CompareHeaderCell store={storeA} side="A" />
              <CompareHeaderCell store={storeB} side="B" />
            </div>

            {/* Sections — SR にテーブル構造として読ませる */}
            <div
              role="table"
              aria-label={`${storeA.name} と ${storeB.name} の比較表`}
              className="mt-5 rounded-2xl overflow-hidden"
              style={{
                background: "white",
                border: "1px solid rgba(27,37,40,0.07)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
              }}
            >
              <SectionTitle>基本情報</SectionTitle>
              {rows.basic.map((r) => (
                <CompareRow key={r.label} {...r} />
              ))}

              <SectionTitle>給与</SectionTitle>
              {rows.salary.map((r) => (
                <CompareRow key={r.label} {...r} />
              ))}

              <SectionTitle>体験・採用</SectionTitle>
              {rows.trial.map((r) => (
                <CompareRow key={r.label} {...r} />
              ))}

              <SectionTitle>分析</SectionTitle>
              {rows.analysis.map((r) => (
                <CompareRow key={r.label} {...r} />
              ))}

              <SectionTitle>コミュニティ</SectionTitle>
              {rows.community.map((r) => (
                <CompareRow key={r.label} {...r} />
              ))}
            </div>

            {/* LINE CTA at the bottom */}
            <div className="mt-6">
              <LineCtaCard
                variant="card"
                title="どちらにするか迷ったら"
                description="あなたの希望に合う方をLINEで担当者がご提案します"
                ctaLabel="LINEで相談"
                source="store-detail:compare-result"
              />
            </div>

            {/* Quick navigation back to each store */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Link
                to={`/stores/${storeA.id}`}
                className="rounded-xl text-center py-3 active:scale-[0.98] transition-transform"
                style={{
                  background: "white",
                  border: `1px solid ${GOLD}66`,
                  color: DARK,
                  textDecoration: "none",
                  fontFamily: J,
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                A の詳細を見る
              </Link>
              <Link
                to={`/stores/${storeB.id}`}
                className="rounded-xl text-center py-3 active:scale-[0.98] transition-transform"
                style={{
                  background: "white",
                  border: `1px solid ${GOLD}66`,
                  color: DARK,
                  textDecoration: "none",
                  fontFamily: J,
                  fontWeight: 600,
                  fontSize: "12px",
                }}
              >
                B の詳細を見る
              </Link>
            </div>
          </div>
        )}

        <Footer />
      </div>

      <BottomTabBar />
    </div>
  );
}
