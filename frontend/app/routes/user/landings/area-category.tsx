import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import LandingPage, { type LandingPayload } from "~/components/user/landing/LandingPage";
import { buildMetaTags } from "~/lib/seo";

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
    });
  }
  const { area, category, stats } = data;
  return buildMetaTags({
    title: `${area.name}の${category.name}求人[${stats.count}件]・体入・体験入店 | Recta`,
    description: `${area.name}の${category.name}求人を ${stats.count} 件掲載。平均時給 ¥${(stats.avg_hourly_min ?? 0).toLocaleString()}〜、当日体入 OK の店舗も。LINE で 24h 相談 OK。`,
    path: `/jobs/areas/${area.slug}/categories/${category.slug}`,
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
  return <LandingPage data={data} />;
}
