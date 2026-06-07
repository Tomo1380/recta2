import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router";
import AiChatPanel from "~/components/user/AiChatPanel";
import Footer from "~/components/user/shared/Footer";
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import RelocateSupportCta from "~/components/user/shared/RelocateSupportCta";
import SectionHeader from "~/components/user/shared/SectionHeader";
import { LineIcon } from "~/components/user/shared/LineIcon";
import { useUserAuthSafe } from "~/lib/user-auth";
import { LUXE } from "~/lib/luxe-tokens";
import { getPreferredArea, setPreferredArea } from "~/lib/preferred-area";
import type { ArticleSummary, PublicArticleIndexResponse } from "~/lib/types";

// ─── Constants ─────────────────────────────────────
// Color/gradient/font tokens live in ~/lib/luxe-tokens. Aliases kept short for
// the heavy inline-style usage below.
const GOLD = LUXE.gold;
const DARK = LUXE.dark;
const J = LUXE.fontJa;
const AI_AVATAR_BG = "linear-gradient(135deg,#D4AF37,#9a7a20)";
const ROBOT_SVG_PATH = "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1a7 7 0 0 1-7 7H9a7 7 0 0 1-7-7H1a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2zm-4 9a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm8 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2z";
const BASE_GRADIENT = LUXE.baseGradient;

/** トップ→コラムのテーマ入口。/columns?section= にディープリンクする
 *  (Article::SECTIONS と一致)。コラムの探し方を入口から見せる導線。 */
const COLUMN_THEMES: { label: string; sub: string }[] = [
  { label: "夜の始め方", sub: "未経験から安心スタート" },
  { label: "エリア別比較", sub: "街ごとの特徴がわかる" },
  { label: "地方から上京", sub: "上京の不安を解消" },
  { label: "Q&A", sub: "よくある疑問に回答" },
];

// ─── Types ─────────────────────────────────────────
interface PickupShop {
  id: number;
  name: string;
  area?: string;
  category?: string;
  trial_hourly_min?: number;
  trial_hourly_max?: number;
  feature_tags?: string[];
  images?: (string | { url: string })[];
  reviews_count?: number;
  average_rating?: number;
}

interface Area {
  id: number;
  name: string;
  slug: string;
  tier?: string;
  store_count?: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  store_count?: number;
}

interface RecentReviewUser {
  line_display_name?: string | null;
  line_picture_url?: string | null;
  use_line_avatar?: boolean;
  nickname?: string | null;
}

interface RecentReview {
  id: number;
  rating: number;
  body: string;
  tweet_id?: string | null;
  tweet_author_screen_name?: string | null;
  created_at: string;
  store: { id: number; name: string; area: string; category: string; image_url?: string | null } | null;
  user: RecentReviewUser | null;
}

interface HomeBanner {
  hero_tagline?: string | null;
  hero_subtitle?: string | null;
  hero_badge?: string | null;
  hero_ai_label?: string | null;
  hero_image_url?: string | null;
}

interface HomeData {
  banner?: HomeBanner;
  pickup_shops?: PickupShop[];
  consultations?: { id: number; question: string; tag?: string; answer?: string; count?: number }[];
  areas?: Area[];
  categories?: Category[];
  recent_reviews?: RecentReview[];
}

// ─── Helpers ───────────────────────────────────────

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffMs = Date.now() - t;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 60) return "たった今";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}分前`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}時間前`;
  const day = Math.floor(hour / 24);
  if (day < 7) return `${day}日前`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}週間前`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}ヶ月前`;
  return `${Math.floor(day / 365)}年前`;
}

// ─── Static Data ────────────────────────────────────

const CATEGORY_IMAGES: Record<string, string> = {
  "ラウンジ": "https://images.unsplash.com/photo-1573830540758-68d5a242fc79?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "キャバクラ": "https://images.unsplash.com/photo-1620022604911-126743712882?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "クラブ": "https://images.unsplash.com/photo-1628500548389-3557986eba8c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "ガールズバー": "https://images.unsplash.com/photo-1758526348234-2dd7170514d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
  "コンカフェ": "https://images.unsplash.com/photo-1612452556802-f9e9ab097eaf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=400",
};


// ─── Helper Components ─────────────────────────────

function AreaCategoryBand({
  areas,
  categories,
  areasVisible,
  setAreasVisible,
  onAreaSelect,
}: {
  areas: Area[];
  categories: Category[];
  areasVisible: number;
  setAreasVisible: (updater: (v: number) => number) => void;
  onAreaSelect: (slug: string) => void;
}) {
  return (
    <div style={{ marginTop: "12px", position: "relative" }}>
      <EdgeTop />
      <div style={{ background: DARK, position: "relative", padding: "20px 0 24px" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "60px", pointerEvents: "none" }} />

        {/* AREA */}
        <div className="px-5">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", color: "rgba(212,175,55,.5)", textTransform: "uppercase" as const }}>Area</span>
              <span style={{ fontFamily: J, fontWeight: 500, fontSize: "14px", color: "rgba(255,255,255,.9)" }}>エリアから探す</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {areas.slice(0, areasVisible).map((area) => {
              const count = area.store_count ?? 0;
              return (
                <Link
                  key={area.id}
                  to={`/stores?area=${encodeURIComponent(area.slug)}`}
                  onClick={() => onAreaSelect(area.slug)}
                  className="rounded-xl flex items-center gap-2.5 px-3 active:scale-[0.98] transition-transform"
                  style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(212,175,55,.2)", height: "50px", textDecoration: "none" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke={GOLD} strokeWidth="1.5" fill="rgba(212,175,55,.15)" />
                    <circle cx="12" cy="9" r="2.5" fill={GOLD} />
                  </svg>
                  <span className="flex-1 text-left" style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: "rgba(255,255,255,.95)" }}>{area.name}</span>
                  <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "10px", color: "rgba(255,255,255,.25)" }}>{count}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="shrink-0"><path d="M9 18l6-6-6-6" stroke="rgba(255,255,255,.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </Link>
              );
            })}
          </div>
          {areasVisible < areas.length && (
            <button
              type="button"
              onClick={() => setAreasVisible((v) => Math.min(v + AREA_STEP, areas.length))}
              className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl active:scale-[0.98] transition-transform"
              style={{ height: "44px", background: "rgba(212,175,55,.1)", border: "1px solid rgba(212,175,55,.25)", cursor: "pointer" }}
              aria-label={`他のエリアをさらに${Math.min(AREA_STEP, areas.length - areasVisible)}件表示`}
            >
              <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: GOLD, letterSpacing: "0.02em" }}>
                他のエリアも見る（あと{areas.length - areasVisible}件）
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          )}
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,.06)", margin: "24px 20px" }} />

        {/* CATEGORY */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-5">
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "10px", letterSpacing: "0.1em", color: "rgba(212,175,55,.5)", textTransform: "uppercase" as const }}>Category</span>
            <span style={{ fontFamily: J, fontWeight: 500, fontSize: "14px", color: "rgba(255,255,255,.9)" }}>カテゴリから探す</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pl-5 pr-3 pb-1" style={{ scrollbarWidth: "none" as const }}>
            {categories.map((cat) => {
              const count = cat.store_count ?? 0;
              const img = cat.image_url || CATEGORY_IMAGES[cat.name];
              return (
                <Link key={cat.id} to={`/stores?category=${encodeURIComponent(cat.slug)}`} className="shrink-0 relative rounded-2xl overflow-hidden active:scale-[0.97] transition-transform" style={{ width: "130px", height: "160px", border: "1px solid rgba(255,255,255,.1)", textDecoration: "none" }}>
                  {img ? (
                    <img src={img} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)` }} />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(0,0,0,.1) 0%,rgba(0,0,0,.6) 100%)" }} />
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p style={{ fontFamily: J, fontWeight: 600, fontSize: "13px", color: "white", margin: "0 0 3px", textShadow: "0 1px 4px rgba(0,0,0,.4)" }}>{cat.name}</p>
                    <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "10px", color: "rgba(255,255,255,.55)", margin: 0 }}>{count} jobs</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
      <EdgeBottom />
    </div>
  );
}

function AiAvatar({ size }: { size: number }) {
  const iconSize = size * 0.625;
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: size * 0.44,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0, background: AI_AVATAR_BG,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
        <path d={ROBOT_SVG_PATH} fill="white" />
      </svg>
    </div>
  );
}

function GlowOrbs() {
  return (
    <div style={{ position: "absolute", inset: 0, height: "260px", overflow: "hidden", pointerEvents: "none", zIndex: 1 }}>
      <div style={{ position: "absolute", top: "-30px", left: "50%", transform: "translateX(-50%)", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(212,175,55,.45)", filter: "blur(60px)", animation: "orbFloat1 6s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "30px", right: "-20px", width: "150px", height: "150px", borderRadius: "50%", background: "rgba(200,96,128,.35)", filter: "blur(55px)", animation: "orbFloat2 7s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "60px", left: "-30px", width: "130px", height: "130px", borderRadius: "50%", background: "rgba(0,126,172,.25)", filter: "blur(50px)", animation: "orbFloat3 8s ease-in-out infinite" }} />
      <div style={{ position: "absolute", top: "10px", left: "35%", width: "80px", height: "80px", borderRadius: "50%", background: "rgba(255,220,100,.3)", filter: "blur(35px)", animation: "orbFloat2 5s ease-in-out infinite reverse" }} />
    </div>
  );
}

function EdgeTop() {
  // drop-shadow を SVG 全体に効かせると、塗り潰し path (DARK の波下) の下端に
  // 影が漏れてベージュ背景に水平な黒い帯として見えてしまう。
  // 影は波線の strokes だけに乗せて、塗り潰し path には乗せない構成にする。
  return (
    <div style={{ position: "relative", height: "54px", marginBottom: "-1px" }}>
      <div style={{ position: "absolute", top: "-8px", left: "8%", width: "84%", height: "28px", background: "radial-gradient(ellipse 100% 100%, rgba(212,175,55,.18) 0%, transparent 70%)", pointerEvents: "none" }} />
      <svg viewBox="0 0 430 54" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="eT1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={GOLD} stopOpacity="0.15" /><stop offset="25%" stopColor={GOLD} stopOpacity="0.7" /><stop offset="50%" stopColor={GOLD} stopOpacity="0.25" /><stop offset="75%" stopColor={GOLD} stopOpacity="0.8" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.2" /></linearGradient>
          <filter id="eT1Shadow" x="-5%" y="-50%" width="110%" height="200%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="rgba(27,37,40,0.25)" />
          </filter>
        </defs>
        <path d="M0,54 L430,54 L430,14 C380,4 310,26 250,16 C190,6 130,28 70,22 C35,19 10,30 0,36 Z" fill={DARK} />
        <g filter="url(#eT1Shadow)">
          <path d="M0,36 C10,30 35,19 70,22 C130,28 190,6 250,16 C310,26 380,4 430,14" fill="none" stroke={GOLD} strokeWidth="12" opacity="0.08" />
          <path d="M0,36 C10,30 35,19 70,22 C130,28 190,6 250,16 C310,26 380,4 430,14" fill="none" stroke="url(#eT1g)" strokeWidth="2.5" />
          <path d="M0,35 C10,29 35,18 70,21 C130,27 190,5 250,15 C310,25 380,3 430,13" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="0.8" />
        </g>
      </svg>
    </div>
  );
}

function EdgeBottom() {
  // EdgeTop と同じ理由で drop-shadow を strokes だけに限定する。
  return (
    <div style={{ position: "relative", height: "54px", marginTop: "-1px" }}>
      <svg viewBox="0 0 430 54" preserveAspectRatio="none" style={{ width: "100%", height: "100%", display: "block" }}>
        <defs>
          <linearGradient id="eB1g" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor={GOLD} stopOpacity="0.2" /><stop offset="30%" stopColor={GOLD} stopOpacity="0.8" /><stop offset="55%" stopColor={GOLD} stopOpacity="0.2" /><stop offset="80%" stopColor={GOLD} stopOpacity="0.7" /><stop offset="100%" stopColor={GOLD} stopOpacity="0.15" /></linearGradient>
          <filter id="eB1Shadow" x="-5%" y="-200%" width="110%" height="300%">
            <feDropShadow dx="0" dy="-3" stdDeviation="3" floodColor="rgba(27,37,40,0.25)" />
          </filter>
        </defs>
        <path d="M0,0 L430,0 L430,40 C380,48 310,28 250,38 C190,48 130,26 70,34 C35,38 10,28 0,20 Z" fill={DARK} />
        <g filter="url(#eB1Shadow)">
          <path d="M0,20 C10,28 35,38 70,34 C130,26 190,48 250,38 C310,28 380,48 430,40" fill="none" stroke={GOLD} strokeWidth="12" opacity="0.08" />
          <path d="M0,20 C10,28 35,38 70,34 C130,26 190,48 250,38 C310,28 380,48 430,40" fill="none" stroke="url(#eB1g)" strokeWidth="2.5" />
          <path d="M0,19 C10,27 35,37 70,33 C130,25 190,47 250,37 C310,27 380,47 430,39" fill="none" stroke="rgba(255,255,255,.15)" strokeWidth="0.8" />
        </g>
      </svg>
      <div style={{ position: "absolute", bottom: "-6px", left: "8%", width: "84%", height: "20px", background: "radial-gradient(ellipse, rgba(212,175,55,.15) 0%, transparent 70%)", pointerEvents: "none" }} />
    </div>
  );
}


// ─── Helper ────────────────────────────────────────

function getImageUrl(image: string | { url: string } | undefined): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  return image.url;
}

// ─── Main Component ────────────────────────────────

// 初期に見せるエリア数と、「他のエリアも見る」を押すたびに足す件数。
const AREA_INITIAL = 6;
const AREA_STEP = 8;

export default function TopPage({
  previewBanner = null,
}: {
  // 管理画面のフロートプレビューから、未保存のヒーロー編集内容を渡して
  // 即時反映表示するための prop (StoreDetailPage の previewData と同じ発想)。
  previewBanner?: HomeBanner | null;
} = {}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  // Provider 外 (admin プレビューで TopPage を直接 render) でも動くよう safe 版。
  const isAuthenticated = useUserAuthSafe()?.isAuthenticated ?? false;
  const [areasVisible, setAreasVisible] = useState(AREA_INITIAL);
  // 最新コラム。0 件ならセクションごと非表示にするので別 state で軽く取る。
  const [columns, setColumns] = useState<ArticleSummary[]>([]);

  useEffect(() => {
    // 最後に選んだエリア (localStorage) を渡すと、ピックアップが近隣エリア順に
    // 並び替わる (絞り込みではなく並べ替えなので運営の推しは消えない)。
    const preferred = getPreferredArea();
    const homeUrl = preferred
      ? `/api/home?area=${encodeURIComponent(preferred)}`
      : "/api/home";
    fetch(homeUrl)
      .then((res) => res.json())
      .then((json: HomeData) => { setData(json); setLoading(false); })
      .catch(() => { setLoading(false); });

    fetch("/api/columns?per_page=3")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: PublicArticleIndexResponse | null) => {
        const list = json?.articles?.data ?? [];
        setColumns(Array.isArray(list) ? list : []);
      })
      .catch(() => setColumns([]));
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-10 animate-spin rounded-full border-4" style={{ borderColor: "rgba(212,175,55,0.2)", borderTopColor: GOLD }} />
          <p className="text-sm" style={{ color: "rgba(27,37,40,0.5)" }}>読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p style={{ color: "rgba(27,37,40,0.5)" }}>データの取得に失敗しました。再度お試しください。</p>
      </div>
    );
  }

  const allPickupShops = data.pickup_shops ?? [];
  const areas = data.areas ?? [];
  const categories = data.categories ?? [];
  const recentReviews = data.recent_reviews ?? [];

  // ヒーロー表示値: API の banner にプレビュー draft を重ね、空なら既定文言。
  const heroBanner: HomeBanner = { ...(data.banner ?? {}), ...(previewBanner ?? {}) };
  const pick = (v: string | null | undefined, fallback: string) =>
    v && v.trim() ? v : fallback;
  const heroImage = pick(heroBanner.hero_image_url, "/hero-top.jpg");
  const heroTagline = pick(heroBanner.hero_tagline, "AIと探す、理想のナイトワーク");
  const heroSubtitle = pick(heroBanner.hero_subtitle, "キャバクラ・ラウンジ・クラブ｜全国厳選");
  const heroBadge = pick(heroBanner.hero_badge, "ナイトワーク求人");
  const heroAiLabel = pick(heroBanner.hero_ai_label, "AI MATCHING");

  // ピックアップは「運営のおすすめ枠」。エリアでの“絞り込み”はしない
  // (完全一致絞りは運営の推しが消えるため撤去済み 2026-06-07 FB)。
  // 代わりに、ユーザーが選んだエリアの近隣順に“並べ替え”だけ行う。並べ替えは
  // backend (/api/home?area=) 側で実施済みなので、ここはそのまま受ける。
  const pickupShops = allPickupShops;

  return (
    <>
      {/* ══ HERO ══ */}
        <div className="relative w-full" style={{ height: "82vw", maxHeight: "360px", minHeight: "260px" }}>
          <img
            src={heroImage}
            alt=""
            width={1200}
            height={630}
            fetchPriority="high"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(8,6,16,.52) 0%,rgba(8,6,16,.1) 45%,rgba(8,6,16,.78) 100%)" }} />
          <div className="absolute bottom-0 left-0 right-0" style={{ height: "1.5px", background: `linear-gradient(90deg,transparent,rgba(212,175,55,.9) 30%,#ffe066 50%,rgba(212,175,55,.9) 70%,transparent)` }} />
          <div className="absolute top-5 left-5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: "linear-gradient(135deg,rgba(212,175,55,.22),rgba(212,175,55,.06))", border: "1px solid rgba(212,175,55,.55)", backdropFilter: "blur(8px)" }}>
              <span className="relative flex h-[6px] w-[6px]">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "rgba(212,175,55,.9)" }} />
                <span className="relative inline-flex rounded-full h-[6px] w-[6px]" style={{ background: GOLD }} />
              </span>
              <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 500, fontSize: "9.5px", letterSpacing: "0.18em", color: "rgba(255,220,100,.95)" }}>{heroAiLabel}</span>
            </div>
          </div>
          <div className="absolute bottom-6 left-5 right-5">
            <div className="mb-2 inline-flex">
              <span className="px-2.5 py-0.5 rounded-sm" style={{ background: "rgba(200,96,128,.85)", fontFamily: J, fontWeight: 700, fontSize: "10px", letterSpacing: "0.14em", color: "white" }}>{heroBadge}</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <h1 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "clamp(36px,11vw,46px)", letterSpacing: "0.04em", lineHeight: 1, color: "#fff", textShadow: "0 2px 24px rgba(0,0,0,.5)", margin: 0 }}>Recta</h1>
              <div className="mb-1.5 w-[5px] h-[5px] rounded-full shrink-0" style={{ background: GOLD, boxShadow: "0 0 8px rgba(212,175,55,.8)" }} />
            </div>
            <div className="mb-3" style={{ width: "52px", height: "1px", background: "linear-gradient(90deg,rgba(212,175,55,.9),transparent)" }} />
            {/* BUG-Live-08: ヒーロー文言は site_settings (DB) で管理する想定だが、
                ここでハードコードされていたため、管理画面で変えても反映されなかった。
                API レスポンス (data.banner) を優先し、無い場合だけ既定文言にフォールバック。 */}
            <p style={{ fontFamily: J, fontWeight: 500, fontSize: "15px", letterSpacing: "0.04em", color: "rgba(255,255,255,.96)", lineHeight: 1.5, textShadow: "0 1px 12px rgba(0,0,0,.5)", margin: "0 0 4px" }}>{heroTagline}</p>
            <p style={{ fontFamily: J, fontWeight: 300, fontSize: "11px", letterSpacing: "0.08em", color: "rgba(255,240,180,.88)", margin: 0 }}>{heroSubtitle}</p>
          </div>
        </div>

        {/* ══ AI CHAT ══ */}
        <div style={{ background: BASE_GRADIENT, padding: "14px 12px 16px", position: "relative" }}>
          <GlowOrbs />
          <AiChatPanel pageType="top" />
        </div>

        {/* ══ DARK BAND — AREA + CATEGORY (上に移動) ══ */}
        <AreaCategoryBand
          areas={areas}
          categories={categories}
          areasVisible={areasVisible}
          setAreasVisible={setAreasVisible}
          onAreaSelect={(slug) => {
            // 選んだエリアを記録。次回トップ訪問時に /api/home?area= へ渡し、
            // ピックアップをこのエリアの近隣順に並べ替える。
            setPreferredArea(slug);
          }}
        />

        {/* ══ PICKUP STORES ══
            BUG-Live-09: 0件のとき空のセクションタイトルだけ出てた。
            データがあるときだけセクション全体を描画する。 */}
        {pickupShops.length > 0 && (
        <div className="mt-4">
          <div className="px-5 mb-3">
            <SectionHeader
              title="ピックアップ店舗"
              right={
                <Link to="/stores" style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: GOLD, textDecoration: "none" }}>すべて見る →</Link>
              }
            />
          </div>
          <div className="flex gap-3 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
            {pickupShops.map((store) => {
              const imageUrl = store.images && store.images.length > 0 ? getImageUrl(store.images[0]) : undefined;
              return (
                <Link key={store.id} to={`/stores/${store.id}`} className="shrink-0 rounded-2xl overflow-hidden" style={{ width: "200px", background: "white", boxShadow: "0 4px 20px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.06)", border: "1px solid rgba(27,37,40,.06)", textDecoration: "none" }}>
                  <div className="relative w-full overflow-hidden" style={{ height: "130px" }}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={store.name} className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1b2528, #2a3a3f)" }}>
                        <span style={{ fontSize: "24px", fontWeight: 700, color: GOLD }}>{store.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,transparent 30%,rgba(0,0,0,.5) 100%)" }} />
                    {store.category && (
                      <div
                        className="absolute top-2.5 left-2.5 inline-flex items-center px-2 rounded-md"
                        style={{
                          height: 18,
                          background: "rgba(200,96,128,.9)",
                          backdropFilter: "blur(4px)",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: J,
                            fontSize: "9px",
                            fontWeight: 600,
                            color: "white",
                            letterSpacing: "0.04em",
                            lineHeight: 1,
                          }}
                        >
                          {store.category}
                        </span>
                      </div>
                    )}
                    {(store.trial_hourly_min || store.trial_hourly_max) && (
                      <div className="absolute bottom-2.5 left-2.5 right-2.5">
                        <p style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "13px", color: "white", margin: 0, textShadow: "0 1px 6px rgba(0,0,0,.5)" }}>
                          体入時給 {store.trial_hourly_min?.toLocaleString()}〜{store.trial_hourly_max?.toLocaleString()}円
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="px-3.5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p style={{ fontFamily: J, fontWeight: 600, fontSize: "13px", color: DARK, margin: 0 }}>{store.name}</p>
                      {store.average_rating && store.average_rating > 0 && (
                        <div className="flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill={GOLD}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 600, fontSize: "11px", color: DARK }}>{store.average_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 mb-2">
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="rgba(20,39,46,.4)" /></svg>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.5)" }}>{store.area}</span>
                      {store.reviews_count !== undefined && store.reviews_count > 0 && (
                        <>
                          <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.25)" }}>|</span>
                          <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(20,39,46,.4)" }}>{store.reviews_count}件の口コミ</span>
                        </>
                      )}
                    </div>
                    {store.feature_tags && store.feature_tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {store.feature_tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 rounded" style={{ background: "rgba(212,175,55,.08)", border: "1px solid rgba(212,175,55,.15)", fontFamily: J, fontWeight: 500, fontSize: "9px", color: "rgba(168,130,20,.8)" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        )}

        {/* ══ COLUMNS (Recta コラム) ══
            記事 0 件ならセクションごと非表示 (空棚は逆効果)。            */}
        {columns.length > 0 && (
          <div className="mt-6 px-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }} />
                <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em", color: DARK, margin: 0 }}>
                  Recta コラム
                </h2>
              </div>
              <Link
                to="/columns"
                style={{ fontFamily: J, fontSize: "12px", fontWeight: 500, color: "rgba(27,37,40,.55)", textDecoration: "none" }}
              >
                もっと見る →
              </Link>
            </div>

            {/* テーマ入口 — /columns?section= にディープリンク (ダーク×ゴールド) */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {COLUMN_THEMES.map((t) => (
                <Link
                  key={t.label}
                  to={`/columns?section=${encodeURIComponent(t.label)}`}
                  className="relative overflow-hidden rounded-xl px-3 py-2.5 active:scale-[0.98] transition-transform"
                  style={{
                    background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
                    border: "1px solid rgba(212,175,55,.3)",
                    boxShadow: "0 4px 14px rgba(27,37,40,.16), inset 0 1px 0 rgba(212,175,55,.1)",
                    textDecoration: "none",
                  }}
                >
                  <span
                    aria-hidden
                    className="absolute -right-5 -top-5 w-12 h-12 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(212,175,55,.2), transparent 70%)" }}
                  />
                  <div className="flex items-center justify-between gap-1">
                    <span style={{ fontFamily: J, fontWeight: 700, fontSize: "13px", color: "white", letterSpacing: ".02em" }}>
                      {t.label}
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M9 6l6 6-6 6" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="mt-0.5 truncate" style={{ fontFamily: J, fontSize: "10px", color: "rgba(212,175,55,.85)" }}>
                    {t.sub}
                  </div>
                </Link>
              ))}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
              {columns.map((col) => (
                <Link
                  key={col.id}
                  to={`/columns/${col.slug}`}
                  className="shrink-0"
                  style={{
                    width: 220,
                    background: "white",
                    borderRadius: 14,
                    border: "1px solid rgba(27,37,40,.06)",
                    boxShadow: "0 4px 16px rgba(0,0,0,.04)",
                    overflow: "hidden",
                    textDecoration: "none",
                    color: DARK,
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16 / 10",
                      background: col.thumbnail_url
                        ? `center / cover url(${col.thumbnail_url})`
                        : `linear-gradient(135deg, ${DARK} 0%, #2c3e46 50%, rgba(200,96,128,.4) 100%)`,
                      position: "relative",
                    }}
                  >
                    {col.category && (
                      <span
                        className="absolute top-2 left-2 px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(255,255,255,.92)",
                          fontFamily: J,
                          fontWeight: 700,
                          fontSize: "10px",
                          color: DARK,
                        }}
                      >
                        {col.category}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <h3
                      style={{
                        fontFamily: J,
                        fontWeight: 700,
                        fontSize: "13px",
                        lineHeight: 1.5,
                        margin: 0,
                        color: DARK,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {col.title}
                    </h3>
                    {col.excerpt && (
                      <p
                        style={{
                          fontFamily: J,
                          fontWeight: 400,
                          fontSize: "11px",
                          lineHeight: 1.6,
                          margin: "6px 0 0",
                          color: "rgba(27,37,40,.55)",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as const,
                          overflow: "hidden",
                        }}
                      >
                        {col.excerpt}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ══ RECENTLY VIEWED (あなたが見た店舗) ══ */}
        <RecentlyViewedStores variant="flush" />

        {/* ══ REVIEWS ══ */}
        <div className="mt-6 px-5 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: `linear-gradient(180deg,${GOLD},#c8960c)` }} />
              <h2 style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.02em", color: DARK, margin: 0 }}>新着クチコミ</h2>
              <span className="px-2 py-0.5 rounded" style={{ background: "rgba(200,96,128,.1)", fontFamily: J, fontWeight: 600, fontSize: "9px", color: "rgba(200,96,128,.8)" }}>{recentReviews.length}件</span>
            </div>
          </div>
          {recentReviews.length === 0 ? (
            <div className="px-5 py-8 text-center" style={{ fontFamily: J, fontSize: "12px", color: "rgba(27,37,40,.45)" }}>
              まだ口コミは投稿されていません。
            </div>
          ) : (
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" as const }}>
            {recentReviews.map((review, idx) => {
              const requireLogin = !isAuthenticated && idx >= 3;
              // 口コミ表示は本人のニックネームのみ。LINE 実名はプライバシー保護のため使わない。
              const userName = review.user?.nickname || "匿名";
              const initial = (userName.charAt(0) || "?");
              const dateText = review.created_at ? formatRelative(review.created_at) : "";
              return (
              <Link
                key={review.id}
                to={requireLogin ? "/login" : `/stores/${review.store?.id}#reviews`}
                onClick={() => {
                  if (requireLogin) {
                    sessionStorage.setItem("recta:login-return-to", "/");
                  }
                }}
                className="shrink-0 rounded-2xl overflow-hidden block active:scale-[0.99] transition-transform"
                style={{ width: "270px", background: "white", border: "1px solid rgba(27,37,40,.06)", boxShadow: "0 4px 20px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.04)", textDecoration: "none", color: "inherit" }}
              >
                <div className="flex items-center px-4 pt-3.5 pb-2.5 gap-3">
                  {/* 店舗サムネ: 画像 URL があれば 36x36 で表示、無ければ
                      従来の棚アイコンを fallback として残す。 */}
                  {review.store?.image_url ? (
                    <img
                      src={review.store.image_url}
                      alt={review.store.name}
                      className="w-9 h-9 rounded-xl object-cover shrink-0"
                      style={{ border: "1px solid rgba(27,37,40,.08)" }}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,rgba(200,96,128,.1),rgba(200,96,128,.04))", border: "1px solid rgba(200,96,128,.15)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 21V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v14M3 21h10M13 21V3a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v18M13 21h8" stroke="rgba(200,96,128,.55)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <p style={{ fontFamily: J, fontWeight: 600, fontSize: "12.5px", color: DARK, margin: 0 }}>{review.store?.name ?? ""}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9.5px", color: "rgba(27,37,40,.4)" }}>{review.store?.area ?? ""}</span>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9.5px", color: "rgba(27,37,40,.2)" }}>·</span>
                      <span className="px-1.5 py-0 rounded" style={{ fontFamily: J, fontWeight: 500, fontSize: "9px", color: "rgba(200,96,128,.7)", background: "rgba(200,96,128,.07)" }}>{review.store?.category ?? ""}</span>
                    </div>
                  </div>
                  <span style={{ fontFamily: J, fontWeight: 400, fontSize: "9px", color: "rgba(27,37,40,.25)" }}>{dateText}</span>
                </div>
                <div style={{ height: "1px", background: "linear-gradient(90deg,transparent,rgba(27,37,40,.06) 16px,rgba(27,37,40,.06) calc(100% - 16px),transparent)" }} />
                <div className="relative" style={{ padding: "12px 16px 14px", minHeight: "115px" }}>
                  <div style={{ filter: requireLogin ? "blur(7px)" : "none", transition: "filter .4s ease", userSelect: requireLogin ? "none" : "auto" }}>
                    <div className="flex items-center gap-3 mb-2.5">
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(s => (
                          <svg key={s} width="13" height="13" viewBox="0 0 24 24" fill={s <= review.rating ? GOLD : "rgba(27,37,40,.08)"}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,rgba(200,96,128,.12),rgba(200,96,128,.06))", border: "1px solid rgba(200,96,128,.15)" }}>
                          <span style={{ fontFamily: J, fontWeight: 600, fontSize: "8px", color: "rgba(200,96,128,.7)" }}>{initial}</span>
                        </div>
                        <span style={{ fontFamily: J, fontWeight: 500, fontSize: "10.5px", color: "rgba(27,37,40,.5)" }}>{userName}</span>
                      </div>
                    </div>
                    <p style={{ fontFamily: J, fontWeight: 400, fontSize: "12px", color: DARK, margin: 0, lineHeight: 1.75, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const, overflow: "hidden" }}>{review.body}</p>
                  </div>
                  {requireLogin && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1" style={{ background: "rgba(255,255,255,.08)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mb-1">
                        <rect x="3" y="11" width="18" height="11" rx="2" stroke="rgba(27,37,40,.25)" strokeWidth="1.5" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="rgba(27,37,40,.25)" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span style={{ fontFamily: J, fontWeight: 400, fontSize: "10px", color: "rgba(27,37,40,.45)", marginBottom: "6px" }}>クチコミを見るにはログインが必要です</span>
                      {/* 親要素がもう <Link to="/login"> なので、ここは
                          presentational なボタン外見だけ。<a> をネストすると
                          React Router の hydrate が壊れて Invalid HTML 警告
                          になるため、敢えてただの <span> にする。クリックは
                          外側カードの Link が拾う。 */}
                      <span
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl"
                        style={{ background: "#06C755", boxShadow: "0 4px 14px rgba(6,199,85,.3), 0 1px 3px rgba(6,199,85,.2)" }}
                      >
                        <LineIcon size={16} />
                        <span style={{ fontFamily: J, fontWeight: 600, fontSize: "12px", color: "white", letterSpacing: "0.02em" }}>LINEでログイン</span>
                      </span>
                    </div>
                  )}
                </div>
              </Link>
              );
            })}
          </div>
          )}
        </div>

        {/* ══ 上京サポート BANNER ══ */}
        <div className="mt-6 px-5">
          <RelocateSupportCta variant="top" />
        </div>

        {/* ══ FOOTER ══ */}
        <Footer />
    </>
  );
}
