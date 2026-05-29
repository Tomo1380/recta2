import { useParams, useLoaderData, redirect } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";
import { buildMetaTags } from "~/lib/seo";

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
  // 既存 StoreDetailPage は id (number) を必須にしているので、
  // loader data の store.id を優先、未取得なら parseInt fallback (slug の場合は NaN)
  const id = loaderData?.store?.id ?? Number(slugOrId);
  return <StoreDetailPage id={id} initialData={loaderData ?? undefined} />;
}
