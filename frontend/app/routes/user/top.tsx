import TopPage from "~/components/user/TopPage";

export function meta() {
  const title = "Recta - AIと探す、理想のナイトワーク求人";
  const desc =
    "キャバクラ・ラウンジ・クラブのお仕事探しならRecta。AIチャットがあなたに合う体入先・高時給店を提案し、LINEで担当者と直接相談できます。";
  return [
    { title },
    { name: "description", content: desc },
    { property: "og:title", content: title },
    { property: "og:description", content: desc },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}

export default function Top() {
  return <TopPage />;
}
