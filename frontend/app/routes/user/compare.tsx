import { useParams } from "react-router";
import ComparePage from "~/components/user/ComparePage";

export function meta() {
  return [
    { title: "店舗を比較 - Recta" },
    {
      name: "description",
      content: "気になる2店舗の時給・体験・シフト・必要書類をまとめて比較できます。",
    },
  ];
}

export default function Compare() {
  const { idA, idB } = useParams();
  return <ComparePage idA={Number(idA)} idB={Number(idB)} />;
}
