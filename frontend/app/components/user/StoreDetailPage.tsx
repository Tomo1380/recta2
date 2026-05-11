import { useState, useEffect, useRef, useMemo } from "react";
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
      className="font-heading flex items-center gap-2 pl-3 text-lg font-bold"
      style={{
        fontFamily: "'Domine', 'Noto Sans JP', sans-serif",
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
  const [videoMode, setVideoMode] = useState<"hero" | "mini" | "closed">("hero");

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
  const heroHeight = 220;



  return (
    <div className="min-h-screen pb-[68px]" style={{ backgroundColor: "#fafeff" }}>
      {/* ============================================================ */}
      {/* 1. Sticky Hero Video */}
      {/* ============================================================ */}
      {store.video_url && videoMode !== "closed" && (
        <div
          className={
            videoMode === "hero"
              ? "fixed top-0 left-0 right-0 z-20 w-full overflow-hidden"
              : "fixed bottom-20 right-3 z-30 overflow-hidden rounded-lg shadow-2xl ring-1 ring-black/20"
          }
          style={
            videoMode === "hero"
              ? { height: `${heroHeight}px` }
              : { width: "140px", height: "80px" }
          }
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          >
            <source src={store.video_url} type="video/mp4" />
          </video>
          {videoMode === "hero" && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)",
              }}
            />
          )}
          {videoMode === "hero" ? (
            <button
              type="button"
              aria-label="動画を最小化"
              onClick={() => setVideoMode("mini")}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-base leading-none hover:bg-black/80"
            >
              −
            </button>
          ) : (
            <button
              type="button"
              aria-label="動画を閉じる"
              onClick={() => setVideoMode("closed")}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs hover:bg-black/80"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* Main content - overlaps video on scroll */}
      {/* ============================================================ */}
      <div
        className="relative z-10"
        style={{
          marginTop: store.video_url && videoMode === "hero" ? `${heroHeight - 20}px` : "0",
          borderTopLeftRadius: store.video_url && videoMode === "hero" ? "20px" : "0",
          borderTopRightRadius: store.video_url && videoMode === "hero" ? "20px" : "0",
          backgroundColor: "#fafeff",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-6">
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

  const monthly = useMemo(() => {
    const wage = hourly * hoursPerDay * daysPerMonth;
    const back = sales * inferredBackRate;
    const nom = nominations * nominationUnit;
    return Math.round(wage + back + nom);
  }, [hourly, sales, nominations, inferredBackRate, hoursPerDay, daysPerMonth, nominationUnit]);

  // Render the section only if we have a simulator config OR a usable hourly base.
  const enabled = !!simulator || (hourlyMin && hourlyMin > 0);
  if (!enabled) return null;

  return (
    <SectionCard
      icon={<Calculator size={20} style={{ color: GOLD_HEX }} />}
      title="給料シミュレーター"
    >
      <div className="space-y-5">
        <div
          className="rounded-[12px] px-4 py-3"
          style={{
            background:
              "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)",
            border: "1px solid rgba(212,175,55,0.25)",
          }}
        >
          <p className="text-xs font-medium" style={{ color: "rgba(27,37,40,0.55)" }}>
            想定月収
          </p>
          <p
            className="font-heading text-2xl font-bold"
            style={{ color: GOLD_HEX, fontFamily: "'Outfit','Noto Sans JP',sans-serif" }}
          >
            ¥{monthly.toLocaleString()}
          </p>
          <p className="text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
            {hoursPerDay}時間 × {daysPerMonth}日 + バック{Math.round(inferredBackRate * 100)}%
            {nominationUnit > 0 ? ` + 指名 ¥${nominationUnit.toLocaleString()}/本` : ""}
          </p>
        </div>

        <SimSlider
          label="時給"
          value={hourly}
          min={1500}
          max={Math.max(hourlyMaxBound, 10000)}
          step={100}
          format={(v) => `¥${v.toLocaleString()}`}
          onChange={setHourly}
        />
        <SimSlider
          label="月の売上"
          value={sales}
          min={0}
          max={2_000_000}
          step={10_000}
          format={(v) => `¥${v.toLocaleString()}`}
          onChange={setSales}
        />
        <SimSlider
          label="指名本数 / 月"
          value={nominations}
          min={0}
          max={50}
          step={1}
          format={(v) => `${v}本`}
          onChange={setNominations}
        />

        <p className="text-[11px]" style={{ color: "rgba(27,37,40,0.45)" }}>
          ※ 概算です。実際の給与は店舗ごとの規定により異なります。
        </p>
      </div>
    </SectionCard>
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

  return (
    <div
      id="reviews"
      className="overflow-hidden rounded-[16px] bg-white scroll-mt-20"
      style={{
        boxShadow: "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <SectionHeading icon={<Star size={20} style={{ color: GOLD_HEX }} />}>
          リアルな声・口コミ ({reviewsCount}件)
        </SectionHeading>
        <a
          href={`/stores/${storeId}/review`}
          className="shrink-0 rounded-full px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #D4AF37 0%, #9a7a20 100%)",
          }}
        >
          口コミを書く
        </a>
      </div>

      {/* Visible reviews (first 3) */}
      <div className="space-y-4 px-5">
        {visible.map((review) => (
          <ReviewItem key={review.id} review={review} />
        ))}
      </div>

      {/* Blurred locked reviews + login CTA */}
      {hasHidden && (
        <div className="relative mt-4 px-5 pb-5">
          <div className="space-y-4" style={{ filter: "blur(6px)", userSelect: "none", pointerEvents: "none" }}>
            {(hidden.length > 0 ? hidden : visible).slice(0, 3).map((review) => (
              <ReviewItem key={`locked-${review.id}`} review={review} />
            ))}
          </div>
          <div
            className="absolute inset-0 flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.85) 50%)" }}
          >
            <p
              className="font-heading mb-3 text-center text-base font-bold"
              style={{ fontFamily: "'Domine', 'Noto Sans JP', sans-serif", color: "#1b2528" }}
            >
              4件目以降はログインが必要です
            </p>
            <button
              className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#06C755" }}
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
              LINEでログイン
            </button>
          </div>
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
