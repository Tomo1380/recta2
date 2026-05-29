import type { Route } from "./+types/privacy";
import LegalPage, { Section } from "~/components/user/shared/LegalPage";
import { buildMetaTags } from "~/lib/seo";

export function meta(_: Route.MetaArgs) {
  return buildMetaTags({
    title: "プライバシーポリシー - Recta",
    description:
      "Recta（レクタ）における個人情報の取扱いについて定めたプライバシーポリシーです。",
    path: "/privacy",
  });
}

export default function PrivacyPage() {
  return (
    <LegalPage
      title="プライバシーポリシー"
      eyebrow="Privacy Policy"
      updatedAt="2026-05-29"
    >
      <p>
        {COMPANY}（以下「当社」といいます。）は、当社が提供する求人情報サービス「Recta」（以下「本サービス」といいます。）におけるユーザーの個人情報の取扱いについて、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）その他関係法令を遵守し、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <Section title="1. 事業者の名称・住所・代表者">
        <p>本ポリシーに基づく個人情報の取扱いの責任主体は以下のとおりです。詳細は<a href="/company" className="underline">運営会社情報</a>をご参照ください。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>事業者: {COMPANY}</li>
          <li>個人情報保護管理者: {PRIVACY_OFFICER}</li>
        </ul>
      </Section>

      <Section title="2. 取得する個人情報および取得方法">
        <p>当社は、本サービスの提供にあたり、以下の個人情報を、以下の方法により取得します。</p>
        <p className="mt-2 font-semibold">(1) ユーザーから直接取得する情報</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ニックネーム、年齢、希望勤務エリア・業態、その他プロフィール項目</li>
          <li>口コミ、評価、AIチャットへの問い合わせ内容、X（Twitter）ポストURL等の投稿コンテンツ</li>
        </ul>
        <p className="mt-2 font-semibold">(2) LINEログインにより取得する情報</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>LINEユーザー識別子、LINE表示名、プロフィール画像URL</li>
          <li>ユーザーが LINE のアプリ上で同意した場合のメールアドレス</li>
        </ul>
        <p className="mt-2 font-semibold">(3) サービス利用時に自動的に取得する情報</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>アクセスログ、IPアドレス、リファラ情報、ブラウザの種類およびバージョン、OS、デバイス情報、画面サイズ</li>
          <li>Cookieおよび類似技術により取得される識別子、サイト内行動履歴、閲覧した店舗ページ</li>
          <li>本サービスを通じた LINE 公式アカウントとの友だち追加状況、トーク履歴（当社が窓口対応のために確認する範囲）</li>
        </ul>
        <p className="mt-2 font-semibold">(4) 第三者から取得する情報</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>掲載店舗が、求職者ユーザーの紹介の経緯を当社に共有する場合の情報（応募有無、面接日時、入店有無等）</li>
          <li>不正利用防止のため、外部のセキュリティサービス事業者から取得する情報</li>
        </ul>
      </Section>

      <Section title="3. 利用目的">
        <p>当社は、取得した個人情報を、以下の目的の範囲内で利用します。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>本サービスの提供および運営、ユーザーの本人確認、認証管理</li>
          <li>ユーザーに最適な求人情報を提案するため（AIチャットによる対話、レコメンデーションを含む）</li>
          <li>口コミ・評価の表示およびモデレーション</li>
          <li>掲載店舗とユーザーとの円滑なコミュニケーションの媒介（LINE連携を含む）</li>
          <li>ユーザーからのお問い合わせ、サポート対応、利用規約違反の調査・対応</li>
          <li>本サービスの改善、新機能の開発、利用状況の分析・統計化</li>
          <li>AIチャット応答の品質改善（個人を特定できないよう匿名化または統計化した上での利用）</li>
          <li>本サービスに関するご案内、キャンペーン情報、関連サービス・新機能の通知</li>
          <li>不正アクセスの検知、セキュリティインシデントの予防および対応</li>
          <li>法令、行政機関、裁判所等からの要請への対応</li>
          <li>その他、上記の利用目的に付随する業務</li>
        </ul>
      </Section>

      <Section title="4. Cookieおよび類似技術">
        <p>本サービスは、利便性の向上、利用状況の分析、セキュリティ確保等のため、Cookie および類似技術（ローカルストレージ、セッションストレージ等）を使用します。</p>
        <p>主に使用する Cookie の種類は以下のとおりです。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>必須 Cookie: ログイン状態の維持、CSRF 対策など、本サービス提供に不可欠なもの</li>
          <li>機能 Cookie: 表示設定、最近見た店舗、比較トレイの保持等</li>
          <li>分析 Cookie: 利用状況分析のため（後述「6. 外部サービスの利用」参照）</li>
        </ul>
        <p>ユーザーはブラウザの設定により Cookie の受け入れを拒否、または個別に削除することができます。ただし、その場合、本サービスの一部機能が正常に動作しない可能性があります。</p>
      </Section>

      <Section title="5. 第三者への提供">
        <p>当社は、次に掲げる場合を除き、あらかじめユーザーの同意を得ることなく、第三者に個人情報を提供することはありません。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>法令に基づく場合（裁判所、警察、税務当局、行政機関からの正式な要請を含む）</li>
          <li>人の生命、身体または財産の保護のために必要がある場合であって、本人の同意を得ることが困難であるとき</li>
          <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって、本人の同意を得ることが困難であるとき</li>
          <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</li>
          <li>事業承継に伴う合併、会社分割、事業譲渡その他の事由により事業を承継することに伴って個人情報が提供される場合</li>
        </ul>
        <p className="mt-2">ユーザーが応募意思を示し、掲載店舗にコンタクトを希望した場合、当社は当該掲載店舗に対し、求職者ユーザーのニックネーム、希望条件、LINE 上の連絡経路等を共有します。</p>
      </Section>

      <Section title="6. 外部サービスの利用（個人データの取扱いの委託および外国にある第三者への提供）">
        <p>当社は、利用目的の達成に必要な範囲内で、個人情報の取扱いの全部または一部を以下の事業者に委託することがあります。外国にある第三者への提供にあたっては、個人情報保護法第28条に基づき、提供先国における個人情報保護に関する制度等について、ご請求があれば情報提供いたします。</p>
        <table className="mt-3 w-full text-[12px]" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(27,37,40,0.15)" }}>
              <th className="py-2 text-left">委託先</th>
              <th className="py-2 text-left">所在国</th>
              <th className="py-2 text-left">委託内容</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: "1px solid rgba(27,37,40,0.06)" }}>
              <td className="py-2">Amazon Web Services, Inc.</td>
              <td className="py-2">米国</td>
              <td className="py-2">クラウドインフラ（サーバ・データベース・画像ストレージ）</td>
            </tr>
            <tr style={{ borderBottom: "1px solid rgba(27,37,40,0.06)" }}>
              <td className="py-2">Google LLC</td>
              <td className="py-2">米国</td>
              <td className="py-2">AIチャットの応答生成（Gemini API）、地図表示（Google Maps）、フォント配信</td>
            </tr>
            <tr>
              <td className="py-2">LINE株式会社</td>
              <td className="py-2">日本</td>
              <td className="py-2">LINEログイン、Messaging API、トーク窓口</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-[12px]" style={{ color: "rgba(27,37,40,0.55)" }}>
          ※ 委託先は変更されることがあります。重要な変更がある場合は本ポリシーを更新します。
        </p>
      </Section>

      <Section title="7. 個人情報の保有期間">
        <p>当社は、利用目的に必要な範囲内で個人情報を保有し、利用目的を達成した後または法令上の保存期間が経過した後は、合理的な期間内に削除または匿名化を行います。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>退会から3年が経過したアカウント情報は削除します。ただし、紛争解決、法令上の義務履行のため必要な範囲は除外します。</li>
          <li>AIチャットの問い合わせ内容のうち、応答品質改善目的で利用するものは、匿名化または統計化した上で保有期間の制限なく保存することがあります。</li>
        </ul>
      </Section>

      <Section title="8. 個人情報の安全管理措置">
        <p>当社は、個人情報への不正アクセス、紛失、破壊、改ざん、漏えい等を防止するため、以下を含む適切な安全管理措置を講じます。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>組織的安全管理措置: 個人情報保護管理者の選任、社内規程の整備、定期的な点検</li>
          <li>人的安全管理措置: 役職員への教育、秘密保持義務の徹底</li>
          <li>物理的安全管理措置: アクセス制御、デバイスの紛失・盗難対策</li>
          <li>技術的安全管理措置: 通信および保管時の暗号化、認証・認可制御、ログ監視、脆弱性対応</li>
        </ul>
      </Section>

      <Section title="9. ユーザーの権利（開示・訂正・削除・利用停止等の請求）">
        <p>ユーザーは、個人情報保護法に定める要件のもと、自己の個人情報について以下の権利を行使することができます。</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>利用目的の通知、保有個人データの開示、訂正、追加または削除</li>
          <li>利用の停止または消去、第三者への提供の停止</li>
          <li>第三者提供記録の開示</li>
        </ul>
        <p>本サービス上のマイページから可能な操作については、ユーザー自身で実施いただけます。それ以外のご請求については、本ポリシー末尾の連絡先までお問い合わせください。当社は法令に従い、合理的な期間内に対応いたします。なお、開示等請求にあたっては、本人確認のための情報のご提供をお願いすることがあります。</p>
      </Section>

      <Section title="10. 未成年者の利用">
        <p>本サービスは満18歳以上の方のみご利用いただけます。当社は18歳未満の方の個人情報を意図的に収集することはありません。万一18歳未満の方の情報を取得したことが判明した場合、当社は速やかに当該情報を削除します。</p>
      </Section>

      <Section title="11. 第三者サイトへのリンク">
        <p>本サービスから他のウェブサイトへのリンクが提供される場合がありますが、リンク先のウェブサイトにおける個人情報の取扱いについて、当社は責任を負いません。リンク先のプライバシーポリシーを各自ご確認ください。</p>
      </Section>

      <Section title="12. プライバシーポリシーの変更">
        <p>当社は、必要に応じて本ポリシーを変更することがあります。変更後の本ポリシーは、本サービス上に掲載した時点から効力を生じるものとします。重要な変更を行う場合は、本サービス上または LINE 公式アカウント等を通じてユーザーに通知します。</p>
      </Section>

      <Section title="13. お問い合わせ窓口">
        <p>本ポリシーに関するお問い合わせ、開示等請求、苦情の申出は、本サービスの<a href="/contact" className="underline">お問い合わせページ</a>または LINE 公式アカウントよりお願いいたします。</p>
        <p className="text-[12px]" style={{ color: "rgba(27,37,40,0.55)" }}>
          個人情報保護管理者: {PRIVACY_OFFICER}
        </p>
      </Section>

      <p className="mt-10 text-[11.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>
        2026年5月29日 制定<br />
        以上
      </p>
    </LegalPage>
  );
}

const COMPANY = "{{COMPANY_NAME}}";
const PRIVACY_OFFICER = "{{COMPANY_PRIVACY_OFFICER}}";
