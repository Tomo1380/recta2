import { useParams, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildJobPostingSchema,
  buildLocalBusinessSchema,
  buildSchemaGraph,
  serializeSchema,
} from "~/lib/schema";

// SSR loader で店舗データを先取りして動的 meta を出す。
// 失敗時は client-side で /api/stores/:id を叩く既存ロジックに任せるため、
// loader は「成功時のみデータを返す」設計にし、エラーは null で吞む
// (= スローしないので route はレンダリングされる、ただし meta は固定タイトル)。
function resolveApiBase(): string {
  if (typeof window !== "undefined") return "";
  const fromEnv = process.env.INTERNAL_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") {
    return "";
  }
  return "http://nginx:80";
}

export async function loader({ params }: LoaderFunctionArgs): Promise<StoreDetailResponse | null> {
  const slugOrId = params.slugOrId;
  if (!slugOrId) return null;
  try {
    const res = await fetch(`${resolveApiBase()}/api/stores/${slugOrId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as StoreDetailResponse;
    // ID URL でアクセスされた場合、正規 (slug) URL に 301 redirect する。
    // SEO 重複回避 + 被リンク資産の集約。
    if (/^\d+$/.test(slugOrId) && json.store?.slug && json.store.slug !== slugOrId) {
      throw redirect(`/stores/${json.store.slug}`, 301);
    }
    return json;
  } catch (e) {
    // Response (redirect 含む) は throw のまま伝播
    if (e instanceof Response) throw e;
    return null;
  }
}

export function meta({
  data,
  params,
}: {
  data: StoreDetailResponse | null | undefined;
  params: { id?: string };
}) {
  const store = data?.store;
  if (!store) {
    return buildMetaTags({
      title: "店舗詳細 - Recta",
      description:
        "Recta はキャバクラ・ラウンジ・クラブの求人情報をまとめた、安心して相談できるマッチングサービスです。",
      path: `/stores/${params.id ?? ""}`,
    });
  }
  const area = store.area ? `（${store.area}）` : "";
  const title = `${store.name}${area} - Recta`;
  const fallbackDesc = `${store.name}${area}の店舗情報・体験入店・口コミ・面接情報など、求職者向け詳細ページです。${store.category ?? ""}の求人ならRecta。`;
  const desc =
    (store as { meta_description?: string | null }).meta_description?.trim() ||
    fallbackDesc;
  const ogImage = (store as { images?: { url: string }[] | null }).images?.[0]?.url ?? null;
  return buildMetaTags({
    title,
    description: desc,
    // canonical は常に slug 版 (slug 未設定なら ID で fallback)
    path: `/stores/${store.slug ?? store.id}`,
    image: ogImage,
  });
}

export default function StoreDetail() {
  const { slugOrId } = useParams();
  const loaderData = useLoaderData() as StoreDetailResponse | null;
  const id = loaderData?.store?.id ?? Number(slugOrId);
  const store = loaderData?.store;

  // SSR で構造化データを出す。SchemaGraph に LocalBusiness + JobPosting +
  // BreadcrumbList + (qa があれば) FAQPage を入れて 1 タグに集約。
  let schemaJson: string | null = null;
  if (store) {
    const canonical = absoluteUrl(`/stores/${store.slug ?? store.id}`);
    const image =
      (store as { images?: { url: string }[] | null }).images?.[0]?.url ?? null;
    const description =
      ((store as { meta_description?: string | null }).meta_description?.trim() as string | undefined) ||
      ((store as { features_text?: string | null }).features_text?.trim() as string | undefined) ||
      ((store as { description?: string | null }).description?.trim() as string | undefined) ||
      `${store.name}の店舗情報・体験入店・口コミ・面接情報。`;

    const schemas: object[] = [];

    schemas.push(
      buildLocalBusinessSchema({
        name: store.name,
        category: store.category,
        url: canonical,
        address: store.address ?? null,
        area: store.area ?? null,
        lat: store.lat ?? null,
        lng: store.lng ?? null,
        telephone: (store as { phone?: string | null }).phone ?? null,
        websiteUrl: (store as { website_url?: string | null }).website_url ?? null,
        image,
        averageRating: (store as { average_rating?: number | null }).average_rating ?? null,
        reviewsCount: (store as { reviews_count?: number | null }).reviews_count ?? null,
      }),
    );

    const createdAt = (store as unknown as { created_at?: string }).created_at;
    if (createdAt) {
      schemas.push(
        buildJobPostingSchema({
          storeName: store.name,
          area: store.area ?? null,
          category: store.category ?? null,
          url: canonical,
          datePosted: createdAt,
          description,
          hourlyMin: (store as { hourly_min?: number | null }).hourly_min ?? null,
          hourlyMax: (store as { hourly_max?: number | null }).hourly_max ?? null,
          address: store.address ?? null,
          image,
        }),
      );
    }

    schemas.push(
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "店舗一覧", url: absoluteUrl("/stores") },
        { name: store.name, url: canonical },
      ]),
    );

    const qa = (store as { qa?: { question: string; answer: string }[] | null }).qa ?? null;
    if (qa && qa.length > 0) {
      schemas.push(
        buildFAQSchema(
          qa
            .filter((q) => q.question && q.answer)
            .map((q) => ({ question: q.question, answer: q.answer })),
        ),
      );
    }

    schemaJson = serializeSchema(buildSchemaGraph(schemas));
  }

  return (
    <>
      {schemaJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      )}
      <StoreDetailPage id={id} initialData={loaderData ?? undefined} />
    </>
  );
}
