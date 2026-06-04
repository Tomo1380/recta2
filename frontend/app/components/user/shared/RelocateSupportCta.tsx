import { Link } from "react-router";
import { Calculator, Home as HomeIcon } from "lucide-react";

/**
 * 上京サポート（/relocate-support）への誘導バナー。
 *
 * TopPage の「地方から東京で働きたい方へ」バナーと
 * StoreDetail の「給与・待遇」直後の収支シミュレーション再誘導は
 * 同一構造のため、配置文脈ごとに variant で文言とアイコンだけ差し替える。
 */

export type RelocateSupportVariant = "top" | "salary";

const GOLD = "#D4AF37";
const DARK = "#1b2528";

const PRESETS: Record<RelocateSupportVariant, {
  eyebrowTag: string;
  badge: string;
  title: string;
  subtitle: string;
  Icon: typeof Calculator;
  iconRender: "outline" | "filled";
}> = {
  top: {
    eyebrowTag: "Relocate Support",
    badge: "家紹介あり",
    title: "地方から東京で働きたい方へ",
    subtitle: "体入確約・オンライン面接・住居サポートまで一気通貫",
    Icon: HomeIcon,
    iconRender: "outline",
  },
  salary: {
    eyebrowTag: "Relocate Support",
    badge: "家賃込み試算",
    title: "地方からの上京・収支シミュレーション",
    subtitle: "寮・足代サポートを含めた手取りをチェック",
    Icon: Calculator,
    iconRender: "outline",
  },
};

interface RelocateSupportCtaProps {
  variant?: RelocateSupportVariant;
}

export default function RelocateSupportCta({ variant = "top" }: RelocateSupportCtaProps) {
  const preset = PRESETS[variant];
  const Icon = preset.Icon;

  return (
    <Link
      to="/relocate-support"
      aria-label={`${preset.title} — 上京サポートページへ`}
      className="block rounded-2xl overflow-hidden active:scale-[0.99] transition-transform"
      style={{
        // 元々 base linear-gradient + 右側に absolute span で gold radial を重ねていたが、
        // span の bounding-box 左端で radial の透明域が直線で切れて「右下ボーダー
        // 付近がガビって見える」現象が出ていた。base 背景に radial を 1 段
        // 重ねる方式に変えると要素境界に縛られず自然にフェードする。
        background:
          `radial-gradient(circle at 88% 50%, ${GOLD}24 0%, transparent 55%), ` +
          `linear-gradient(135deg, ${DARK} 0%, #2c3e46 60%, rgba(200,96,128,.4) 100%)`,
        // ボーダー無し: 金ボーダーが背景グラデの境目で「がび」って見えていた。
        // ボックスシャドウで浮かせれば縁の存在感は出る。
        boxShadow: "0 8px 24px rgba(0,0,0,.18)",
        textDecoration: "none",
        position: "relative",
      }}
    >
      <div className="flex items-center gap-3 p-4 relative">
        <span
          className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${GOLD}26`, border: `1px solid ${GOLD}59` }}
          aria-hidden
        >
          <Icon size={22} strokeWidth={1.6} style={{ color: GOLD }} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "9.5px",
                letterSpacing: "0.14em",
                color: GOLD,
                textTransform: "uppercase",
              }}
            >
              {preset.eyebrowTag}
            </span>
            <span
              className="px-1.5 py-0 rounded"
              style={{
                background: "rgba(255,255,255,.1)",
                fontFamily: "'Noto Sans JP',sans-serif",
                fontWeight: 600,
                fontSize: "8.5px",
                color: "rgba(255,255,255,.85)",
              }}
            >
              {preset.badge}
            </span>
          </div>
          <p
            className="text-[14.5px] font-bold leading-tight"
            style={{ color: "white", fontFamily: "'Noto Sans JP',sans-serif" }}
          >
            {preset.title}
          </p>
          <p
            className="text-[11px] mt-0.5 leading-snug"
            style={{ color: "rgba(255,255,255,.7)", fontFamily: "'Noto Sans JP',sans-serif" }}
          >
            {preset.subtitle}
          </p>
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0"
          aria-hidden
        >
          <path d="M9 18l6-6-6-6" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}
