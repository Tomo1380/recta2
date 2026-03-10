import { useParams } from "react-router";
import StoreDetailPage from "~/components/user/StoreDetailPage";

export function meta() {
  return [
    { title: "店舗詳細 - Recta" },
  ];
}

export default function StoreDetail() {
  const { id } = useParams();
  return <StoreDetailPage id={Number(id)} />;
}
