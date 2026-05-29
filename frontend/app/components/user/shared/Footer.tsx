import { Link } from "react-router";
import { LUXE } from "~/lib/luxe-tokens";
import { LINE_ADD_FRIEND_URL } from "~/lib/line";

interface FooterProps {
  className?: string;
}

const footerLinks = [
  { label: "利用規約", to: "/terms" },
  { label: "プライバシーポリシー", to: "/privacy" },
  { label: "運営会社", to: "/company" },
  { label: "お問い合わせ", to: "/contact" },
];

/**
 * フッターのソーシャルリンク。`href` が設定されているものだけ表示される。
 * X / Instagram / TikTok 等のアカウントを開設したら、ここに `href` 付きで
 * 追加すれば自動的にアイコンが出る（href が無いものは描画しない）。
 */
const socialLinks: { label: string; href: string; icon: React.ReactNode }[] = [
  {
    label: "LINE公式アカウント",
    href: LINE_ADD_FRIEND_URL,
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,.4)">
        <path d="M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
  },
];

const GOLD = LUXE.gold;
const DARK = LUXE.dark;
const J = LUXE.fontJa;

/**
 * Brand-luxe footer — dark slab capped by a faint scalloped gold edge.
 * Originally lived inline inside TopPage; lifted here so every user-facing
 * page reads with the same closing brand cadence.
 */
export default function Footer({ className }: FooterProps) {
  return (
    <div
      className={className}
      style={{ marginTop: 28, position: "relative" }}
    >
      <EdgeTopFooter />
      <footer
        style={{
          background: DARK,
          padding: "16px 20px 24px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <h3
            style={{
              fontFamily: LUXE.fontOutfit,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: "0.04em",
              color: "white",
              margin: 0,
            }}
          >
            Recta
          </h3>
          <div
            className="w-[4px] h-[4px] rounded-full"
            style={{ background: GOLD, boxShadow: "0 0 6px rgba(212,175,55,.6)" }}
          />
        </div>
        <p
          style={{
            fontFamily: J,
            fontWeight: 300,
            fontSize: 11,
            color: "rgba(255,255,255,.45)",
            lineHeight: 1.7,
            margin: "0 0 20px",
            maxWidth: 280,
          }}
        >
          AIがあなたにぴったりのナイトワークを提案。安心・安全な求人情報をお届けします。
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-6">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              style={{
                fontFamily: J,
                fontWeight: 400,
                fontSize: 11,
                color: "rgba(255,255,255,.4)",
                textDecoration: "none",
                textAlign: "left",
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div style={{ height: 1, background: "rgba(255,255,255,.08)", marginBottom: 16 }} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
              >
                <SocialIconBox>{social.icon}</SocialIconBox>
              </a>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-label="18歳未満は利用できません"
              style={{
                fontFamily: LUXE.fontOutfit,
                fontWeight: 700,
                fontSize: 9,
                letterSpacing: "0.08em",
                color: GOLD,
                background: "rgba(212,175,55,0.08)",
                border: `1px solid ${GOLD}66`,
                padding: "2px 6px",
                borderRadius: 4,
                lineHeight: 1.2,
              }}
            >
              R18+
            </span>
            <span
              style={{
                fontFamily: LUXE.fontOutfit,
                fontWeight: 400,
                fontSize: 9,
                letterSpacing: "0.06em",
                color: "rgba(255,255,255,.2)",
              }}
            >
              &copy; 2026 Recta Inc.
            </span>
          </div>
        </div>
        <p
          style={{
            fontFamily: J,
            fontWeight: 300,
            fontSize: 10,
            color: "rgba(255,255,255,.32)",
            margin: "12px 0 0",
            lineHeight: 1.5,
          }}
        >
          本サービスは18歳以上の方のみご利用いただけます。
        </p>
      </footer>
    </div>
  );
}

function SocialIconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center"
      style={{
        background: "rgba(255,255,255,.06)",
        border: "1px solid rgba(255,255,255,.08)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Faint scalloped gold edge that sits on top of the footer — bridges the cream
 * page background and the dark footer slab.
 */
function EdgeTopFooter() {
  return (
    <div style={{ position: "relative", height: 44, marginBottom: -1 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: -6,
          left: "10%",
          width: "80%",
          height: 18,
          background: "radial-gradient(ellipse, rgba(212,175,55,.14) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <svg
        viewBox="0 0 430 44"
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          filter: "drop-shadow(0 5px 16px rgba(27,37,40,.2))",
        }}
      >
        <defs>
          <linearGradient id="footerEdgeGold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.4" />
            <stop offset="40%" stopColor={GOLD} stopOpacity="0.2" />
            <stop offset="70%" stopColor={GOLD} stopOpacity="0.6" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <path d="M0,44 L430,44 L430,10 C370,4 290,20 215,12 C140,4 70,18 0,24 Z" fill={DARK} />
        <path
          d="M0,24 C70,18 140,4 215,12 C290,20 370,4 430,10"
          fill="none"
          stroke="url(#footerEdgeGold)"
          strokeWidth="2"
        />
        <path
          d="M0,23 C70,17 140,3 215,11 C290,19 370,3 430,9"
          fill="none"
          stroke="rgba(255,255,255,.12)"
          strokeWidth="0.7"
        />
      </svg>
    </div>
  );
}
