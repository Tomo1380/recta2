import TopPage from "~/components/user/TopPage";
import { buildMetaTags } from "~/lib/seo";
import {
  buildOrganizationSchema,
  buildSchemaGraph,
  buildWebSiteSchema,
  serializeSchema,
} from "~/lib/schema";

export function meta() {
  return buildMetaTags({
    title: "Recta - AIと探す、理想のナイトワーク求人",
    description:
      "キャバクラ・ラウンジ・クラブのお仕事探しならRecta。AIチャットがあなたに合う体入先・高時給店を提案し、LINEで担当者と直接相談できます。",
    path: "/",
  });
}

const SCHEMA_JSON = serializeSchema(
  buildSchemaGraph([buildOrganizationSchema(), buildWebSiteSchema()]),
);

export default function Top() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: SCHEMA_JSON }}
      />
      <TopPage />
    </>
  );
}
