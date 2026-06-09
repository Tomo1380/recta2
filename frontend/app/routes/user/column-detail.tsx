import { useEffect, useState, useMemo } from "react";
import { Link, useParams, useLoaderData, isRouteErrorResponse, useRouteError } from "react-router";
import type { LoaderFunctionArgs } from "react-router";
import { FileText, ChevronRight } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { useTrackPageView } from "~/lib/tracking";
import LineCtaCard from "~/components/user/shared/LineCtaCard";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import { absoluteUrl, buildMetaTags } from "~/lib/seo";
import {
  buildArticleSchema,
  buildBreadcrumbSchema,
  buildSchemaGraph,
  serializeSchema,
} from "~/lib/schema";
import type { Article, ArticleSummary, PublicArticleShowResponse } from "~/lib/types";

// ─── SSR loader & meta ────────────────────────────────────────
//
// クライアントの useEffect で document.title を書き換える方式は、Twitterbot や
// Googlebot 等 JS 非実行クローラに OG タグが届かない。Sprint 3-C の SEO 目的
// （記事を発見されやすくする）を達成するために SSR 時点で meta を出す。
//
// loader は SSR でも CSR (navigation) でも走る。
// - ブラウザでは同オリジン（空文字）で OK
// - SSR では内部ネットワーク経由で nginx/laravel に到達するホストが必要
//   - docker compose ローカル: `http://nginx:80`
//   - k8s / ECS / Vercel SSR: 必ず `INTERNAL_API_BASE_URL` を env で渡す
function resolveApiBase(): string {
  if (typeof window !== "undefined") {
    return ""; // 同オリジン
  }
  const fromEnv = process.env.INTERNAL_API_BASE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // 本番では未設定はミスコンフィグ。loader 全 article 取得が失敗して
  // OGP が壊れるよりも、明示的に 500 を投げて運用者に気付かせる。
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "INTERNAL_API_BASE_URL is not set. SSR loader cannot reach the API in production.",
    );
  }
  // 開発 (docker compose) のみフォールバック
  return "http://nginx:80";
}

export async function loader({ params }: LoaderFunctionArgs) {
  const slug = params.slug;
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }
  let res: Response;
  try {
    res = await fetch(`${resolveApiBase()}/api/columns/${slug}`, {
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    // ネットワーク到達不能（DNS 失敗、connection refused 等）。
    // 200 + 空ページを返してインデックスを汚染しないように 503 で明示する。
    // クライアントは ErrorBoundary でリトライ UI を出せる。
    throw new Response("Upstream unavailable", { status: 503 });
  }
  if (!res.ok) {
    // 404 はそのまま、それ以外はステータス透過
    throw new Response("Not Found", {
      status: res.status === 404 ? 404 : res.status >= 500 ? 502 : 500,
    });
  }
  return (await res.json()) as PublicArticleShowResponse;
}

export function meta({
  data,
  params,
}: {
  data: PublicArticleShowResponse | undefined;
  params: { slug?: string };
}) {
  const article = data?.article;
  if (!article) {
    return buildMetaTags({
      title: "コラム | Recta",
      description: "Recta のコラム記事です。",
      path: `/columns/${params.slug ?? ""}`,
    });
  }
  const desc = article.excerpt || article.title;
  const title = `${article.title} | Recta コラム`;
  return buildMetaTags({
    title,
    description: desc,
    path: `/columns/${article.slug}`,
    image: article.thumbnail_url ?? null,
    type: "article",
    extra: article.published_at
      ? [{ property: "article:published_time", content: article.published_at }]
      : [],
  });
}

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

function formatDate(s: string | null): string {
  if (!s) return "";
  // SSR(UTC) と CSR(JST 等) で getMonth/getDate がズレると React が hydration
  // mismatch を出すので、UTC 基準で固定。日付として "公開日" を見せたいだけ
  // なので時刻成分は無視して OK。
  const d = new Date(s);
  return `${d.getUTCFullYear()}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Turn TikTok placeholder divs (<div data-tiktok-id="...">) emitted by the
 * editor into the official TikTok blockquote embed, and append the script
 * tag once.
 *
 * Also strips any inline <script> tags that snuck in (defensive).
 */
/**
 * loader が 404 / 503 等を throw した場合に表示する route 単位の ErrorBoundary。
 * 404 は記事専用の ColumnNotFound、それ以外は通信エラー表示にして、
 * 英語のグローバル 404 に落ちないようにする。
 */
export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <ColumnNotFound />;
  }
  return (
    <div
      style={{ background: "#faf9f5", minHeight: "60vh", padding: "60px 20px" }}
      className="flex flex-col items-center justify-center text-center gap-3"
    >
      <FileText className="w-8 h-8 text-stone-300" />
      <p style={{ fontFamily: J, color: DARK, fontSize: "14px" }}>
        記事を読み込めませんでした。時間をおいて再度お試しください。
      </p>
      <Link
        to="/columns"
        className="px-4 py-2 rounded-lg"
        style={{ fontFamily: J, background: DARK, color: "white", fontSize: "13px", textDecoration: "none" }}
      >
        コラム一覧へ
      </Link>
    </div>
  );
}

function ColumnNotFound() {
  return (
    <div
      style={{ background: "#faf9f5", minHeight: "60vh", padding: "60px 20px" }}
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

  // XSS 対策: DOMPurify でサニタイズ。
  //   - <script> や onload / onerror / javascript: URL を除去
  //   - 必要な埋め込み要素 (iframe, blockquote.tiktok-embed) は明示的に許可
  //   - SSR/CSR 両対応: isomorphic-dompurify が環境を自動判別
  const safe = DOMPurify.sanitize(transformed, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: [
      "allow",
      "allowfullscreen",
      "frameborder",
      "scrolling",
      "data-video-id",
      "cite",
      "target",
    ],
    // YouTube/TikTok/X 埋め込みの iframe を許可するため
    ALLOW_DATA_ATTR: true,
  });

  return { html: safe, needsTikTokScript };
}

export default function ColumnDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  // loader が必ず成功（or throw）するので、初期値はそのまま使えば足りる。
  // 取得失敗（5xx 等）は loader が Response を throw し、route の ErrorBoundary
  // 経由でレンダリングが置き換わるため、ここに来た時点で article は信頼できる。
  const initial = useLoaderData() as PublicArticleShowResponse;

  const [article, setArticle] = useState<Article | null>(initial.article);
  const [related, setRelated] = useState<ArticleSummary[]>(initial.related ?? []);

  // アクセス解析: コラム別 PV（C1 のランキング/CV率の分母）。
  useTrackPageView({ page_type: "column", article_id: article?.id ?? null });

  // React Router の loader は CSR navigation でも自動で再実行されるので、
  // useLoaderData の変化を state に反映するだけで OK（手動 fetch 不要）。
  useEffect(() => {
    if (initial.article && initial.article.slug === slug) {
      setArticle(initial.article);
      setRelated(initial.related ?? []);
    }
  }, [slug, initial]);

  if (!article) {
    return <ColumnNotFound />;
  }

  const canonical = absoluteUrl(`/columns/${article.slug}`);
  const schemaJson = serializeSchema(
    buildSchemaGraph([
      buildArticleSchema({
        headline: article.title,
        description: article.excerpt ?? null,
        url: canonical,
        image: article.thumbnail_url ?? null,
        datePublished: article.published_at ?? null,
        dateModified: article.updated_at ?? article.published_at ?? null,
        authorName: "Recta 編集部",
        category: article.category ?? null,
        tags: (article.tags as string[] | null | undefined) ?? null,
      }),
      buildBreadcrumbSchema([
        { name: "ホーム", url: absoluteUrl("/") },
        { name: "コラム", url: absoluteUrl("/columns") },
        { name: article.title, url: canonical },
      ]),
    ]),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: schemaJson }}
      />
      <ColumnArticleView article={article} related={related} />
    </>
  );
}

/**
 * 記事本文の表示部分のプレゼンテーション。loader 経由でなく、
 * props 経由で記事を渡せるので管理画面のプレビューにも使える。
 */
export function ColumnArticleView({
  article,
  related = [],
}: {
  article: Article;
  related?: ArticleSummary[];
}) {
  const { html, needsTikTokScript } = useMemo(
    () => transformBodyHtml(article.body_html ?? ""),
    [article.body_html],
  );

  // title / OG meta は SSR meta() で出力済み。CSR navigation 時は React Router
  // が自動で <title> を差し替えるので、useEffect での書き換えは不要。

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
  }, [needsTikTokScript, article.slug]);

  return (
    <div style={{ background: "#faf9f5", minHeight: "100%", paddingBottom: "60px" }}>
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

      <Breadcrumb
        items={[
          { label: "ホーム", to: "/" },
          { label: "コラム", to: "/columns" },
          { label: article.title },
        ]}
      />

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
          {(article.tags as string[]).map((t) => (
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

      {/* C4: この記事で紹介した店舗（回遊動線: 記事 → 店舗詳細 → LINE） */}
      <RelatedStoresBlock article={article} />

      {/* LINE CTA */}
      <div className="px-5 pt-8">
        <LineCtaCard
          variant="dark"
          title="気になることがあればLINEで相談"
          description="お給料の仕組み、向いてるお店、上京サポートなど、なんでもお気軽にどうぞ。"
          ctaLabel="LINEで相談する"
          source="column:end"
        />
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
        /* 画像: 中央寄せ + 角丸 + max-width:100% (小画面で潰れない)。
           新規: 幅は HTML 属性 <img width="320"> としてエディタから保存され、
                ブラウザがそのまま尊重するので CSS 側で値を指定しない。
           旧記事の data-size プリセット (small/medium/large/full) も
           後方互換で width を当てる。ただし width 属性がある img には
           当てない (新仕様 = ドラッグサイズが優先)。 */
        .column-body img {
          display: block;
          margin: 1em auto;
          border-radius: 12px;
          max-width: 100%;
          height: auto;
        }
        .column-body img[data-size="small"]:not([width])  { width: 200px; }
        .column-body img[data-size="medium"]:not([width]) { width: 360px; }
        .column-body img[data-size="large"]:not([width])  { width: 560px; }
        .column-body img[data-size="full"]:not([width])   { width: 100%; }
        .column-body iframe { width: 100%; max-width: 640px; aspect-ratio: 16 / 9; border-radius: 12px; margin: 1em auto; height: auto; display: block; }
        .column-body code { background: #f5f5f4; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; }
        .column-body strong { font-weight: 700; }
      `}</style>
    </div>
  );
}

/** C4: 「この記事で紹介した店舗」の軽量サマリ（backend Article::relatedStoreSummaries と一致）。 */
interface RelatedStoreSummary {
  id: number;
  name: string;
  slug: string | null;
  area: string | null;
  category: string | null;
  image: string | null;
  trial_hourly_min?: number | null;
  trial_hourly_max?: number | null;
  average_rating?: number | null;
}

/** 横スライド/単体で使う店舗カード（店舗詳細寄りのデザイン）。 */
function RelatedStoreCard({ s, wide }: { s: RelatedStoreSummary; wide?: boolean }) {
  const fmtWage = (min?: number | null, max?: number | null): string | null => {
    const f = (n: number) => `¥${n.toLocaleString()}`;
    if (min && max) return min === max ? f(min) : `${f(min)}〜${f(max)}`;
    if (min) return `${f(min)}〜`;
    if (max) return `〜${f(max)}`;
    return null;
  };
  const w = fmtWage(s.trial_hourly_min, s.trial_hourly_max);
  return (
    <Link
      to={`/stores/${s.slug ?? s.id}`}
      className={`group block shrink-0 overflow-hidden rounded-2xl bg-white transition hover:shadow-md ${wide ? "w-full" : "w-[200px]"}`}
      style={{ border: "1px solid rgba(27,37,40,.08)", textDecoration: "none", scrollSnapAlign: "start" }}
    >
      <div className="relative w-full" style={{ aspectRatio: "16 / 10", background: "#1b2528" }}>
        {s.image ? (
          <img src={s.image} alt={s.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" style={{ color: GOLD, fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 28 }}>
            {s.name.charAt(0)}
          </div>
        )}
        {s.category && (
          <span className="absolute left-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: "rgba(200,96,128,0.9)" }}>
            {s.category}
          </span>
        )}
        {w && <div className="absolute bottom-1.5 left-2 text-[12px] font-semibold text-white">体入 {w}</div>}
      </div>
      <div className="p-2.5">
        <p className="truncate" style={{ fontFamily: J, fontWeight: 700, fontSize: "13.5px", color: DARK, margin: 0 }}>
          {s.name}
        </p>
        <p className="truncate flex items-center gap-1.5" style={{ fontFamily: J, fontSize: "11.5px", color: "rgba(27,37,40,.5)", margin: "2px 0 0" }}>
          {s.area}
          {s.average_rating ? <span style={{ color: GOLD }}>★ {s.average_rating.toFixed(1)}</span> : null}
        </p>
      </div>
    </Link>
  );
}

/**
 * C4: 記事 → 店舗詳細 → LINE の回遊動線。管理者が紐付けた related_stores を、
 * 2 店舗以上は横スライド、1 店舗はそのまま単体カードで表示する (FB: コラム①)。
 * （生成型では related_stores が string 扱いになるため unknown 経由で読む）
 */
function RelatedStoresBlock({ article }: { article: Article }) {
  const stores =
    ((article as unknown as { related_stores?: RelatedStoreSummary[] }).related_stores ?? []);
  if (stores.length === 0) return null;

  const areas = Array.from(
    new Set(stores.map((s) => s.area).filter((a): a is string => !!a)),
  );

  return (
    <div className="pt-8">
      <h2 className="px-5" style={{ fontFamily: J, fontWeight: 700, fontSize: "15px", color: DARK, margin: "0 0 12px" }}>
        この記事で紹介したお店
      </h2>
      {stores.length === 1 ? (
        <div className="px-5">
          <RelatedStoreCard s={stores[0]} wide />
        </div>
      ) : (
        // 2 店舗以上は横スライド。端を少し見切れさせて「まだある」と分かるようにする。
        <div
          className="flex gap-3 overflow-x-auto px-5 pb-2"
          style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        >
          {stores.map((s) => (
            <RelatedStoreCard key={s.id} s={s} />
          ))}
        </div>
      )}

      {areas.length > 0 && (
        <div className="mt-3 px-5 flex flex-wrap gap-1.5">
          {areas.map((a) => (
            <Link
              key={a}
              to={`/stores?area=${encodeURIComponent(a)}`}
              className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px]"
              style={{ fontFamily: J, fontWeight: 600, background: "#f5f4f0", color: DARK, border: "1px solid rgba(27,37,40,.1)", textDecoration: "none" }}
            >
              {a}の求人を見る →
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
