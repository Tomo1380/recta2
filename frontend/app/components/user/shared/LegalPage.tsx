import type { ReactNode } from "react";
import { Link } from "react-router";
import { ChevronLeft } from "lucide-react";
import { LUXE } from "~/lib/luxe-tokens";

interface LegalPageProps {
  title: string;
  /** Short tagline shown under the title (e.g. "Terms of Service"). */
  eyebrow?: string;
  /** ISO date, e.g. "2026-05-25". Displayed as "最終更新日: 2026年5月25日". */
  updatedAt: string;
  children: ReactNode;
}

/**
 * Shared chrome for legal/static pages (terms, privacy, company, contact).
 *
 * Renders a dark hero + cream body. Wrap article content in <Section>/<Article>
 * helpers exported below so spacing and typography stay consistent.
 */
export default function LegalPage({
  title,
  eyebrow,
  updatedAt,
  children,
}: LegalPageProps) {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${LUXE.dark} 0%, ${LUXE.darkSoft} 60%, ${LUXE.dark} 100%)`,
        }}
      >
        {/* Soft gold glow on the right */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-30%",
            right: "-10%",
            width: "60%",
            height: "160%",
            background:
              "radial-gradient(ellipse at center, rgba(212,175,55,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative px-5 pt-3 pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[12px] font-medium"
            style={{
              color: "rgba(255,255,255,0.7)",
              textDecoration: "none",
              fontFamily: LUXE.fontJa,
            }}
          >
            <ChevronLeft size={14} aria-hidden />
            ホームへ戻る
          </Link>
          {eyebrow && (
            <div
              className="mt-4 text-[10px] font-bold uppercase"
              style={{
                color: "rgba(212,175,55,0.85)",
                fontFamily: LUXE.fontOutfit,
                letterSpacing: "0.22em",
              }}
            >
              {eyebrow}
            </div>
          )}
          <h1
            className="mt-1 text-[24px] font-bold leading-tight text-white"
            style={{ fontFamily: LUXE.fontOutfit }}
          >
            {title}
          </h1>
          {/* Gold underline */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="size-1 rounded-full"
              style={{ backgroundColor: LUXE.gold }}
              aria-hidden
            />
            <span
              aria-hidden
              className="h-px flex-1"
              style={{
                background:
                  "linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0))",
              }}
            />
            <span
              className="text-[10px] font-light text-white/55"
              style={{
                fontFamily: LUXE.fontOutfit,
                letterSpacing: "0.14em",
              }}
            >
              最終更新日: {formatJaDate(updatedAt)}
            </span>
          </div>
        </div>
      </section>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <article
        className="px-5 pb-12 pt-6 text-[13.5px] leading-[1.85]"
        style={{
          fontFamily: LUXE.fontJa,
          color: LUXE.dark,
        }}
      >
        {children}
      </article>
    </>
  );
}

/** Numbered article (条) — used inside <LegalPage> children. */
export function Article({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2
        className="mb-2 flex items-baseline gap-2 text-[15px] font-bold"
        style={{ color: LUXE.dark, fontFamily: LUXE.fontJa }}
      >
        <span
          className="text-[12px] font-semibold"
          style={{ color: LUXE.gold, fontFamily: LUXE.fontOutfit }}
        >
          第{number}条
        </span>
        <span>{title}</span>
      </h2>
      <div className="space-y-2 text-[13px]">{children}</div>
    </section>
  );
}

/** Plain titled subsection — used in /privacy, /company etc. */
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2
        className="mb-2 text-[15px] font-bold"
        style={{
          color: LUXE.dark,
          fontFamily: LUXE.fontJa,
          borderLeft: `3px solid ${LUXE.gold}`,
          paddingLeft: 10,
        }}
      >
        {title}
      </h2>
      <div className="space-y-2 text-[13px]">{children}</div>
    </section>
  );
}

/** Definition-list row, e.g. for the company info page. */
export function InfoRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-4"
      style={{ borderBottom: "1px solid rgba(27,37,40,0.08)" }}
    >
      <dt
        className="shrink-0 text-[11.5px] font-semibold"
        style={{ color: "rgba(27,37,40,0.55)", minWidth: 132 }}
      >
        {label}
      </dt>
      <dd className="text-[13px]" style={{ color: LUXE.dark, margin: 0 }}>
        {children}
      </dd>
    </div>
  );
}

function formatJaDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}
