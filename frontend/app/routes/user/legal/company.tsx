import type { Route } from "./+types/company";
import LegalPage, { InfoRow, Section } from "~/components/user/shared/LegalPage";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "運営会社 - Recta" },
    {
      name: "description",
      content: "Recta（レクタ）を運営する会社情報および募集情報等提供事業届出に関する情報です。",
    },
  ];
}

export default function CompanyPage() {
  return (
    <LegalPage title="運営会社" eyebrow="Company" updatedAt="2026-05-25">
      <p>
        求人情報サービス「Recta」は、以下の事業者が運営しています。
      </p>

      <Section title="会社概要">
        <dl className="mt-2">
          <InfoRow label="会社名">{"{{COMPANY_NAME}}"}</InfoRow>
          <InfoRow label="代表者">{"{{COMPANY_CEO}}"}</InfoRow>
          <InfoRow label="所在地">{"{{COMPANY_ADDRESS}}"}</InfoRow>
          <InfoRow label="設立">{"{{COMPANY_FOUNDED}}"}</InfoRow>
          <InfoRow label="事業内容">
            求人情報提供サービス「Recta」の企画・開発・運営
          </InfoRow>
        </dl>
      </Section>

      <Section title="募集情報等提供事業に関する表記">
        <dl className="mt-2">
          <InfoRow label="届出番号">{"{{LICENSE_NUMBER}}"}</InfoRow>
          <InfoRow label="事業区分">
            職業安定法に基づく募集情報等提供事業者（特定募集情報等提供事業者）
          </InfoRow>
          <InfoRow label="苦情・お問い合わせ窓口">
            本サービスのLINE公式アカウントよりご連絡ください。
          </InfoRow>
        </dl>
        <p className="mt-3 text-[12px]" style={{ color: "rgba(27,37,40,0.6)" }}>
          ※ 本サービスに掲載される求人情報は、職業安定法および募集情報等提供事業者ガイドラインに基づき、正確かつ最新の状態を保つよう努めております。掲載内容に誤りや問題がある場合は、上記窓口までご連絡ください。
        </p>
      </Section>

      <Section title="関連リンク">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <a href="/terms" className="underline" style={{ color: "rgba(27,37,40,0.8)" }}>
              利用規約
            </a>
          </li>
          <li>
            <a href="/privacy" className="underline" style={{ color: "rgba(27,37,40,0.8)" }}>
              プライバシーポリシー
            </a>
          </li>
        </ul>
      </Section>
    </LegalPage>
  );
}
