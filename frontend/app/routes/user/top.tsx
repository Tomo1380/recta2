import TopPage from "~/components/user/TopPage";

export function meta() {
  return [
    { title: "Recta - AIと探す、理想のナイトワーク" },
    { name: "description", content: "キャバクラ・ラウンジ・クラブのお仕事探しならRecta。AIがあなたにぴったりのお店を見つけます。" },
  ];
}

export default function Top() {
  return <TopPage />;
}
