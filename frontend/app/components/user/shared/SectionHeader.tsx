/**
 * Brand-standard section heading: gold vertical bar + Outfit title (+ optional
 * pink subtitle, dark gold pill badge, and right-aligned action slot). Mirrors
 * the "ピックアップ店舗" header on TopPage so every section across the user
 * site reads as part of the same visual family.
 */
import type { ReactNode } from "react";
import { LUXE } from "~/lib/luxe-tokens";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  right?: ReactNode;
  className?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  badge,
  right,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${className}`.trim()}>
      <div className="flex items-center gap-2 min-w-0">
        <span
          aria-hidden
          className="w-1 h-5 rounded-full shrink-0"
          style={{ background: `linear-gradient(180deg,${LUXE.gold},${LUXE.goldDark})` }}
        />
        <h2
          className="m-0 truncate"
          style={{
            fontFamily: LUXE.fontOutfit,
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: LUXE.dark,
          }}
        >
          {title}
        </h2>
        {badge && (
          <span
            className="px-2 py-0.5 rounded shrink-0"
            style={{
              background: `linear-gradient(135deg,${LUXE.dark},${LUXE.darkSoft})`,
              border: `1px solid ${LUXE.goldGlow}`,
              fontFamily: LUXE.fontOutfit,
              fontWeight: 600,
              fontSize: 8.5,
              letterSpacing: "0.12em",
              color: LUXE.gold,
            }}
          >
            {badge}
          </span>
        )}
        {subtitle && (
          <span
            className="text-[11px] shrink-0 min-w-0 truncate"
            style={{
              color: "rgba(27,37,40,0.5)",
              fontFamily: LUXE.fontJa,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
