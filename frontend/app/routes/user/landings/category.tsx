import { useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import LandingPage, { type LandingPayload } from "~/components/user/landing/LandingPage";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
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
  const slug = params.categorySlug;
  if (!slug) return null;
  try {
    const res = await fetch(`${resolveApiBase()}/api/landings/categories/${slug}`, {
      headers: { Accept: "application/json" },
    });
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
  params: { categorySlug?: string };
}) {
  const slug = params.categorySlug ?? "";
  if (!data || !data.category) {
    return buildMetaTags({
      title: "業態別求人 | Recta",
      description: "Recta の業態別ナイトワーク求人ページです。",
      path: `/jobs/categories/${slug}`,
    });
  }
  const categoryName = data.category.name;
  const count = data.stats.count;
  return buildMetaTags({
    title: `${categoryName}求人[${count}件]・体入・高時給 | Recta`,
    description: `${categoryName}の求人を ${count} 件掲載。体験確約・未経験 OK・高時給の店舗をエリア横断で一覧比較できます。LINE で気軽に相談可能。`,
    path: `/jobs/categories/${data.category.slug}`,
  });
}

export default function CategoryLanding() {
  const data = useLoaderData() as LandingPayload | null;
  if (!data) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        業態情報が見つかりませんでした。
      </div>
    );
  }
  const schemaJson = data.category ? buildCategorySchema(data) : null;
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

function buildCategorySchema(data: LandingPayload): string {
  const category = data.category!;
  const canonical = absoluteUrl(`/jobs/categories/${category.slug}`);
  const items = data.stores.slice(0, 20).map((s) => ({
    name: s.name,
    url: absoluteUrl(`/stores/${s.slug ?? s.id}`),
  }));
  return serializeSchema(
    buildSchemaGraph([
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "求人を探す", url: absoluteUrl("/stores") },
        { name: category.name, url: canonical },
      ]),
      buildItemListSchema(items),
    ]),
  );
}
