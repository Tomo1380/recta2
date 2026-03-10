import { useState, useEffect } from "react";
import { Link } from "react-router";
import {
  Search,
  MapPin,
  ChevronRight,
  Sparkles,
  Star,
  MessageCircle,
  TrendingUp,
  Radio,
} from "lucide-react";
import StoreCard from "~/components/user/shared/StoreCard";
import Footer from "~/components/user/shared/Footer";
import AiChatPanel from "~/components/user/AiChatPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BannerData {
  hero_tagline?: string;
  hero_subtitle?: string;
  hero_badge?: string;
  hero_ai_label?: string;
}

interface PickupShop {
  id: number;
  name: string;
  area?: string;
  category?: string;
  hourly_min?: number;
  hourly_max?: number;
  feature_tags?: string[];
  images?: (string | { url: string })[];
  is_pr?: boolean;
  reviews_count?: number;
  average_rating?: number;
}

interface Area {
  id: number;
  name: string;
  slug: string;
  tier?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
}

interface HomeData {
  banner?: BannerData;
  pickup_shops?: PickupShop[];
  consultations?: { id: number; question: string; tag: string; count: number }[];
  areas?: Area[];
  categories?: Category[];
}

// ---------------------------------------------------------------------------
// Fake data for sections not yet backed by API
// ---------------------------------------------------------------------------

const FAKE_REVIEWS = [
  { initial: "ゆ", name: "ゆきな", time: "3日前", text: "未経験でしたが、スタッフの方が丁寧にサポートしてくださり、安心して働くことができました。お客様も紳士的な方が多く..." },
  { initial: "あ", name: "あいり", time: "5日前", text: "時給が良く、交通費も全額支給されるので助かります。シフトの融通も利くので学業との両立がしやすいです..." },
  { initial: "り", name: "りの", time: "1週間前", text: "面接の雰囲気がとても良く、お店の雰囲気も落ち着いていて働きやすいです。ノルマもなく自分のペースで..." },
  { initial: "ま", name: "まりか", time: "2週間前", text: "体入で雰囲気を確かめてから入店できたので安心でした。黒服さんも優しくて、未経験の私でも楽しく働けています..." },
  { initial: "ほ", name: "ほのか", time: "2週間前", text: "日払いOKなのがとても助かります。終電上がりもできるので、Wワークにも最適です。客層も良いお店です..." },
];

const AREA_COUNTS: Record<string, number> = {
  "渋谷": 186, "新宿": 234, "六本木": 152, "銀座": 98,
  "池袋": 143, "恵比寿": 87, "麻布十番": 64, "表参道": 41,
};

const CATEGORY_COUNTS: Record<string, number> = {
  "キャバクラ": 420, "ラウンジ": 380, "クラブ": 210,
  "ガールズバー": 165, "コンカフェ": 95,
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TopPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HomeData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/home")
      .then((res) => res.json())
      .then((json: HomeData) => {
        setData(json);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  // ---- Loading state ----
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="size-10 animate-spin rounded-full border-4"
            style={{
              borderColor: "rgba(212,175,55,0.2)",
              borderTopColor: "#d4af37",
            }}
          />
          <p className="text-sm" style={{ color: "rgba(27,37,40,0.5)" }}>
            読み込み中...
          </p>
        </div>
      </div>
    );
  }

  // ---- Error state ----
  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p style={{ color: "rgba(27,37,40,0.5)" }}>
          データの取得に失敗しました。再度お試しください。
        </p>
      </div>
    );
  }

  const banner = data.banner ?? {};
  const pickupShops = data.pickup_shops ?? [];
  const areas = data.areas ?? [];
  const categories = data.categories ?? [];
  const consultations = data.consultations ?? [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f6f3" }}>
      {/* ================================================================= */}
      {/* Hero Section - Dark with background image & decorative elements   */}
      {/* ================================================================= */}
      <section
        className="relative overflow-hidden px-4 pb-10 pt-14"
        style={{
          background:
            "linear-gradient(180deg, #1b2528 0%, #243034 50%, #1b2528 100%)",
          minHeight: "420px",
        }}
      >
        {/* Background decorative image */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800&q=40')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(27,37,40,0.7) 0%, rgba(27,37,40,0.85) 50%, rgba(27,37,40,0.95) 100%)",
          }}
        />

        {/* Decorative glow orbs */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "20%",
            right: "10%",
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            top: "40%",
            left: "5%",
            width: "150px",
            height: "150px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(200,96,128,0.1) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        <div className="relative mx-auto flex max-w-md flex-col items-center text-center">
          {/* Badge */}
          <span
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-wider"
            style={{
              backgroundColor: "rgba(212,175,55,0.15)",
              color: "#d4af37",
              border: "1px solid rgba(212,175,55,0.3)",
            }}
          >
            <Sparkles className="size-3" />
            {banner.hero_badge ?? "AI MATCHING"}
          </span>

          {/* Logo */}
          <h1
            className="mb-2 text-[48px] font-bold leading-none tracking-tight text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Recta
            <span style={{ color: "#d4af37" }}>.</span>
          </h1>

          {/* Tagline */}
          <p
            className="mb-3 text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            {banner.hero_tagline ?? "AIと探す、理想のナイトワーク"}
          </p>

          {/* Subtitle */}
          <p
            className="mb-8 text-xs"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {banner.hero_subtitle ?? "キャバクラ・ラウンジ・クラブ｜全国1,200件以上"}
          </p>

          {/* Search bar */}
          <div className="flex w-full gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2"
                style={{ color: "rgba(27,37,40,0.35)" }}
              />
              <input
                type="text"
                placeholder="エリア・店名・条件で検索"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-xl bg-white pl-10 pr-4 text-sm outline-none"
                style={{
                  color: "#1b2528",
                  boxShadow: "0px 4px 16px rgba(0,0,0,0.15)",
                }}
              />
            </div>
            <Link
              to={
                searchQuery
                  ? `/stores?q=${encodeURIComponent(searchQuery)}`
                  : "/stores"
              }
              className="flex h-12 items-center justify-center rounded-xl px-5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{
                background:
                  "linear-gradient(135deg, #d4af37 0%, #c5a028 100%)",
                boxShadow: "0 4px 12px rgba(212,175,55,0.3)",
              }}
            >
              検索
            </Link>
          </div>

          {/* Decorative labels */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Organic Curve", "Layered Depth", "Glow Orbs", "Aurora"].map((label) => (
              <span
                key={label}
                className="rounded-full px-2.5 py-0.5 text-[9px]"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.35)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* AI Chat Section                                                   */}
      {/* ================================================================= */}
      <section
        className="px-4 pt-10 pb-8"
        style={{ backgroundColor: "white" }}
      >
        <div className="mx-auto max-w-2xl">
          <AiChatPanel pageType="top" />
        </div>
      </section>


      {/* ================================================================= */}
      {/* Pickup Shops - ピックアップ店舗                                   */}
      {/* ================================================================= */}
      <section className="px-4 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2
                className="flex items-center gap-1.5 text-lg font-bold"
                style={{ color: "#1b2528", fontFamily: "Outfit, sans-serif" }}
              >
                <Star size={18} style={{ color: "#d4af37", fill: "#d4af37" }} />
                ピックアップ店舗
              </h2>
              <span
                className="rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
                style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
              >
                PR
              </span>
            </div>
            <Link
              to="/stores"
              className="inline-flex items-center gap-0.5 text-xs font-medium transition-colors hover:opacity-70"
              style={{ color: "#d4af37" }}
            >
              すべて見る
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory">
            {pickupShops.map((shop) => (
              <div key={shop.id} className="flex-none snap-start">
                <StoreCard
                  id={shop.id}
                  name={shop.name}
                  area={shop.area}
                  category={shop.category}
                  hourly_min={shop.hourly_min}
                  hourly_max={shop.hourly_max}
                  feature_tags={shop.feature_tags}
                  images={shop.images}
                  average_rating={shop.average_rating}
                  reviews_count={shop.reviews_count}
                  is_pr={shop.is_pr}
                />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ================================================================= */}
      {/* 新着クチコミ - Recent Reviews                                     */}
      {/* ================================================================= */}
      <section
        className="px-4 py-12"
        style={{ backgroundColor: "white" }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <h2
              className="flex items-center gap-1.5 text-lg font-bold"
              style={{ color: "#1b2528", fontFamily: "Outfit, sans-serif" }}
            >
              <MessageCircle size={18} style={{ color: "#d4af37" }} />
              新着クチコミ
            </h2>
            <span
              className="text-xs font-medium"
              style={{ color: "rgba(27,37,40,0.4)" }}
            >
              {FAKE_REVIEWS.length}件
            </span>
          </div>

          <div className="relative">
            {/* Scrollable review cards */}
            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 snap-x snap-mandatory">
              {FAKE_REVIEWS.map((review, i) => (
                <div
                  key={i}
                  className="flex-none snap-start rounded-[14px] bg-white p-4"
                  style={{
                    width: "260px",
                    boxShadow: "0px 2px 12px rgba(0,0,0,0.05)",
                    border: "1px solid rgba(27,37,40,0.06)",
                    filter: "blur(5px)",
                    userSelect: "none",
                  }}
                >
                  <div className="mb-2 flex items-center gap-2.5">
                    <div
                      className="flex size-9 items-center justify-center rounded-full text-sm font-bold"
                      style={{
                        background: "linear-gradient(135deg, rgba(200,96,128,0.2), rgba(212,175,55,0.2))",
                        color: "rgba(200,96,128,0.8)",
                      }}
                    >
                      {review.initial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "#1b2528" }}>
                        {review.name}
                      </p>
                      <p className="text-[10px]" style={{ color: "rgba(27,37,40,0.4)" }}>
                        {review.time}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(27,37,40,0.65)" }}>
                    {review.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Login overlay */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center rounded-[14px]"
              style={{ backgroundColor: "rgba(247,246,243,0.7)" }}
            >
              <p
                className="mb-3 text-sm font-bold"
                style={{ color: "#1b2528" }}
              >
                クチコミを見るにはログインが必要です
              </p>
              <button
                className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: "#06C755",
                  boxShadow: "0px 3px 12px rgba(6,199,85,0.3)",
                }}
                onClick={() => {
                  window.location.href = "/login";
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                </svg>
                LINEでログイン
              </button>
            </div>
          </div>
        </div>
      </section>


      {/* ================================================================= */}
      {/* エリアから探す                                                     */}
      {/* ================================================================= */}
      <section
        className="px-4 py-12"
        style={{ backgroundColor: "#f7f6f3" }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p
                className="mb-0.5 text-[10px] font-semibold tracking-wider"
                style={{ color: "#d4af37", fontFamily: "Outfit, sans-serif" }}
              >
                Area
              </p>
              <h2
                className="text-lg font-bold"
                style={{ color: "#1b2528" }}
              >
                エリアから探す
              </h2>
            </div>
            <Link
              to="/stores"
              className="inline-flex items-center gap-0.5 text-xs font-medium hover:opacity-70"
              style={{ color: "#d4af37" }}
            >
              もっと見る
              <ChevronRight className="size-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {areas.map((area) => {
              const count = AREA_COUNTS[area.name] ?? Math.floor(Math.random() * 200 + 20);
              const isGold = area.tier === "gold";
              return (
                <Link
                  key={area.id}
                  to={`/stores?area=${encodeURIComponent(area.name)}`}
                  className="flex items-center justify-between rounded-[12px] bg-white px-4 py-3 transition-shadow hover:shadow-md"
                  style={{
                    border: isGold
                      ? "1.5px solid rgba(212,175,55,0.3)"
                      : "1px solid rgba(27,37,40,0.08)",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <MapPin
                      className="size-3.5 shrink-0"
                      style={{ color: isGold ? "#d4af37" : "rgba(27,37,40,0.3)" }}
                    />
                    <span
                      className="text-sm font-medium"
                      style={{ color: "#1b2528" }}
                    >
                      {area.name}
                    </span>
                  </div>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "rgba(27,37,40,0.35)" }}
                  >
                    {count}件
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* カテゴリから探す                                                   */}
      {/* ================================================================= */}
      <section
        className="px-4 py-12"
        style={{
          backgroundColor: "#1b2528",
        }}
      >
        <div className="mx-auto max-w-6xl">
          <div className="mb-5">
            <p
              className="mb-0.5 text-[10px] font-semibold tracking-wider"
              style={{ color: "#d4af37", fontFamily: "Outfit, sans-serif" }}
            >
              Category
            </p>
            <h2
              className="text-lg font-bold text-white"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              カテゴリから探す
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {categories.map((category) => {
              const count = CATEGORY_COUNTS[category.name] ?? 100;
              return (
                <Link
                  key={category.id}
                  to={`/stores?category=${encodeURIComponent(category.slug)}`}
                  className="relative overflow-hidden rounded-[14px] px-4 py-5 transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${category.color}30 0%, ${category.color}15 100%)`,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-sm font-bold text-white">
                    {category.name}
                  </p>
                  <p
                    className="mt-1 text-[11px]"
                    style={{ color: "rgba(255,255,255,0.5)" }}
                  >
                    {count}件の求人
                  </p>
                  {/* Decorative circle */}
                  <div
                    className="absolute -right-3 -top-3 size-16 rounded-full"
                    style={{
                      background: `radial-gradient(circle, ${category.color}25, transparent 70%)`,
                    }}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* みんなの相談                                                       */}
      {/* ================================================================= */}
      <section className="px-4 py-12" style={{ backgroundColor: "#f7f6f3" }}>
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2
                className="text-lg font-bold"
                style={{ color: "#1b2528" }}
              >
                みんなの相談
              </h2>
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: "rgba(200,96,128,0.1)",
                  color: "rgba(200,96,128,1)",
                }}
              >
                <Radio size={8} />
                LIVE
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-medium"
                style={{
                  backgroundColor: "rgba(212,175,55,0.1)",
                  color: "#d4af37",
                }}
              >
                更新
              </span>
            </div>
          </div>

          <p
            className="mb-4 text-xs"
            style={{ color: "rgba(27,37,40,0.45)" }}
          >
            AIがリアルタイムで分析したトレンド相談
          </p>

          <div className="space-y-2.5">
            {(consultations.length > 0 ? consultations : [
              { id: 1, question: "ノルマなしのお店は本当にある？", tag: "条件", count: 1100 },
              { id: 2, question: "容姿に自信がなくても大丈夫？", tag: "不安", count: 1400 },
              { id: 3, question: "バレずに働ける方法はある？", tag: "プライバシー", count: 2300 },
              { id: 4, question: "渋谷エリアの時給相場は？", tag: "エリア", count: 920 },
            ]).map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 rounded-[12px] bg-white px-4 py-3.5 transition-shadow hover:shadow-md"
                style={{
                  border: "1px solid rgba(27,37,40,0.06)",
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex size-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: "rgba(212,175,55,0.08)" }}
                >
                  <TrendingUp size={14} style={{ color: "#d4af37" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    style={{ color: "#1b2528" }}
                  >
                    {item.question}
                  </p>
                  <p className="text-[10px]" style={{ color: "rgba(27,37,40,0.4)" }}>
                    {item.count >= 1000
                      ? `${(item.count / 1000).toFixed(1)}k件の相談`
                      : `${item.count}件の相談`}
                    <span className="ml-1.5" style={{ color: "#d4af37" }}>
                      #{item.tag}
                    </span>
                  </p>
                </div>
                <ChevronRight size={16} style={{ color: "rgba(27,37,40,0.2)" }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Footer                                                            */}
      {/* ================================================================= */}
      <Footer />
    </div>
  );
}
