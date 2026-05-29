import type { Route } from "./+types/company";
import LegalPage, { InfoRow, Section } from "~/components/user/shared/LegalPage";
import { buildMetaTags } from "~/lib/seo";

export function meta(_: Route.MetaArgs) {
  return buildMetaTags({
    title: "運営会社 - Recta",
    description:
      "Recta（レクタ）を運営する会社情報および募集情報等提供事業届出に関する情報です。",
    path: "/company",
  });
}

export default function CompanyPage() {
  return (
    <LegalPage title="運営会社" eyebrow="Company" updatedAt="2026-05-29">
      <p>
        求人情報サービス「Recta」（以下「本サービス」といいます。）は、以下の事業者が運営しています。本サービスは、職業安定法第43条の2に基づく募集情報等提供事業として運営しています。
      </p>

      <Section title="会社概要">
        <dl className="mt-2">
          <InfoRow label="会社名">{"{{COMPANY_NAME}}"}</InfoRow>
          <InfoRow label="代表者">{"{{COMPANY_CEO}}"}</InfoRow>
          <InfoRow label="所在地">{"{{COMPANY_ADDRESS}}"}</InfoRow>
          <InfoRow label="設立年月">{"{{COMPANY_FOUNDED}}"}</InfoRow>
          <InfoRow label="資本金">{"{{COMPANY_CAPITAL}}"}</InfoRow>
          <InfoRow label="事業内容">
            <ul className="list-disc pl-5 space-y-1">
              <li>求人情報提供サービス「Recta」の企画・開発・運営</li>
              <li>AI技術を活用した求職者向けマッチングサービスの提供</li>
              <li>掲載店舗向け広告・販促支援</li>
            </ul>
          </InfoRow>
        </dl>
      </Section>

      <Section title="募集情報等提供事業に関する表記">
        <p className="mb-3 text-[12px]" style={{ color: "rgba(27,37,40,0.6)" }}>
          職業安定法第43条の2第1項に基づく募集情報等提供事業として、以下のとおり届出を行っています。
        </p>
        <dl className="mt-2">
          <InfoRow label="届出番号">{"{{LICENSE_NUMBER}}"}</InfoRow>
          <InfoRow label="事業区分">
            職業安定法第4条第6項に定める募集情報等提供事業者
            <br />
            （同法第4条第7項に定める特定募集情報等提供事業者）
          </InfoRow>
          <InfoRow label="取扱業務">
            キャバクラ、ラウンジ、クラブ、ガールズバー、コンカフェ等の接客サービス職を含むナイトワーク全般の求人募集情報の提供
          </InfoRow>
          <InfoRow label="苦情・お問い合わせ窓口">
            本サービスの<a href="/contact" className="underline">お問い合わせページ</a>
            、または LINE 公式アカウントよりご連絡ください。
            <br />
            お問い合わせから原則 7 営業日以内にご回答いたします。
          </InfoRow>
        </dl>
        <p className="mt-3 text-[12px]" style={{ color: "rgba(27,37,40,0.6)" }}>
          ※ 本サービスに掲載される求人情報は、職業安定法および
          <a
            href="https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyou/jakunensha/dl/guidelines.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            特定募集情報等提供事業者ガイドライン
          </a>
          に基づき、正確かつ最新の状態を保つよう努めております。掲載内容に誤りや問題がある場合は、上記窓口までご連絡ください。
        </p>
      </Section>

      <Section title="募集情報の的確な表示について">
        <p>
          本サービスでは、職業安定法第5条の4および同法施行規則第4条の2に基づき、以下の事項を遵守して募集情報を提供します。
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>虚偽または誤解を生じさせる表示の禁止</li>
          <li>業務の内容、賃金、労働時間その他の労働条件を正確に表示</li>
          <li>募集を行っている事業者の名称または氏名の表示</li>
          <li>募集情報の更新日および掲載期間の管理</li>
          <li>古くなった募集情報の速やかな削除または非公開化</li>
        </ul>
      </Section>

      <Section title="個人情報保護への取り組み">
        <p>
          当社は、ユーザーの個人情報を適切に取扱うため、個人情報保護法および関連法令を遵守し、個人情報保護管理者を選任し、社内規程に基づく運用を行っています。詳細は
          <a href="/privacy" className="underline">プライバシーポリシー</a>
          をご確認ください。
        </p>
      </Section>

      <Section title="関連リンク">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <a href="/terms" className="underline">
              利用規約
            </a>
          </li>
          <li>
            <a href="/privacy" className="underline">
              プライバシーポリシー
            </a>
          </li>
          <li>
            <a href="/contact" className="underline">
              お問い合わせ
            </a>
          </li>
        </ul>
      </Section>
    </LegalPage>
  );
}
