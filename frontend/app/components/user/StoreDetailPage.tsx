import { useState, useEffect, useRef, useMemo, forwardRef } from "react";
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
  Shirt,
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
} from "lucide-react";

import Footer from "~/components/user/shared/Footer";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import XPostEmbed from "~/components/user/shared/XPostEmbed";
import UserAvatar from "~/components/user/shared/UserAvatar";
import AiChatPanel from "~/components/user/AiChatPanel";
import { pushViewedStore } from "~/lib/viewed-stores";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BackItem {
  label: string;
  amount: number;
}

interface FeeItem {
  label: string;
  amount: number;
}

interface StoreImage {
  url: string;
  order: number;
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
  experience_ratio: number;
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

interface PopularFeatures {
  features: string[];
  hint?: string;
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
  radius_km?: number | string;
  fee?: number | string;
  color?: string;
  label?: string;
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

export interface SalarySimulator {
  default_hourly?: number;
  default_sales?: number;
  default_nominations?: number;
  back_rate?: number;
  nomination_unit?: number;
  hours_per_day?: number;
  days_per_month?: number;
  formulas?: Record<string, unknown>;
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
  nearest_station: string;
  category: string;
  business_hours: string;
  opening_time: string | null;
  closing_time: string | null;
  holidays: string;
  shift_info: string | null;
  phone: string;
  website_url: string;
  hourly_min: number;
  hourly_max: number;
  daily_estimate: number;
  back_items: BackItem[];
  fee_items: FeeItem[];
  salary_notes: string;
  guarantee_period: string;
  guarantee_details: string;
  norma_info: string;
  unit_wage_type: string | null;
  payroll_system_type: string | null;
  payroll_system_description: string | null;
  trial_avg_hourly: number;
  trial_hourly: number;
  interview_hours: string;
  interview_start: string | null;
  interview_end: string | null;
  same_day_trial: boolean;
  feature_tags: string[];
  description: string;
  features_text: string;
  dress_code: string | DressCodeObject | null;
  images: StoreImage[] | null;
  video_url: string;
  analysis: Analysis | null;
  interview_info: InterviewInfo | null;
  required_documents: RequiredDocuments | null;
  schedule: Schedule | null;
  recent_hires: RecentHire[] | null;
  recent_hires_summary: string;
  popular_features: PopularFeatures | null;
  qa: QAItem[] | null;
  staff_comment: StaffComment | null;
  recruitment_standards: string | null;
  rank: string | null;
  gal_point: number;
  loose_point: number;
  age_point: number;
  waiwai_point: number;
  cute_point: number;
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
  /** Optional list of "high recruitment-standard" sibling stores */
  high_standard_stores?: RelatedStoreLite[] | null;
  transfer_map_image_url?: string | null;
  transfer_zones?: TransferZone[] | null;
  experience_guaranteed?: boolean | null;
  set_fee?: SetFee | null;
  salary_simulator?: SalarySimulator | null;
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

function formatCurrency(amount: number | string): string {
  if (typeof amount === "string") return amount;
  return `¥${amount.toLocaleString()}`;
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
        fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
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
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoMode, setVideoMode] = useState<"inline" | "stuck" | "mini">("inline");

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
      hourly_min: s.hourly_min,
      hourly_max: s.hourly_max,
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
    <div className="min-h-screen pb-[68px]" style={{ backgroundColor: "#f5f5f5" }}>
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
        <div className="mx-auto max-w-3xl space-y-4 px-4 pb-24 pt-4">
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
            <div className="border-r px-2 py-3 text-center" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                体験時給
              </div>
              <div
                className="mt-0.5 text-[14px] font-bold tabular-nums"
                style={{ color: "#D4AF37", fontFamily: "'Outfit', sans-serif" }}
              >
                ¥{(store.trial_hourly ?? store.hourly_min ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="border-r px-2 py-3 text-center" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <div className="text-[9px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
                最高時給
              </div>
              <div
                className="mt-0.5 text-[14px] font-bold tabular-nums"
                style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
              >
                ¥{(store.hourly_max ?? 0).toLocaleString()}
              </div>
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
              hourly_min: store.hourly_min,
              hourly_max: store.hourly_max,
              feature_tags: store.feature_tags,
              description: store.description,
              business_hours: store.business_hours,
              same_day_trial: store.same_day_trial,
              trial_hourly: store.trial_hourly,
            }}
          />

          {/* ============================================================ */}
          {/* 3. Store video — play-to-stick (inline → mini)              */}
          {/* ============================================================ */}
          {store.video_url && (
            <StoreVideoSection
              videoUrl={store.video_url}
              posterUrl={sortedImages[0]?.url}
              ref={videoRef}
              mode={videoMode}
              setMode={setVideoMode}
            />
          )}

          {/* ============================================================ */}
          {/* 4. Experience Entry (体験入店情報) */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Sparkles size={20} style={{ color: "#D4AF37" }} />}
            title="体験入店情報"
          >
            <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <InfoRow label="平均時給" value={formatCurrency(store.trial_avg_hourly ?? 0)} />
              <InfoRow label="体験時給" value={formatCurrency(store.trial_hourly ?? 0)} />
              <InfoRow
                label="面接可能時間"
                value={
                  store.interview_start && store.interview_end
                    ? `${store.interview_start}〜${store.interview_end}`
                    : store.interview_hours
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
            title={`【${store.name}】の特徴は？`}
          >
            {store.features_text && (
              <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.65)" }}>
                {store.features_text}
              </p>
            )}

            {/* Store data table */}
            <div className="mt-4 divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <InfoRow label="業種" value={store.category} />
              <InfoRow label="エリア" value={store.area} />
              <InfoRow label="最寄り駅" value={store.nearest_station} />
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
          {/* ============================================================ */}
          <SectionCard
            icon={<Award size={20} style={{ color: "#D4AF37" }} />}
            title="給与・待遇"
          >
            <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <InfoRow label="時給" value={`${formatCurrency(store.hourly_min ?? 0)}〜${formatCurrency(store.hourly_max ?? 0)}`} />
              <InfoRow label="日給目安" value={formatCurrency(store.daily_estimate ?? 0)} />
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

          {/* ============================================================ */}
          {/* 7. Analysis */}
          {/* ============================================================ */}
          {store.analysis && <AnalysisSection analysis={store.analysis} />}

          {/* ============================================================ */}
          {/* 8. Image Gallery */}
          {/* ============================================================ */}
          {store.images && store.images.length > 0 && (
            <SectionCard
              icon={<Building size={20} style={{ color: "#D4AF37" }} />}
              title="店内写真"
            >
              <div className="grid grid-cols-2 gap-2">
                {store.images
                  .sort((a, b) => a.order - b.order)
                  .map((img, i) => (
                    <div
                      key={img.url}
                      className={`relative overflow-hidden rounded-[12px] ${i === 0 ? "col-span-2 aspect-[16/9]" : "aspect-square"}`}
                    >
                      <img
                        src={img.url}
                        alt={`${store.name} ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* 9. Interview Info */}
          {/* ============================================================ */}
          {store.interview_info && (
            <SectionCard
              icon={<FileText size={20} style={{ color: "#D4AF37" }} />}
              title="面接情報"
            >
              <div className="space-y-4">
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

                {(store.interview_info.tips ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      面接のコツ
                    </h3>
                    <ul className="space-y-1.5">
                      {(store.interview_info.tips ?? []).map((tip, i) => (
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

                {(store.interview_info.dialog ?? []).length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      面接の流れ
                    </h3>
                    <div className="space-y-2">
                      {(store.interview_info.dialog ?? []).map((entry, i) => (
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
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* 10. Required Documents */}
          {/* ============================================================ */}
          {store.required_documents && (
            <SectionCard
              icon={<FileText size={20} style={{ color: "#D4AF37" }} />}
              title="必要書類"
            >
              <div className="space-y-3">
                {(store.required_documents.documents ?? []).length > 0 && (
                  <ul className="space-y-1.5">
                    {(store.required_documents.documents ?? []).map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="shrink-0" style={{ color: "#D4AF37" }} />
                        {doc}
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
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* 11a. Transfer Map (送りマップ) — image + zone fee table */}
          {/* ============================================================ */}
          <TransferMapSection
            mapImageUrl={store.transfer_map_image_url}
            zones={store.transfer_zones}
            fallbackDescription={store.transfer_description}
            fallbackKm={store.transfer_km}
          />

          {/* ============================================================ */}
          {/* 11b. Champagne prices (4 fixed templates) */}
          {/* ============================================================ */}
          <ChampagnePricesSection
            prices={store.champagne_prices}
            fallback={store.champagne_description}
          />

          {/* ============================================================ */}
          {/* 11c. Recta-keiyū episodes (レクタ経由入店女性エピソード) */}
          {/* ============================================================ */}
          <RectaEpisodesSection episodes={store.recta_episodes} />

          {/* ============================================================ */}
          {/* 11d. Dress code OK / NG examples */}
          {/* ============================================================ */}
          <DressCodeSection
            detail={store.dress_code_detail ?? (typeof store.dress_code === "object" ? (store.dress_code as DressCodeObject | null) : undefined)}
            fallback={typeof store.dress_code === "string" ? store.dress_code : null}
          />

          {/* ============================================================ */}
          {/* 11e. Salary simulator (interactive) */}
          {/* ============================================================ */}
          <SalarySimulatorSection
            simulator={store.salary_simulator}
            backItems={store.back_items}
            hourlyMin={store.hourly_min}
            hourlyMax={store.hourly_max}
          />

          {/* ============================================================ */}
          {/* 11f. Set fee (セット料金) */}
          {/* ============================================================ */}
          <SetFeeSection setFee={store.set_fee} />

          {/* ============================================================ */}
          {/* 12. Q&A */}
          {/* ============================================================ */}
          {store.qa && store.qa.length > 0 && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#D4AF37" }} />}
              title="よくある質問"
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

          {/* ============================================================ */}
          {/* 12a. Related stores (系列店) — moved here for SEO internal links */}
          {/* ============================================================ */}
          <RelatedStoresSection
            title="系列店舗"
            icon={<Building size={20} style={{ color: "#D4AF37" }} />}
            stores={store.related_stores}
            ids={store.related_store_ids}
            currentId={store.id}
          />

          {/* ============================================================ */}
          {/* 12b. High recruitment-standard stores */}
          {/* ============================================================ */}
          <RelatedStoresSection
            title="採用基準が高い店舗"
            icon={<Award size={20} style={{ color: "#D4AF37" }} />}
            stores={store.high_standard_stores}
            currentId={store.id}
          />

          {/* ============================================================ */}
          {/* 12c. Reviews — first 3 visible, 4th+ blurred behind LINE login */}
          {/* ============================================================ */}
          {(store.reviews ?? []).length > 0 && (
            <ReviewsSection
              storeId={store.id}
              reviews={store.reviews ?? []}
              reviewsCount={store.reviews_count ?? 0}
            />
          )}

          {/* ============================================================ */}
          {/* 13. Staff Comment */}
          {/* ============================================================ */}
          {store.staff_comment && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#D4AF37" }} />}
              title="スタッフコメント"
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

              {/* Google Map embed */}
              {store.address && (
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
              )}
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/* 16. Recently viewed stores (あなたが見た記事) */}
          {/* ============================================================ */}
          <RecentlyViewedStores excludeId={store.id} variant="card" />

        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* ============================================================ */}
      {/* Bottom Tab Bar (skipped in preview — admin preview shell renders its own) */}
      {/* ============================================================ */}
      {!previewData && <BottomTabBar />}
    </div>
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

  useEffect(() => {
    if (!hasSlides || slides.length < 2 || paused) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 3000);
    return () => clearInterval(id);
  }, [hasSlides, slides.length, paused]);

  const goPrev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      style={{ height: "440px", background: "#1b2528" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
            fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
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

      {/* Arrows (only when multiple slides) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-2 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-opacity hover:opacity-100"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            aria-label="前の写真"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-2 top-1/2 z-10 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-white opacity-0 transition-opacity hover:opacity-100"
            style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
            aria-label="次の写真"
          >
            <ChevronRight className="size-4" />
          </button>
        </>
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

const StoreVideoSection = forwardRef<
  HTMLVideoElement,
  {
    videoUrl: string;
    posterUrl?: string;
    mode: "inline" | "stuck" | "mini";
    setMode: (m: "inline" | "stuck" | "mini") => void;
  }
>(function StoreVideoSection({ videoUrl, posterUrl, mode, setMode }, ref) {
  const localRef = useRef<HTMLVideoElement | null>(null);
  const setRefs = (el: HTMLVideoElement | null) => {
    localRef.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) (ref as React.MutableRefObject<HTMLVideoElement | null>).current = el;
  };

  const ytId = parseYouTubeId(videoUrl);
  const isYouTube = !!ytId;
  const effectivePoster = posterUrl || (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : undefined);

  const handlePlay = () => {
    setMode("stuck");
    if (!isYouTube) {
      requestAnimationFrame(() => {
        localRef.current?.play().catch(() => {});
      });
    }
  };

  // Stuck and mini are fixed-position overlays
  if (mode === "stuck" || mode === "mini") {
    return (
      <div
        className={
          mode === "stuck"
            ? "fixed inset-x-0 top-0 z-40 w-full overflow-hidden shadow-2xl"
            : "fixed bottom-20 right-3 z-40 overflow-hidden rounded-xl shadow-2xl"
        }
        style={
          mode === "stuck"
            ? { height: "220px", backgroundColor: "#000" }
            : { width: "140px", height: "80px", backgroundColor: "#000", border: "1px solid rgba(255,255,255,0.15)" }
        }
      >
        {isYouTube ? (
          <iframe
            title="店舗動画"
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&playsinline=1&controls=${mode === "stuck" ? 1 : 0}&modestbranding=1&rel=0`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
          />
        ) : (
          <video
            ref={setRefs}
            autoPlay
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={videoUrl} type="video/mp4" />
          </video>
        )}
        {mode === "stuck" && !isYouTube && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.4) 100%)" }}
          />
        )}
        {/* Mini: restore button (top-left) */}
        {mode === "mini" && (
          <button
            type="button"
            aria-label="動画を拡大"
            onClick={() => setMode("stuck")}
            className="absolute left-1 top-1 z-10 inline-flex items-center justify-center rounded-full text-white"
            style={{
              width: "20px",
              height: "20px",
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Maximize2 className="size-3" />
          </button>
        )}
        <div className="absolute right-1.5 top-1.5 z-10 flex gap-1">
          {mode === "stuck" && (
            <button
              type="button"
              aria-label="動画を最小化"
              onClick={() => setMode("mini")}
              className="inline-flex size-7 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(8px)" }}
            >
              <Minus className="size-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="動画を閉じてプレイヤーに戻す"
            onClick={() => setMode("inline")}
            className="inline-flex items-center justify-center rounded-full text-white"
            style={{
              width: mode === "stuck" ? "28px" : "20px",
              height: mode === "stuck" ? "28px" : "20px",
              backgroundColor: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(8px)",
            }}
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Inline poster card with play button. For YouTube we use the auto-thumbnail
  // as a plain <img>; for mp4 we render the video itself with preload=metadata
  // so the first frame shows as the poster (no download of the whole stream).
  return (
    <button
      type="button"
      onClick={handlePlay}
      className="group relative block w-full overflow-hidden rounded-2xl"
      style={{
        aspectRatio: "16 / 9",
        backgroundColor: "#0E1316",
        boxShadow: "0 4px 18px rgba(0,0,0,0.1)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
      aria-label="動画を再生"
    >
      {isYouTube && effectivePoster ? (
        <img
          src={effectivePoster}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
        />
      ) : (
        // mp4: render the video element muted with preload=metadata so the
        // first frame is shown as the poster.
        <video
          src={videoUrl}
          muted
          playsInline
          preload="metadata"
          // Seeking to a tiny offset forces Safari/Chrome to paint a frame
          // even when preload=metadata wouldn't on its own.
          // eslint-disable-next-line react/no-unknown-property
          onLoadedMetadata={(e) => {
            try { (e.currentTarget as HTMLVideoElement).currentTime = 0.1; } catch {}
          }}
          className="absolute inset-0 h-full w-full object-cover opacity-85 transition-opacity group-hover:opacity-100"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.55) 100%)" }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span
          className="inline-flex size-14 items-center justify-center rounded-full text-white shadow-xl transition-transform group-hover:scale-105"
          style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
        >
          <Play className="ml-0.5 size-6" style={{ fill: "white" }} />
        </span>
        <span
          className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/80"
          style={{ fontFamily: "'Outfit', sans-serif" }}
        >
          {isYouTube ? "Tap to play YouTube video" : "Tap to play store video"}
        </span>
      </div>
    </button>
  );
});

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
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


function AnalysisSection({ analysis }: { analysis: Analysis }) {
  const castTotal =
    analysis.cast_style.beauty +
    analysis.cast_style.cute +
    analysis.cast_style.glamour +
    analysis.cast_style.natural || 1;

  const castSegments = [
    { label: "綺麗系", value: analysis.cast_style.beauty, color: "#D4AF37" },
    { label: "可愛い系", value: analysis.cast_style.cute, color: "rgba(200,96,128,1)" },
    { label: "派手系", value: analysis.cast_style.glamour, color: "#1b2528" },
    { label: "素人系", value: analysis.cast_style.natural, color: "rgba(200,96,128,0.5)" },
  ];

  const maxAge = Math.max(...(analysis.customer_age ?? []).map((c) => c.ratio), 1);

  return (
    <SectionCard
      icon={<Award size={20} style={{ color: "#D4AF37" }} />}
      title="お店の分析"
    >
      <div className="space-y-5">
        {/* Experience level */}
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

        <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />

        {/* Atmosphere */}
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

        <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />

        {/* Cast style */}
        <div className="space-y-2">
          <p className="text-sm font-medium" style={{ color: "#1b2528" }}>在籍女性の系統</p>
          <div className="flex h-4 w-full overflow-hidden rounded-full">
            {castSegments.map((seg) =>
              seg.value > 0 ? (
                <div
                  key={seg.label}
                  className="h-full transition-all"
                  style={{ width: `${(seg.value / castTotal) * 100}%`, backgroundColor: seg.color }}
                />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {castSegments.map((seg) => (
              <span key={seg.label} className="inline-flex items-center gap-1.5 text-xs">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                {seg.label} {Math.round((seg.value / castTotal) * 100)}%
              </span>
            ))}
          </div>
        </div>

        <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />

        {/* Drinking style */}
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

        <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />

        {/* Customer age bar chart */}
        {(analysis.customer_age ?? []).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: "#1b2528" }}>客層年齢</p>
            <div className="space-y-2">
              {(analysis.customer_age ?? []).map((age) => (
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

// ── Transfer map section ───────────────────────────────────────────────────
function TransferMapSection({
  mapImageUrl,
  zones,
  fallbackDescription,
  fallbackKm,
}: {
  mapImageUrl?: string | null;
  zones?: TransferZone[] | null;
  fallbackDescription?: string | null;
  fallbackKm?: string | null;
}) {
  const hasMap = !!mapImageUrl;
  const zoneList = zones ?? [];
  const hasZones = zoneList.length > 0;
  const hasFallback = !!(fallbackDescription || fallbackKm);

  if (!hasMap && !hasZones && !hasFallback) return null;

  return (
    <SectionCard
      icon={<MapIcon size={20} style={{ color: GOLD_HEX }} />}
      title="送り（送迎範囲）"
    >
      {hasMap && (
        <div className="overflow-hidden rounded-[12px] mb-3">
          <img
            src={mapImageUrl!}
            alt="送り範囲マップ"
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {hasZones && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
            距離別の料金
          </p>
          <div className="overflow-hidden rounded-[10px]" style={{ border: "1px solid rgba(27,37,40,0.08)" }}>
            {zoneList.map((zone, i) => {
              const radius = zone.radius_km;
              const radiusLabel =
                radius !== undefined && radius !== null && radius !== ""
                  ? typeof radius === "number"
                    ? `〜${radius}km`
                    : String(radius)
                  : zone.label ?? `ゾーン${i + 1}`;
              const fee = formatAmount(zone.fee);
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
                    style={{ backgroundColor: zone.color || GOLD_HEX }}
                  />
                  <span className="flex-1 font-medium" style={{ color: "#1b2528" }}>
                    {zone.label ?? radiusLabel}
                  </span>
                  <span style={{ color: GOLD_HEX, fontWeight: 600 }}>{fee}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!hasMap && !hasZones && hasFallback && (
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
const CHAMPAGNE_TEMPLATES: { key: keyof ChampagnePrices; label: string }[] = [
  { key: "tequila", label: "テキーラ" },
  { key: "belle_epoque", label: "ベル・エポック" },
  { key: "armand", label: "アルマンド" },
  { key: "lavay", label: "ラベイ" },
];

function ChampagnePricesSection({
  prices,
  fallback,
}: {
  prices?: ChampagnePrices | null;
  fallback?: string | null;
}) {
  const hasAny =
    prices &&
    CHAMPAGNE_TEMPLATES.some((t) => {
      const item = prices[t.key];
      return item && (item.amount !== undefined || item.image_url);
    });

  if (!hasAny && !fallback) return null;

  return (
    <SectionCard
      icon={<Wine size={20} style={{ color: GOLD_HEX }} />}
      title="シャンパン金額"
    >
      {hasAny ? (
        <div className="grid grid-cols-2 gap-3">
          {CHAMPAGNE_TEMPLATES.map(({ key, label }) => {
            const item = prices?.[key];
            if (!item) return null;
            return (
              <div
                key={key}
                className="overflow-hidden rounded-[12px]"
                style={{
                  border: "1px solid rgba(212,175,55,0.25)",
                  backgroundColor: "rgba(212,175,55,0.04)",
                }}
              >
                <div className="aspect-[4/5] w-full overflow-hidden bg-[#1b2528]">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Wine size={36} style={{ color: GOLD_HEX, opacity: 0.6 }} />
                    </div>
                  )}
                </div>
                <div className="px-3 py-2.5">
                  <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
                    {label}
                  </p>
                  <p className="text-base font-bold" style={{ color: GOLD_HEX }}>
                    {formatAmount(item.amount)}
                  </p>
                  {item.note && (
                    <p className="text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                      {item.note}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-relaxed" style={{ color: "rgba(27,37,40,0.7)" }}>
          {fallback}
        </p>
      )}
    </SectionCard>
  );
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
function DressCodeSection({
  detail,
  fallback,
}: {
  detail?: DressCodeObject | null;
  fallback?: string | null;
}) {
  const ok = detail?.ok_examples ?? [];
  const ng = detail?.ng_examples ?? [];
  const description = detail?.description;

  if (ok.length === 0 && ng.length === 0 && !description && !fallback) return null;

  return (
    <SectionCard
      icon={<Shirt size={20} style={{ color: GOLD_HEX }} />}
      title="ドレスコード"
    >
      {(description || fallback) && (
        <p
          className="mb-4 text-sm leading-relaxed"
          style={{ color: "rgba(27,37,40,0.7)" }}
        >
          {description || fallback}
        </p>
      )}

      {ok.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
            OKな例
          </p>
          <DressGallery items={ok} variant="ok" />
        </div>
      )}

      {ng.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
            NGな例
          </p>
          <DressGallery items={ng} variant="ng" />
        </div>
      )}
    </SectionCard>
  );
}

function DressGallery({
  items,
  variant,
}: {
  items: DressExample[];
  variant: "ok" | "ng";
}) {
  const badgeBg = variant === "ok" ? "rgba(34,197,94,0.95)" : "rgba(220,38,38,0.95)";
  const badgeText = variant === "ok" ? "OK" : "NG";
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-[10px]"
          style={{ border: "1px solid rgba(27,37,40,0.08)" }}
        >
          <div className="relative aspect-[3/4] w-full bg-[rgba(27,37,40,0.04)]">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={`${badgeText}例 ${i + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Shirt size={28} style={{ color: "rgba(27,37,40,0.3)" }} />
              </div>
            )}
            <span
              className="absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
              style={{ backgroundColor: badgeBg }}
            >
              {badgeText}
            </span>
          </div>
          {item.note && (
            <p
              className="px-2 py-1.5 text-[11px] leading-snug"
              style={{ color: "rgba(27,37,40,0.6)" }}
            >
              {item.note}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Salary simulator ──────────────────────────────────────────────────────
function SalarySimulatorSection({
  simulator,
  backItems,
  hourlyMin,
  hourlyMax,
}: {
  simulator?: SalarySimulator | null;
  backItems?: BackItem[];
  hourlyMin?: number;
  hourlyMax?: number;
}) {
  // Defaults: prefer simulator → fall back to store hourly_min/back/etc.
  const baseHourly =
    simulator?.default_hourly ??
    (Math.max(hourlyMin ?? 0, 0) || 3000);
  const baseSales = simulator?.default_sales ?? 200_000;
  const baseNominations = simulator?.default_nominations ?? 0;

  // back_rate: prefer explicit, otherwise infer from store back_items if any
  // are expressed as percentage values (≤ 100), otherwise a sensible 30%.
  const inferredBackRate = (() => {
    if (typeof simulator?.back_rate === "number") return simulator.back_rate;
    const sample = (backItems ?? []).find(
      (b) => typeof b.amount === "number" && b.amount > 0 && b.amount <= 100,
    );
    if (sample) return sample.amount / 100;
    return 0.3;
  })();
  const nominationUnit = simulator?.nomination_unit ?? 1500;
  const hoursPerDay = simulator?.hours_per_day ?? 5;
  const daysPerMonth = simulator?.days_per_month ?? 22;

  const hourlyMaxBound = Math.max(
    hourlyMax ?? baseHourly * 2,
    baseHourly + 1000,
  );

  const [hourly, setHourly] = useState<number>(baseHourly);
  const [sales, setSales] = useState<number>(baseSales);
  const [nominations, setNominations] = useState<number>(baseNominations);

  // If the input store changes, re-sync defaults (rare but tidy).
  useEffect(() => {
    setHourly(baseHourly);
    setSales(baseSales);
    setNominations(baseNominations);
  }, [baseHourly, baseSales, baseNominations]);

  const wage = hourly * hoursPerDay * daysPerMonth;
  const back = sales * inferredBackRate;
  const nom = nominations * nominationUnit;
  const monthly = Math.round(wage + back + nom);

  // Render the section only if we have a simulator config OR a usable hourly base.
  const enabled = !!simulator || (hourlyMin && hourlyMin > 0);
  if (!enabled) return null;

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
                  時給 ¥{(s.hourly_min ?? 0).toLocaleString()}〜¥{(s.hourly_max ?? 0).toLocaleString()}
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

      {/* Visible reviews (first 3) */}
      <div className="space-y-2.5 px-5">
        {visible.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>

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
                style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
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
              LINEで開く
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
