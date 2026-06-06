import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Star, MapPin, Briefcase, ChevronRight, FileText } from "lucide-react";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";

export interface LandingStore {
  id: number;
  slug?: string | null;
  name: string;
  area?: string | null;
  category?: string | null;
  trial_hourly_min?: number | null;
  trial_hourly_max?: number | null;
  trial_type?: "same_day" | "normal" | "none" | null;
  reviews_count?: number | null;
  average_rating?: number | null;
  images?: { url: string; order: number }[] | null;
}

export interface LandingPayload {
  area: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  stores: LandingStore[];
  stats: {
    count: number;
    hourly_min: number | null;
    hourly_max: number | null;
    avg_hourly_min: number | null;
  };
  related: {
    areas?: { name: string; slug: string }[];
    categories?: { name: string; slug: string }[];
  };
}

const GOLD = "#d4af37";
const DARK = "#1b2528";

function formatYen(v: number | null): string {
  if (v == null) return "-";
  return v.toLocaleString();
}

/**
 * SEO 用ランディングページ (エリア × 業態) 共通レイアウト。
 * H1 / lead / 店舗一覧 / 統計 / 関連 LP を全部 SSR で出すことで
 * Googlebot がコンテンツを完全に index できるようにする。
 */
export default function LandingPage({ data }: { data: LandingPayload }) {
  const { area, category, stores, stats, related } = data;
  const { headingTitle, headingDescription, breadcrumbItems } = buildHeadings(area, category, stats);

  return (
    <div style={{ background: "#f5f5f5", minHeight: "100%" }}>
      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #243034 60%, ${DARK} 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-30%",
            right: "-10%",
            width: "60%",
            height: "160%",
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.22) 0%, transparent 60%)",
          }}
        />
        <div className="relative px-5 pb-6 pt-6">
          <div
            className="text-[10px] font-bold uppercase"
            style={{
              color: "rgba(212,175,55,0.85)",
              fontFamily: "'Outfit', sans-serif",
              letterSpacing: "0.22em",
            }}
          >
            {area ? area.name.toUpperCase() : "ALL AREAS"}
            {category ? ` · ${category.name}` : ""}
          </div>
          <h1
            className="mt-2 text-[24px] font-bold leading-tight text-white"
          >
            {headingTitle}
          </h1>
          <p
            className="mt-2 text-[13px] leading-relaxed text-white/70"
          >
            {headingDescription}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="size-1 rounded-full" style={{ backgroundColor: GOLD }} />
            <span
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0))",
              }}
            />
            <span
              className="text-[10px] font-light text-white/55"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.14em" }}
            >
              {stats.count} 件
            </span>
          </div>
        </div>
      </section>

      <Breadcrumb items={breadcrumbItems} />

      {/* Stats summary */}
      <section className="mx-4 mt-3 rounded-2xl bg-white p-4" style={{ border: "1px solid rgba(27,37,40,0.06)" }}>
        <div className="grid grid-cols-3 gap-3 text-center">
          <Stat label="掲載店舗" value={`${stats.count}`} suffix="店" />
          <Stat
            label="体入時給レンジ"
            value={
              stats.hourly_min && stats.hourly_max
                ? `¥${formatYen(stats.hourly_min)}〜¥${formatYen(stats.hourly_max)}`
                : "-"
            }
          />
          <Stat
            label="平均最低体入時給"
            value={stats.avg_hourly_min ? `¥${formatYen(stats.avg_hourly_min)}` : "-"}
          />
        </div>
      </section>

      {/* Stores list */}
      <section className="px-4 pb-6 pt-5">
        <h2 className="mb-3 text-[15px] font-bold" style={{ color: DARK }}>
          掲載店舗一覧
        </h2>
        {stores.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-[13px]" style={{ color: "rgba(27,37,40,0.55)" }}>
            該当する店舗がまだ掲載されていません。
          </div>
        ) : (
          <div className="space-y-2.5">
            {stores.map((store) => (
              <Link
                key={store.id}
                to={`/stores/${store.slug ?? store.id}`}
                className="block rounded-2xl bg-white p-3 transition-colors hover:bg-[rgba(212,175,55,0.04)]"
                style={{ border: "1px solid rgba(27,37,40,0.06)" }}
              >
                <div className="flex items-center gap-3">
                  {store.images?.[0]?.url && (
                    <img
                      src={store.images[0].url}
                      alt={store.name}
                      className="size-16 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-bold" style={{ color: DARK }}>
                      {store.name}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 truncate text-[11px]" style={{ color: "rgba(27,37,40,0.55)" }}>
                      <MapPin size={10} />
                      {store.area}
                      {store.category ? ` · ${store.category}` : ""}
                    </p>
                    {store.trial_hourly_min && (
                      <p className="mt-1 text-[12px] tabular-nums" style={{ color: GOLD, fontWeight: 600 }}>
                        体入時給 ¥{formatYen(store.trial_hourly_min)}
                        {store.trial_hourly_max ? `〜¥${formatYen(store.trial_hourly_max)}` : "〜"}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {store.average_rating && store.average_rating > 0 && (
                      <div className="inline-flex items-center gap-0.5 text-[11px] tabular-nums">
                        <Star size={11} style={{ color: GOLD, fill: GOLD }} />
                        <span style={{ color: DARK, fontWeight: 600 }}>
                          {store.average_rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {store.trial_type === "same_day" && (
                      <span
                        className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white"
                        style={{ background: GOLD }}
                      >
                        体入確約
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} style={{ color: "rgba(27,37,40,0.3)" }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* About section (SEO 本文) */}
      <section className="mx-4 mb-6 rounded-2xl bg-white p-5" style={{ border: "1px solid rgba(27,37,40,0.06)" }}>
        <h2 className="mb-3 text-[15px] font-bold" style={{ color: DARK }}>
          {area && category
            ? `${area.name}の${category.name}求人について`
            : area
              ? `${area.name}のナイトワーク求人について`
              : `${category?.name}求人について`}
        </h2>
        <p className="text-[13px] leading-relaxed" style={{ color: "rgba(27,37,40,0.7)" }}>
          {buildAboutText(area, category)}
        </p>
      </section>

      {/* このエリアのコラム (回遊動線: エリアLP → 記事) */}
      {area && <AreaColumns areaName={area.name} />}

      {/* Related LPs */}
      {(related.areas?.length || related.categories?.length) && (
        <section className="mx-4 mb-8 rounded-2xl bg-white p-4" style={{ border: "1px solid rgba(27,37,40,0.06)" }}>
          <h2 className="mb-3 flex items-center gap-1.5 text-[14px] font-bold" style={{ color: DARK }}>
            <Briefcase size={14} style={{ color: GOLD }} />
            関連の求人を探す
          </h2>
          {related.areas && related.areas.length > 0 && (
            <div className="mb-3">
              <p className="mb-1.5 text-[10.5px] font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                他のエリア
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related.areas.map((a) => (
                  <Link
                    key={a.slug}
                    to={
                      category
                        ? `/jobs/areas/${a.slug}/categories/${category.slug}`
                        : `/jobs/areas/${a.slug}`
                    }
                    className="rounded-full bg-[rgba(212,175,55,0.08)] px-3 py-1 text-[11.5px] transition-colors hover:bg-[rgba(212,175,55,0.18)]"
                    style={{ color: DARK }}
                  >
                    {a.name}
                    {category ? `の${category.name}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {related.categories && related.categories.length > 0 && (
            <div>
              <p className="mb-1.5 text-[10.5px] font-semibold" style={{ color: "rgba(27,37,40,0.5)" }}>
                他の業態
              </p>
              <div className="flex flex-wrap gap-1.5">
                {related.categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={
                      area
                        ? `/jobs/areas/${area.slug}/categories/${c.slug}`
                        : `/jobs/categories/${c.slug}`
                    }
                    className="rounded-full bg-[rgba(200,96,128,0.08)] px-3 py-1 text-[11.5px] transition-colors hover:bg-[rgba(200,96,128,0.18)]"
                    style={{ color: DARK }}
                  >
                    {area ? `${area.name}の` : ""}
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div>
      <p className="text-[10px]" style={{ color: "rgba(27,37,40,0.5)" }}>
        {label}
      </p>
      <p
        className="mt-0.5 text-[15px] font-bold tabular-nums"
        style={{ color: DARK, fontFamily: "'Outfit', sans-serif" }}
      >
        {value}
        {suffix && (
          <span className="ml-0.5 text-[10px] font-medium" style={{ color: "rgba(27,37,40,0.5)" }}>
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function buildHeadings(
  area: LandingPayload["area"],
  category: LandingPayload["category"],
  stats: LandingPayload["stats"],
): {
  headingTitle: string;
  headingDescription: string;
  breadcrumbItems: { label: string; to?: string }[];
} {
  if (area && category) {
    return {
      headingTitle: `${area.name}の${category.name}求人・体入・バイト`,
      headingDescription: `${area.name}エリアの${category.name}の求人を ${stats.count} 件掲載。平均最低時給 ¥${(stats.avg_hourly_min ?? 0).toLocaleString()}〜。体入確約・LINE 相談・24h サポート。`,
      breadcrumbItems: [
        { label: "ホーム", to: "/" },
        { label: "求人を探す", to: "/stores" },
        { label: area.name, to: `/jobs/areas/${area.slug}` },
        { label: category.name },
      ],
    };
  }
  if (area) {
    return {
      headingTitle: `${area.name}のナイトワーク求人一覧`,
      headingDescription: `${area.name}エリアのキャバクラ・ラウンジ・クラブ・ガールズバー求人を ${stats.count} 件掲載。LINE で気軽に相談、24h サポート。`,
      breadcrumbItems: [
        { label: "ホーム", to: "/" },
        { label: "求人を探す", to: "/stores" },
        { label: area.name },
      ],
    };
  }
  if (category) {
    return {
      headingTitle: `${category.name}の求人一覧`,
      headingDescription: `${category.name}の求人を ${stats.count} 件掲載。体入確約・高時給・未経験 OK の店舗を比較検討できます。`,
      breadcrumbItems: [
        { label: "ホーム", to: "/" },
        { label: "求人を探す", to: "/stores" },
        { label: category.name },
      ],
    };
  }
  return {
    headingTitle: "ナイトワーク求人一覧",
    headingDescription: "Recta に掲載中の求人一覧です。",
    breadcrumbItems: [{ label: "ホーム", to: "/" }, { label: "求人を探す" }],
  };
}

function buildAboutText(
  area: LandingPayload["area"],
  category: LandingPayload["category"],
): string {
  const areaName = area?.name ?? "東京";
  const categoryName = category?.name ?? "ナイトワーク";
  return (
    `${areaName}の${categoryName}は、未経験から始める方も多く、お店ごとに体入時給・バック・ノルマ・送り条件が大きく違います。` +
    `Recta では各店舗の時給レンジ、面接情報、体入の流れ、口コミ評価を一覧で比較でき、` +
    `気になる店舗は LINE から直接担当者へ相談できます。体入確約・住居サポート・上京サポートも、` +
    `各店舗ページに条件が明示されているので、自分に合う一店を効率よく見つけられます。`
  );
}

interface AreaColumnSummary {
  id: number;
  slug: string;
  title: string;
  thumbnail_url?: string | null;
  section?: string | null;
  category?: string | null;
}

/**
 * エリアLP → このエリアのコラム (回遊動線)。エリア名を tags に持つ記事を
 * クライアントで取得して表示。SEO 本文ではなく補助コンテンツなので client-fetch。
 */
function AreaColumns({ areaName }: { areaName: string }) {
  const [cols, setCols] = useState<AreaColumnSummary[]>([]);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/columns?tags=${encodeURIComponent(areaName)}&per_page=4`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.articles?.data) setCols(j.articles.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [areaName]);

  if (cols.length === 0) return null;

  return (
    <section className="mx-4 mb-6 rounded-2xl bg-white p-4" style={{ border: "1px solid rgba(27,37,40,0.06)" }}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-[14px] font-bold" style={{ color: DARK }}>
          <FileText size={14} style={{ color: GOLD }} />
          {areaName}のコラム
        </h2>
        <Link
          to={`/columns?tag=${encodeURIComponent(areaName)}`}
          className="text-[12px]"
          style={{ color: "rgba(27,37,40,0.55)", textDecoration: "none" }}
        >
          もっと見る →
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {cols.map((c) => (
          <Link
            key={c.id}
            to={`/columns/${c.slug}`}
            className="shrink-0 overflow-hidden rounded-xl"
            style={{ width: 170, background: "#fcfeff", border: "1px solid rgba(27,37,40,0.06)", textDecoration: "none" }}
          >
            <div
              className="relative w-full"
              style={{
                height: 100,
                background: c.thumbnail_url
                  ? `center / cover url(${c.thumbnail_url})`
                  : "linear-gradient(135deg,#1b2528,#2a3a3f)",
              }}
            >
              {(c.section || c.category) && (
                <span
                  className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ background: "rgba(255,255,255,0.92)", color: DARK }}
                >
                  {c.section || c.category}
                </span>
              )}
            </div>
            <div className="px-2.5 py-2">
              <p className="line-clamp-2 text-xs font-bold" style={{ color: DARK, lineHeight: 1.4 }}>
                {c.title}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
