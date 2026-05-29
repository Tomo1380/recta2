import StoreListPage from "~/components/user/StoreListPage";
import { buildMetaTags } from "~/lib/seo";

export function meta() {
  return buildMetaTags({
    title: "お店を探す - キャバクラ・ラウンジ・クラブ求人 | Recta",
    description:
      "東京・六本木・銀座・新宿・渋谷のキャバクラ・ラウンジ・クラブ求人を一覧表示。当日体入・時給順・評価順で絞り込み、AIチャットからも相談できます。",
    path: "/stores",
  });
}

export default function Stores() {
  return <StoreListPage />;
}
