import StoreListPage from "~/components/user/StoreListPage";

export function meta() {
  return [
    { title: "お店を探す - Recta" },
    { name: "description", content: "キャバクラ・ラウンジ・クラブの求人一覧。エリア・カテゴリで絞り込み検索。" },
  ];
}

export default function Stores() {
  return <StoreListPage />;
}
