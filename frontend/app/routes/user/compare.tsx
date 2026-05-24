import { useParams } from "react-router";
import ComparePage from "~/components/user/ComparePage";

export function meta() {
  return [
    { title: "店舗を比較 - Recta" },
    {
      name: "description",
      content: "気になる店舗の時給・体験・シフト・必要書類をまとめて比較できます。",
    },
  ];
}

export default function Compare() {
  const { ids } = useParams<{ ids: string }>();
  // "1,5,8" → [1,5,8]。不正値は ComparePage 側で error 表示。
  const parsed = (ids ?? "")
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return <ComparePage ids={parsed} />;
}
