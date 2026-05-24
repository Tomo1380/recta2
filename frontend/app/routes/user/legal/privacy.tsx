import type { Route } from "./+types/privacy";
import LegalPage, { Section } from "~/components/user/shared/LegalPage";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "プライバシーポリシー - Recta" },
    {
      name: "description",
      content: "Recta（レクタ）における個人情報の取扱いについて定めたプライバシーポリシーです。",
    },
  ];
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="プライバシーポリシー"
      eyebrow="Privacy Policy"
      updatedAt="2026-05-25"
    >
      <p>
        {COMPANY}（以下「当社」といいます。）は、当社が提供する求人情報サービス「Recta」（以下「本サービス」といいます。）におけるユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <Section title="1. 取得する個人情報">
        <p>当社は、本サービスの提供にあたり、以下の個人情報を取得します。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>LINEアカウント連携時に取得する情報: LINEユーザーID、表示名、プロフィール画像URL、メールアドレス（ユーザーが同意した場合）</li>
          <li>ユーザーが自ら入力する情報: ニックネーム、年齢</li>
          <li>本サービス上でユーザーが投稿する情報: 口コミ、評価、AIチャットの問い合わせ内容</li>
          <li>自動的に取得する情報: アクセスログ、IPアドレス、ブラウザ情報、Cookie情報、閲覧履歴</li>
          <li>ユーザーが許可した場合の位置情報（おおまかなエリア検出のため）</li>
        </ul>
      </Section>

      <Section title="2. 利用目的">
        <p>取得した個人情報は、以下の目的の範囲内で利用します。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本サービスの提供および運営のため</li>
          <li>ユーザーに最適な求人情報を提案するため（AIチャットを含む）</li>
          <li>ユーザーからのお問い合わせに対応するため</li>
          <li>本サービスの改善・新機能の開発のため</li>
          <li>利用規約に違反する行為への対応のため</li>
          <li>本サービスに関するご案内やキャンペーン等の通知のため</li>
        </ul>
      </Section>

      <Section title="3. 第三者への提供">
        <p>当社は、次に掲げる場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>法令に基づく場合</li>
          <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
          <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
          <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
        </ul>
      </Section>

      <Section title="4. 個人情報の取扱いの委託">
        <p>当社は、利用目的の達成に必要な範囲内で、個人情報の取扱いの全部または一部を以下の事業者に委託することがあります。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>クラウドインフラ事業者: Amazon Web Services, Inc.（米国）</li>
          <li>AIサービス提供事業者: Google LLC（米国 / Gemini API）</li>
          <li>認証・メッセージング基盤: LINE株式会社（日本）</li>
        </ul>
        <p>外国にある第三者への提供にあたっては、個人情報保護法第28条に基づき、提供先国における個人情報保護に関する制度等について、ご請求があれば情報提供いたします。</p>
      </Section>

      <Section title="5. 個人情報の開示・訂正・削除請求">
        <p>ユーザーは、本サービス上のマイページから、自身が登録した個人情報の確認・訂正・削除を行うことができます。それ以外の個人情報については、本ポリシー末尾の連絡先までお問い合わせください。当社は法令に従い、合理的な期間内に対応いたします。</p>
      </Section>

      <Section title="6. Cookieおよびアクセス解析">
        <p>本サービスは、ユーザー体験の向上とサービス改善のためにCookieおよび類似の技術を使用します。ユーザーはブラウザの設定によりCookieの受け入れを拒否することができますが、その場合、本サービスの一部機能が正常に動作しない可能性があります。</p>
      </Section>

      <Section title="7. セキュリティ">
        <p>当社は、個人情報への不正アクセス、紛失、破壊、改ざん、漏えい等を防止するため、適切な安全管理措置を講じます。</p>
      </Section>

      <Section title="8. 未成年者の利用">
        <p>本サービスは18歳以上の方のみご利用いただけます。当社は18歳未満の個人情報を意図的に収集することはありません。</p>
      </Section>

      <Section title="9. プライバシーポリシーの変更">
        <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後の本ポリシーは、本サービス上に掲載した時点から効力を生じるものとします。</p>
      </Section>

      <Section title="10. お問い合わせ窓口">
        <p>本ポリシーに関するお問い合わせは、本サービスのLINE公式アカウントよりお願いいたします。</p>
        <p className="text-[12px]" style={{ color: "rgba(27,37,40,0.55)" }}>
          個人情報保護管理者: {PRIVACY_OFFICER}
        </p>
      </Section>

      <p className="mt-10 text-[11.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>
        以上
      </p>
    </LegalPage>
  );
}

const COMPANY = "{{COMPANY_NAME}}";
const PRIVACY_OFFICER = "{{COMPANY_PRIVACY_OFFICER}}";
