import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import { Loader2, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { userApi } from "~/lib/api";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import TrendingTopics, { type TrendingItem } from "~/components/user/shared/TrendingTopics";
import { buildMetaTags } from "~/lib/seo";
import type {
  ArticleSummary,
  PublicArticleIndexResponse,
} from "~/lib/types";

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

export function meta() {
  return buildMetaTags({
    title: "コラム | Recta - ナイトワーク業界ガイド",
    description:
      "キャバクラとラウンジの違い、ノルマやバックの仕組み、グループ解説など。ナイトワーク業界をやさしく学べるコラム集。",
    path: "/columns",
  });
}

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function ColumnsPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<TrendingItem[]>([]);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => (r.ok ? r.json() : null))
      .then((json: { consultations?: { question: string; answer?: string | null; tag?: string; count?: number | string | null }[] } | null) => {
        const list = (json?.consultations ?? [])
          .filter((c) => !!c.answer)
          .map((c) => ({
            q: c.question,
            a: c.answer ?? "",
            tag: c.tag?.replace(/^#/, ""),
            count: c.count != null ? `${c.count}` : undefined,
          }));
        setConsultations(list);
      })
      .catch(() => setConsultations([]));
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (activeCategory) params.set("category", activeCategory);
      if (search) params.set("q", search);
      const res = await userApi.get<PublicArticleIndexResponse>(
        `/columns?${params.toString()}`,
      );
      setArticles(res.articles.data);
      setLastPage(res.articles.last_page);
      setTotal(res.articles.total);
      setCategories(res.categories);
    } catch (e) {
      console.error("Failed to fetch articles", e);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeCategory, search]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    setPage(1);
  }, [activeCategory, search]);

  return (
    <div style={{ background: "#faf9f5", minHeight: "100%" }}>
      {/* Hero */}
      <div
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
          padding: "32px 20px 36px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "60%",
            background: `radial-gradient(circle at 70% 30%, rgba(212,175,55,.18), transparent 60%)`,
            pointerEvents: "none",
          }}
        />
        <Link
          to="/"
          style={{
            color: "rgba(255,255,255,.6)",
            fontSize: "13px",
            textDecoration: "none",
            fontFamily: J,
          }}
        >
          ← トップに戻る
        </Link>
        <div style={{ marginTop: "16px", position: "relative" }}>
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
            Recta Columns
          </span>
          <h1
            style={{
              fontFamily: J,
              fontWeight: 700,
              fontSize: "24px",
              color: "white",
              margin: "8px 0 8px",
              lineHeight: 1.4,
            }}
          >
            ナイトワーク業界を、<br />正しく知る
          </h1>
          <p
            style={{
              fontFamily: J,
              fontWeight: 400,
              fontSize: "13px",
              color: "rgba(255,255,255,.78)",
              margin: 0,
              lineHeight: 1.7,
            }}
          >
            キャバクラとラウンジの違い、ノルマやバックの仕組み、グループ解説まで。
          </p>
        </div>
      </div>

      <Breadcrumb
        items={[
          { label: "ホーム", to: "/" },
          { label: "コラム" },
        ]}
      />

      <div className="px-5 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="記事を検索..."
            // iOS Safari の自動ズーム対策で 16px。
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-400"
            style={{ fontFamily: J, fontSize: "16px" }}
          />
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-3 py-1.5 rounded-full text-[12px] transition"
              style={{
                fontFamily: J,
                fontWeight: 600,
                background: activeCategory === null ? DARK : "white",
                color: activeCategory === null ? "white" : DARK,
                border: `1px solid ${activeCategory === null ? DARK : "rgba(27,37,40,.12)"}`,
              }}
            >
              すべて
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className="px-3 py-1.5 rounded-full text-[12px] transition"
                style={{
                  fontFamily: J,
                  fontWeight: 600,
                  background: activeCategory === c ? DARK : "white",
                  color: activeCategory === c ? "white" : DARK,
                  border: `1px solid ${activeCategory === c ? DARK : "rgba(27,37,40,.12)"}`,
                }}
              >
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Article cards */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-stone-400 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-2"
            style={{ fontFamily: J, color: "rgba(27,37,40,.5)", fontSize: "13px" }}
          >
            <FileText className="w-7 h-7 text-stone-300" />
            まだ記事がありません
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {articles.map((a) => (
              <Link
                key={a.id}
                to={`/columns/${a.slug}`}
                className="block rounded-2xl bg-white overflow-hidden hover:shadow-md transition-all"
                style={{
                  border: "1px solid rgba(27,37,40,.06)",
                  boxShadow: "0 2px 8px rgba(0,0,0,.03)",
                }}
              >
                <div
                  className="aspect-[16/9] bg-stone-100 relative"
                  style={{
                    backgroundImage: a.thumbnail_url ? `url(${a.thumbnail_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                >
                  {!a.thumbnail_url && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-stone-300" />
                    </div>
                  )}
                  {a.category && (
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px]"
                      style={{
                        fontFamily: J,
                        fontWeight: 700,
                        background: "rgba(255,255,255,.92)",
                        color: DARK,
                      }}
                    >
                      {a.category}
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <h3
                    className="line-clamp-2"
                    style={{
                      fontFamily: J,
                      fontWeight: 700,
                      fontSize: "14px",
                      color: DARK,
                      margin: 0,
                      lineHeight: 1.5,
                    }}
                  >
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p
                      className="line-clamp-2"
                      style={{
                        fontFamily: J,
                        fontSize: "12px",
                        color: "rgba(27,37,40,.6)",
                        margin: "6px 0 0",
                        lineHeight: 1.6,
                      }}
                    >
                      {a.excerpt}
                    </p>
                  )}
                  <p
                    style={{
                      fontFamily: "'Outfit',sans-serif",
                      fontSize: "10.5px",
                      color: "rgba(27,37,40,.4)",
                      margin: "10px 0 0",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {formatDate(a.published_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && total > 0 && lastPage > 1 && (
          <div className="flex items-center justify-center gap-1 pt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-md disabled:opacity-30"
              style={{ color: DARK }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ fontFamily: J, fontSize: "12px", color: DARK }}>
              {page} / {lastPage}
            </span>
            <button
              disabled={page >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="p-2 rounded-md disabled:opacity-30"
              style={{ color: DARK }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* みんなの相談 — トップから移動 */}
      <div className="pb-10">
        <TrendingTopics pool={consultations} />
      </div>
    </div>
  );
}
