import { useState, useEffect, useRef } from "react";
import { Separator } from "~/components/ui/separator";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import {
  MapPin,
  Star,
  Clock,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
  Users,
  MessageSquare,
  Building,
  Utensils,
  Award,
  Play,
  Navigation,
  TrendingUp,
  Sparkles,
  Heart,
} from "lucide-react";
import StoreCard from "~/components/user/shared/StoreCard";
import Footer from "~/components/user/shared/Footer";
import AiChatPanel from "~/components/user/AiChatPanel";

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
  hours: string;
  holidays: string;
  shift_info: string;
}

interface RecentHire {
  month: string;
  count: number;
  examples: string[];
}

interface PopularFeatures {
  features: string[];
  hint: string;
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

interface Spot {
  name: string;
  genre: string;
  distance: string;
}

interface ReviewUser {
  line_display_name: string;
  line_picture_url: string;
}

interface Review {
  id: number;
  rating: number;
  body: string;
  created_at: string;
  user: ReviewUser;
}

export interface StoreDetailStore {
  id: number;
  name: string;
  area: string;
  address: string;
  nearest_station: string;
  category: string;
  business_hours: string;
  holidays: string;
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
  trial_avg_hourly: number;
  trial_hourly: number;
  interview_hours: string;
  same_day_trial: boolean;
  feature_tags: string[];
  description: string;
  features_text: string;
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
  after_spots: Spot[] | null;
  companion_spots: Spot[] | null;
  reviews_count: number;
  average_rating: number;
  reviews: Review[];
}

interface RelatedStore {
  id: number;
  name: string;
  area: string;
  category: string;
  hourly_min: number;
  hourly_max: number;
  feature_tags: string[];
  reviews_count: number;
  average_rating: number;
}

export interface StoreDetailResponse {
  store: StoreDetailStore;
  related: RelatedStore[];
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
          style={{ color: "#d4af37", fill: "#d4af37" }}
        />,
      );
    } else if (i === full && hasHalf) {
      stars.push(
        <Star
          key={i}
          size={size}
          style={{ color: "#d4af37", fill: "#d4af37", opacity: 0.5 }}
        />,
      );
    } else {
      stars.push(
        <Star
          key={i}
          size={size}
          style={{ color: "#d4af37", fill: "none" }}
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
        fontFamily: "Outfit, sans-serif",
        color: "#1b2528",
        borderLeft: "4px solid #d4af37",
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
  const [scrollY, setScrollY] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: StoreDetailResponse) => {
        if (!cancelled) setData(json);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message ?? "読み込みに失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, previewData]);

  // Parallax scroll tracking for hero video
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (loading) return <LoadingSkeleton />;

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4">
        <p className="text-lg font-medium" style={{ color: "rgba(200,96,128,1)" }}>
          {error ?? "データが見つかりませんでした"}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-full border px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ borderColor: "#d4af37", color: "#d4af37" }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  const { store, related } = data;
  const heroHeight = 220;
  const videoScale = 1 + scrollY * 0.0005;
  const videoOpacity = Math.max(0, 1 - scrollY / (heroHeight * 1.5));

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f6f3" }}>
      {/* ============================================================ */}
      {/* 1. Sticky Hero Video */}
      {/* ============================================================ */}
      {store.video_url && (
        <div
          className="sticky top-0 z-0 w-full overflow-hidden"
          style={{ height: `${heroHeight}px` }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              transform: `scale(${videoScale})`,
              opacity: videoOpacity,
            }}
          >
            <source src={store.video_url} type="video/mp4" />
          </video>
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.4) 100%)",
            }}
          />
        </div>
      )}

      {/* ============================================================ */}
      {/* Fixed Header Bar */}
      {/* ============================================================ */}
      <div
        className="fixed top-0 left-0 right-0 z-30 flex items-center px-4"
        style={{
          height: "56px",
          backgroundColor: scrollY > heroHeight * 0.5 ? "rgba(255,255,255,0.95)" : "transparent",
          backdropFilter: scrollY > heroHeight * 0.5 ? "blur(12px)" : "none",
          borderBottom: scrollY > heroHeight * 0.5 ? "1px solid rgba(27,37,40,0.08)" : "none",
          transition: "background-color 0.3s, backdrop-filter 0.3s",
        }}
      >
        <button
          onClick={() => window.history.back()}
          className="flex h-9 w-9 items-center justify-center rounded-full"
          style={{
            backgroundColor: scrollY > heroHeight * 0.5 ? "transparent" : "rgba(0,0,0,0.3)",
          }}
        >
          <ChevronLeft
            size={24}
            style={{ color: scrollY > heroHeight * 0.5 ? "#1b2528" : "#ffffff" }}
          />
        </button>
        <span
          className="ml-3 truncate text-base font-bold transition-opacity"
          style={{
            fontFamily: "Outfit, sans-serif",
            color: "#1b2528",
            opacity: scrollY > heroHeight * 0.5 ? 1 : 0,
          }}
        >
          {store.name}
        </span>
      </div>

      {/* ============================================================ */}
      {/* Main content - overlaps video on scroll */}
      {/* ============================================================ */}
      <div
        className="relative z-10"
        style={{
          marginTop: store.video_url ? `-20px` : "0",
          borderTopLeftRadius: store.video_url ? "20px" : "0",
          borderTopRightRadius: store.video_url ? "20px" : "0",
          backgroundColor: "#f7f6f3",
        }}
      >
        <div className="mx-auto max-w-3xl space-y-5 px-4 pb-24 pt-6">
          {/* ============================================================ */}
          {/* 2. Shop Intro Card */}
          {/* ============================================================ */}
          <div
            className="overflow-hidden rounded-[16px] bg-white p-5"
            style={{
              boxShadow: "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
              border: "1px solid rgba(27,37,40,0.06)",
            }}
          >
            {/* Store name */}
            <h1
              className="font-heading text-xl font-bold leading-tight"
              style={{ fontFamily: "Outfit, sans-serif", color: "#1b2528" }}
            >
              {store.name}のご紹介です
            </h1>

            {/* Description */}
            {store.description && (
              <p
                className="mt-3 text-sm leading-relaxed"
                style={{ color: "rgba(27,37,40,0.65)" }}
              >
                {store.description}
              </p>
            )}

            {/* Quick info row */}
            <div
              className="mt-4 space-y-2 rounded-[12px] p-3"
              style={{ backgroundColor: "rgba(27,37,40,0.02)" }}
            >
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={14} style={{ color: "#d4af37" }} />
                <span style={{ color: "rgba(27,37,40,0.5)" }}>エリア:</span>
                <span className="font-medium" style={{ color: "#1b2528" }}>
                  {store.area}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp size={14} style={{ color: "#d4af37" }} />
                <span style={{ color: "rgba(27,37,40,0.5)" }}>時給:</span>
                <span className="font-medium" style={{ color: "#1b2528" }}>
                  時給{formatCurrency(store.hourly_min)}〜{formatCurrency(store.hourly_max)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} style={{ color: "#d4af37" }} />
                <span style={{ color: "rgba(27,37,40,0.5)" }}>勤務時間:</span>
                <span className="font-medium" style={{ color: "#1b2528" }}>
                  {store.business_hours}
                  {store.schedule?.shift_info ? `（${store.schedule.shift_info.split("。")[0]}）` : ""}
                </span>
              </div>
            </div>

            {/* Benefits */}
            {store.feature_tags && store.feature_tags.length > 0 && (
              <div className="mt-4">
                <p
                  className="mb-2 text-sm font-bold"
                  style={{ color: "#1b2528" }}
                >
                  【主な待遇】
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {store.feature_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        border: "1px solid rgba(212,175,55,0.3)",
                        color: "#d4af37",
                        backgroundColor: "rgba(212,175,55,0.06)",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Category + Rating badges */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {store.category && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
                >
                  {store.category}
                </span>
              )}
              {(store.average_rating ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-sm">
                  {renderStars(store.average_rating ?? 0, 14)}
                  <span className="font-semibold" style={{ color: "#1b2528" }}>
                    {(store.average_rating ?? 0).toFixed(1)}
                  </span>
                  <span style={{ color: "rgba(27,37,40,0.45)" }}>
                    ({store.reviews_count ?? 0}件)
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* ============================================================ */}
          {/* 3. AI Chat */}
          {/* ============================================================ */}
          <AiChatPanel pageType="detail" storeId={store.id} storeName={store.name} />

          {/* ============================================================ */}
          {/* 4. Experience Entry (体験入店情報) */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Sparkles size={20} style={{ color: "#d4af37" }} />}
            title="体験入店情報"
          >
            <div className="divide-y" style={{ borderColor: "rgba(27,37,40,0.06)" }}>
              <InfoRow label="平均時給" value={formatCurrency(store.trial_avg_hourly ?? 0)} />
              <InfoRow label="体験時給" value={formatCurrency(store.trial_hourly ?? 0)} />
              <InfoRow label="面接可能時間" value={store.interview_hours} />
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
                        <span className="text-xs font-bold" style={{ color: "#d4af37" }}>
                          {hire.count}人
                        </span>
                        <div
                          className="w-full rounded-t-md"
                          style={{
                            height: `${barHeight}px`,
                            background: "linear-gradient(to top, #d4af37, rgba(212,175,55,0.6))",
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
                        <span style={{ color: "#d4af37" }}>●</span>
                        {ex}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          {/* ============================================================ */}
          {/* CTA Button - 体験入店してみる */}
          {/* ============================================================ */}
          <button
            className="flex w-full items-center justify-center gap-2 rounded-full py-4 text-base font-bold text-white transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, rgba(200,96,128,1) 0%, rgba(180,76,108,1) 100%)",
              boxShadow: "0 4px 16px rgba(200,96,128,0.35)",
            }}
            onClick={() => {
              /* LINE apply handler */
            }}
          >
            <Heart size={18} fill="white" />
            体験入店してみる
          </button>

          {/* ============================================================ */}
          {/* 5. Detailed Info - Shop Features */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Building size={20} style={{ color: "#d4af37" }} />}
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
              <InfoRow label="営業時間" value={store.business_hours} />
              {store.holidays && <InfoRow label="定休日" value={store.holidays} />}
            </div>
          </SectionCard>

          {/* ============================================================ */}
          {/* 6. Salary & Benefits */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Award size={20} style={{ color: "#d4af37" }} />}
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
              icon={<Building size={20} style={{ color: "#d4af37" }} />}
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
              icon={<FileText size={20} style={{ color: "#d4af37" }} />}
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
                            style={{ backgroundColor: "#d4af37" }}
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
              icon={<FileText size={20} style={{ color: "#d4af37" }} />}
              title="必要書類"
            >
              <div className="space-y-3">
                {(store.required_documents.documents ?? []).length > 0 && (
                  <ul className="space-y-1.5">
                    {(store.required_documents.documents ?? []).map((doc, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <FileText size={14} className="shrink-0" style={{ color: "#d4af37" }} />
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
          {/* 11. Q&A */}
          {/* ============================================================ */}
          {store.qa && store.qa.length > 0 && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#d4af37" }} />}
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
          {/* 12. Reviews - with blur overlay */}
          {/* ============================================================ */}
          {(store.reviews ?? []).length > 0 && (
            <div
              className="relative overflow-hidden rounded-[16px] bg-white"
              style={{
                boxShadow: "0px 4px 20px rgba(0,0,0,0.06), 0px 1px 3px rgba(0,0,0,0.04)",
                border: "1px solid rgba(27,37,40,0.06)",
              }}
            >
              <div className="px-5 pt-5 pb-3">
                <SectionHeading icon={<Star size={20} style={{ color: "#d4af37" }} />}>
                  リアルな声・口コミ ({store.reviews_count ?? 0}件)
                </SectionHeading>
              </div>
              <div className="relative px-5 pb-5">
                {/* Review content - blurred */}
                <div className="space-y-4" style={{ filter: "blur(6px)", userSelect: "none" }}>
                  {(store.reviews ?? []).map((review) => (
                    <div key={review.id} className="space-y-2">
                      <div className="flex items-center gap-3">
                        {review.user?.line_picture_url ? (
                          <img
                            src={review.user.line_picture_url}
                            alt={review.user?.line_display_name ?? ""}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div
                            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                            style={{ backgroundColor: "rgba(27,37,40,0.08)", color: "rgba(27,37,40,0.4)" }}
                          >
                            {(review.user?.line_display_name ?? "?").charAt(0)}
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: "#1b2528" }}>
                            {review.user?.line_display_name ?? "匿名"}
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
                      <Separator style={{ backgroundColor: "rgba(27,37,40,0.06)" }} />
                    </div>
                  ))}
                </div>

                {/* Blur overlay with login prompt */}
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60">
                  <p
                    className="font-heading mb-4 text-center text-base font-bold"
                    style={{ fontFamily: "Outfit, sans-serif", color: "#1b2528" }}
                  >
                    クチコミを見るにはログインが必要です
                  </p>
                  <button
                    className="flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: "#06C755" }}
                    onClick={() => {
                      /* LINE login handler */
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                    </svg>
                    LINEでログイン
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 13. Staff Comment */}
          {/* ============================================================ */}
          {store.staff_comment && (
            <SectionCard
              icon={<MessageSquare size={20} style={{ color: "#d4af37" }} />}
              title="スタッフコメント"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold"
                    style={{ backgroundColor: "rgba(212,175,55,0.12)", color: "#d4af37" }}
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
                        style={{ border: "1px solid rgba(212,175,55,0.3)", color: "#d4af37" }}
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
          {/* 14. Nearby Spots */}
          {/* ============================================================ */}
          {((store.after_spots && store.after_spots.length > 0) ||
            (store.companion_spots && store.companion_spots.length > 0)) && (
            <SectionCard
              icon={<Utensils size={20} style={{ color: "#d4af37" }} />}
              title="周辺スポット"
            >
              <div className="space-y-4">
                {store.after_spots && store.after_spots.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      アフタースポット
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {store.after_spots.map((spot, i) => (
                        <SpotCard key={i} spot={spot} />
                      ))}
                    </div>
                  </div>
                )}
                {store.companion_spots && store.companion_spots.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                      同伴スポット
                    </h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {store.companion_spots.map((spot, i) => (
                        <SpotCard key={i} spot={spot} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* ============================================================ */}
          {/* 15. Access / Map */}
          {/* ============================================================ */}
          <SectionCard
            icon={<Navigation size={20} style={{ color: "#d4af37" }} />}
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
                        style={{ color: "#d4af37" }}
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
                        style={{ color: "#d4af37" }}
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
          {/* 16. Related Stores */}
          {/* ============================================================ */}
          {(related ?? []).length > 0 && (
            <section className="space-y-3">
              <SectionHeading icon={<Building size={20} style={{ color: "#d4af37" }} />}>
                採用基準が近い店
              </SectionHeading>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
                {(related ?? []).map((r) => (
                  <div key={r.id} className="flex-none snap-start">
                    <StoreCard
                      id={r.id}
                      name={r.name}
                      area={r.area}
                      category={r.category}
                      hourly_min={r.hourly_min}
                      hourly_max={r.hourly_max}
                      feature_tags={r.feature_tags}
                      average_rating={r.average_rating}
                      reviews_count={r.reviews_count}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <Footer />
      </div>

      {/* ============================================================ */}
      {/* Bottom Fixed CTA Bar */}
      {/* ============================================================ */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-3 px-4 py-3"
        style={{
          backgroundColor: "rgba(255,255,255,0.95)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(27,37,40,0.08)",
        }}
      >
        <div className="flex gap-4">
          <a href="/" className="flex flex-col items-center text-[10px]" style={{ color: "rgba(27,37,40,0.45)" }}>
            <Building size={18} />
            ホーム
          </a>
          <a href="/stores" className="flex flex-col items-center text-[10px]" style={{ color: "rgba(27,37,40,0.45)" }}>
            <MapPin size={18} />
            一覧
          </a>
        </div>
        <button
          className="flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-bold text-white"
          style={{
            backgroundColor: "#06C755",
            boxShadow: "0 2px 8px rgba(6,199,85,0.3)",
          }}
          onClick={() => {
            /* LINE apply handler */
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
          </svg>
          LINEで応募・相談する
        </button>
      </div>
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

function SpotCard({ spot }: { spot: Spot }) {
  return (
    <div
      className="flex items-center gap-3 rounded-[12px] p-3"
      style={{ border: "1px solid rgba(27,37,40,0.06)" }}
    >
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{ backgroundColor: "rgba(212,175,55,0.1)" }}
      >
        <Utensils size={16} style={{ color: "#d4af37" }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#1b2528" }}>{spot.name}</p>
        <p className="text-xs" style={{ color: "rgba(27,37,40,0.45)" }}>
          {spot.genre} ・ {spot.distance}
        </p>
      </div>
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
    { label: "綺麗系", value: analysis.cast_style.beauty, color: "#d4af37" },
    { label: "可愛い系", value: analysis.cast_style.cute, color: "rgba(200,96,128,1)" },
    { label: "派手系", value: analysis.cast_style.glamour, color: "#1b2528" },
    { label: "素人系", value: analysis.cast_style.natural, color: "rgba(200,96,128,0.5)" },
  ];

  const maxAge = Math.max(...(analysis.customer_age ?? []).map((c) => c.ratio), 1);

  return (
    <SectionCard
      icon={<Award size={20} style={{ color: "#d4af37" }} />}
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
              style={{ width: `${analysis.experience_level}%`, backgroundColor: "#d4af37" }}
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
              style={{ width: `${analysis.drinking_style}%`, backgroundColor: "#d4af37" }}
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
                      style={{ width: `${(age.ratio / maxAge) * 100}%`, backgroundColor: "#d4af37" }}
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
