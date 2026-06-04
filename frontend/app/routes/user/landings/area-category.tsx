import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import LandingPage, { type LandingPayload } from "~/components/user/landing/LandingPage";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildItemListSchema,
  buildSchemaGraph,
  serializeSchema,
} from "~/lib/schema";

function resolveApiBase(): string {
  if (typeof window !== "undefined") return "";
  const fromEnv = process.env.INTERNAL_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return "http://nginx:80";
}

export async function loader({ params }: LoaderFunctionArgs): Promise<LandingPayload | null> {
  const { areaSlug, categorySlug } = params;
  if (!areaSlug || !categorySlug) return null;
  try {
    const res = await fetch(
      `${resolveApiBase()}/api/landings/areas/${areaSlug}/categories/${categorySlug}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    return (await res.json()) as LandingPayload;
  } catch {
    return null;
  }
}

export function meta({
  data,
  params,
}: {
  data: LandingPayload | null | undefined;
  params: { areaSlug?: string; categorySlug?: string };
}) {
  const areaSlug = params.areaSlug ?? "";
  const categorySlug = params.categorySlug ?? "";
  if (!data || !data.area || !data.category) {
    return buildMetaTags({
      title: "エリア × 業態の求人 | Recta",
      description: "Recta のエリア × 業態組み合わせ求人ページです。",
      path: `/jobs/areas/${areaSlug}/categories/${categorySlug}`,
      // 該当データが無い組み合わせはインデックスさせない (薄いページ防止)。
      noindex: true,
    });
  }
  const { area, category, stats } = data;
  return buildMetaTags({
    title: `${area.name}の${category.name}求人[${stats.count}件]・体入・体験入店 | Recta`,
    description: `${area.name}の${category.name}求人を ${stats.count} 件掲載。平均体入時給 ¥${(stats.avg_hourly_min ?? 0).toLocaleString()}〜、体入確約 OK の店舗も。LINE で 24h 相談 OK。`,
    path: `/jobs/areas/${area.slug}/categories/${category.slug}`,
    // 掲載 0 件の空ページはインデックスさせない (虚偽の件数・薄いコンテンツ回避)。
    noindex: stats.count === 0,
  });
}

export default function AreaCategoryLanding() {
  const data = useLoaderData() as LandingPayload | null;
  if (!data) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        該当の組み合わせが見つかりませんでした。
      </div>
    );
  }

  // 掲載 0 件のときは JSON-LD を出さない (ItemList が空・FAQ が「0件」と
  // 虚偽になり構造化データの品質を下げるため)。
  const schemaJson = data.area && data.category && data.stats.count > 0
    ? buildLandingSchema(data)
    : null;

  return (
    <>
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      )}
      <LandingPage data={data} />
    </>
  );
}

function buildLandingSchema(data: LandingPayload): string {
  const area = data.area!;
  const category = data.category!;
  const canonical = absoluteUrl(`/jobs/areas/${area.slug}/categories/${category.slug}`);
  const items = data.stores.slice(0, 20).map((s) => ({
    name: s.name,
    url: absoluteUrl(`/stores/${s.slug ?? s.id}`),
  }));
  return serializeSchema(
    buildSchemaGraph([
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "求人を探す", url: absoluteUrl("/stores") },
        { name: area.name, url: absoluteUrl(`/jobs/areas/${area.slug}`) },
        { name: category.name, url: canonical },
      ]),
      buildItemListSchema(items),
      buildFAQSchema([
        {
          question: `${area.name}で${category.name}の体入はできますか？`,
          answer: `Recta では ${area.name} エリアの ${category.name} 求人を ${data.stats.count} 件掲載中。体入確約 OK の店舗も多数あり、LINE で直接相談できます。`,
        },
        {
          question: `${area.name}の${category.name}の体入時給はどれくらいですか？`,
          answer: data.stats.hourly_min && data.stats.hourly_max
            ? `掲載店舗の体入時給は ¥${data.stats.hourly_min.toLocaleString()}〜¥${data.stats.hourly_max.toLocaleString()} のレンジです。最低体入時給の平均は ¥${(data.stats.avg_hourly_min ?? 0).toLocaleString()}。`
            : "店舗ごとに異なりますので、各詳細ページの「体入時給」項目をご確認ください。",
        },
        {
          question: "未経験でも応募できますか？",
          answer: "ほとんどの店舗で未経験 OK です。各詳細ページの「応募条件」「面接情報」を確認のうえ、LINE で気軽にご相談ください。",
        },
      ]),
    ]),
  );
}
