import TopPage from "~/components/user/TopPage";
import { buildMetaTags } from "~/lib/seo";

export function meta() {
  return buildMetaTags({
    title: "Recta - AIと探す、理想のナイトワーク求人",
    description:
      "キャバクラ・ラウンジ・クラブのお仕事探しならRecta。AIチャットがあなたに合う体入先・高時給店を提案し、LINEで担当者と直接相談できます。",
    path: "/",
  });
}

export default function Top() {
  return <TopPage />;
}
