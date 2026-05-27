import { useState, useEffect, useRef, useMemo, useCallback, forwardRef } from "react";
import { Link } from "react-router";

import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import { Slider } from "~/components/ui/slider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  MapPin,
  Star,
  Phone,
  ExternalLink,
  FileText,
  MessageSquare,
  Building,
  Award,
  Navigation,
  Sparkles,
  Map as MapIcon,
  Wine,
  Heart,
  Calculator,
  Wallet,
  Instagram,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X as XIcon,
  Minus,
  Maximize2,
  Tv,
  RotateCcw,
} from "lucide-react";

import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import XPostEmbed from "~/components/user/shared/XPostEmbed";
import UserAvatar from "~/components/user/shared/UserAvatar";
import AiChatPanel from "~/components/user/AiChatPanel";
import LineCtaCard from "~/components/user/shared/LineCtaCard";
import RelocateSupportCta from "~/components/user/shared/RelocateSupportCta";
import CompareToggle from "~/components/user/shared/CompareToggle";
import StoreMap from "~/components/shared/StoreMap";
import LuxeCard from "~/components/user/shared/LuxeCard";
import { pushViewedStore } from "~/lib/viewed-stores";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackItem {
  label: string;
  // バックは「500円」「10%」「5,000〜10,000円」のように単位込みで運営が
  // 入力するため文字列で扱う。表示はそのまま render。
  amount: string | number;
}

interface FeeItem {
  label: string;
  amount: string | number;
}

interface StoreImage {
  url: string;
  order: number;
}

interface StoreVideo {
  video_url: string;
  label?: string | null;
  description?: string | null;
  poster_url?: string | null;
  display_order: number;
}

interface StoreStaffPhoto {
  image_url: string;
  caption?: string | null;
  instagram_url?: string | null;
  staff_type?: string | null;
  display_order: number;
}

interface CastStyle {
  beauty: number;
  cute: number;
  glamour: number;
  natural: number;
}

interface CustomerAge {
  label: string;
  ratio: number;
}

interface Analysis {
  experience_level: number;
  atmosphere: number;
  cast_style: CastStyle;
  customer_age: CustomerAge[];
  drinking_style: number;
}

interface DialogEntry {
  text: string;
  speaker: string;
}

interface InterviewInfo {
  dress_advice: string;
  tips: string[];
  dress_code: string;
  criteria: string;
  dialog: DialogEntry[];
}

interface RequiredDocuments {
  notes: string;
  documents: string[];
}

interface Schedule {
  hours?: string;
  holidays?: string;
  shift_info?: string;
}

interface RecentHire {
  month: string;
  count: number;
  examples: string[];
}

interface QAItem {
  question: string;
  answer: string;
}

interface StaffComment {
  name: string;
  role: string;
  comment: string;
  supports: string[];
}


interface ReviewUser {
  line_display_name: string;
  line_picture_url: string | null;
  use_line_avatar?: boolean;
  nickname?: string | null;
}

interface Review {
  id: number;
  rating: number;
  body: string;
  tweet_id?: string | null;
  tweet_author_screen_name?: string | null;
  created_at: string;
  user: ReviewUser;
}

// New JSONB shapes (DB redesign 2026-05)
export interface DressExample {
  /** @deprecated 画像は廃止。旧データ互換のため optional 残置。 */
  image_url?: string;
  note?: string;
}

export interface DressCodeObject {
  description?: string;
  ok_examples?: DressExample[];
  ng_examples?: DressExample[];
}

export interface ChampagnePriceItem {
  amount?: number | string;
  image_url?: string;
  note?: string;
}

export interface ChampagnePrices {
  tequila?: ChampagnePriceItem;
  belle_epoque?: ChampagnePriceItem;
  armand?: ChampagnePriceItem;
  lavay?: ChampagnePriceItem;
}

export interface RectaEpisode {
  name: string;
  photo_url?: string;
  comment?: string;
  instagram_url?: string;
}

export interface TransferZone {
  /** 半径 km。number / 数字文字列 / 単位込み文字列 ("2km" 等) / null 許容。 */
  radius_km?: number | string | null;
  fee?: number | string | null;
  color?: string | null;
  label?: string | null;
}

export interface SetFeeItem {
  label: string;
  amount: number | string;
  note?: string;
}

export interface SetFee {
  items?: SetFeeItem[];
  notes?: string;
}

export interface RelatedStoreLite {
  id: number;
  name: string;
  area?: string;
  category?: string;
  image_url?: string;
  hourly_min?: number;
  hourly_max?: number;
}

export interface StoreDetailStore {
  id: number;
  name: string;
  area: string;
  address: string;
  lat: number | null;
  lng: number | null;
  nearest_station: string;
  category: string;
  business_hours: string;
  opening_time: string | null;
  closing_time: string | null;
  holidays: string;
  shift_info: string | null;
  phone: string;
  website_url: string;
  hourly_min: number | null;
  hourly_max: number | null;
  /** 日給目安。Resource は文字列 (例: "30,000円〜60,000円") を返す想定だが、
      過去データは number のこともある。表示側で両対応する。 */
  daily_estimate: number | string | null;
  back_items: BackItem[];
  fee_items: FeeItem[];
  salary_notes: string;
  guarantee_period: string;
  guarantee_details: string;
  norma_info: string;
  unit_wage_type: string | null;
  payroll_system_type: string | null;
  payroll_system_description: string | null;
  /** 体入時給（最低額） */
  trial_hourly_min: number | string | null;
  /** 体入時給（最高額） */
  trial_hourly_max: number | string | null;
  /** @deprecated 旧キー — フォールバックのため残置 */
  trial_avg_hourly?: number | string | null;
  /** @deprecated 旧キー — フォールバックのため残置 */
  trial_hourly?: number | string | null;
  interview_hours: string;
  interview_start: string | null;
  interview_end: string | null;
  same_day_trial: boolean;
  feature_tags: string[];
  description: string;
  features_text: string;
  dress_code: string | DressCodeObject | null;
  images: StoreImage[] | null;
  /** Legacy single-video URL — still emitted by the API as the first videos[] entry. Prefer `videos`. */
  video_url: string | null;
  /** Ordered list of videos with their own label/description. */
  videos?: StoreVideo[] | null;
  /** Ordered staff photos (在籍女性ギャラリー) */
  staff_photos?: StoreStaffPhoto[] | null;
  analysis: Analysis | null;
  interview_info: InterviewInfo | null;
  required_documents: RequiredDocuments | null;
  schedule: Schedule | null;
  recent_hires: RecentHire[] | null;
  recent_hires_summary: string;
  qa: QAItem[] | null;
  staff_comment: StaffComment | null;
  recruitment_standards: string | null;
  transfer_description: string | null;
  transfer_km: string | null;
  champagne_description: string | null;
  reviews_count: number;
  average_rating: number;
  reviews: Review[];

  // ── New JSONB fields (post DB redesign) ─────────────────────────────────
  /** Object form of dress_code (preferred over the legacy string above) */
  dress_code_detail?: DressCodeObject | null;
  champagne_prices?: ChampagnePrices | null;
  recta_episodes?: RectaEpisode[] | null;
  related_store_ids?: number[] | null;
  /** Optional pre-resolved related stores (preferred over related_store_ids) */
  related_stores?: RelatedStoreLite[] | null;
  transfer_zones?: TransferZone[] | null;
  experience_guaranteed?: boolean | null;
  set_fee?: SetFee | null;
}

export interface StoreDetailResponse {
  store: StoreDetailStore;
}

interface StoreDetailPageProps {
  id: number;
  /** When provided, skip API fetch and render this data directly (for admin preview) */
  previewData?: StoreDetailResponse;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * 給与レンジを「¥1,000〜¥2,000」「¥1,000〜」「〜¥2,000」のいずれかで
 * 整形する。片方しか入力されていないと「特に決まってない」ことを
 * 明示するため、もう片方を空白にする (¥0 とは表示しない)。
 * 両方空なら null を返す (呼び出し側で EmptyValue にフォールバック)。
 */
function formatWageRange(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string | null {
  const minStr = toAmountString(min);
  const maxStr = toAmountString(max);
  if (!minStr && !maxStr) return null;
  if (minStr && maxStr) {
    if (minStr === maxStr) return formatCurrency(minStr);
    return `${formatCurrency(minStr)}〜${formatCurrency(maxStr)}`;
  }
  if (minStr) return `${formatCurrency(minStr)}〜`;
  return `〜${formatCurrency(maxStr!)}`;
}

/**
 * クイックステータス 4 セル用の値レンダラ。レンジ (min ≠ max) なら 2 行に
 * 縦積み、同値・片側のみ・両空はコンパクトに 1 行で出す。tabular-nums + Outfit
 * フォントで桁揃え。
 */
function QuickRangeValue({
  min,
  max,
  color,
}: {
  min: number | string | null | undefined;
  max: number | string | null | undefined;
  color: string;
}) {
  const minN = toAmountNumberSafe(min);
  const maxN = toAmountNumberSafe(max);
  const fmt = (n: number) => `¥${n.toLocaleString()}`;
  const wrapper = "mt-0.5 font-bold tabular-nums leading-[1.15]";
  const style = { color, fontFamily: "'Outfit', sans-serif" } as const;

  if (minN == null && maxN == null) {
    return <div className={`${wrapper} text-[14px]`} style={style}>—</div>;
  }
  if (minN != null && maxN != null && minN !== maxN) {
    // 「¥8,000〜 / ¥10,000」を 2 行表示。font-size を少し落として縦に収める。
    return (
      <div className={`${wrapper} text-[12px]`} style={style}>
        <div>{fmt(minN)}〜</div>
        <div>{fmt(maxN)}</div>
      </div>
    );
  }
  // 同値 or 片側のみ
  const single =
    minN != null && maxN != null
      ? fmt(minN)
      : minN != null
        ? `${fmt(minN)}〜`
        : `〜${fmt(maxN!)}`;
  return <div className={`${wrapper} text-[14px]`} style={style}>{single}</div>;
}

function toAmountNumberSafe(v: number | string | null | undefined): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) && v > 0 ? v : null;
  // "5,000円" "¥5,000" 等の単位付き文字列にも対応
  const cleaned = String(v).replace(/[^\d.]/g, "");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toAmountString(v: number | string | null | undefined): string | null {
  if (v == null) return null;
  if (typeof v === "number") return v > 0 ? String(v) : null;
  const s = String(v).trim();
  if (!s) return null;
  // 数字のみ "0" は未入力扱い
  if (/^0+$/.test(s)) return null;
  return s;
}

function formatCurrency(amount: number | string): string {
  // 数値型なら ¥カンマ区切り。
  if (typeof amount === "number") return `¥${amount.toLocaleString()}`;
  // 文字列: 数字だけなら number として整形、`30000〜80000` のような範囲表記は
  // 各数値を整形して `¥` を付けて返す。それ以外 (既に「¥5,000」等) は素通し。
  const s = String(amount).trim();
  if (!s) return s;
  if (/^\d+$/.test(s)) return `¥${Number(s).toLocaleString()}`;
  const rangeMatch = s.match(/^(\d+)\s*[〜~\-ー]\s*(\d+)$/);
  if (rangeMatch) {
    const lo = Number(rangeMatch[1]).toLocaleString();
    const hi = Number(rangeMatch[2]).toLocaleString();
    return `¥${lo}〜¥${hi}`;
  }
  return s;
}

function renderStars(rating: number, size = 16) {
  const stars = [];
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <Star
          key={i}
          size={size}
          style={{ color: "#D4AF37", fill: "#D4AF37" }}
        />,
      );
    } else if (i === full && hasHalf) {
      stars.push(
        <Star
          key={i}
          size={size}
          style={{ color: "#D4AF37", fill: "#D4AF37", opacity: 0.5 }}
        />,
      );
    } else {
      stars.push(
        <Star
          key={i}
          size={size}
          style={{ color: "#D4AF37", fill: "none" }}
        />,
      );
    }
  }
  return <span className="inline-flex items-center gap-0.5">{stars}</span>;
}

// ---------------------------------------------------------------------------
// Section heading helper
// ---------------------------------------------------------------------------

function SectionHeading({
  children,
  icon,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <h2
      className="flex items-center gap-2 pl-3 text-[17px] font-bold tracking-tight"
      style={{
        color: "#1b2528",
        borderLeft: "4px solid #D4AF37",
      }}
    >
      {icon}
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-6 px-4 py-8">
      <Skeleton className="h-[220px] w-full rounded-none" />
      <Skeleton className="h-8 w-64" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-16" />
      </div>
      <Skeleton className="h-64 rounded-[16px]" />
      <Skeleton className="h-48 rounded-[16px]" />
      <Skeleton className="h-48 rounded-[16px]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function StoreDetailPage({ id, previewData }: StoreDetailPageProps) {
  const [data, setData] = useState<StoreDetailResponse | null>(previewData ?? null);
  const [loading, setLoading] = useState(!previewData);
  const [error, setError] = useState<string | null>(null);
  // Shared controller — ensures only one video can be `stuck`/`mini` at a time.
  const stickyController = useStickyVideoController();

  // Keep preview data in sync when form changes
  useEffect(() => {
    if (previewData) {
      setData(previewData);
      setLoading(false);
    }
  }, [previewData]);

  useEffect(() => {
    if (previewData) return; // Skip fetch in preview mode

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/stores/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("NOT_FOUND");
        if (!res.ok) throw new Error("FAILED");
        return res.json();
      })
      .then((json: StoreDetailResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message === "NOT_FOUND" ? "NOT_FOUND" : "FAILED");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, previewData]);

  // After data loads, honor URL hash (#reviews etc) by scrolling the
  // matching element into view. React Router doesn't auto-scroll to
  // hashes, and the target may not exist until the API response paints.
  useEffect(() => {
    if (!data?.store) return;
    if (typeof window === "undefined") return;
    const hash = window.location.hash?.slice(1);
    if (!hash) return;
    // Wait one frame for the section to mount, then scroll.
    const handle = window.requestAnimationFrame(() => {
      const target = document.getElementById(hash);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(handle);
  }, [data?.store]);

  // 店舗データが揃ったら <title> と <meta name="description"> を更新する。
  // SSR loader 未整備なので CSR で document を直接書き換える妥協策。
  // SEO 的には bot が JS 実行後の DOM を読む前提だが、運営入力 (meta_description)
  // と自動生成フォールバックは Resource 側で組まれているのでそれを反映するだけ。
  useEffect(() => {
    if (previewData) return;
    if (typeof document === "undefined") return;
    const s = data?.store;
    if (!s) return;
    const title = `${s.name}${s.area ? `（${s.area}）` : ""} - Recta`;
    document.title = title;
    const desc = (s as { meta_description?: string }).meta_description ?? "";
    if (desc) {
      let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", "description");
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", desc);
    }
  }, [data?.store, previewData]);

  // Persist this store to "recently viewed" history (skip preview mode)
  useEffect(() => {
    if (previewData) return;
    if (!data?.store) return;
    const s = data.store;
    const firstImage = (s.images ?? [])
      .slice()
      .sort((a, b) => a.order - b.order)[0]?.url;
    pushViewedStore({
      id: s.id,
      name: s.name,
      area: s.area,
      category: s.category,
      image_url: firstImage,
      hourly_min: s.hourly_min ?? undefined,
      hourly_max: s.hourly_max ?? undefined,
    });
  }, [data?.store, previewData]);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    const isNotFound = error === "NOT_FOUND";
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.35)" }}
        >
          <Building size={28} style={{ color: "#D4AF37" }} />
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-bold" style={{ color: "#1b2528" }}>
            {isNotFound ? "店舗が見つかりませんでした" : "店舗を読み込めませんでした"}
          </p>
          <p className="text-xs" style={{ color: "rgba(27,37,40,0.55)" }}>
            {isNotFound
              ? "URLが間違っているか、掲載が終了した可能性があります。"
              : "通信エラーが発生しました。少し時間をおいて再度お試しください。"}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link
            to="/stores"
            className="rounded-full border px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ borderColor: "rgba(27,37,40,0.15)", color: "#1b2528", textDecoration: "none" }}
          >
            店舗一覧へ
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full border px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{ borderColor: "#D4AF37", color: "#D4AF37" }}
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  const { store } = data;
  const sortedImages = (store.images ?? []).slice().sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Reserve room for the sticky video player at the top of the frame.
          Height is reported by the active video to stickyController; while
          nothing is stuck this is 0 and behaves exactly like before. */}
      {stickyController.stuckHeight > 0 && (
        <div aria-hidden style={{ height: stickyController.stuckHeight }} />
      )}

      {/* ============================================================ */}
      {/* Luxe hero — image slider w/ editorial overlay                */}
      {/* ============================================================ */}
      <LuxeHero
        images={sortedImages.map((img) => img.url)}
        category={store.category}
        area={store.area}
        name={store.name}
        nearestStation={store.nearest_station}
        averageRating={store.average_rating}
        reviewsCount={store.reviews_count}
        sameDayTrial={store.same_day_trial}
      />

      <div className="relative z-10" style={{ backgroundColor: "#f5f5f5" }}>
        <div className="space-y-4 px-4 pb-24 pt-4">
          {/* ============================================================ */}
          {/* Quick stats — 4 strip                                       */}
          {/* ============================================================ */}
          <div
            className="grid grid-cols-4 overflow-hidden rounded-2xl bg-white"
            style={{
              boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
              border: "1px solid rgba(27,37,40,0.06)",
            }}
          >
            {/* 体験時給・時給は「最低〜最高」のレンジで表示。片方欠けてたら
                「¥8,000〜」「〜¥10,000」のように見せる (空欄であることを明示)。
                4 セル横並びで桁が多いと 1 行に収まらないので、レンジは 2 行
                ("¥8,000〜" / "¥10,000") に縦積みする。同値・片側のみは 1 行。 */}
            <div className="border-r px-2 py-3 text-center" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                体験時給
              </div>
              <QuickRangeValue
                min={store.trial_hourly_min ?? store.trial_avg_hourly}
                max={store.trial_hourly_max ?? store.trial_hourly}
                color="#D4AF37"
              />
            </div>
            <div className="border-r px-2 py-3 text-center" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                時給
              </div>
              <QuickRangeValue
                min={store.hourly_min}
                max={store.hourly_max}
                color="#1b2528"
              />
            </div>
            <div className="border-r px-2 py-3 text-center" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                営業
              </div>
              <div className="mt-0.5 text-[10.5px] font-semibold leading-tight" style={{ color: "#1b2528" }}>
                {store.opening_time && store.closing_time
                  ? `${store.opening_time}〜${store.closing_time}`
                  : store.business_hours || "—"}
              </div>
            </div>
            <div className="px-2 py-3 text-center">
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                体入
              </div>
              <div
                className="mt-0.5 text-[12px] font-bold"
                style={{ color: store.same_day_trial ? "#6FB37D" : "rgba(27,37,40,0.4)" }}
              >
                {store.same_day_trial ? "即日OK" : "—"}
              </div>
            </div>
          </div>

          {/* ============================================================ */}
          {/* 2. AI Chat (replaces old Shop Intro Card — chat intro summarizes store info) */}
          {/* ============================================================ */}
          <AiChatPanel
            pageType="detail"
            storeId={store.id}
            storeName={store.name}
            storeInfo={{
              name: store.name,
              area: store.area,
              category: store.category,
              nearest_station: store.nearest_station,
              hourly_min: store.hourly_min ?? undefined,
              hourly_max: store.hourly_max ?? undefined,
              feature_tags: store.feature_tags,
              description: store.description,
              business_hours: store.business_hours,
              same_day_trial: store.same_day_trial,
              trial_hourly: store.trial_hourly_min ?? store.trial_hourly_max ?? store.trial_avg_hourly ?? store.trial_hourly ?? null,
            }}
          />

          {/* LINE CTA #1 — between AI chat and video */}
          <LineCtaCard
            variant="slim"
            title="チャットでは聞きにくいことも"
            description="担当スタッフがLINEで直接お答えします"
            ctaLabel="相談する"
            source="store-detail:chat-inline"
          />

          {/* ============================================================ */}
          {/* 3. Store videos — multiple videos with labels & descriptions */}
          {/*    Renders display_order ascending. Each video is               */}
          {/*    play-to-stick; only one can be `stuck`/`mini` at a time      */}
          {/*    thanks to the shared `stickyController`.                     */}
          {/* ============================================================ */}
          <StoreVideosBlock
            videos={(store.videos && store.videos.length > 0)
              ? store.videos
              : (store.video_url
                  ? [{ video_url: store.video_url, label: null, description: null, poster_url: null, display_order: 0 }]
                  : [])}
            fallbackPosterUrl={sortedImages[0]?.url}
            controller={stickyController}
          />

          {/* ============================================================ */}
          {/* 4. Experience Entry (体験入店情報) */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Sparkles size={20} style={{ color: "#D4AF37" }} />}
            title="体験入店情報"
            previewAnchor="trial"
          >
            <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              {/* 数値がない店舗で「¥0」を出すと「タダ働き？」と読まれる
                  ので、未設定は「—」（薄いダッシュ）にして空欄であることを
                  はっきり示す。最低/最高どちらかしか入っていない場合は
                  「¥4,500〜」「〜¥6,000」のような片側表記で「上限/下限が
                  特に決まってない」ことを伝える。 */}
              {(() => {
                const min = store.trial_hourly_min ?? store.trial_avg_hourly ?? null;
                const max = store.trial_hourly_max ?? store.trial_hourly ?? null;
                const display = formatWageRange(min, max);
                return (
                  <InfoRow
                    label="体験時給"
                    value={display ?? <EmptyValue />}
                  />
                );
              })()}
              <InfoRow
                label="面接可能時間"
                value={
                  store.interview_start && store.interview_end
                    ? `${store.interview_start}〜${store.interview_end}`
                    : store.interview_hours
                      ? store.interview_hours
                      : <EmptyValue />
                }
              />
              <InfoRow
                label="当日体験"
                value={
                  store.same_day_trial ? (
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                      style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
                    >
                      可能
                    </span>
                  ) : (
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{ border: "1px solid rgba(27,37,40,0.15)", color: "rgba(27,37,40,0.45)" }}
                    >
                      不可
                    </span>
                  )
                }
              />
              {store.recent_hires_summary && (
                <InfoRow label="直近の採用" value={store.recent_hires_summary} />
              )}
            </div>

            {/* Recent hires chart */}
            {store.recent_hires && store.recent_hires.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
                  採用実績
                </p>
                <div className="flex items-end gap-2">
                  {store.recent_hires.map((hire, i) => {
                    const maxCount = Math.max(...store.recent_hires!.map((h) => h.count));
                    const barHeight = Math.max(20, (hire.count / maxCount) * 80);
                    return (
                      <div key={i} className="flex flex-1 flex-col items-center gap-1">
                        <span className="text-xs font-bold" style={{ color: "#D4AF37" }}>
                          {hire.count}人
                        </span>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${barHeight}px`,
                            background: "linear-gradient(to top, #D4AF37, rgba(212,175,55,0.6))",
                          }}
                        />
                        <span
                          className="text-[10px] text-center"
                          style={{ color: "rgba(27,37,40,0.45)" }}
                        >
                          {hire.month.replace("2026年", "")}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Hiring examples */}
                {store.recent_hires.some((h) => h.examples?.length > 0) && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      採用例
                    </p>
                    {store.recent_hires.flatMap((h) => h.examples ?? []).slice(0, 3).map((ex, i) => (
                      <p key={i} className="flex items-start gap-1.5 text-xs" style={{ color: "rgba(27,37,40,0.6)" }}>
                        <span style={{ color: "#D4AF37" }}>●</span>
                        {ex}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ============================================================ */}
          {/* 5. Detailed Info - Shop Features */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Building size={20} style={{ color: "#D4AF37" }} />}
            // features_text が空の店舗ではタイトルを「店舗情報」に倒す。
            // 「特徴は？」だけ残して下が単なるメタ表組みなのは見出し詐欺。
            title={
              store.features_text
                ? `【${store.name}】の特徴は？`
                : "店舗情報"
            }
            previewAnchor="shop-info"
          >
            {store.features_text && (
              <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.65)" }}>
                {store.features_text}
              </p>
            )}

            {/* Feature tags — 管理画面 STEP3 で入力された特徴タグ (BUG-008) */}
            {(store.feature_tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {store.feature_tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{
                      backgroundColor: "rgba(212,175,55,0.12)",
                      color: "#8a7124",
                      border: "1px solid rgba(212,175,55,0.3)",
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Store data table —「どこ → いくら → いつ」の動線に合わせて
                場所・時給・営業 の 3 ブロックで並べる。詳細 (バック / 保証 /
                ノルマ等) は下の「報酬・待遇」カードへ。 */}
            <div className="mt-4 divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              {/* どこ */}
              <InfoRow label="業種" value={store.category} />
              <InfoRow label="エリア" value={store.area} />
              <InfoRow label="最寄り駅" value={store.nearest_station} />
              {/* いくら */}
              {(() => {
                const range = formatWageRange(store.hourly_min, store.hourly_max);
                return range ? <InfoRow label="時給" value={range} /> : null;
              })()}
              {(() => {
                const raw = store.daily_estimate;
                const isEmpty =
                  raw == null ||
                  (typeof raw === "string" && raw.trim() === "") ||
                  (typeof raw === "number" && raw <= 0);
                return isEmpty ? null : (
                  <InfoRow label="日給目安" value={formatCurrency(raw)} />
                );
              })()}
              {/* いつ */}
              <InfoRow
                label="営業時間"
                value={
                  store.opening_time && store.closing_time
                    ? `${store.opening_time}〜${store.closing_time}`
                    : store.business_hours
                }
              />
              {store.holidays && <InfoRow label="定休日" value={store.holidays} />}
              {store.shift_info && <InfoRow label="シフト" value={store.shift_info} />}
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/* 6. Salary & Benefits */}
          {/* 時給/日給目安は「店舗情報」カードへ移動済み。ここはバック・控除・
              支払い方法・保証・ノルマ・給与備考。すべて空なら丸ごと非表示
              (空のカードを残すと見出し詐欺になる)。 */}
          {/* ============================================================ */}
          {((store.back_items ?? []).length > 0
            || (store.fee_items ?? []).length > 0
            || store.payroll_system_type
            || store.guarantee_period
            || store.norma_info
            || store.salary_notes) && (
          <SectionCard
            icon={<Award size={20} style={{ color: "#D4AF37" }} />}
            title="報酬・待遇"
            previewAnchor="salary"
          >
            <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              {(store.back_items ?? []).length > 0 && (
                <InfoRow
                  label="バック"
                  value={
                    <ul className="space-y-0.5">
                      {(store.back_items ?? []).map((item) => (
                        <li key={item.label} className="text-sm">
                          {item.label}: {formatCurrency(item.amount)}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
              {(store.fee_items ?? []).length > 0 && (
                <InfoRow
                  label="控除"
                  value={
                    <ul className="space-y-0.5">
                      {(store.fee_items ?? []).map((item) => (
                        <li key={item.label} className="text-sm">
                          {item.label}: {formatCurrency(item.amount)}
                        </li>
                      ))}
                    </ul>
                  }
                />
              )}
              {store.payroll_system_type && (
                <InfoRow
                  label="支払い方法"
                  value={store.payroll_system_description
                    ? `${store.payroll_system_type}／${store.payroll_system_description}`
                    : store.payroll_system_type}
                />
              )}
              {store.guarantee_period && (
                <InfoRow label="保証" value={`${store.guarantee_period}${store.guarantee_details ? ` / ${store.guarantee_details}` : ""}`} />
              )}
              {store.norma_info && <InfoRow label="ノルマ" value={store.norma_info} />}
              {store.salary_notes && <InfoRow label="給与備考" value={store.salary_notes} />}
            </div>
          </SectionCard>
          )}

          {/* Relocate-support CTA — re-prompt the simulator for users coming from outside Tokyo */}
          <RelocateSupportCta variant="salary" />

          {/* ============================================================ */}
          {/* 7. Analysis */}
          {/* ============================================================ */}
          {store.analysis && <AnalysisSection analysis={store.analysis} />}

          {/* 店内写真セクションは廃止。ページ最上部のヘッダー画像で十分
              なので、同じ写真をもう一度カードで出さない。 */}

          {/* ============================================================ */}
          {/* 8b. Staff gallery — 在籍女性 / レクタ経由入店女性 の写真 */}
          {/* ============================================================ */}
          {store.staff_photos && store.staff_photos.length > 0 && (
            <StaffGallerySection photos={store.staff_photos} storeName={store.name} />
          )}

          {/* ============================================================ */}
          {/* 9. Interview Info (+ Required documents + Dress code as sub-blocks) */}
          {/* ============================================================ */}
          {(() => {
            const dressDetail = store.dress_code_detail
              ?? (typeof store.dress_code === "object" ? (store.dress_code as DressCodeObject | null) : null);
            const dressFallbackString = typeof store.dress_code === "string" ? store.dress_code : null;
            const hasDress = !!(
              dressDetail?.description
              || (dressDetail?.ok_examples ?? []).length > 0
              || (dressDetail?.ng_examples ?? []).length > 0
              || dressFallbackString
            );
            const showSection = !!(store.interview_info || store.required_documents || hasDress);
            if (!showSection) return null;
            return (
            <SectionCard
              icon={<FileText size={20} style={{ color: "#D4AF37" }} />}
              title="面接情報"
              previewAnchor="interview"
            >
              <div className="space-y-4">
                {store.interview_info && (
                <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
                  {store.interview_info.criteria && (
                    <InfoRow label="採用基準" value={store.interview_info.criteria} />
                  )}
                  {store.interview_info.dress_code && (
                    <InfoRow label="服装" value={store.interview_info.dress_code} />
                  )}
                  {store.interview_info.dress_advice && (
                    <InfoRow label="アドバイス" value={store.interview_info.dress_advice} />
                  )}
                </div>
                )}

                {(store.interview_info?.tips ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      面接のコツ
                    </h3>
                    <ul className="space-y-1.5">
                      {(store.interview_info?.tips ?? []).map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: "#D4AF37" }}
                          />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(store.interview_info?.dialog ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      面接の流れ
                    </h3>
                    <div className="space-y-2">
                      {(store.interview_info?.dialog ?? []).map((entry, i) => (
                        <div
                          key={i}
                          className={`flex ${entry.speaker === "staff" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm"
                            style={
                              entry.speaker === "staff"
                                ? {
                                    borderTopLeftRadius: "4px",
                                    backgroundColor: "rgba(27,37,40,0.05)",
                                    color: "#1b2528",
                                  }
                                : {
                                    borderTopRightRadius: "4px",
                                    backgroundColor: "rgba(200,96,128,0.9)",
                                    color: "#ffffff",
                                  }
                            }
                          >
                            <p className="mb-0.5 text-xs font-medium opacity-70">
                              {entry.speaker === "staff" ? "面接官" : "あなた"}
                            </p>
                            {entry.text}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 必要書類はかつて独立 SectionCard だったが、面接情報と
                    文脈が近い (「面接の持ち物」) のでサブブロックとして
                    同居させる。書類リスト or 補足メモのどちらかがあれば出す。 */}
                {store.required_documents
                  && ((store.required_documents.documents ?? []).length > 0
                      || store.required_documents.notes) && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      必要書類
                    </h3>
                    {(store.required_documents.documents ?? []).length > 0 && (
                      <ul className="space-y-1.5">
                        {(store.required_documents.documents ?? []).map((doc, i) => (
                          <li key={i} className="flex items-baseline gap-2 text-sm">
                            <span
                              aria-hidden
                              className="shrink-0 text-xs leading-none"
                              style={{ color: "rgba(27,37,40,0.4)" }}
                            >
                              ・
                            </span>
                            <span>{doc}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {store.required_documents.notes && (
                      <p
                        className="rounded-[12px] px-3 py-2 text-sm"
                        style={{ backgroundColor: "rgba(212,175,55,0.08)", color: "rgba(27,37,40,0.7)" }}
                      >
                        {store.required_documents.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* ドレスコード — 旧 DressCodeSection (独立カード) を統合。
                    画像がある時はサムネ + OK/NG バッジ、画像が無ければ note を
                    bullet テキストだけで列挙する。情報量が薄い時にカード 1 枚
                    使わなくて済むよう、面接情報内のサブブロックに同居。 */}
                {hasDress && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      ドレスコード
                    </h3>
                    {(dressDetail?.description || dressFallbackString) && (
                      <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.7)" }}>
                        {dressDetail?.description || dressFallbackString}
                      </p>
                    )}
                    {(dressDetail?.ok_examples ?? []).length > 0 && (
                      <DressExampleList items={dressDetail?.ok_examples ?? []} variant="ok" />
                    )}
                    {(dressDetail?.ng_examples ?? []).length > 0 && (
                      <DressExampleList items={dressDetail?.ng_examples ?? []} variant="ng" />
                    )}
                  </div>
                )}
              </div>
            </SectionCard>
            );
          })()}

          {/* LINE CTA #2 — 面接情報の直後。「面接前の不安、LINEで」の文脈で
              必要書類を含む面接ブロックの締めとして置く。 */}
          {store.required_documents && (
            <LineCtaCard
              variant="slim"
              title="面接前の不安、LINEで気軽に質問"
              description="服装・持ち物・当日の流れまで個別にサポート"
              ctaLabel="質問する"
              source="store-detail:docs-inline"
            />
          )}

          {/* ============================================================ */}
          {/* 11a. Transfer / 足代 — distance-based zone fee map + table */}
          {/* ============================================================ */}
          <TransferMapSection
            lat={store.lat}
            lng={store.lng}
            zones={store.transfer_zones}
            fallbackDescription={store.transfer_description}
            fallbackKm={store.transfer_km}
          />

          {/* ============================================================ */}
          {/* 11b. Champagne prices + Set fee — お店の単価が分かる「価格表」系を
                  隣接させる (運営要望)。 */}
          {/* ============================================================ */}
          <ChampagnePricesSection
            prices={store.champagne_prices}
            fallback={store.champagne_description}
          />
          <SetFeeSection setFee={store.set_fee} />

          {/* ============================================================ */}
          {/* 11c. Recta-keiyū episodes (レクタ経由入店女性エピソード) */}
          {/* ============================================================ */}
          <RectaEpisodesSection episodes={store.recta_episodes} />

          {/* ドレスコードは「面接情報」セクション内に統合 (画像も廃止し
              テキストだけに簡素化)。独立 SectionCard は廃止。 */}

          {/* ============================================================ */}
          {/* 11e. Salary simulator (interactive, derived from hourly_min/max) */}
          {/* ============================================================ */}
          <SalarySimulatorSection
            backItems={store.back_items}
            hourlyMin={store.hourly_min ?? undefined}
            hourlyMax={store.hourly_max ?? undefined}
          />

          {/* ============================================================ */}
          {/* 12. Q&A */}
          {/* ============================================================ */}
          {store.qa && store.qa.length > 0 && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#D4AF37" }} />}
              title="よくある質問"
              previewAnchor="qa"
            >
              <Accordion type="multiple" className="w-full">
                {store.qa.map((item, i) => (
                  <AccordionItem key={i} value={`qa-${i}`}>
                    <AccordionTrigger className="text-sm font-medium text-left" style={{ color: "#1b2528" }}>
                      Q. {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.6)" }}>
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </SectionCard>
          )}

          {/* セクション順: よくある質問 → 口コミ → スタッフコメント。
              系列店舗は「あなたが見た記事 (RecentlyViewedStores)」の直上に
              移動 (動線を「他店も見てね」で揃えるため)。 */}

          {/* ============================================================ */}
          {/* 12c. Reviews — first 3 visible, 4th+ blurred behind LINE login. */}
          {/*      0 件でもセクションごと出して「口コミを書く」導線を維持する */}
          {/*      (隠すと最初の 1 件を誰も投稿できない鶏卵問題になる)。       */}
          {/* ============================================================ */}
          <ReviewsSection
            storeId={store.id}
            reviews={store.reviews ?? []}
            reviewsCount={store.reviews_count ?? 0}
          />


          {/* ============================================================ */}
          {/* 13. Staff Comment */}
          {/* ============================================================ */}
          {store.staff_comment && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#D4AF37" }} />}
              title="スタッフコメント"
              previewAnchor="staff"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#D4AF37" }}
                  >
                    {store.staff_comment.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
                      {store.staff_comment.name} / Recta キャリアアドバイザー
                    </p>
                    <p className="text-xs" style={{ color: "rgba(27,37,40,0.45)" }}>
                      {store.staff_comment.role}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.7)" }}>
                  {store.staff_comment.comment}
                </p>
                {(store.staff_comment.supports ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(store.staff_comment.supports ?? []).map((s, i) => (
                      <span
                        key={i}
                        className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#D4AF37" }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* 15. Access / Map */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Navigation size={20} style={{ color: "#D4AF37" }} />}
            title="アクセス"
          >
            <div className="space-y-3">
              <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
                <InfoRow
                  label="住所"
                  value={
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={14} className="shrink-0" style={{ color: "rgba(27,37,40,0.35)" }} />
                      {store.address}
                    </span>
                  }
                />
                {store.nearest_station && (
                  <InfoRow label="最寄り駅" value={`${store.nearest_station}より徒歩5分`} />
                )}
                {store.phone && (
                  <InfoRow
                    label="電話"
                    value={
                      <a
                        href={`tel:${store.phone}`}
                        className="inline-flex items-center gap-1 hover:underline"
                        style={{ color: "#D4AF37" }}
                      >
                        <Phone size={14} />
                        {store.phone}
                      </a>
                    }
                  />
                )}
                {store.website_url && (
                  <InfoRow
                    label="サイト"
                    value={
                      <a
                        href={store.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                        style={{ color: "#D4AF37" }}
                      >
                        <ExternalLink size={14} />
                        公式サイト
                      </a>
                    }
                  />
                )}
              </div>

              {/* Map: Google Maps JS API when lat/lng exists; fall back to the
                  legacy address iframe (free, no API key needed) so we never
                  show an empty box. */}
              {store.lat != null && store.lng != null ? (
                <StoreMap
                  lat={store.lat}
                  lng={store.lng}
                  height={180}
                  fallbackAddress={store.address}
                />
              ) : (
                store.address && (
                  <div className="overflow-hidden rounded-[12px]">
                    <iframe
                      title="Map"
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(store.address)}&output=embed&z=16`}
                      width="100%"
                      height="180"
                      style={{ border: 0 }}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                )
              )}
            </div>
          </SectionCard>

          {/* LINE CTA #3 — between access map and recently-viewed list */}
          <LineCtaCard
            variant="card"
            title="気になったら、まずLINEへ"
            description="体入予約・条件交渉までLINEで完結"
            ctaLabel="LINE追加"
            source="store-detail:map-card"
          />

          {/* ============================================================ */}
          {/* 16a. Related stores (系列店舗) — RecentlyViewedStores 直上 */}
          {/* ============================================================ */}
          <div data-preview-anchor="related">
            <RelatedStoresSection
              title="系列店舗"
              icon={<Building size={20} style={{ color: "#D4AF37" }} />}
              stores={store.related_stores}
              ids={store.related_store_ids}
              currentId={store.id}
            />
          </div>

          {/* ============================================================ */}
          {/* 16. Recently viewed stores (あなたが見た記事) */}
          {/* ============================================================ */}
          <RecentlyViewedStores excludeId={store.id} variant="card" />

          {/* 17. Compare CTA — fed by dev feedback「即決できない人に2件並べて選ばせる」 */}
          <CompareToggle
            storeId={store.id}
            storeName={store.name}
            storeArea={store.area}
            storeCategory={store.category}
            storeImageUrl={sortedImages[0]?.url}
          />

        </div>

      </div>

      {/* BottomTabBar is rendered by routes/user/layout.tsx. The admin shop
          preview imports StoreDetailPage directly (outside that layout), so the
          tab bar naturally doesn't leak into admin views. */}
    </>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Luxe hero — auto-carousel image slider + editorial overlay
function LuxeHero({
  images,
  category,
  area,
  name,
  nearestStation,
  averageRating,
  reviewsCount,
  sameDayTrial,
}: {
  images: string[];
  category?: string;
  area?: string;
  name: string;
  nearestStation?: string;
  averageRating?: number;
  reviewsCount?: number;
  sameDayTrial?: boolean;
}) {
  const slides = images.length > 0 ? images : [];
  const hasSlides = slides.length > 0;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // ユーザーが手動操作した直後は自動切替を一時停止する (操作 → すぐ次へ
  // 切り替わって読めないのを防ぐ)。3 秒経ったら自動再開。
  const [userInteracted, setUserInteracted] = useState(false);

  useEffect(() => {
    if (!hasSlides || slides.length < 2 || paused || userInteracted) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3000);
    return () => clearInterval(id);
  }, [hasSlides, slides.length, paused, userInteracted]);

  useEffect(() => {
    if (!userInteracted) return;
    const id = setTimeout(() => setUserInteracted(false), 3000);
    return () => clearTimeout(id);
  }, [userInteracted, index]);

  const goPrev = () => {
    setUserInteracted(true);
    setIndex((i) => (i - 1 + slides.length) % slides.length);
  };
  const goNext = () => {
    setUserInteracted(true);
    setIndex((i) => (i + 1) % slides.length);
  };
  const goTo = (i: number) => {
    setUserInteracted(true);
    setIndex(i);
  };

  // モバイル向けスワイプ: 水平に 40px 以上ドラッグしたら前後へ。縦スクロールを
  // 邪魔しないよう threshold は控えめに、垂直方向の動きが大きいときは無視。
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  // 「次に出る画像」サムネ用: index+1, index+2 を循環参照で取り出す。
  // 2 枚しかない店舗では offset=2 が現在表示と同じになるので 1 枚だけ。
  const nextSlides = hasSlides && slides.length > 1
    ? (slides.length >= 3 ? [1, 2] : [1])
        .map((offset) => ({ url: slides[(index + offset) % slides.length], offset }))
    : [];

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      style={{ height: "440px", background: "#1b2528" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Slides */}
      {hasSlides ? (
        slides.map((src, i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              opacity: i === index ? 1 : 0,
              transition: "opacity 800ms ease",
            }}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              style={{ transform: i === index ? "scale(1.04)" : "scale(1)", transition: "transform 4s ease-out" }}
            />
          </div>
        ))
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #2a1d12 0%, #16110b 50%, #0d0805 100%), radial-gradient(circle at 30% 30%, rgba(212,175,55,0.35), transparent 50%)",
          }}
        >
          <div className="flex h-full w-full items-center justify-center">
            <span
              className="text-[120px] font-bold italic"
              style={{
                color: "rgba(212,175,55,0.45)",
                fontFamily: "'Outfit', serif",
                textShadow: "0 8px 30px rgba(0,0,0,0.6)",
              }}
            >
              {name.charAt(0)}
            </span>
          </div>
        </div>
      )}

      {/* Gradient fade — bottom dark for legibility */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,6,16,0.55) 0%, rgba(8,6,16,0.05) 35%, rgba(8,6,16,0.8) 100%)",
        }}
      />

      {/* Floating top — back + share */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-3">
        <Link
          to="/stores"
          className="inline-flex size-9 items-center justify-center rounded-full text-white"
          style={{
            backgroundColor: "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
          aria-label="戻る"
        >
          <ChevronLeft className="size-5" />
        </Link>
        {slides.length > 1 && (
          <div
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium text-white tabular-nums"
            style={{
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {index + 1} / {slides.length}
          </div>
        )}
      </div>

      {/* Editorial overlay — bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-5 pb-6">
        <div
          className="text-[10px] font-bold uppercase"
          style={{
            color: "rgba(212,175,55,0.95)",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.18em",
          }}
        >
          {category} ・ {area}
        </div>
        <h1
          className="mt-1 text-[32px] font-bold leading-[1.1] text-white"
          style={{
                textShadow: "0 2px 18px rgba(0,0,0,0.5)",
          }}
        >
          {name}
        </h1>
        {/* Gold underline */}
        <div className="mt-3 flex items-center gap-2">
          <span className="size-1 rounded-full" style={{ backgroundColor: "#D4AF37" }} />
          <span
            className="h-px flex-1"
            style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.9), rgba(212,175,55,0))" }}
            aria-hidden
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {(averageRating ?? 0) > 0 && (
            <div className="inline-flex items-center gap-1">
              <Star size={13} style={{ color: "#D4AF37", fill: "#D4AF37" }} />
              <span
                className="text-[13px] font-semibold tabular-nums text-white"
                style={{ fontFamily: "'Outfit', sans-serif" }}
              >
                {(averageRating ?? 0).toFixed(1)}
              </span>
              {reviewsCount !== undefined && (
                <span className="text-[10.5px] text-white/60">({reviewsCount}件)</span>
              )}
            </div>
          )}
          {nearestStation && (
            <span className="text-[11px] text-white/80">⌖ {nearestStation}</span>
          )}
          {sameDayTrial && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              即日体験OK
            </span>
          )}
        </div>
      </div>

      {/* Arrows (only when multiple slides) — モバイルでもタップできるよう
          常時うっすら表示 (opacity-60)。タップ/ホバーで濃く。 */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-60 transition-opacity hover:opacity-100 active:opacity-100"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            aria-label="前の写真"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-60 transition-opacity hover:opacity-100 active:opacity-100"
            style={{ backgroundColor: "rgba(0,0,0,0.45)", backdropFilter: "blur(8px)" }}
            aria-label="次の写真"
          >
            <ChevronRight className="size-5" />
          </button>
        </>
      )}

      {/* 次に出る画像のミニサムネ (右下に縦並び 2 枚)。「次これ → その次これ」
          を予告して、ユーザーに「もっと写真あるよ」を伝える。タップで該当
          スライドへジャンプ。サムネは indicator バーの上に積む。 */}
      {nextSlides.length > 0 && (
        <div className="absolute bottom-5 right-2 z-10 flex flex-col gap-1.5">
          {nextSlides.map(({ url, offset }) => (
            <button
              key={offset}
              type="button"
              onClick={() => goTo((index + offset) % slides.length)}
              aria-label={`${((index + offset) % slides.length) + 1}枚目に移動`}
              className="block overflow-hidden rounded-md transition-transform active:scale-95"
              style={{
                width: 44,
                height: 44,
                border: "1.5px solid rgba(255,255,255,0.6)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              <img
                src={url}
                alt=""
                className="h-full w-full object-cover"
                style={{ opacity: offset === 1 ? 0.95 : 0.7 }}
              />
            </button>
          ))}
        </div>
      )}

      {/* Indicator dots */}
      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-1 z-10 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}枚目に移動`}
              className="h-[3px] rounded-full transition-all"
              style={{
                width: i === index ? "20px" : "8px",
                backgroundColor: i === index ? "#D4AF37" : "rgba(255,255,255,0.4)",
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Store video — inline by default; once playing, sticks to top of viewport.
// User can shrink to corner mini OR close.
// Extracts a YouTube video ID from common URL shapes; returns null if not YouTube.
function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:embed|shorts|v)\/([^/?]+)/);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 複数動画がページに並ぶ場合、「同時に sticky/mini になれるのは 1 本だけ」
 * というルールを徹底するためのコントローラ。アクティブな動画IDと
 * そのモードを React state で唯一管理し、ある動画が再生開始したら
 * 他の動画は強制的に inline へ戻す。
 */
export type StickyVideoMode = "inline" | "stuck" | "mini";
type StickyEntry = { id: string; mode: Exclude<StickyVideoMode, "inline"> } | null;

export interface StickyVideoController {
  modeFor: (id: string) => StickyVideoMode;
  setMode: (id: string, next: StickyVideoMode) => void;
  /** Height (px) currently occupied by a stuck video at the top of the frame,
   *  so layout can push down the rest of the content. 0 when nothing is stuck. */
  stuckHeight: number;
  setStuckHeight: (px: number) => void;
}

function useStickyVideoController(): StickyVideoController {
  const [active, setActive] = useState<StickyEntry>(null);
  const [stuckHeight, setStuckHeight] = useState(0);
  // controller オブジェクト参照を active/stuckHeight が変わらない限り安定させ、
  // 各 StoreVideoSection の useCallback / useEffect で不要な発火を防ぐ。
  return useMemo<StickyVideoController>(
    () => ({
      modeFor: (id: string): StickyVideoMode =>
        active && active.id === id ? active.mode : "inline",
      setMode: (id: string, next: StickyVideoMode) => {
        setActive(next === "inline" ? null : { id, mode: next });
        if (next !== "stuck") setStuckHeight(0);
      },
      stuckHeight,
      setStuckHeight,
    }),
    [active, stuckHeight],
  );
}

/**
 * 複数動画を縦に並べる外殻。各動画はラベル(label)と説明(description)を
 * 動画の **下** に表示する（A 案: 動画下にぶら下げる）。
 *
 * 動画が 1 本だけのときは見出しと余白を最小化し、従来の単一動画と同じ
 * 見え方にする。複数本になった瞬間「店舗動画」セクション全体を 1 枚の
 * 大きな白カードで括ると、店舗詳細の他セクションとリズムが揃う。
 */
function StoreVideosBlock({
  videos,
  fallbackPosterUrl,
  controller,
}: {
  videos: StoreVideo[];
  fallbackPosterUrl?: string;
  controller: StickyVideoController;
}) {
  if (videos.length === 0) return null;
  const showNumber = videos.length > 1;

  return (
    <div className="space-y-4">
      {videos.map((v, idx) => (
        <LuxeCard key={`${v.video_url}-${idx}`} className="overflow-hidden">
          <StoreVideoSection
            id={`video-${idx}`}
            videoUrl={v.video_url}
            posterUrl={v.poster_url ?? fallbackPosterUrl ?? undefined}
            controller={controller}
          />
          {(v.label || v.description) && (
            <div className="px-4 pt-3 pb-4">
              {v.label && (
                <div className="flex items-center gap-2 mb-2">
                  {showNumber && (
                    <span
                      className="inline-flex items-center justify-center shrink-0"
                      style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        color: "#D4AF37",
                        minWidth: 22,
                      }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                  )}
                  {showNumber && (
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 1,
                        background: "linear-gradient(90deg, rgba(212,175,55,0.85), rgba(212,175,55,0))",
                      }}
                    />
                  )}
                  <p
                    className="text-[13.5px] font-bold leading-tight"
                    style={{ color: "#1b2528", fontFamily: "'Noto Sans JP',sans-serif", margin: 0 }}
                  >
                    {v.label}
                  </p>
                </div>
              )}
              {v.description && (
                <p
                  className="text-[12px] leading-relaxed whitespace-pre-line"
                  style={{ color: "rgba(27,37,40,0.62)", fontFamily: "'Noto Sans JP',sans-serif", margin: 0 }}
                >
                  {v.description}
                </p>
              )}
            </div>
          )}
        </LuxeCard>
      ))}
    </div>
  );
}

/** Mobile column width that the user-facing layout pins to. Mirrored as a
 *  constant here because StoreVideoSection uses fixed positioning and needs to
 *  align with that frame instead of stretching to the viewport. */
const FRAME_WIDTH = 430;

const StoreVideoSection = forwardRef<
  HTMLVideoElement,
  {
    /** 同じページ内で動画を一意に識別するキー */
    id: string;
    videoUrl: string;
    posterUrl?: string;
    controller: StickyVideoController;
  }
>(function StoreVideoSection({ id, videoUrl, posterUrl, controller }, ref) {
  const mode = controller.modeFor(id);
  const setMode = useCallback(
    (next: StickyVideoMode) => controller.setMode(id, next),
    [controller, id],
  );

  const localRef = useRef<HTMLVideoElement | null>(null);
  const setRefs = (el: HTMLVideoElement | null) => {
    localRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  };

  // この動画がアクティブでなくなったタイミングで再生を止める。
  // 別動画にスティッキーが切り替わったとき、こちらが裏で延々と
  // 再生し続ける（音が二重に出る等）のを防ぐため。
  useEffect(() => {
    if (mode === "inline" && localRef.current) {
      try {
        localRef.current.pause();
        localRef.current.currentTime = 0;
      } catch {
        // ignore — autoplay/permission edge cases
      }
    }
  }, [mode]);

  // When this video becomes the stuck one, report its current rendered height
  // to the controller so the layout can push the rest of the page down.
  // Width is fixed (FRAME_WIDTH or viewport, whichever is smaller), so the
  // 16:9 aspect ratio fully determines the height.
  const stuckHeightPx = useMemo(() => {
    if (mode !== "stuck") return 0;
    if (typeof window === "undefined") return Math.round((FRAME_WIDTH * 9) / 16);
    const w = Math.min(window.innerWidth, FRAME_WIDTH);
    return Math.round((w * 9) / 16);
  }, [mode]);
  const { setStuckHeight } = controller;
  useEffect(() => {
    if (mode === "stuck") setStuckHeight(stuckHeightPx);
  }, [mode, stuckHeightPx, setStuckHeight]);

  const ytId = parseYouTubeId(videoUrl);
  const isYouTube = !!ytId;
  // For YouTube videos, the platform's auto thumbnail is the canonical
  // poster — always prefer it over store-level fallbacks (which would
  // otherwise show an unrelated venue photo behind the play button).
  // maxresdefault (16:9 HD) first, mqdefault (16:9) fallback via <img onError>.
  // hqdefault/sddefault are 4:3 so we avoid them — they show black bars.
  const effectivePoster = isYouTube
    ? `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`
    : posterUrl;

  const handlePlay = () => {
    setMode("stuck");
    if (!isYouTube) {
      requestAnimationFrame(() => {
        localRef.current?.play().catch(() => {});
      });
    }
  };

  // The playing media element (video or iframe) is rendered exactly once and
  // never remounted as mode changes — only its outer container's CSS shifts
  // between inline/stuck/mini. That's what keeps the playback position from
  // resetting when the user minimizes or restores.
  const hasStarted = mode !== "inline";

  return (
    <>
      {/* ── Inline slot ─────────────────────────────────────────────────
          Always rendered to reserve the 16:9 footprint inside the LuxeCard.
          - mode === inline : shows the poster + play button
          - otherwise       : shows the PlayingPlaceholder ("再生中 / ここに戻す")
                              so the surrounding label/description don't jump. */}
      {mode === "inline" ? (
        <button
          type="button"
          onClick={handlePlay}
          className="group relative block w-full overflow-hidden"
          style={{
            aspectRatio: "16 / 9",
            backgroundColor: "#0E1316",
          }}
          aria-label="動画を再生"
        >
          {isYouTube && effectivePoster ? (
            <img
              src={effectivePoster}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
              onError={(e) => {
                // maxresdefault is missing for some shorter videos — fall back
                // to mqdefault which is always available and still 16:9.
                const img = e.currentTarget;
                if (ytId && !img.dataset.fallback) {
                  img.dataset.fallback = "1";
                  img.src = `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                }
              }}
            />
          ) : (
            <video
              src={videoUrl}
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                try { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; } catch {}
              }}
              className="absolute inset-0 h-full w-full object-cover opacity-90 transition-opacity group-hover:opacity-100"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 100%)" }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span
              className="inline-flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-transform group-hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #c8960c)",
                boxShadow: "0 6px 20px rgba(212,175,55,0.45)",
              }}
            >
              <Play className="ml-0.5 size-6" style={{ fill: "white" }} />
            </span>
            <span
              className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/85"
              style={{ fontFamily: "'Outfit', sans-serif" }}
            >
              Tap to play
            </span>
          </div>
        </button>
      ) : (
        <PlayingPlaceholder
          onRestore={() => setMode("inline")}
          onClose={() => setMode("inline")}
        />
      )}

      {/* ── Floating media container ────────────────────────────────────
          Single source of truth for the actual <video> / <iframe>. We mount
          it the first time the user hits play and never re-mount it after —
          only the outer wrapper's classes / styles switch as mode changes.
          This is what keeps the playback position from resetting when the
          user toggles between stuck (top sticky) and mini (bottom-right). */}
      {hasStarted && (
        <div
          className={
            mode === "stuck"
              ? "fixed left-0 right-0 top-0 z-40 mx-auto"
              : "fixed bottom-20 right-3 z-40 overflow-hidden rounded-xl shadow-2xl"
          }
          style={
            mode === "stuck"
              ? { maxWidth: FRAME_WIDTH, backgroundColor: "#000" }
              : {
                  width: 144,
                  height: 81,
                  backgroundColor: "#000",
                  border: "1px solid rgba(212,175,55,0.35)",
                }
          }
        >
          <div
            className="relative w-full overflow-hidden shadow-2xl"
            style={
              mode === "stuck"
                ? { aspectRatio: "16 / 9", backgroundColor: "#000" }
                : { width: "100%", height: "100%", backgroundColor: "#000" }
            }
          >
            {/* The actual media element. Rendered exactly once; we never
                conditionally swap between two <video>s or two <iframe>s,
                and the iframe src is constant across modes so YouTube doesn't
                restart on minimize/restore. The mini-mode "no controls" look
                is faked by disabling pointer events instead of changing src. */}
            {isYouTube ? (
              <iframe
                title="店舗動画"
                src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&playsinline=1&controls=1&modestbranding=1&rel=0`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className={
                  mode === "mini"
                    ? "absolute inset-0 h-full w-full pointer-events-none"
                    : "absolute inset-0 h-full w-full"
                }
                style={{ border: 0 }}
              />
            ) : (
              <video
                ref={setRefs}
                autoPlay
                loop
                playsInline
                muted={mode === "mini"}
                controls={mode === "stuck"}
                className={
                  mode === "stuck"
                    ? "absolute inset-0 h-full w-full object-contain bg-black"
                    : "absolute inset-0 h-full w-full object-cover"
                }
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            )}

            {/* Chrome — buttons differ slightly by mode but live in the same
                wrapper so the underlying media isn't disturbed. */}
            {mode === "stuck" ? (
              <StickyVideoChrome
                onMinimize={() => setMode("mini")}
                onClose={() => setMode("inline")}
                size="lg"
              />
            ) : (
              <>
                <button
                  type="button"
                  aria-label="動画を元の位置に戻す"
                  onClick={() => setMode("stuck")}
                  className="absolute left-1 top-1 inline-flex items-center justify-center rounded-full z-10"
                  style={{
                    width: 22,
                    height: 22,
                    background: "rgba(27,37,40,0.7)",
                    border: "1px solid rgba(212,175,55,0.45)",
                    backdropFilter: "blur(8px)",
                    color: "white",
                  }}
                >
                  <Maximize2 className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="動画を閉じる"
                  onClick={() => setMode("inline")}
                  className="absolute right-1 top-1 inline-flex items-center justify-center rounded-full z-10"
                  style={{
                    width: 22,
                    height: 22,
                    background: "rgba(27,37,40,0.7)",
                    border: "1px solid rgba(212,175,55,0.45)",
                    backdropFilter: "blur(8px)",
                    color: "white",
                  }}
                >
                  <XIcon className="size-3" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
});

/**
 * Chrome shown on top of the stuck (full-width sticky) video. Two pill buttons
 * sized to match the luxe brand — dark glass + gold hairline outline so they
 * read against any thumbnail behind them.
 */
function StickyVideoChrome({
  onMinimize,
  onClose,
  size,
}: {
  onMinimize: () => void;
  onClose: () => void;
  size: "lg" | "sm";
}) {
  const px = size === "lg" ? 32 : 22;
  return (
    <div className="absolute right-2 top-2 z-10 flex gap-1.5">
      <button
        type="button"
        aria-label="動画を最小化"
        onClick={onMinimize}
        className="inline-flex items-center justify-center rounded-full text-white active:scale-95 transition-transform"
        style={{
          width: px,
          height: px,
          background: "rgba(27,37,40,0.62)",
          border: "1px solid rgba(212,175,55,0.45)",
          backdropFilter: "blur(8px)",
        }}
      >
        <Minus className="size-4" />
      </button>
      <button
        type="button"
        aria-label="動画を閉じる"
        onClick={onClose}
        className="inline-flex items-center justify-center rounded-full text-white active:scale-95 transition-transform"
        style={{
          width: px,
          height: px,
          background: "rgba(27,37,40,0.62)",
          border: "1px solid rgba(212,175,55,0.45)",
          backdropFilter: "blur(8px)",
        }}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  );
}

/**
 * Replaces the inline video poster while the video is playing in stuck/mini
 * mode. Keeps the 16:9 footprint so the surrounding label/description text
 * doesn't reflow, and offers a "ここに戻す" affordance for users who want to
 * pull the floating video back into its original slot.
 */
function PlayingPlaceholder({
  onRestore,
  onClose,
}: {
  onRestore: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        aspectRatio: "16 / 9",
        background:
          "radial-gradient(ellipse at top, #1b2528 0%, #0f1618 60%, #050708 100%)",
      }}
    >
      {/* Soft gold ambient orb in the corner */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          top: "-20%",
          right: "-10%",
          width: "60%",
          height: "120%",
          background: "radial-gradient(circle, rgba(212,175,55,0.18), transparent 70%)",
        }}
      />
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center">
        <span
          className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase"
          style={{
            color: "rgba(212,175,55,0.9)",
            fontFamily: "'Outfit', sans-serif",
            letterSpacing: "0.22em",
          }}
        >
          <Tv className="size-3.5" aria-hidden />
          再生中
        </span>
        <button
          type="button"
          onClick={onRestore}
          className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11.5px] font-semibold active:scale-95 transition-transform"
          style={{
            background: "linear-gradient(135deg, #D4AF37, #c8960c)",
            color: "#1b2528",
            fontFamily: "'Outfit','Noto Sans JP',sans-serif",
            boxShadow: "0 4px 14px rgba(212,175,55,0.35)",
          }}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          ここに戻す
        </button>
        <button
          type="button"
          onClick={onClose}
          className="text-[10.5px] underline-offset-2 hover:underline"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          再生を終了
        </button>
      </div>
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
  previewAnchor,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  /** 管理画面のプレビューパネル (FloatingPreview) が、admin SectionCard の
      フォーカス時に対応するこのセクションまで自動スクロールするためのキー。
      ShopEditPage 側で同じキーを SectionCard.previewAnchor に渡している。 */
  previewAnchor?: string;
}) {
  return (
    <div
      data-preview-anchor={previewAnchor}
      className="overflow-hidden rounded-[16px] bg-white"
      style={{
        boxShadow: "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="px-5 pt-5 pb-3">
        <SectionHeading icon={icon}>{title}</SectionHeading>
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

// ─── StaffGallerySection ──────────────────────────────────────────────────
// 「在籍女性ギャラリー」セクション。
// 2列グリッドで写真を並べる。各カードに staff_type バッジ、キャプション、
// インスタリンク（あれば）を表示する。
function StaffGallerySection({
  photos,
  storeName,
}: {
  photos: StoreStaffPhoto[];
  storeName: string;
}) {
  const sorted = [...photos].sort((a, b) => a.display_order - b.display_order);
  const GOLD_HEX_LOCAL = "#D4AF37";
  return (
    <SectionCard
      icon={<Sparkles size={20} style={{ color: GOLD_HEX_LOCAL }} />}
      title="在籍女性ギャラリー"
    >
      <div className="grid grid-cols-2 gap-2">
        {sorted.map((photo, i) => {
          const inner = (
            <div
              className="relative overflow-hidden rounded-[12px] aspect-[3/4]"
              style={{ background: "#0E1316" }}
            >
              <img
                src={photo.image_url}
                alt={photo.caption ?? `${storeName} 在籍女性 ${i + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
              {photo.staff_type && (
                <span
                  className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold leading-none"
                  style={{
                    background: "rgba(212,175,55,0.95)",
                    color: "#1b2528",
                    letterSpacing: "0.04em",
                  }}
                >
                  {photo.staff_type}
                </span>
              )}
              {photo.instagram_url && (
                <span
                  aria-hidden
                  className="absolute top-2 right-2 rounded-full p-1.5"
                  style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
                >
                  <Instagram size={12} style={{ color: "white" }} />
                </span>
              )}
              {photo.caption && (
                <div
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 px-2 pt-4 pb-2"
                  style={{
                    background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.7) 100%)",
                  }}
                >
                  <p
                    className="text-[11px] font-medium leading-tight"
                    style={{
                      color: "white",
                      fontFamily: "'Noto Sans JP',sans-serif",
                      textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                      overflow: "hidden",
                    }}
                  >
                    {photo.caption}
                  </p>
                </div>
              )}
            </div>
          );

          // インスタURLがあれば外部リンク、無ければ単なる画像カード
          return photo.instagram_url ? (
            <a
              key={`${photo.image_url}-${i}`}
              href={photo.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${photo.caption ?? "在籍女性"}のInstagramを開く（外部リンク）`}
              className="block active:scale-[0.99] transition-transform"
            >
              {inner}
            </a>
          ) : (
            <div key={`${photo.image_url}-${i}`}>{inner}</div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      className="flex gap-4 py-3 text-sm"
      style={{ borderColor: "rgba(27,37,40,0.06)" }}
    >
      <span className="w-24 shrink-0 font-medium" style={{ color: "rgba(27,37,40,0.45)" }}>
        {label}
      </span>
      <span className="flex-1" style={{ color: "#1b2528" }}>{value}</span>
    </div>
  );
}

// 値が未設定の InfoRow を「タダ」「0円」と読まれないように薄いダッシュで埋める。
function EmptyValue() {
  return (
    <span style={{ color: "rgba(27,37,40,0.35)" }}>—</span>
  );
}


function AnalysisSection({ analysis }: { analysis: Analysis }) {
  // 各項目が 0 (未入力) のときは個別に非表示。全部 0 / 空ならセクション自体を
  // 出さない (StoreDetailPage 側で `hasAnalysis` を計算して条件 render する)。
  const castSegments = [
    { label: "綺麗系", value: analysis.cast_style.beauty, color: "#D4AF37" },
    { label: "可愛い系", value: analysis.cast_style.cute, color: "rgba(200,96,128,1)" },
    { label: "派手系", value: analysis.cast_style.glamour, color: "#1b2528" },
    { label: "素人系", value: analysis.cast_style.natural, color: "rgba(200,96,128,0.5)" },
  ];
  const castTotal = castSegments.reduce((sum, s) => sum + (Number(s.value) || 0), 0);
  const hasCast = castTotal > 0;
  const hasExperience = (Number(analysis.experience_level) || 0) > 0;
  const hasAtmosphere = (Number(analysis.atmosphere) || 0) > 0;
  const hasDrink = (Number(analysis.drinking_style) || 0) > 0;
  const ageEntries = analysis.customer_age ?? [];
  const hasAge = ageEntries.length > 0;

  const maxAge = Math.max(...ageEntries.map((c) => c.ratio), 1);

  // 何もないなら null を返す。呼び出し側でも分岐するので二重防御。
  if (!hasCast && !hasExperience && !hasAtmosphere && !hasDrink && !hasAge) {
    return null;
  }

  return (
    <SectionCard
      icon={<Award size={20} style={{ color: "#D4AF37" }} />}
      title="お店の分析"
    >
      <div className="space-y-5">
        {hasExperience && (
          <>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: "#1b2528" }}>経験レベル</span>
            <span style={{ color: "rgba(27,37,40,0.45)" }}>{analysis.experience_level}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(27,37,40,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${analysis.experience_level}%`, backgroundColor: "#D4AF37" }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "rgba(27,37,40,0.4)" }}>
            <span>未経験向け</span>
            <span>経験者向け</span>
          </div>
        </div>
          </>
        )}

        {hasExperience && hasAtmosphere && (
          <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
        )}

        {hasAtmosphere && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: "#1b2528" }}>雰囲気</span>
            <span style={{ color: "rgba(27,37,40,0.45)" }}>{analysis.atmosphere}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(27,37,40,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${analysis.atmosphere}%`, backgroundColor: "rgba(200,96,128,0.8)" }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "rgba(27,37,40,0.4)" }}>
            <span>カジュアル</span>
            <span>フォーマル</span>
          </div>
        </div>
        )}

        {(hasExperience || hasAtmosphere) && hasCast && (
          <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
        )}

        {hasCast && (
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "#1b2528" }}>キャストスタイル</p>
          <div className="flex h-9 w-full overflow-hidden rounded-md" style={{ boxShadow: "inset 0 0 0 1px rgba(27,37,40,0.06)" }}>
            {castSegments.map((seg) => {
              if (seg.value <= 0) return null;
              const pct = Math.round((seg.value / castTotal) * 100);
              // Show the in-bar label only when the segment is wide enough
              // for the text to fit cleanly (~8% of the bar).
              const showLabel = pct >= 8;
              // Use white text on segments where charcoal text wouldn't hit
              // WCAG AA (4.5:1) at 10px: the dark navy and the saturated
              // pink both fail the contrast check otherwise.
              const useWhiteText = seg.color === "#1b2528" || seg.color === "rgba(200,96,128,1)";
              return (
                <div
                  key={seg.label}
                  className="h-full flex items-center justify-center transition-all"
                  style={{ width: `${pct}%`, backgroundColor: seg.color }}
                  title={`${seg.label} ${pct}%`}
                >
                  {showLabel && (
                    <span
                      className="text-[10px] font-semibold leading-none"
                      style={{
                        color: useWhiteText ? "#fff" : "rgba(27,37,40,0.9)",
                        textShadow: useWhiteText ? "0 1px 1px rgba(0,0,0,0.25)" : "none",
                      }}
                    >
                      {pct}%
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:flex sm:flex-wrap">
            {castSegments.map((seg) => {
              const pct = castTotal > 0 ? Math.round((seg.value / castTotal) * 100) : 0;
              return (
                <span key={seg.label} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "rgba(27,37,40,0.7)" }}>
                  <span
                    className="inline-block h-3 w-3 rounded-sm shrink-0"
                    style={{ backgroundColor: seg.color, boxShadow: "0 0 0 1px rgba(27,37,40,0.08)" }}
                  />
                  <span className="font-medium">{seg.label}</span>
                  <span className="tabular-nums" style={{ color: "rgba(27,37,40,0.5)" }}>{pct}%</span>
                </span>
              );
            })}
          </div>
        </div>
        )}

        {(hasExperience || hasAtmosphere || hasCast) && hasDrink && (
          <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
        )}

        {hasDrink && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: "#1b2528" }}>飲み度</span>
            <span style={{ color: "rgba(27,37,40,0.45)" }}>{analysis.drinking_style}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "rgba(27,37,40,0.06)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${analysis.drinking_style}%`, backgroundColor: "#D4AF37" }}
            />
          </div>
          <div className="flex justify-between text-xs" style={{ color: "rgba(27,37,40,0.4)" }}>
            <span>飲まなくてOK</span>
            <span>飲める方が◎</span>
          </div>
        </div>
        )}

        {(hasExperience || hasAtmosphere || hasCast || hasDrink) && hasAge && (
          <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
        )}

        {hasAge && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: "#1b2528" }}>客層年齢</p>
            <div className="space-y-2">
              {ageEntries.map((age) => (
                <div key={age.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs text-right" style={{ color: "rgba(27,37,40,0.45)" }}>
                    {age.label}
                  </span>
                  <div
                    className="flex-1 h-5 rounded overflow-hidden"
                    style={{ backgroundColor: "rgba(27,37,40,0.04)" }}
                  >
                    <div
                      className="h-full rounded transition-all"
                      style={{ width: `${(age.ratio / maxAge) * 100}%`, backgroundColor: "#D4AF37" }}
                    />
                  </div>
                  <span className="w-10 text-xs" style={{ color: "rgba(27,37,40,0.45)" }}>
                    {age.ratio}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// New sections (added 2026-05 — DEV FB)
// ---------------------------------------------------------------------------

const GOLD_HEX = "#D4AF37";

function toAmountNumber(value: number | string | undefined): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const cleaned = String(value).replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function formatAmount(value: number | string | undefined): string {
  const n = toAmountNumber(value);
  if (n === null) {
    return typeof value === "string" ? value : "—";
  }
  return `¥${n.toLocaleString()}`;
}

// ── Transfer / 足代 zone fee section ───────────────────────────────────────

// マップの円と同じ fillOpacity。StoreMap.tsx と揃える (片方変えるなら両方)。
const TRANSFER_ZONE_FILL_OPACITY = 0.28;

// "#D4AF37" or "rgb(...)" を [r,g,b] に。失敗時は null。
function parseColorToRgb(c?: string | null): [number, number, number] | null {
  if (!c) return null;
  const s = c.trim();
  // #RGB / #RRGGBB
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (hex3) {
    return [parseInt(hex3[1] + hex3[1], 16), parseInt(hex3[2] + hex3[2], 16), parseInt(hex3[3] + hex3[3], 16)];
  }
  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s);
  if (hex6) {
    return [parseInt(hex6[1], 16), parseInt(hex6[2], 16), parseInt(hex6[3], 16)];
  }
  const rgb = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(s);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

// 白背景の上に複数色を alpha 0.28 で順番に乗せたときの最終色を返す。
// マップ上は半径の大きい順に円が描かれ、小さい円が上に重なるので、
// 凡例 zone i の「中心」に見える色は: 半径が i 以下の zone を半径降順で
// 重ねた結果に等しい (= zone i も含む)。
function blendZoneFillColor(
  baseRgb: [number, number, number],
  layers: Array<string | null | undefined>,
): string {
  let [r, g, b] = baseRgb;
  for (const c of layers) {
    const rgb = parseColorToRgb(c);
    if (!rgb) continue;
    const a = TRANSFER_ZONE_FILL_OPACITY;
    r = Math.round(r * (1 - a) + rgb[0] * a);
    g = Math.round(g * (1 - a) + rgb[1] * a);
    b = Math.round(b * (1 - a) + rgb[2] * a);
  }
  return `rgb(${r},${g},${b})`;
}

function TransferMapSection({
  lat,
  lng,
  zones,
  fallbackDescription,
  fallbackKm,
}: {
  lat: number | null;
  lng: number | null;
  zones?: TransferZone[] | null;
  fallbackDescription?: string | null;
  fallbackKm?: string | null;
}) {
  const zoneList = zones ?? [];
  const hasZones = zoneList.length > 0;
  const hasFallback = !!(fallbackDescription || fallbackKm);
  const canShowMap = hasZones && typeof lat === "number" && typeof lng === "number";

  if (!hasZones && !hasFallback) return null;

  return (
    <SectionCard
      icon={<MapIcon size={20} style={{ color: GOLD_HEX }} />}
      title="送り・足代"
    >
      {canShowMap && (
        <div className="mb-3">
          <StoreMap
            lat={lat}
            lng={lng}
            zones={zoneList.map((z) => ({ radius_km: z.radius_km, color: z.color }))}
            height={220}
          />
        </div>
      )}
      {hasZones && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
            距離別の料金
          </p>
          {(() => {
            // 凡例の色チップを「マップ上で実際に見える混合色」に揃える。
            // マップは半径の大きい順に円を描き、小さい円が上に乗るので、
            // 凡例 zone i の中心に見える色 = 半径が zone i 以下の zone を
            // 半径降順で baseRgb (白) に alpha 0.28 で順に乗せた結果。
            const parsedZones = zoneList.map((z) => ({
              raw: z,
              km: (() => {
                if (z.radius_km == null) return NaN;
                if (typeof z.radius_km === "number") return z.radius_km;
                const m = String(z.radius_km).match(/-?\d+(?:\.\d+)?/);
                return m ? Number(m[0]) : NaN;
              })(),
            }));
            return (
              <div className="overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(27,37,40,0.08)" }}>
                {zoneList.map((zone, i) => {
                  const radius = zone.radius_km;
                  const radiusLabel =
                    radius !== undefined && radius !== null && radius !== ""
                      ? typeof radius === "number"
                        ? `〜${radius}km`
                        : String(radius)
                      : zone.label ?? `ゾーン${i + 1}`;
                  const fee = formatAmount(zone.fee ?? undefined);
                  const myKm = parsedZones[i].km;
                  // 半径が自分以下の zone を集めて、半径降順で重ねる。
                  // NaN (半径不明) はマップに乗らないので除外。
                  const layers = Number.isFinite(myKm)
                    ? parsedZones
                        .filter((z) => Number.isFinite(z.km) && z.km <= myKm)
                        .sort((a, b) => b.km - a.km)
                        .map((z) => z.raw.color ?? GOLD_HEX)
                    : [zone.color ?? GOLD_HEX];
                  const chipColor = blendZoneFillColor([255, 255, 255], layers);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-3 py-2.5 text-sm"
                      style={{
                        borderTop: i === 0 ? "none" : "1px solid rgba(27,37,40,0.06)",
                        backgroundColor: i % 2 === 0 ? "rgba(212,175,55,0.03)" : "transparent",
                      }}
                    >
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full"
                        style={{
                          backgroundColor: chipColor,
                          // 元の色 (重なり無し) を細い枠で示してゾーン識別性を保つ
                          boxShadow: `inset 0 0 0 1px ${zone.color || GOLD_HEX}`,
                        }}
                      />
                      <span className="flex-1 font-medium" style={{ color: "#1b2528" }}>
                        {zone.label ?? radiusLabel}
                      </span>
                      <span style={{ color: GOLD_HEX, fontWeight: 600 }}>{fee}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {!hasZones && hasFallback && (
        <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.7)" }}>
          {fallbackKm
            ? `${fallbackDescription ?? "送りあり"}（${fallbackKm}以内）`
            : fallbackDescription}
        </p>
      )}
    </SectionCard>
  );
}

// ── Champagne prices section ──────────────────────────────────────────────
// Editorial menu styled after a high-end bottle list: dark slab, gold hairlines,
// each row alternates the bottle image between right and left (zigzag) with the
// English script label, kana, and yen price centered. Bottle images live in
// /frontend/public/champagne/{key}.png (transparent PNG, ~600x900). Per-store
// overrides via champagne_prices[key].image_url.
const CHAMPAGNE_TEMPLATES: {
  key: keyof ChampagnePrices;
  scriptName: string;   // English script (Great Vibes display)
  kanaName: string;     // 日本語カナ
  defaultImage: string; // shared bottle asset
}[] = [
  { key: "tequila",      scriptName: "Tequila", kanaName: "テキーラ",  defaultImage: "/champagne/tequila.png" },
  { key: "belle_epoque", scriptName: "Belle Epoque", kanaName: "ベル・エポック",   defaultImage: "/champagne/belle_epoque.png" },
  { key: "armand",       scriptName: "Armand",       kanaName: "アルマンド",       defaultImage: "/champagne/armand.png" },
  { key: "lavay",        scriptName: "La Vie",       kanaName: "ラベイ",          defaultImage: "/champagne/la_vie.png" },
];

function ChampagnePricesSection({
  prices,
  fallback,
}: {
  prices?: ChampagnePrices | null;
  fallback?: string | null;
}) {
  // Only render rows where the store actually set a price — empty bottles are
  // dropped from the menu rather than shown as "—".
  const visible = CHAMPAGNE_TEMPLATES
    .map((tpl) => ({ tpl, item: prices?.[tpl.key] }))
    .filter(({ item }) => item && (item.amount !== undefined && item.amount !== null && item.amount !== ""));

  if (visible.length === 0 && !fallback) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Custom dark slab — we bypass SectionCard's white surface because the
          editorial menu vibe depends on the whole panel being dark. */}
      <div
        className="relative px-5 py-7"
        style={{
          background:
            "radial-gradient(ellipse at top, #1b2528 0%, #0f1618 60%, #050708 100%)",
          border: "1px solid rgba(212,175,55,0.28)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
        }}
      >
        {/* Ambient gold orb, like the rest of the user site */}
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-30%",
            right: "-15%",
            width: "65%",
            height: "70%",
            background: "radial-gradient(circle, rgba(212,175,55,0.18), transparent 70%)",
          }}
        />

        {visible.length > 0 ? (
          <>
            {/* Title — Japanese-primary because this is for job seekers
                gauging per-bottle revenue (= potential bottle-back commission),
                not a customer-facing wine list. */}
            <div className="relative mb-5 text-center">
              <h3
                className="m-0 text-[19px] font-bold leading-tight"
                style={{
                  color: "#f7d976",
                  fontFamily: "'Noto Sans JP','Outfit',sans-serif",
                  letterSpacing: "0.06em",
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                ボトル目安価格
              </h3>
              <p
                className="mt-1 text-[9.5px] font-medium uppercase"
                style={{
                  color: "rgba(212,175,55,0.65)",
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "0.32em",
                }}
              >
                Champagne Price
              </p>
            </div>

            {/* 説明文 (運営入力) — 改行を反映。価格表とは別ブロックで上に。
                両方入力されているケースで説明が抜けないよう、価格グリッドの
                上に明示的なテキストブロックを置く。 */}
            {fallback && (
              <p
                className="relative mb-5 whitespace-pre-line text-center text-sm leading-relaxed"
                style={{
                  color: "rgba(255,255,255,0.82)",
                  fontFamily: "'Noto Sans JP', sans-serif",
                }}
              >
                {fallback}
              </p>
            )}

            {/* Rows */}
            <ul className="relative space-y-0">
              {visible.map(({ tpl, item }, i) => {
                const src = item!.image_url || tpl.defaultImage;
                const bottleOnRight = i % 2 === 0;
                return (
                  <li
                    key={tpl.key}
                    className="relative grid grid-cols-12 items-center"
                    style={{
                      minHeight: 96,
                      // hairline divider between rows
                      borderTop: i === 0 ? "none" : "1px solid rgba(212,175,55,0.18)",
                    }}
                  >
                    {/* Bottle photo — switch column placement to create the
                        zigzag, leaving the text centered. */}
                    {!bottleOnRight && (
                      <ChampagneBottleSlot src={src} alt={tpl.kanaName} side="left" />
                    )}
                    <div
                      className={
                        bottleOnRight
                          ? "col-span-9 pl-2 pr-1 text-center"
                          : "col-span-9 col-start-1 pr-2 pl-1 text-center"
                      }
                      style={{
                        // text always takes 9 of 12; bottle takes 3 on the
                        // opposite side via col-start placement
                        gridColumnStart: bottleOnRight ? 1 : 4,
                      }}
                    >
                      <p
                        className="m-0"
                        style={{
                          fontFamily: "'Great Vibes', cursive",
                          fontSize: 26,
                          lineHeight: 1.15,
                          color: "#f7d976",
                          textShadow: "0 1px 6px rgba(0,0,0,0.4)",
                        }}
                      >
                        {tpl.scriptName}
                      </p>
                      <p
                        className="mt-1 text-[11.5px]"
                        style={{
                          color: "rgba(255,255,255,0.7)",
                          fontFamily: "'Noto Sans JP', sans-serif",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {tpl.kanaName}
                        <span
                          className="ml-3 tabular-nums"
                          style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontWeight: 600,
                            color: "#ffe066",
                          }}
                        >
                          ¥ {formatYen(item!.amount)}
                        </span>
                      </p>
                      {item!.note && (
                        <p
                          className="mt-1 text-[10px]"
                          style={{
                            color: "rgba(255,255,255,0.42)",
                            fontFamily: "'Noto Sans JP', sans-serif",
                          }}
                        >
                          {item!.note}
                        </p>
                      )}
                    </div>
                    {bottleOnRight && (
                      <ChampagneBottleSlot src={src} alt={tpl.kanaName} side="right" />
                    )}
                  </li>
                );
              })}
            </ul>

            {/* Footer ornament */}
            <div className="relative mt-5 flex items-center justify-center gap-2">
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 1,
                  background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.7))",
                }}
              />
              <Wine size={11} style={{ color: "rgba(212,175,55,0.85)" }} aria-hidden />
              <span
                aria-hidden
                style={{
                  width: 32,
                  height: 1,
                  background: "linear-gradient(90deg, rgba(212,175,55,0.7), transparent)",
                }}
              />
            </div>
            {/* Disclaimer — make it obvious these numbers are reference values
                so users don't take them as the venue's actual current menu. */}
            <p
              className="relative mt-2 text-center text-[10px] leading-relaxed"
              style={{
                color: "rgba(255,255,255,0.45)",
                fontFamily: "'Noto Sans JP', sans-serif",
              }}
            >
              ※ 価格は参考目安です。詳細は店舗にお問い合わせください。
            </p>
          </>
        ) : (
          // Fallback ブランチでも見出しを出さないと、店舗詳細を縦に流したときに
          // 「モエ・エ・シャンドンなど各種あり。」がただの裸テキストとして浮く。
          // 見出し+本文の塊にすることで他のセクションと一貫した重みを与える。
          <>
            <div className="relative mb-3 text-center">
              <h3
                className="m-0 text-[19px] font-bold leading-tight"
                style={{
                  color: "#f7d976",
                  fontFamily: "'Noto Sans JP','Outfit',sans-serif",
                  letterSpacing: "0.06em",
                  textShadow: "0 2px 12px rgba(0,0,0,0.4)",
                }}
              >
                ボトル目安価格
              </h3>
              <p
                className="mt-1 text-[9.5px] font-medium uppercase"
                style={{
                  color: "rgba(212,175,55,0.65)",
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: "0.32em",
                }}
              >
                Champagne Price
              </p>
            </div>
            <p
              className="relative whitespace-pre-line text-sm leading-relaxed text-center"
              style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              {fallback}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

/** A single bottle slot in the zigzag menu. 3/12 of the row width on the
 *  named side; bottle PNG is shown contained so transparent backgrounds blend
 *  into the surrounding dark slab. Hides gracefully if the asset is missing. */
function ChampagneBottleSlot({
  src,
  alt,
  side,
}: {
  src: string;
  alt: string;
  side: "left" | "right";
}) {
  return (
    <div
      className="col-span-3 flex h-full items-center"
      style={{
        gridColumnStart: side === "left" ? 1 : 10,
        justifyContent: side === "left" ? "flex-start" : "flex-end",
      }}
    >
      <img
        src={src}
        alt={alt}
        className="h-[88px] w-auto object-contain"
        style={{
          filter: "drop-shadow(0 4px 14px rgba(0,0,0,0.5))",
          maxWidth: 80,
        }}
        onError={(e) => {
          // Hide cleanly when the bottle asset hasn't been shipped yet.
          (e.target as HTMLImageElement).style.visibility = "hidden";
        }}
      />
    </div>
  );
}

/** "18,000" — drops the leading ¥ which is rendered as a label by the caller. */
function formatYen(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("ja-JP");
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n) && n > 0) return n.toLocaleString("ja-JP");
    return value;
  }
  return "—";
}

// ── Recta-keiyū episodes section ──────────────────────────────────────────
function RectaEpisodesSection({ episodes }: { episodes?: RectaEpisode[] | null }) {
  const list = (episodes ?? []).filter((e) => e && e.name);
  if (list.length === 0) return null;

  return (
    <SectionCard
      icon={<Heart size={20} style={{ color: GOLD_HEX }} />}
      title="レクタ経由で入店した女性"
    >
      <div className="space-y-4">
        {list.map((ep, i) => (
          <div key={i} className="flex gap-3">
            <div className="shrink-0">
              {ep.photo_url ? (
                <img
                  src={ep.photo_url}
                  alt={ep.name}
                  className="h-16 w-16 rounded-full object-cover"
                  style={{ border: "2px solid rgba(212,175,55,0.3)" }}
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold"
                  style={{
                    backgroundColor: "rgba(212,175,55,0.12)",
                    color: GOLD_HEX,
                  }}
                >
                  {ep.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
                  {ep.name}
                </p>
                {ep.instagram_url && (
                  <a
                    href={ep.instagram_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs hover:underline"
                    style={{ color: GOLD_HEX }}
                  >
                    <Instagram size={12} />
                    Instagram
                  </a>
                )}
              </div>
              {ep.comment && (
                <p
                  className="mt-1 text-sm leading-relaxed"
                  style={{ color: "rgba(27,37,40,0.7)" }}
                >
                  {ep.comment}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Dress code OK / NG examples ───────────────────────────────────────────
// 旧 DressCodeSection / DressGallery (独立カード + サムネ 3 列) は廃止し、
// 「面接情報」セクション内のサブブロックとして DressExampleList (テキストのみ)
// を使う。OK/NG 画像 (image_url) は運用上不要と判断したため、表示も入力も廃止。
// 既存データの image_url は読み捨て (mute) する。
function DressExampleList({
  items,
  variant,
}: {
  items: DressExample[];
  variant: "ok" | "ng";
}) {
  const badgeBg = variant === "ok" ? "rgba(34,197,94,0.95)" : "rgba(220,38,38,0.95)";
  const badgeText = variant === "ok" ? "OK" : "NG";
  const notes = items.map((it) => it.note?.trim()).filter((s): s is string => !!s);
  if (notes.length === 0) return null;
  return (
    <ul className="space-y-1">
      {notes.map((note, i) => (
        <li key={i} className="flex items-baseline gap-2 text-sm" style={{ color: "rgba(27,37,40,0.75)" }}>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
            style={{ backgroundColor: badgeBg }}
          >
            {badgeText}
          </span>
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Salary simulator (driven entirely by hourly_min/max + back_items) ──────
function SalarySimulatorSection({
  backItems,
  hourlyMin,
  hourlyMax,
}: {
  backItems?: BackItem[];
  hourlyMin?: number;
  hourlyMax?: number;
}) {
  // No store-specific simulator config any more — derive sensible defaults
  // from the store's hourly_min and back_items. Store admins tune time wages
  // separately; this simulator is for "what could I make if I got X sales?"
  const baseHourly = Math.max(hourlyMin ?? 0, 0) || 3000;
  const baseSales = 200_000;
  const baseNominations = 0;

  // back_rate: infer from store back_items if any are expressed as percentage
  // values (≤ 100), otherwise a sensible 30%.
  // amount は string (例: "10%") か number ("500") のどちらもあり得る。
  const inferredBackRate = (() => {
    for (const b of backItems ?? []) {
      const raw = typeof b.amount === "number" ? String(b.amount) : b.amount;
      // "10%" "15 %" のようなパターンは％として採用
      const pct = /^\s*(\d+(?:\.\d+)?)\s*%\s*$/.exec(raw ?? "");
      if (pct) {
        const n = Number(pct[1]);
        if (n > 0 && n <= 100) return n / 100;
      }
      // 数値のみで 0 < n ≤ 100 のときも %（旧データ互換）として扱う
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0 && n <= 100) return n / 100;
    }
    return 0.3;
  })();
  const nominationUnit = 1500;
  const hoursPerDay = 5;
  const daysPerMonth = 22;

  const hourlyMaxBound = Math.max(
    hourlyMax ?? baseHourly * 2,
    baseHourly + 1000,
  );

  const [hourly, setHourly] = useState<number>(baseHourly);
  const [sales, setSales] = useState<number>(baseSales);
  const [nominations, setNominations] = useState<number>(baseNominations);

  useEffect(() => {
    setHourly(baseHourly);
    setSales(baseSales);
    setNominations(baseNominations);
  }, [baseHourly, baseSales, baseNominations]);

  const wage = hourly * hoursPerDay * daysPerMonth;
  const back = sales * inferredBackRate;
  const nom = nominations * nominationUnit;
  const monthly = Math.round(wage + back + nom);

  // Only render the section if we have a usable hourly base.
  if (!hourlyMin || hourlyMin <= 0) return null;

  return (
    <SectionCard
      icon={<Calculator size={20} style={{ color: GOLD_HEX }} />}
      title="給料シミュレーター"
    >
      <div className="space-y-4">
        {/* Total — luxe dark panel with gold radial glow */}
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-5 text-center"
          style={{
            background: "linear-gradient(135deg, #1b2528 0%, #2c3e46 100%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: "-40%",
              right: "-20%",
              width: "60%",
              height: "200%",
              background: "radial-gradient(circle, rgba(212,175,55,0.28) 0%, transparent 70%)",
            }}
          />
          <div
            className="relative text-[10px] font-medium uppercase"
            style={{ color: "rgba(212,175,55,0.75)", letterSpacing: "0.16em" }}
          >
            月収目安
          </div>
          <div
            className="relative mt-1.5 text-[40px] font-bold leading-none tabular-nums"
            style={{
              fontFamily: "'Outfit', sans-serif",
              background: "linear-gradient(135deg, #ffe066, #D4AF37)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              letterSpacing: "-0.02em",
            }}
          >
            ¥{monthly.toLocaleString()}
          </div>
          <div className="relative mt-1 text-[10.5px] text-white/55">
            {hoursPerDay}時間 × {daysPerMonth}日勤務 + バック{Math.round(inferredBackRate * 100)}%
            {nominationUnit > 0 ? ` + 指名 ¥${nominationUnit.toLocaleString()}/本` : ""}
          </div>
        </div>

        {/* Sliders — ClaudeDesign style with custom gold thumb */}
        <div className="space-y-4 pt-1">
          <LuxeSimSlider
            label="時給"
            value={hourly}
            min={1500}
            max={Math.max(hourlyMaxBound, 10000)}
            step={100}
            format={(v) => `¥${v.toLocaleString()}`}
            onChange={setHourly}
          />
          <LuxeSimSlider
            label="月の売上"
            value={sales}
            min={0}
            max={2_000_000}
            step={10_000}
            format={(v) => `¥${v.toLocaleString()}`}
            onChange={setSales}
          />
          <LuxeSimSlider
            label="指名本数 / 月"
            value={nominations}
            min={0}
            max={50}
            step={1}
            format={(v) => `${v}本`}
            onChange={setNominations}
          />
        </div>

        {/* Breakdown table */}
        <div
          className="rounded-xl px-4 py-3"
          style={{
            backgroundColor: "rgba(27,37,40,0.025)",
            border: "1px solid rgba(27,37,40,0.06)",
          }}
        >
          <SimBreakdownRow
            label={`時給×時間（${hoursPerDay}h × ${daysPerMonth}日）`}
            value={`¥${wage.toLocaleString()}`}
          />
          <SimBreakdownRow
            label={`売上バック（${Math.round(inferredBackRate * 100)}%）`}
            value={`¥${Math.round(back).toLocaleString()}`}
          />
          <SimBreakdownRow
            label={`指名（${nominations}本 × ¥${nominationUnit.toLocaleString()}）`}
            value={`¥${nom.toLocaleString()}`}
          />
          <div
            className="mt-1 flex items-center justify-between border-t pt-2 text-[13px] font-semibold"
            style={{ borderColor: "rgba(27,37,40,0.1)" }}
          >
            <span style={{ color: "#1b2528" }}>合計</span>
            <span
              className="text-[16px] tabular-nums"
              style={{ color: GOLD_HEX, fontFamily: "'Outfit', sans-serif" }}
            >
              ¥{monthly.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-center" style={{ color: "rgba(27,37,40,0.4)" }}>
          ※ 平均値ベースの参考シミュレーションです。実際は店舗担当者にご確認ください。
        </p>
      </div>
    </SectionCard>
  );
}

function SimBreakdownRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-[12.5px]">
      <span style={{ color: "rgba(27,37,40,0.7)" }}>{label}</span>
      <span
        className="font-semibold tabular-nums"
        style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
      >
        {value}
      </span>
    </div>
  );
}

// Luxe slider — custom track + gold-bordered thumb, used inside the simulator.
function LuxeSimSlider({
  label, value, min, max, step, format, onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[12px] font-medium" style={{ color: "rgba(27,37,40,0.7)" }}>
          {label}
        </span>
        <span
          className="text-[14px] font-bold tabular-nums"
          style={{ color: GOLD_HEX, fontFamily: "'Outfit', sans-serif" }}
        >
          {format(value)}
        </span>
      </div>
      <div className="relative h-5">
        <div
          className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: "rgba(27,37,40,0.08)" }}
        />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{
            left: 0,
            width: `${pct}%`,
            background: "linear-gradient(90deg, #D4AF37, #c8960c)",
          }}
        />
        <div
          className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `${pct}%`,
            backgroundColor: "white",
            border: "2px solid #D4AF37",
            boxShadow: "0 2px 8px rgba(212,175,55,0.4)",
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </div>
    </div>
  );
}

function SimSlider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium" style={{ color: "#1b2528" }}>
          {label}
        </span>
        <span className="text-sm font-bold" style={{ color: GOLD_HEX }}>
          {format(value)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0] ?? value)}
      />
      <div className="flex justify-between text-[10px]" style={{ color: "rgba(27,37,40,0.4)" }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

// ── Set fee (セット料金) ─────────────────────────────────────────────────
function SetFeeSection({ setFee }: { setFee?: SetFee | null }) {
  const items = setFee?.items ?? [];
  const notes = setFee?.notes;
  if (items.length === 0 && !notes) return null;

  return (
    <SectionCard
      icon={<Wallet size={20} style={{ color: GOLD_HEX }} />}
      title="セット料金"
    >
      {items.length > 0 && (
        <div className="overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(27,37,40,0.08)" }}>
          {items.map((item, i) => (
            <div
              key={i}
              className="px-3 py-2.5"
              style={{
                borderTop: i === 0 ? "none" : "1px solid rgba(27,37,40,0.06)",
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium" style={{ color: "#1b2528" }}>
                  {item.label}
                </span>
                <span className="text-sm font-bold" style={{ color: GOLD_HEX }}>
                  {formatAmount(item.amount)}
                </span>
              </div>
              {item.note && (
                <p className="mt-0.5 text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                  {item.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {notes && (
        <p
          className="mt-3 rounded-[10px] px-3 py-2 text-xs"
          style={{
            backgroundColor: "rgba(212,175,55,0.08)",
            color: "rgba(27,37,40,0.7)",
          }}
        >
          {notes}
        </p>
      )}
    </SectionCard>
  );
}

// ── Related stores section ───────────────────────────────────────────────
function RelatedStoresSection({
  title,
  icon,
  stores,
  ids,
  currentId,
}: {
  title: string;
  icon: React.ReactNode;
  stores?: RelatedStoreLite[] | null;
  ids?: number[] | null;
  currentId: number;
}) {
  const [resolved, setResolved] = useState<RelatedStoreLite[]>([]);

  // Prefer pre-resolved `stores` from API. If only ids are given, fetch in parallel.
  useEffect(() => {
    if (stores && stores.length > 0) {
      setResolved(stores.filter((s) => s.id !== currentId));
      return;
    }
    if (!ids || ids.length === 0) {
      setResolved([]);
      return;
    }
    let cancelled = false;
    Promise.all(
      ids
        .filter((id) => id !== currentId)
        .slice(0, 6)
        .map((id) =>
          fetch(`/api/stores/${id}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
        ),
    ).then((results) => {
      if (cancelled) return;
      const items: RelatedStoreLite[] = [];
      for (const r of results) {
        const s = r?.store;
        if (!s) continue;
        const firstImage = (s.images ?? [])
          .slice()
          .sort((a: StoreImage, b: StoreImage) => a.order - b.order)[0]?.url;
        items.push({
          id: s.id,
          name: s.name,
          area: s.area,
          category: s.category,
          image_url: firstImage,
          hourly_min: s.hourly_min,
          hourly_max: s.hourly_max,
        });
      }
      setResolved(items);
    });
    return () => {
      cancelled = true;
    };
  }, [stores, ids, currentId]);

  if (resolved.length === 0) return null;

  return (
    <SectionCard icon={icon} title={title}>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {resolved.map((s) => (
          <Link
            key={s.id}
            to={`/stores/${s.id}`}
            className="shrink-0 rounded-xl overflow-hidden"
            style={{
              width: "170px",
              background: "#fcfeff",
              border: "1px solid rgba(27,37,40,0.06)",
              textDecoration: "none",
            }}
          >
            <div className="relative w-full" style={{ height: "100px" }}>
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt={s.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1b2528, #2a3a3f)" }}
                >
                  <span style={{ fontSize: "20px", fontWeight: 700, color: GOLD_HEX }}>
                    {s.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="px-2.5 py-2">
              <p
                className="truncate text-xs font-bold"
                style={{ color: "#1b2528" }}
              >
                {s.name}
              </p>
              {s.area && (
                <p className="truncate text-[10px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                  {s.area}
                  {s.category ? ` / ${s.category}` : ""}
                </p>
              )}
              {(s.hourly_min || s.hourly_max) && (
                <p
                  className="mt-0.5 text-[10px]"
                  style={{ color: GOLD_HEX, fontWeight: 600 }}
                >
                  時給 {formatWageRange(s.hourly_min, s.hourly_max) ?? "—"}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Reviews section (3 visible + blur for 4+) ─────────────────────────────
function ReviewsSection({
  storeId,
  reviews,
  reviewsCount,
}: {
  storeId: number;
  reviews: Review[];
  reviewsCount: number;
}) {
  const visible = reviews.slice(0, 3);
  const hidden = reviews.slice(3);
  const hasHidden = hidden.length > 0 || reviewsCount > visible.length;

  // Compute summary stats from visible reviews (or fallbacks if none)
  const ratings = reviews.map((r) => r.rating ?? 0).filter((n) => n > 0);
  const avg = ratings.length > 0
    ? ratings.reduce((s, n) => s + n, 0) / ratings.length
    : 0;
  const total = reviewsCount || ratings.length;

  // Bucket distribution (use loaded reviews; for unloaded use weighted estimate centered on avg).
  const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  ratings.forEach((r) => {
    const bucket = Math.round(Math.max(1, Math.min(5, r)));
    dist[bucket] = (dist[bucket] ?? 0) + 1;
  });
  const distMax = Math.max(...Object.values(dist), 1);

  return (
    <div
      id="reviews"
      className="overflow-hidden rounded-[16px] bg-white scroll-mt-20"
      style={{
        boxShadow: "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="flex items-center justify-between px-5 pb-3 pt-5">
        <SectionHeading icon={<Star size={20} style={{ color: GOLD_HEX }} />}>
          リアルな声・口コミ
        </SectionHeading>
        <a
          href={`/stores/${storeId}/review`}
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
        >
          口コミを書く
        </a>
      </div>

      {/* Summary panel — cream gradient + gold border */}
      {total > 0 && (
        <div className="mx-5 mb-4">
          <div
            className="grid grid-cols-[110px_1fr] items-center gap-4 rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, #fffdf6, #fff8e8)",
              border: "1px solid rgba(212,175,55,0.28)",
            }}
          >
            <div
              className="border-r pr-4 text-center"
              style={{ borderColor: "rgba(212,175,55,0.22)" }}
            >
              <div
                className="text-[36px] font-bold leading-none tabular-nums"
                style={{ color: GOLD_HEX, fontFamily: "'Outfit', sans-serif", letterSpacing: "-0.02em" }}
              >
                {avg.toFixed(1)}
              </div>
              <div className="mt-1.5 inline-flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={11}
                    style={{
                      color: i < Math.round(avg) ? GOLD_HEX : "rgba(212,175,55,0.25)",
                      fill: i < Math.round(avg) ? GOLD_HEX : "none",
                    }}
                  />
                ))}
              </div>
              <div className="mt-1 text-[10.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                {total}件
              </div>
            </div>
            <div>
              {[5, 4, 3, 2, 1].map((s) => {
                const pct = ratings.length > 0 ? (dist[s] / distMax) * 100 : 0;
                return (
                  <div
                    key={s}
                    className="mb-[5px] grid grid-cols-[14px_1fr] items-center gap-2 text-[10.5px]"
                    style={{ color: "rgba(27,37,40,0.5)", fontFamily: "'Outfit', sans-serif" }}
                  >
                    <span className="tabular-nums">{s}</span>
                    <div
                      className="h-[5px] overflow-hidden rounded-full"
                      style={{ backgroundColor: "rgba(27,37,40,0.06)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, #D4AF37, #c8960c)",
                          transition: "width 400ms ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Visible reviews (first 3) — or an empty-state nudge if there's none. */}
      {visible.length > 0 ? (
        <div className="space-y-2.5 px-5">
          {visible.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="mx-5 mb-5 rounded-2xl border border-dashed p-6 text-center"
          style={{ borderColor: "rgba(212,175,55,0.35)", background: "rgba(255,253,246,0.6)" }}
        >
          <p className="text-sm font-medium" style={{ color: "#1b2528" }}>
            まだ口コミがありません
          </p>
          <p className="mt-1 text-xs" style={{ color: "rgba(27,37,40,0.55)" }}>
            体験入店した方や、お店の雰囲気を知っている方の<br />最初の1件をぜひお寄せください。
          </p>
          <a
            href={`/stores/${storeId}/review`}
            className="mt-4 inline-flex items-center justify-center rounded-full px-5 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)" }}
          >
            最初の口コミを書く
          </a>
        </div>
      )}

      {/* Blurred locked reviews + login CTA */}
      {hasHidden && (
        <div className="relative mt-3 px-5 pb-5 pt-12">
          {/* Fade overlay */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-5 top-0 h-20"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 100%)",
            }}
          />
          <div
            className="space-y-2.5"
            style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }}
          >
            {(hidden.length > 0 ? hidden : visible).slice(0, 2).map((review) => (
              <ReviewItem key={`locked-${review.id}`} review={review} />
            ))}
          </div>
          {/* Gold gate card */}
          <button
            type="button"
            onClick={() => { window.location.href = "/login"; }}
            className="absolute inset-x-5 z-10 flex items-center gap-3 rounded-2xl bg-white p-4 text-left"
            style={{
              top: "55%",
              transform: "translateY(-50%)",
              border: "1px solid rgba(212,175,55,0.32)",
              boxShadow: "0 6px 20px rgba(212,175,55,0.18)",
            }}
          >
            <span
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(212,175,55,0.05))",
                border: "1px solid rgba(212,175,55,0.32)",
              }}
            >
              🔒
            </span>
            <div className="min-w-0 flex-1">
              <div
                className="text-[13px] font-semibold"
                style={{ color: "#1b2528" }}
              >
                続きはログインで全件公開
              </div>
              <div className="mt-0.5 text-[10.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                あと {Math.max(reviewsCount - visible.length, 1)} 件のクチコミ
              </div>
            </div>
            <span
              className="shrink-0 rounded-xl px-4 py-2.5 text-[12px] font-semibold text-white"
              style={{
                backgroundColor: "#06C755",
                boxShadow: "0 4px 14px rgba(6,199,85,0.3)",
              }}
            >
              ログイン
            </span>
          </button>
        </div>
      )}
      {!hasHidden && <div className="pb-5" />}
    </div>
  );
}

function ReviewItem({ review }: { review: Review }) {
  // 口コミは本人のニックネームのみを公開。LINEの実名や画像はプライバシー保護のため使わない。
  const displayName = review.user?.nickname || "匿名";
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {/* 口コミは常にニックネームのイニシャルアバターで表示する。
            LINE のプロフィール画像は本人がプライバシー上嫌がるため公開しない。 */}
        <UserAvatar
          displayName={displayName}
          size={32}
        />
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: "#1b2528" }}>
            {displayName}
          </p>
          <div className="flex items-center gap-2">
            {renderStars(review.rating ?? 0, 12)}
            <span className="text-xs" style={{ color: "rgba(27,37,40,0.4)" }}>
              {review.created_at ? new Date(review.created_at).toLocaleDateString("ja-JP") : ""}
            </span>
          </div>
        </div>
      </div>
      <p className="text-sm leading-relaxed pl-11" style={{ color: "rgba(27,37,40,0.7)" }}>
        {review.body}
      </p>
      {review.tweet_id && review.tweet_author_screen_name && (
        <XPostEmbed
          postId={review.tweet_id}
          authorHandle={review.tweet_author_screen_name}
          className="pl-11"
        />
      )}
      <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
    </div>
  );
}

