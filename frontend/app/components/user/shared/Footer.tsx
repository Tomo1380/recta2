import { Link } from "react-router";

interface FooterProps {
  className?: string;
}

const footerLinks = [
  { label: "利用規約", to: "/terms" },
  { label: "プライバシーポリシー", to: "/privacy" },
  { label: "運営会社", to: "/company" },
  { label: "お問い合わせ", to: "/contact" },
  { label: "よくある質問", to: "/faq" },
  { label: "ヘルプセンター", to: "/help" },
];

export default function Footer({ className }: FooterProps) {
  return (
    <footer
      className={`px-4 py-12 sm:px-6 lg:px-8 ${className ?? ""}`}
      style={{ backgroundColor: "#1b2528" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Logo */}
        <div className="mb-8">
          <span
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Recta
            <span style={{ color: "#d4af37" }}>●</span>
          </span>
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "'Noto Sans JP', sans-serif", fontWeight: 300, maxWidth: "274px" }}>
            AIがあなたにぴったりのナイトワークを提案。安心・安全な求人情報をお届けします。
          </p>
        </div>

        {/* Links grid */}
        <nav className="mb-8 grid grid-cols-2 gap-x-8 gap-y-3 sm:max-w-md">
          {footerLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-sm transition-colors"
              style={{ color: "rgba(255,255,255,0.6)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.6)";
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div
          className="mb-6"
          style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}
        />

        {/* Social icons + Copyright */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex size-8 items-center justify-center rounded-[10px]" style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "0.5px solid rgba(255,255,255,0.08)" }}>
                <div className="size-3.5 rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.4)" }} />
              </div>
            ))}
          </div>
          <p className="text-[9px] tracking-wider" style={{ color: "rgba(255,255,255,0.2)", fontFamily: "Outfit, sans-serif" }}>
            &copy; 2026 Recta Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
