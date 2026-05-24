import type { Route } from "./+types/contact";
import LegalPage, { Section } from "~/components/user/shared/LegalPage";
import LineCtaCard from "~/components/user/shared/LineCtaCard";

export function meta(_: Route.MetaArgs) {
  return [
    { title: "お問い合わせ - Recta" },
    {
      name: "description",
      content: "Recta（レクタ）へのお問い合わせは、LINE公式アカウントよりお気軽にご連絡ください。",
    },
  ];
}

export default function ContactPage() {
  return (
    <LegalPage title="お問い合わせ" eyebrow="Contact" updatedAt="2026-05-25">
      <p>
        本サービスに関するお問い合わせ、ご相談、不具合のご報告等は、LINE公式アカウントよりお気軽にご連絡ください。担当者が随時対応いたします。
      </p>

      <div className="mt-6">
        <LineCtaCard
          variant="card"
          title="LINEで担当者と話す"
          description="お店探しから条件相談まで、LINEで気軽にやりとりできます。"
          ctaLabel="LINEで問い合わせる"
          source="contact-page"
        />
      </div>

      <Section title="お問い合わせの種類">
        <ul className="list-disc pl-5 space-y-1">
          <li>お店探し・条件のご相談</li>
          <li>掲載店舗に関するお問い合わせ</li>
          <li>口コミ・投稿に関するご報告</li>
          <li>本サービスの不具合・要望</li>
          <li>その他、本サービスに関するご質問</li>
        </ul>
      </Section>

      <Section title="営業店舗のお客様へ">
        <p>
          求人情報の掲載・修正・お取り下げのご相談も、LINE公式アカウントよりお問い合わせください。担当者よりご案内いたします。
        </p>
      </Section>
    </LegalPage>
  );
}
