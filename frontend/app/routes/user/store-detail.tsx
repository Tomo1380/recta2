import { useParams, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import StoreDetailPage from "~/components/user/StoreDetailPage";
import type { StoreDetailResponse } from "~/components/user/StoreDetailPage";

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
  const id = params.id;
  if (!id || Number.isNaN(Number(id))) return null;
  try {
    const res = await fetch(`${resolveApiBase()}/api/stores/${id}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as StoreDetailResponse;
  } catch {
    return null;
  }
}

export function meta({ data }: { data: StoreDetailResponse | null | undefined }) {
  const store = data?.store;
  if (!store) {
    return [
      { title: "店舗詳細 - Recta" },
      { name: "description", content: "Recta はキャバクラ・ラウンジ・クラブの求人情報をまとめた、安心して相談できるマッチングサービスです。" },
    ];
  }
  const area = store.area ? `（${store.area}）` : "";
  const title = `${store.name}${area} - Recta`;
  const fallbackDesc = `${store.name}${area}の店舗情報・体験入店・口コミ・面接情報など、求職者向け詳細ページです。${store.category ?? ""}の求人ならRecta。`;
  const desc = (store as { meta_description?: string | null }).meta_description?.trim() || fallbackDesc;
  // OG 画像: 1 枚目の画像 (Storage URL) を優先
  const ogImage = (store as { images?: { url: string }[] | null }).images?.[0]?.url ?? null;
  const tags: Array<Record<string, string>> = [
    { title },
    { name: "description", content: desc },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
  if (ogImage) tags.push({ property: "og:image", content: ogImage });
  return tags;
}

export default function StoreDetail() {
  const { id } = useParams();
  const loaderData = useLoaderData() as StoreDetailResponse | null;
  return <StoreDetailPage id={Number(id)} initialData={loaderData ?? undefined} />;
}
