import StoreListPage from "~/components/user/StoreListPage";

export function meta() {
  const title = "お店を探す - キャバクラ・ラウンジ・クラブ求人 | Recta";
  const desc =
    "東京・六本木・銀座・新宿・渋谷のキャバクラ・ラウンジ・クラブ求人を一覧表示。当日体入・時給順・評価順で絞り込み、AIチャットからも相談できます。";
  return [
    { title },
    { name: "description", content: desc },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function Stores() {
  return <StoreListPage />;
}
