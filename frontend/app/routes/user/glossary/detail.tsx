import { Link, useLoaderData } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { ChevronRight } from "lucide-react";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildSchemaGraph,
  serializeSchema,
} from "~/lib/schema";

interface GlossaryEntry {
  id: number;
  category: string;
  slug: string;
  title: string;
  content: string;
  updated_at?: string | null;
  created_at?: string | null;
}

interface GlossaryShowPayload {
  entry: GlossaryEntry;
  related: { slug: string; title: string }[];
}

function resolveApiBase(): string {
  if (typeof window !== "undefined") return "";
  const fromEnv = process.env.INTERNAL_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return "http://nginx:80";
}

export async function loader({ params }: LoaderFunctionArgs): Promise<GlossaryShowPayload | null> {
  const slug = params.slug;
  if (!slug) return null;
  try {
    const res = await fetch(`${resolveApiBase()}/api/glossary/${slug}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as GlossaryShowPayload;
  } catch {
    return null;
  }
}

export function meta({
  data,
  params,
}: {
  data: GlossaryShowPayload | null | undefined;
  params: { slug?: string };
}) {
  const slug = params.slug ?? "";
  const entry = data?.entry;
  if (!entry) {
    return buildMetaTags({
      title: "用語集 | Recta",
      description: "Recta のナイトワーク用語集です。",
      path: `/glossary/${slug}`,
    });
  }
  const desc = entry.content.slice(0, 140);
  // entry.title が既に「〜とは？」を含んでいるケースに対応
  const titleBase = /とは[?？]?/.test(entry.title) ? entry.title : `${entry.title}とは？`;
  return buildMetaTags({
    title: `${titleBase} ナイトワーク用語解説 | Recta`,
    description: desc,
    path: `/glossary/${entry.slug}`,
    type: "article",
  });
}

const GOLD = "#d4af37";
const DARK = "#1b2528";

export default function GlossaryDetail() {
  const data = useLoaderData() as GlossaryShowPayload | null;
  if (!data) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        用語が見つかりませんでした。
      </div>
    );
  }
  const { entry, related } = data;
  const canonical = absoluteUrl(`/glossary/${entry.slug}`);

  const titleBase = /とは[?？]?/.test(entry.title) ? entry.title : `${entry.title}とは？`;
  const schemaJson = serializeSchema(
    buildSchemaGraph([
      buildArticleSchema({
        headline: titleBase,
        description: entry.content.slice(0, 200),
        url: canonical,
        datePublished: entry.created_at ?? null,
        dateModified: entry.updated_at ?? null,
        authorName: "Recta 編集部",
        category: entry.category,
      }),
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "用語集", url: absoluteUrl("/glossary") },
        { name: entry.title, url: canonical },
      ]),
      buildFAQSchema([
        { question: `${entry.title}とは？`, answer: entry.content },
      ]),
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJson }}
      />
      <div style={{ background: "#faf9f5", minHeight: "100%" }}>
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
            padding: "24px 20px 28px",
          }}
        >
          <span
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 700,
              fontSize: 10.5,
              letterSpacing: "0.16em",
              color: GOLD,
              textTransform: "uppercase",
            }}
          >
            Glossary · {entry.category}
          </span>
          <h1 className="mt-2 text-[24px] font-bold leading-tight text-white">
            {entry.title}
          </h1>
        </section>

        <Breadcrumb
          items={[
            { label: "ホーム", to: "/" },
            { label: "用語集", to: "/glossary" },
            { label: entry.title },
          ]}
        />

        <article
          className="mx-4 mb-6 mt-4 rounded-2xl bg-white p-5"
          style={{ border: "1px solid rgba(27,37,40,0.06)" }}
        >
          <p
            className="whitespace-pre-line text-[14px] leading-[1.85]"
            style={{ color: DARK }}
          >
            {entry.content}
          </p>
        </article>

        {related.length > 0 && (
          <section
            className="mx-4 mb-12 rounded-2xl bg-white p-4"
            style={{ border: "1px solid rgba(27,37,40,0.06)" }}
          >
            <h2 className="mb-3 text-[14px] font-bold" style={{ color: DARK }}>
              関連の用語
            </h2>
            <div className="space-y-1.5">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  to={`/glossary/${r.slug}`}
                  className="flex items-center justify-between rounded-xl bg-[rgba(212,175,55,0.05)] px-3 py-2 transition-colors hover:bg-[rgba(212,175,55,0.12)]"
                >
                  <span className="text-[13px] font-semibold" style={{ color: DARK }}>
                    {r.title}
                  </span>
                  <ChevronRight size={14} style={{ color: GOLD }} />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
