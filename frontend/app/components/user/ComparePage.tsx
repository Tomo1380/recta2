import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeft, MapPin, Plus, Sparkles, X as XIcon } from "lucide-react";

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
  // 新スキーマ: value (int) + unit。旧 amount (string) は廃止だが既存
  // フィールド名で来る可能性があるので optional として残しておく。
  value?: number;
  unit?: "yen" | "percent" | "free";
  per_day?: boolean;
  /** @deprecated 旧 string 形式 */
  amount?: number | string;
}

interface StaffPhoto {
  image_url: string;
  caption?: string | null;
  staff_type?: string | null;
  display_order?: number;
}
interface CustomerAgeBand {
  label: string;
  ratio: number;
}

interface ComparableStore {
  id: number;
  name: string;
  area?: string;
  category?: string;
  // 通常時給は廃止。給与は体入時給 (trial_hourly_*) に一本化。
  daily_estimate?: number;
  trial_hourly_min?: number | string | null;
  trial_hourly_max?: number | string | null;
  /** @deprecated 旧キー (フォールバック用) */
  trial_hourly?: number | string | null;
  /** @deprecated 旧キー (フォールバック用) */
  trial_avg_hourly?: number | string | null;
  /** 体入タイプ: 'same_day' (体入確約) / 'normal' (体入可能) / 'none' (体入なし) */
  trial_type?: "same_day" | "normal" | "none";
  back_items?: BackItem[];
  norma_info?: string;
  feature_tags?: string[];
  images?: StoreImage[];
  required_documents?: { documents?: string[] } | null;
  interview_start?: string | null;
  interview_end?: string | null;
  recruitment_standards?: string | null;
  staff_photos?: StaffPhoto[];
  average_rating?: number;
  analysis?: {
    experience_level?: number;
    atmosphere?: number;
    drinking_style?: number;
    customer_age?: CustomerAgeBand[];
    cast_style?: { beauty?: number; cute?: number; glamour?: number; natural?: number };
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

/** 体入時給は number / "5,000円" / null が混在しうるので数値化する (空なら undefined)。 */
function toWageNum(v: number | string | null | undefined): number | undefined {
  const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
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

/** 各店舗の在籍女性 (staff_photos) を最大 4 枚ずつ並べる行 */
function CompareStaffPhotos({
  stores,
  hasAddSlot,
}: {
  stores: ComparableStore[];
  hasAddSlot: boolean;
}) {
  const anyPhotos = stores.some((s) => (s.staff_photos?.length ?? 0) > 0);
  if (!anyPhotos) return null;
  return (
    <div className="mt-4">
      <SectionTitle>在籍女性の例</SectionTitle>
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${COL_LABEL_WIDTH}px repeat(${
            stores.length + (hasAddSlot ? 1 : 0)
          }, ${COL_STORE_WIDTH}px)`,
          padding: "4px 0 8px",
        }}
      >
        <div /> {/* 左端の空白カラム */}
        {stores.map((s) => {
          const photos = (s.staff_photos ?? []).slice(0, 4);
          return (
            <div key={s.id} className="px-1.5">
              {photos.length === 0 ? (
                <div
                  className="rounded-lg flex items-center justify-center"
                  style={{
                    aspectRatio: "1 / 1",
                    background: "rgba(27,37,40,0.04)",
                    color: "rgba(27,37,40,0.35)",
                    fontFamily: J,
                    fontSize: 10.5,
                  }}
                >
                  —
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {photos.map((p, i) => (
                    <div
                      key={i}
                      className="relative rounded-md overflow-hidden"
                      style={{
                        aspectRatio: "1 / 1",
                        background: "rgba(27,37,40,0.06)",
                      }}
                    >
                      <img
                        src={p.image_url}
                        alt={p.caption ?? `${s.name} 在籍キャスト ${i + 1}`}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {hasAddSlot && <div />}
      </div>
    </div>
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
  trial_hourly_min?: number | string | null;
  trial_hourly_max?: number | string | null;
}

interface PickupApiShape {
  id: number;
  name: string;
  area?: string;
  trial_hourly_min?: number | string | null;
  trial_hourly_max?: number | string | null;
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
          trial_hourly_min: p.trial_hourly_min,
          trial_hourly_max: p.trial_hourly_max,
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
    trial_hourly_min: v.trial_hourly_min,
    trial_hourly_max: v.trial_hourly_max,
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
                  {(() => {
                    // 通常時給ではなく体入時給を出す。number|string|null を数値化。
                    const toN = (v: number | string | null | undefined): number | null => {
                      const n = Number(String(v ?? "").replace(/[^\d]/g, ""));
                      return Number.isFinite(n) && n > 0 ? n : null;
                    };
                    const lo = toN(c.trial_hourly_min);
                    const hi = toN(c.trial_hourly_max);
                    if (!lo && !hi) return null;
                    const head = lo ?? hi!;
                    return (
                      <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: 10, color: GOLD, marginLeft: 4 }}>
                        体入時給 ¥{head.toLocaleString()}
                        {lo && hi && hi !== lo ? `〜${hi.toLocaleString()}` : ""}
                      </span>
                    );
                  })()}
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
    // バック合計: 円のみ加算。% やフリーは合計に含めない (定額換算できないので
    // 比較行は「+ 10% 等」の補足を別途出す)。
    const backTotal = (s: ComparableStore) =>
      (s.back_items ?? []).reduce((acc, b) => {
        if (b.unit === "yen" && typeof b.value === "number") return acc + b.value;
        // 旧データ救済: amount が number / 数字文字列ならそのまま
        if (typeof b.amount === "number") return acc + b.amount;
        if (typeof b.amount === "string") {
          const n = Number(b.amount.replace(/[^0-9]/g, ""));
          if (Number.isFinite(n) && b.amount.includes("円")) return acc + n;
        }
        return acc;
      }, 0);

    const topCustomerAge = (s: ComparableStore): string => {
      const bands = s.analysis?.customer_age;
      if (!bands || bands.length === 0) return "—";
      const top = [...bands].sort((a, b) => (b.ratio ?? 0) - (a.ratio ?? 0))[0];
      return top ? `${top.label}が中心` : "—";
    };
    const topCastStyle = (s: ComparableStore): string => {
      const cs = s.analysis?.cast_style;
      if (!cs) return "—";
      const entries: Array<[string, number]> = (
        [
          ["美人系", cs.beauty ?? -1],
          ["可愛い系", cs.cute ?? -1],
          ["グラマー系", cs.glamour ?? -1],
          ["ナチュラル系", cs.natural ?? -1],
        ] as Array<[string, number]>
      ).filter(([, v]) => v >= 0);
      if (entries.length === 0) return "—";
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    };

    return {
      basic: [
        { label: "エリア", values: valid.map((s) => s.area ?? "—"), bestAt: null },
        { label: "カテゴリ", values: valid.map((s) => s.category ?? "—"), bestAt: null },
      ],
      salary: [
        // 本入店後の通常時給は載せず、体入時給(下限/上限)で比較する。
        // 新キー優先・旧キー(avg_hourly/trial_hourly)フォールバックは詳細ページと同じ。
        {
          label: "体入時給(下限)",
          values: valid.map((s) => formatYen(toWageNum(s.trial_hourly_min ?? s.trial_avg_hourly))),
          bestAt: bestIndex(num((s) => toWageNum(s.trial_hourly_min ?? s.trial_avg_hourly))),
        },
        {
          label: "体入時給(上限)",
          values: valid.map((s) => formatYen(toWageNum(s.trial_hourly_max ?? s.trial_hourly))),
          bestAt: bestIndex(num((s) => toWageNum(s.trial_hourly_max ?? s.trial_hourly))),
        },
        {
          label: "バック類",
          values: valid.map((s) => formatYen(backTotal(s))),
          bestAt: bestIndex(valid.map(backTotal)),
        },
        { label: "ノルマ・ペナ", values: valid.map((s) => s.norma_info ?? "—"), bestAt: null },
        {
          label: "未経験率",
          values: valid.map((s) =>
            s.analysis?.experience_level !== undefined ? `${s.analysis.experience_level}%` : "—",
          ),
          // 未経験率は高い方が未経験者にとって安心 → higher 優位
          bestAt: bestIndex(num((s) => s.analysis?.experience_level)),
        },
        {
          label: "即日体験",
          values: valid.map((s) => {
            if (s.trial_type === "same_day") return "即日OK";
            if (s.trial_type === "normal") return "あり (要予約)";
            return "なし";
          }),
          bestAt: bestIndex(
            valid.map((s) =>
              s.trial_type === "same_day" ? 2 : s.trial_type === "normal" ? 1 : 0,
            ),
          ),
        },
      ],
      trial: [
        {
          label: "面接時間",
          values: valid.map((s) =>
            s.interview_start && s.interview_end
              ? `${s.interview_start}〜${s.interview_end}`
              : "—",
          ),
          bestAt: null,
        },
        {
          label: "必要な身分証",
          values: valid.map((s) => {
            const docs = s.required_documents?.documents;
            if (!docs || docs.length === 0) return "—";
            return docs.join("・");
          }),
          bestAt: bestIndex(
            valid.map((s) => s.required_documents?.documents?.length),
            "lower",
          ),
        },
        {
          label: "採用基準",
          values: valid.map((s) => s.recruitment_standards ?? "—"),
          bestAt: null,
        },
      ],
      analysis: [
        {
          label: "系統",
          values: valid.map(topCastStyle),
          bestAt: null,
        },
        {
          label: "客層",
          values: valid.map(topCustomerAge),
          bestAt: null,
        },
        {
          label: "雰囲気",
          values: valid.map((s) =>
            s.analysis?.atmosphere !== undefined ? `${s.analysis.atmosphere}%` : "—",
          ),
          bestAt: null,
        },
      ],
      community: [
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

                {/* 在籍女性の例 — 各店舗の staff_photos を最大4枚 */}
                <CompareStaffPhotos
                  stores={validStores}
                  hasAddSlot={canAdd}
                />
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
