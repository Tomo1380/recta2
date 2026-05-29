import { Link, useLoaderData } from "react-router";
import { BookOpen } from "lucide-react";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
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
}

interface GlossaryIndexPayload {
  categories: string[];
  entries: Record<string, GlossaryEntry[]>;
  total: number;
}

function resolveApiBase(): string {
  if (typeof window !== "undefined") return "";
  const fromEnv = process.env.INTERNAL_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return "";
  return "http://nginx:80";
}

export async function loader(): Promise<GlossaryIndexPayload | null> {
  try {
    const res = await fetch(`${resolveApiBase()}/api/glossary`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as GlossaryIndexPayload;
  } catch {
    return null;
  }
}

export function meta() {
  return buildMetaTags({
    title: "ナイトワーク用語集 - キャバクラ・ラウンジの専門用語ガイド | Recta",
    description:
      "キャバクラ・ラウンジ・クラブのお仕事で使われる業界用語をやさしく解説。バック・ノルマ・体入・送り・指名など、未経験者でも安心して理解できる用語集。",
    path: "/glossary",
  });
}

const GOLD = "#d4af37";
const DARK = "#1b2528";

export default function GlossaryIndex() {
  const data = useLoaderData() as GlossaryIndexPayload | null;
  if (!data) {
    return (
      <div className="px-6 py-12 text-center text-sm text-muted-foreground">
        用語集の取得に失敗しました。
      </div>
    );
  }

  // FAQPage schema (各用語を Q&A 化)
  const faqEntries = data.categories.flatMap((cat) =>
    (data.entries[cat] ?? []).map((entry) => ({
      question: `${entry.title}とは？`,
      answer: entry.content.slice(0, 300),
    })),
  );

  const schemaJson = serializeSchema(
    buildSchemaGraph([
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "用語集", url: absoluteUrl("/glossary") },
      ]),
      buildFAQSchema(faqEntries),
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
            padding: "28px 20px 32px",
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute"
            style={{
              top: 0,
              right: 0,
              bottom: 0,
              width: "60%",
              background:
                "radial-gradient(circle at 70% 30%, rgba(212,175,55,.18), transparent 60%)",
            }}
          />
          <div className="relative">
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: "0.16em",
                color: GOLD,
                textTransform: "uppercase",
              }}
            >
              Recta Glossary
            </span>
            <h1 className="mt-2 text-[22px] font-bold leading-tight text-white">
              ナイトワーク用語集
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-white/70">
              キャバクラ・ラウンジ・クラブの業界用語を {data.total}{" "}
              項目、未経験でもわかるようにまとめました。
            </p>
          </div>
        </section>

        <Breadcrumb
          items={[
            { label: "ホーム", to: "/" },
            { label: "用語集" },
          ]}
        />

        <div className="px-4 pb-12 pt-4">
          {data.categories.map((cat) => (
            <section key={cat} className="mb-6">
              <h2
                className="mb-2 flex items-center gap-1.5 text-[15px] font-bold"
                style={{ color: DARK }}
              >
                <BookOpen size={14} style={{ color: GOLD }} />
                {cat}
              </h2>
              <div
                className="overflow-hidden rounded-2xl bg-white"
                style={{ border: "1px solid rgba(27,37,40,0.06)" }}
              >
                {(data.entries[cat] ?? []).map((entry, idx, arr) => (
                  <Link
                    key={entry.id}
                    to={`/glossary/${entry.slug}`}
                    className="block px-4 py-3 transition-colors hover:bg-[rgba(212,175,55,0.04)]"
                    style={
                      idx < arr.length - 1
                        ? { borderBottom: "1px solid rgba(27,37,40,0.06)" }
                        : undefined
                    }
                  >
                    <p className="text-[14px] font-semibold" style={{ color: DARK }}>
                      {entry.title}
                    </p>
                    <p
                      className="mt-0.5 line-clamp-1 text-[11.5px]"
                      style={{ color: "rgba(27,37,40,0.55)" }}
                    >
                      {entry.content.slice(0, 80)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
