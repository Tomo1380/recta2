import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, MapPin, Plus, Sparkles, X as XIcon } from "lucide-react";

import Footer from "~/components/user/shared/Footer";
import LineCtaCard from "~/components/user/shared/LineCtaCard";
import {
  COMPARE_MAX_ITEMS,
  addToCompareTray,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
} from "~/lib/compare-tray";
import { getViewedStores } from "~/lib/viewed-stores";

// ─── Constants ─────────────────────────────────────
const GOLD = "#D4AF37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

const COL_LABEL_WIDTH = 92;
const COL_STORE_WIDTH = 160;

// ─── Types ─────────────────────────────────────────
interface StoreImage {
  url: string;
  order: number;
}
interface BackItem {
  label: string;
  amount: number;
}

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
  ids: number[];
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

/** N 件比較で「より良い側」のインデックスを求める。同値や該当なしは null。 */
function bestIndex(values: Array<number | undefined>, direction: "higher" | "lower" = "higher"): number | null {
  const finite = values
    .map((v, i) => ({ v, i }))
    .filter((x): x is { v: number; i: number } => Number.isFinite(x.v));
  if (finite.length === 0) return null;
  const bestValue =
    direction === "higher"
      ? Math.max(...finite.map((x) => x.v))
      : Math.min(...finite.map((x) => x.v));
  const winners = finite.filter((x) => x.v === bestValue);
  // 同値の店舗があれば「優位」と呼ばないでフラットに
  if (winners.length > 1) return null;
  return winners[0]?.i ?? null;
}

// ─── Sub-components ────────────────────────────────
function CompareHeaderCell({
  store,
  onRemove,
}: {
  store: ComparableStore;
  onRemove: () => void;
}) {
  const img = pickHeroImage(store);
  return (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        aspectRatio: "1 / 1",
        background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
      }}
    >
      <Link
        to={`/stores/${store.id}`}
        className="block w-full h-full active:scale-[0.99] transition-transform"
        style={{ textDecoration: "none" }}
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
          style={{ background: "linear-gradient(180deg,transparent 40%,rgba(0,0,0,.6) 100%)" }}
        />
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
      </Link>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove();
        }}
        aria-label={`${store.name} を比較から外す`}
        className="absolute top-1 right-1 inline-flex items-center justify-center rounded-full active:scale-90 transition-transform"
        style={{
          width: 22,
          height: 22,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(6px)",
          border: "none",
          cursor: "pointer",
          color: "white",
        }}
      >
        <XIcon size={12} aria-hidden />
      </button>
    </div>
  );
}

/** 「+ 店舗を追加」のヘッダースロット */
function AddSlot({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 active:scale-[0.98] transition-transform"
      style={{
        aspectRatio: "1 / 1",
        borderColor: "rgba(212,175,55,0.4)",
        background: "rgba(212,175,55,0.06)",
        cursor: "pointer",
        color: "rgba(212,175,55,0.95)",
        fontFamily: J,
      }}
      aria-label="比較に店舗を追加"
    >
      <Plus size={20} aria-hidden />
      <span className="text-[10.5px] font-semibold">店舗を追加</span>
    </button>
  );
}

function CompareRow({
  label,
  values,
  bestAt,
}: {
  label: string;
  values: React.ReactNode[];
  bestAt?: number | null;
}) {
  return (
    <div
      role="row"
      className="grid items-stretch"
      style={{
        gridTemplateColumns: `${COL_LABEL_WIDTH}px repeat(${values.length}, ${COL_STORE_WIDTH}px)`,
        borderTop: "1px solid rgba(27,37,40,0.06)",
        // 横幅は親の grid を継承
        minWidth: COL_LABEL_WIDTH + COL_STORE_WIDTH * values.length,
      }}
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
          position: "sticky",
          left: 0,
          zIndex: 1,
        }}
      >
        {label}
      </div>
      {values.map((v, i) => {
        const isBest = bestAt === i;
        return (
          <div
            key={i}
            role="cell"
            aria-label={isBest ? "優位" : undefined}
            style={{
              padding: "10px 8px",
              textAlign: "center",
              fontFamily: J,
              fontSize: "12px",
              color: DARK,
              lineHeight: 1.45,
              wordBreak: "break-word",
              ...(isBest
                ? {
                    background: `${GOLD}1f`,
                    boxShadow: `inset 0 0 0 1px ${GOLD}66`,
                    borderRadius: 6,
                    fontWeight: 700,
                  }
                : null),
            }}
          >
            {v}
          </div>
        );
      })}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className="flex items-center gap-2 px-3 pt-4 pb-2"
      style={{
        fontWeight: 700,
        fontSize: "13px",
        letterSpacing: "0.04em",
        color: DARK,
        margin: 0,
        position: "sticky",
        left: 0,
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
    <div className="w-full px-5 pt-6 pb-24">
      <div className="h-5 w-32 rounded mb-4" style={{ background: "rgba(27,37,40,0.08)" }} />
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl shrink-0"
            style={{ width: COL_STORE_WIDTH, aspectRatio: "1/1", background: "rgba(27,37,40,0.08)" }}
          />
        ))}
      </div>
      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 rounded" style={{ background: "rgba(27,37,40,0.05)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Picker modal (店舗を追加) ──────────────────────
interface PickerCandidate {
  id: number;
  name: string;
  area?: string;
  image_url?: string;
  hourly_min?: number;
  hourly_max?: number;
}

interface PickupApiShape {
  id: number;
  name: string;
  area?: string;
  hourly_min?: number;
  hourly_max?: number;
  images?: (string | { url?: string })[];
}

function pickupImage(p: PickupApiShape): string | undefined {
  const first = p.images?.[0];
  if (!first) return undefined;
  return typeof first === "string" ? first : first.url;
}

function AddStorePicker({
  open,
  currentIds,
  onSelect,
  onClose,
}: {
  open: boolean;
  currentIds: number[];
  onSelect: (id: number, candidate: PickerCandidate) => void;
  onClose: () => void;
}) {
  const [pickup, setPickup] = useState<PickerCandidate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/api/home")
      .then((r) => r.json() as Promise<{ pickup_shops?: PickupApiShape[] }>)
      .then((data) => {
        const list = (data.pickup_shops ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          area: p.area,
          hourly_min: p.hourly_min,
          hourly_max: p.hourly_max,
          image_url: pickupImage(p),
        }));
        setPickup(list);
      })
      .catch(() => setPickup([]))
      .finally(() => setLoading(false));
  }, [open]);

  const viewed = getViewedStores().map<PickerCandidate>((v) => ({
    id: v.id,
    name: v.name,
    area: v.area,
    image_url: v.image_url,
    hourly_min: v.hourly_min,
    hourly_max: v.hourly_max,
  }));

  // 重複と「既に比較中」の店舗を除外
  const seen = new Set<number>(currentIds);
  const dedupe = (list: PickerCandidate[]) =>
    list.filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });

  const recents = dedupe(viewed);
  const picks = dedupe(pickup);
  const totalCount = recents.length + picks.length;

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="picker-title"
      className="fixed inset-0 z-[100] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px] bg-white rounded-t-2xl flex flex-col"
        style={{ maxHeight: "82vh", boxShadow: "0 -8px 32px rgba(0,0,0,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-2 pb-1 flex justify-center">
          <span
            aria-hidden
            className="block rounded-full"
            style={{ width: 36, height: 4, background: "rgba(27,37,40,0.18)" }}
          />
        </div>
        <div className="px-4 pt-1 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="picker-title" style={{ fontFamily: J, fontWeight: 700, fontSize: 15, color: DARK, margin: 0 }}>
              比較に追加する店舗
            </h2>
            <p style={{ fontFamily: J, fontSize: 11.5, color: "rgba(27,37,40,0.55)", margin: "4px 0 0" }}>
              最大 {COMPARE_MAX_ITEMS} 件まで選択できます（現在 {currentIds.length} 件）
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            className="shrink-0 rounded-full p-1.5 active:scale-90 transition-transform"
            style={{ background: "rgba(27,37,40,0.06)", border: "none", cursor: "pointer" }}
          >
            <XIcon size={16} style={{ color: "rgba(27,37,40,0.65)" }} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {loading && totalCount === 0 && (
            <div className="py-6 text-center" style={{ color: "rgba(27,37,40,0.4)", fontSize: 12, fontFamily: J }}>
              候補を読み込み中…
            </div>
          )}
          {!loading && totalCount === 0 && (
            <p className="py-8 text-center" style={{ color: "rgba(27,37,40,0.55)", fontSize: 12, fontFamily: J }}>
              追加できる候補がありません。<br />
              店舗一覧から探してチェックしてください。
            </p>
          )}
          {recents.length > 0 && (
            <PickerSection title="最近見た店舗" items={recents} onSelect={onSelect} />
          )}
          {picks.length > 0 && (
            <PickerSection title="ピックアップ店舗" items={picks} onSelect={onSelect} />
          )}
          <div className="mt-4 text-center">
            <Link
              to="/stores"
              onClick={onClose}
              className="inline-block text-[11.5px] underline"
              style={{ color: GOLD, fontFamily: J }}
            >
              店舗一覧でもっと探す →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function PickerSection({
  title,
  items,
  onSelect,
}: {
  title: string;
  items: PickerCandidate[];
  onSelect: (id: number, candidate: PickerCandidate) => void;
}) {
  return (
    <section className="mt-3 first:mt-1">
      <h3
        className="px-1 pb-1.5"
        style={{
            fontWeight: 600,
          fontSize: 10.5,
          letterSpacing: "0.12em",
          color: "rgba(27,37,40,0.45)",
          textTransform: "uppercase",
          margin: 0,
        }}
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onSelect(c.id, c)}
              aria-label={`${c.name} を比較に追加`}
              className="w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left active:scale-[0.99] transition-transform"
              style={{
                background: "white",
                border: "1px solid rgba(27,37,40,0.08)",
                cursor: "pointer",
                boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
              }}
            >
              <span aria-hidden className="shrink-0 rounded-lg overflow-hidden" style={{ width: 48, height: 48, background: DARK }}>
                {c.image_url ? (
                  <img src={c.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span
                    className="w-full h-full flex items-center justify-center"
                    style={{ color: GOLD, fontWeight: 700, fontSize: 18 }}
                  >
                    {c.name.charAt(0)}
                  </span>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block leading-tight"
                  style={{
                    fontFamily: J,
                    fontWeight: 600,
                    fontSize: 13,
                    color: DARK,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.name}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5">
                  <MapPin size={10} style={{ color: "rgba(27,37,40,0.4)" }} aria-hidden />
                  <span style={{ fontFamily: J, fontSize: 10.5, color: "rgba(27,37,40,0.55)" }}>{c.area ?? "—"}</span>
                  {c.hourly_min && (
                    <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 10, color: GOLD, marginLeft: 4 }}>
                      時給 ¥{c.hourly_min.toLocaleString()}
                      {c.hourly_max && c.hourly_max !== c.hourly_min ? `〜${c.hourly_max.toLocaleString()}` : ""}
                    </span>
                  )}
                </span>
              </span>
              <Plus size={16} aria-hidden style={{ color: GOLD }} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Main ──────────────────────────────────────────
export default function ComparePage({ ids }: ComparePageProps) {
  const navigate = useNavigate();
  const [stores, setStores] = useState<(ComparableStore | null)[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  // 重複 ID + 不正 ID を最初に弾く
  const uniqueIds = useMemo(() => Array.from(new Set(ids)).slice(0, COMPARE_MAX_ITEMS), [ids]);

  useEffect(() => {
    if (uniqueIds.length < 2) {
      setError("比較するには少なくとも 2 件選んでください。");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchStore = (id: number) =>
      fetch(`/api/stores/${id}`).then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return (await r.json()) as CompareApiResponse;
      });

    Promise.allSettled(uniqueIds.map(fetchStore)).then((results) => {
      if (cancelled) return;
      const missing: number[] = [];
      const fetched = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value.store;
        missing.push(uniqueIds[i]);
        return null;
      });

      if (missing.length === uniqueIds.length) {
        setError("店舗情報の取得に失敗しました。");
      } else if (missing.length > 0) {
        // 一部失敗：失敗した分だけ tray からも除去して、見える店舗だけ残す
        missing.forEach((id) => removeFromCompareTray(id));
        const remaining = uniqueIds.filter((id) => !missing.includes(id));
        // URL を見える分だけに同期して redirect
        if (remaining.length >= 2) {
          navigate(`/compare/${remaining.join(",")}`, { replace: true });
          return;
        }
        navigate("/stores", { replace: true });
        return;
      }
      setStores(fetched);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [uniqueIds, navigate]);

  // ── 行データを memoize ──
  const rows = useMemo(() => {
    const valid = stores.filter((s): s is ComparableStore => s !== null);
    if (valid.length < 2) return null;

    const num = (fn: (s: ComparableStore) => number | undefined) =>
      valid.map(fn);
    const backTotal = (s: ComparableStore) =>
      (s.back_items ?? []).reduce((acc, b) => acc + (b.amount ?? 0), 0);

    return {
      basic: [
        { label: "エリア", values: valid.map((s) => s.area ?? "—"), bestAt: null },
        { label: "カテゴリ", values: valid.map((s) => s.category ?? "—"), bestAt: null },
        { label: "最寄り駅", values: valid.map((s) => s.nearest_station ?? "—"), bestAt: null },
        {
          label: "営業時間",
          values: valid.map((s) =>
            s.opening_time && s.closing_time
              ? `${s.opening_time}〜${s.closing_time}`
              : s.business_hours ?? "—",
          ),
          bestAt: null,
        },
        { label: "定休日", values: valid.map((s) => s.holidays ?? "—"), bestAt: null },
        { label: "シフト", values: valid.map((s) => s.shift_info ?? "—"), bestAt: null },
      ],
      salary: [
        {
          label: "時給(上限)",
          values: valid.map((s) => formatYen(s.hourly_max)),
          bestAt: bestIndex(num((s) => s.hourly_max)),
        },
        {
          label: "時給(下限)",
          values: valid.map((s) => formatYen(s.hourly_min)),
          bestAt: bestIndex(num((s) => s.hourly_min)),
        },
        {
          label: "日給目安",
          values: valid.map((s) => formatYen(s.daily_estimate)),
          bestAt: bestIndex(num((s) => s.daily_estimate)),
        },
        {
          label: "体験時給",
          values: valid.map((s) => formatYen(s.trial_hourly)),
          bestAt: bestIndex(num((s) => s.trial_hourly)),
        },
        {
          label: "バック合計",
          values: valid.map((s) => formatYen(backTotal(s))),
          bestAt: bestIndex(valid.map(backTotal)),
        },
      ],
      trial: [
        {
          label: "当日体験",
          values: valid.map((s) => (s.same_day_trial ? "可能" : "—")),
          bestAt: bestIndex(valid.map((s) => (s.same_day_trial ? 1 : 0))),
        },
        { label: "ノルマ", values: valid.map((s) => s.norma_info ?? "—"), bestAt: null },
        {
          label: "必要書類",
          values: valid.map((s) =>
            s.required_documents?.documents?.length
              ? `${s.required_documents.documents.length}点`
              : "—",
          ),
          // 必要書類は少ない方が良いので direction=lower
          bestAt: bestIndex(
            valid.map((s) => s.required_documents?.documents?.length),
            "lower",
          ),
        },
      ],
      analysis: [
        {
          label: "経験レベル",
          values: valid.map((s) =>
            s.analysis?.experience_level !== undefined ? `${s.analysis.experience_level}%` : "—",
          ),
          bestAt: null,
        },
        {
          label: "雰囲気",
          values: valid.map((s) =>
            s.analysis?.atmosphere !== undefined ? `${s.analysis.atmosphere}%` : "—",
          ),
          bestAt: null,
        },
        {
          label: "飲み度",
          values: valid.map((s) =>
            s.analysis?.drinking_style !== undefined ? `${s.analysis.drinking_style}%` : "—",
          ),
          bestAt: null,
        },
      ],
      community: [
        {
          label: "口コミ件数",
          values: valid.map((s) => `${s.reviews_count ?? 0}件`),
          bestAt: bestIndex(num((s) => s.reviews_count)),
        },
        {
          label: "平均評価",
          values: valid.map((s) => (s.average_rating ? s.average_rating.toFixed(1) : "—")),
          bestAt: bestIndex(num((s) => s.average_rating)),
        },
      ],
    };
  }, [stores]);

  const validStores = stores.filter((s): s is ComparableStore => s !== null);
  const canAdd = validStores.length < COMPARE_MAX_ITEMS;

  // ── 個別×：tray から消し、残りの URL に navigate ──
  const handleRemove = (id: number) => {
    const next = removeFromCompareTray(id);
    const remainingIds = next.map((t) => t.id);
    if (remainingIds.length < 2) {
      navigate("/stores", { replace: true });
      return;
    }
    navigate(`/compare/${remainingIds.join(",")}`, { replace: true });
  };

  // ── 追加：picker で選んで tray に追加し URL 更新 ──
  const handleAdd = (id: number, candidate: PickerCandidate) => {
    addToCompareTray({
      id,
      name: candidate.name,
      area: candidate.area,
      image_url: candidate.image_url,
    });
    setPickerOpen(false);
    // tray が更新された結果を見て URL を再構築
    const nextIds = Array.from(new Set([...uniqueIds, id])).slice(0, COMPARE_MAX_ITEMS);
    navigate(`/compare/${nextIds.join(",")}`, { replace: true });
  };

  return (
    <>
        {/* Back nav */}
        <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
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
            <h1 style={{ fontFamily: J, fontWeight: 700, fontSize: "17px", color: DARK, margin: 0 }}>
              店舗を比較
            </h1>
          </div>
          <p className="mt-1" style={{ fontFamily: J, fontSize: "11.5px", color: "rgba(27,37,40,0.5)", margin: 0 }}>
            最大 {COMPARE_MAX_ITEMS} 件まで横スクロールで比較。ゴールドは「より条件が良い側」です。
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

        {!loading && !error && validStores.length >= 2 && rows && (
          <>
            {/* 横スクロール領域 — ヘッダーと本体を同じ overflow-x で包み、行内 grid で揃える */}
            <div className="px-2 pt-2 overflow-x-auto" style={{ scrollbarWidth: "thin" }}>
              <div
                style={{
                  minWidth:
                    COL_LABEL_WIDTH +
                    COL_STORE_WIDTH * (validStores.length + (canAdd ? 1 : 0)),
                }}
              >
                {/* Header row */}
                <div
                  className="grid items-end gap-0"
                  style={{
                    gridTemplateColumns: `${COL_LABEL_WIDTH}px repeat(${
                      validStores.length + (canAdd ? 1 : 0)
                    }, ${COL_STORE_WIDTH}px)`,
                    padding: "4px 0 8px",
                  }}
                >
                  <div /> {/* 左端の空白カラム */}
                  {validStores.map((s) => (
                    <div key={s.id} className="px-1.5">
                      <CompareHeaderCell store={s} onRemove={() => handleRemove(s.id)} />
                      <div className="mt-1 flex items-center gap-1 px-0.5">
                        <MapPin size={10} style={{ color: "rgba(27,37,40,0.4)" }} aria-hidden />
                        <span
                          className="text-[10px] truncate"
                          style={{ color: "rgba(27,37,40,0.55)", fontFamily: J }}
                        >
                          {s.area ?? "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {canAdd && (
                    <div className="px-1.5">
                      <AddSlot onOpen={() => setPickerOpen(true)} />
                    </div>
                  )}
                </div>

                {/* Sections */}
                <div
                  role="table"
                  aria-label={`${validStores.map((s) => s.name).join(" と ")} の比較表`}
                  className="rounded-2xl overflow-hidden"
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
              </div>
            </div>

            {/* LINE CTA */}
            <div className="px-4 mt-6">
              <LineCtaCard
                variant="card"
                title="どちらにするか迷ったら"
                description="あなたの希望に合う店舗をLINEで担当者がご提案します"
                ctaLabel="LINEで相談"
                source="store-detail:compare-result"
              />
            </div>

          </>
        )}

        <Footer />

      <AddStorePicker
        open={pickerOpen}
        currentIds={validStores.map((s) => s.id)}
        onSelect={handleAdd}
        onClose={() => setPickerOpen(false)}
      />
    </>
  );
}

// `subscribeCompareTray` を import 漏れ防止のため再export 不要だが、
// 将来 ComparePage 外から tray 変更を直接購読したい場合のためのコメント。
void subscribeCompareTray;
