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
  const slug = params.areaSlug;
  if (!slug) return null;
  try {
    const res = await fetch(`${resolveApiBase()}/api/landings/areas/${slug}`, {
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
  params: { areaSlug?: string };
}) {
  const slug = params.areaSlug ?? "";
  if (!data || !data.area) {
    return buildMetaTags({
      title: "エリア別求人 | Recta",
      description: "Recta のエリア別ナイトワーク求人ページです。",
      path: `/jobs/areas/${slug}`,
    });
  }
  const areaName = data.area.name;
  const count = data.stats.count;
  return buildMetaTags({
    title: `${areaName}のナイトワーク求人[${count}件]・キャバクラ/ラウンジ/クラブ | Recta`,
    description: `${areaName}エリアのキャバクラ・ラウンジ・クラブ・ガールズバー求人を ${count} 件掲載。当日体入・高時給・LINE 相談 OK の店舗を一覧で比較できます。`,
    path: `/jobs/areas/${data.area.slug}`,
  });
}

export default function AreaLanding() {
  const data = useLoaderData() as LandingPayload | null;
  if (!data) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        エリア情報が見つかりませんでした。
      </div>
    );
  }
  const schemaJson = data.area ? buildAreaSchema(data) : null;
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

function buildAreaSchema(data: LandingPayload): string {
  const area = data.area!;
  const canonical = absoluteUrl(`/jobs/areas/${area.slug}`);
  const items = data.stores.slice(0, 20).map((s) => ({
    name: s.name,
    url: absoluteUrl(`/stores/${s.slug ?? s.id}`),
  }));
  return serializeSchema(
    buildSchemaGraph([
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "求人を探す", url: absoluteUrl("/stores") },
        { name: area.name, url: canonical },
      ]),
      buildItemListSchema(items),
    ]),
  );
}
