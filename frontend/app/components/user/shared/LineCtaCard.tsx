import { LineIcon } from "~/components/user/shared/LineIcon";
import { openLineFriendAdd, type LineCtaSource } from "~/lib/line";

/**
 * LINE 公式アカウント友だち追加への CTA カード。
 *
 * サイトの主要コンバージョンポイントなので 1 ファイルに集約し、
 * 配置文脈ごとに `variant` でデザインを切り替える。
 *
 * variants:
 * - `slim`  — 白カード+緑枠。セクション間に挟むインライン CTA。
 * - `card`  — LINE 緑グラデの全幅カード+白ボタン。最強訴求。
 * - `dark`  — ダーク背景+ゴールド枠+緑ボタン。ページ末尾の総括 CTA。
 */

export type LineCtaVariant = "slim" | "card" | "dark";

interface LineCtaCardProps {
  /** 表示形態 */
  variant?: LineCtaVariant;
  /** タイトル文言（必須） */
  title: string;
  /** 補助説明文（無くてもよい） */
  description?: string;
  /** ボタンラベル */
  ctaLabel?: string;
  /** 計測用ソースキー（推奨） */
  source?: LineCtaSource;
}

const LINE_GREEN = "#06C755";
const LINE_GREEN_DARK = "#04a447";
const GOLD = "#D4AF37";
const DARK = "#1b2528";

export default function LineCtaCard({
  variant = "slim",
  title,
  description,
  ctaLabel = "LINEで相談する",
  source,
}: LineCtaCardProps) {
  if (variant === "card") {
    return (
      <div
        className="rounded-2xl p-4 flex items-center gap-3"
        style={{
          background: `linear-gradient(135deg, ${LINE_GREEN} 0%, ${LINE_GREEN_DARK} 100%)`,
          boxShadow: "0 8px 22px rgba(6,199,85,0.22)",
        }}
      >
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)" }}
          aria-hidden
        >
          <LineIcon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold leading-tight" style={{ color: "white" }}>{title}</p>
          {description && (
            <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.85)" }}>{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => openLineFriendAdd(source)}
          aria-label={`${title}（LINEで友だち追加）`}
          className="px-3.5 py-2 rounded-lg active:scale-95 transition-transform shrink-0"
          style={{
            background: "white",
            color: LINE_GREEN_DARK,
            fontWeight: 700,
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    );
  }

  if (variant === "dark") {
    return (
      <div
        className="rounded-2xl p-5"
        style={{
          background: `linear-gradient(135deg, ${DARK}, #2c3e46)`,
          border: `1px solid ${GOLD}4d`,
        }}
      >
        <p
          className="text-[14.5px] font-bold leading-tight"
          style={{ color: "white", fontFamily: "'Noto Sans JP',sans-serif" }}
        >
          {title}
        </p>
        {description && (
          <p
            className="text-[11.5px] mt-1.5 leading-relaxed"
            style={{ color: "rgba(255,255,255,0.65)", fontFamily: "'Noto Sans JP',sans-serif" }}
          >
            {description}
          </p>
        )}
        <button
          type="button"
          onClick={() => openLineFriendAdd(source)}
          aria-label={`${title}（LINEで友だち追加）`}
          className="mt-3.5 w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-[0.98] transition-transform"
          style={{
            background: LINE_GREEN,
            border: "none",
            cursor: "pointer",
            color: "white",
            fontFamily: "'Noto Sans JP',sans-serif",
            fontWeight: 700,
            fontSize: "13.5px",
          }}
        >
          <LineIcon size={18} />
          <span>{ctaLabel}</span>
        </button>
      </div>
    );
  }

  // slim
  return (
    <button
      type="button"
      onClick={() => openLineFriendAdd(source)}
      aria-label={`${title}（LINEで友だち追加）`}
      className="w-full rounded-xl px-3.5 py-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
      style={{
        background: "white",
        border: `1px solid ${LINE_GREEN}`,
        boxShadow: "0 2px 10px rgba(6,199,85,0.08)",
        cursor: "pointer",
      }}
    >
      <span
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: LINE_GREEN }}
        aria-hidden
      >
        <LineIcon size={18} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[12.5px] font-semibold leading-tight" style={{ color: DARK }}>
          {title}
        </span>
        {description && (
          <span className="block text-[10.5px] mt-0.5 leading-snug" style={{ color: "rgba(27,37,40,0.55)" }}>
            {description}
          </span>
        )}
      </span>
      <span
        className="text-[11px] font-bold px-2.5 py-1.5 rounded-md shrink-0"
        style={{ background: LINE_GREEN, color: "white" }}
        aria-hidden
      >
        {ctaLabel}
      </span>
    </button>
  );
}
