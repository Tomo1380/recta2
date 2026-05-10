import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router";
import { Loader2, FileText, ChevronRight } from "lucide-react";
import { userApi } from "~/lib/api";
import { openLineFriendAdd } from "~/lib/line";
import type { Article, ArticleSummary, PublicArticleShowResponse } from "~/lib/types";

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Turn TikTok placeholder divs (<div data-tiktok-id="...">) emitted by the
 * editor into the official TikTok blockquote embed, and append the script
 * tag once.
 *
 * Also strips any inline <script> tags that snuck in (defensive).
 */
function transformBodyHtml(html: string): { html: string; needsTikTokScript: boolean } {
  if (!html) return { html: "", needsTikTokScript: false };

  let needsTikTokScript = false;
  const transformed = html.replace(
    /<div\s+([^>]*?)data-tiktok-id="(\d+)"([^>]*?)>([\s\S]*?)<\/div>/gi,
    (_match, _pre, id) => {
      needsTikTokScript = true;
      return `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/video/${id}" data-video-id="${id}" style="max-width: 605px; min-width: 325px;"><section></section></blockquote>`;
    },
  );

  // Defensive: remove any <script> tag from body content (TikTok script loaded
  // separately below).
  const safe = transformed.replace(/<script[\s\S]*?<\/script>/gi, "");

  return { html: safe, needsTikTokScript };
}

export default function ColumnDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const res = await userApi.get<PublicArticleShowResponse>(`/columns/${slug}`);
        if (!active) return;
        setArticle(res.article);
        setRelated(res.related);
      } catch (e: unknown) {
        if (!active) return;
        console.error("Failed to load article", e);
        setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  const { html, needsTikTokScript } = useMemo(
    () => transformBodyHtml(article?.body_html ?? ""),
    [article?.body_html],
  );

  // Inject TikTok embed.js once, only when needed
  useEffect(() => {
    if (!needsTikTokScript) return;
    if (typeof document === "undefined") return;
    if (document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
      // Re-trigger embed parsing if script already loaded
      const w = window as unknown as { tiktokEmbedLoad?: () => void };
      w.tiktokEmbedLoad?.();
      return;
    }
    const s = document.createElement("script");
    s.src = "https://www.tiktok.com/embed.js";
    s.async = true;
    document.body.appendChild(s);
  }, [needsTikTokScript, slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32" style={{ background: "#faf9f5" }}>
        <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
      </div>
    );
  }

  if (notFound || !article) {
    return (
      <div
        style={{ background: "#faf9f5", minHeight: "100vh", padding: "60px 20px" }}
        className="flex flex-col items-center justify-center text-center gap-3"
      >
        <FileText className="w-8 h-8 text-stone-300" />
        <p style={{ fontFamily: J, color: DARK, fontSize: "14px" }}>
          記事が見つかりませんでした
        </p>
        <Link
          to="/columns"
          className="px-4 py-2 rounded-lg"
          style={{
            fontFamily: J,
            background: DARK,
            color: "white",
            fontSize: "13px",
            textDecoration: "none",
          }}
        >
          コラム一覧へ
        </Link>
      </div>
    );
  }

  return (
    <div style={{ background: "#faf9f5", minHeight: "100vh", paddingBottom: "60px" }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
          padding: "24px 20px 32px",
          position: "relative",
        }}
      >
        <Link
          to="/columns"
          style={{
            color: "rgba(255,255,255,.6)",
            fontSize: "13px",
            textDecoration: "none",
            fontFamily: J,
          }}
        >
          ← コラム一覧
        </Link>
        <div style={{ marginTop: "14px" }}>
          {article.category && (
            <span
              style={{
                fontFamily: "'Outfit',sans-serif",
                fontWeight: 700,
                fontSize: "11px",
                letterSpacing: "0.16em",
                color: GOLD,
                textTransform: "uppercase",
              }}
            >
              {article.category}
            </span>
          )}
          <h1
            style={{
              fontFamily: J,
              fontWeight: 700,
              fontSize: "22px",
              color: "white",
              margin: "8px 0 6px",
              lineHeight: 1.4,
            }}
          >
            {article.title}
          </h1>
          <p
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontSize: "11px",
              color: "rgba(255,255,255,.5)",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            {formatDate(article.published_at)}
          </p>
        </div>
      </div>

      {article.thumbnail_url && (
        <div className="px-5 pt-4">
          <img
            src={article.thumbnail_url}
            alt={article.title}
            className="w-full rounded-2xl object-cover bg-stone-100"
            style={{ aspectRatio: "16 / 9" }}
          />
        </div>
      )}

      {/* Body */}
      <article
        className="px-5 pt-6 column-body"
        style={{ fontFamily: J, color: DARK, fontSize: "14.5px", lineHeight: 1.85 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="px-5 pt-6 flex flex-wrap gap-1.5">
          {article.tags.map((t) => (
            <span
              key={t}
              className="px-2.5 py-1 rounded-full text-[11px]"
              style={{
                fontFamily: J,
                background: "white",
                color: "rgba(27,37,40,.6)",
                border: "1px solid rgba(27,37,40,.08)",
              }}
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* LINE CTA */}
      <div className="px-5 pt-8">
        <div
          className="rounded-2xl p-5"
          style={{
            background: `linear-gradient(135deg, ${DARK}, #2c3e46)`,
            border: `1px solid rgba(212,175,55,.3)`,
          }}
        >
          <p
            style={{
              fontFamily: J,
              fontWeight: 700,
              fontSize: "14.5px",
              color: "white",
              margin: 0,
            }}
          >
            気になることがあればLINEで相談
          </p>
          <p
            style={{
              fontFamily: J,
              fontWeight: 400,
              fontSize: "11.5px",
              color: "rgba(255,255,255,.65)",
              margin: "6px 0 14px",
              lineHeight: 1.7,
            }}
          >
            お給料の仕組み、向いてるお店、上京サポートなど、なんでもお気軽にどうぞ。
          </p>
          <button
            onClick={() => openLineFriendAdd()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl active:scale-[0.98] transition-transform"
            style={{
              background: "#06C755",
              border: "none",
              cursor: "pointer",
              color: "white",
              fontFamily: J,
              fontWeight: 700,
              fontSize: "13.5px",
            }}
          >
            <span>LINEで相談する</span>
          </button>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="px-5 pt-8">
          <h2
            style={{
              fontFamily: J,
              fontWeight: 700,
              fontSize: "15px",
              color: DARK,
              margin: "0 0 12px",
            }}
          >
            関連記事
          </h2>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/columns/${r.slug}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white hover:shadow-sm transition"
                style={{
                  border: "1px solid rgba(27,37,40,.06)",
                  textDecoration: "none",
                  color: DARK,
                }}
              >
                <div
                  className="w-16 h-16 rounded-lg shrink-0 bg-stone-100"
                  style={{
                    backgroundImage: r.thumbnail_url ? `url(${r.thumbnail_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="flex-1 min-w-0">
                  {r.category && (
                    <span
                      style={{
                        fontFamily: "'Outfit',sans-serif",
                        fontWeight: 700,
                        fontSize: "10px",
                        letterSpacing: "0.1em",
                        color: GOLD,
                        textTransform: "uppercase",
                      }}
                    >
                      {r.category}
                    </span>
                  )}
                  <p
                    className="line-clamp-2"
                    style={{
                      fontFamily: J,
                      fontWeight: 700,
                      fontSize: "13px",
                      margin: "2px 0 0",
                      lineHeight: 1.5,
                    }}
                  >
                    {r.title}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .column-body h1 { font-size: 1.4rem; font-weight: 700; margin: 1.6em 0 0.6em; line-height: 1.4; }
        .column-body h2 { font-size: 1.2rem; font-weight: 700; margin: 1.4em 0 0.5em; line-height: 1.45; border-bottom: 2px solid ${GOLD}; padding-bottom: 0.3em; }
        .column-body h3 { font-size: 1.05rem; font-weight: 700; margin: 1.2em 0 0.4em; }
        .column-body p { margin: 0.9em 0; }
        .column-body ul { list-style: disc; padding-left: 1.4em; margin: 0.8em 0; }
        .column-body ol { list-style: decimal; padding-left: 1.4em; margin: 0.8em 0; }
        .column-body li { margin: 0.3em 0; }
        .column-body blockquote {
          border-left: 3px solid ${GOLD};
          padding: 0.4em 0 0.4em 1em;
          color: rgba(27,37,40,.7);
          font-style: italic;
          margin: 1em 0;
          background: rgba(212,175,55,.06);
          border-radius: 0 8px 8px 0;
        }
        .column-body a { color: #4f46e5; text-decoration: underline; }
        .column-body img { max-width: 100%; border-radius: 12px; margin: 1em 0; }
        .column-body iframe { width: 100%; max-width: 640px; aspect-ratio: 16 / 9; border-radius: 12px; margin: 1em 0; height: auto; }
        .column-body code { background: #f5f5f4; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; }
        .column-body strong { font-weight: 700; }
      `}</style>
    </div>
  );
}
