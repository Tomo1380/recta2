import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  Menu,
  X,
  Sparkles,
  MapPin,
  Briefcase,
  Clock,
} from "lucide-react";
import { userApi } from "~/lib/api";
import TrendingTopics, { type TrendingItem } from "~/components/user/shared/TrendingTopics";
import { buildMetaTags } from "~/lib/seo";
import type {
  ArticleSummary,
  PublicArticleIndexResponse,
} from "~/lib/types";

const GOLD = "#d4af37";
const DARK = "#1b2528";
const J = "'Noto Sans JP',sans-serif";

/** C2: 上段ナビの大テーマ（backend Article::SECTIONS と一致。fallback 用）。 */
const SECTIONS_FALLBACK = ["夜の始め方", "エリア別比較", "地方から上京", "Q&A"];

/** C3: 「条件で探す」チップ。表記ゆれを束ねて /stores?any_tags= に流す。 */
const CONDITION_CHIPS: { label: string; tags: string[] }[] = [
  { label: "未経験歓迎", tags: ["未経験歓迎"] },
  { label: "日払いOK", tags: ["日払いあり", "全額日払い", "体入全額日払い", "日払いOK"] },
  { label: "ノルマなし", tags: ["ノルマなし"] },
  { label: "高時給", tags: ["高時給"] },
  { label: "送りあり", tags: ["送りあり"] },
  { label: "寮・上京サポート", tags: ["寮完備", "上京サポート"] },
];

/** C3: 「働き方で探す」チップ。 */
const WORKSTYLE_CHIPS: { label: string; tags: string[] }[] = [
  { label: "週1〜OK", tags: ["週1OK"] },
  { label: "Wワーク歓迎", tags: ["Wワーク歓迎"] },
  { label: "学生歓迎", tags: ["学生歓迎"] },
  { label: "終電上がりOK", tags: ["終電上がりOK"] },
  { label: "衣装貸出", tags: ["衣装貸出", "ドレス無料", "制服あり"] },
];

type Facet = "condition" | "area" | "category" | "workstyle";
interface MasterItem { slug: string; name: string }

export function meta() {
  return buildMetaTags({
    title: "コラム | Recta - ナイトワーク業界ガイド",
    description:
      "夜の始め方・エリア別比較・地方から上京・Q&A。ナイトワーク業界をやさしく学べるコラムと、条件・エリア・業種・働き方からの店舗探し。",
    path: "/columns",
  });
}

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function storeSearchUrl(tags: string[]): string {
  return `/stores?any_tags=${encodeURIComponent(tags.join(","))}`;
}

export default function ColumnsPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [sections, setSections] = useState<string[]>(SECTIONS_FALLBACK);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<TrendingItem[]>([]);
  // C3: 探すハブ
  const [openFacet, setOpenFacet] = useState<Facet | null>(null);
  const [areas, setAreas] = useState<MasterItem[]>([]);
  const [categories, setCategories] = useState<MasterItem[]>([]);
  // ハンバーガー
  const [drawerOpen, setDrawerOpen] = useState(false);

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

    // 探すハブ用のマスタ（エリア / 業種）。
    userApi.get<MasterItem[]>("/areas").then(setAreas).catch(() => setAreas([]));
    userApi.get<MasterItem[]>("/categories").then(setCategories).catch(() => setCategories([]));
  }, []);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (activeSection) params.set("section", activeSection);
      if (search) params.set("q", search);
      const res = await userApi.get<PublicArticleIndexResponse>(
        `/columns?${params.toString()}`,
      );
      setArticles(res.articles.data);
      setLastPage(res.articles.last_page);
      setTotal(res.articles.total);
      if (res.sections && res.sections.length > 0) setSections(res.sections);
    } catch (e) {
      console.error("Failed to fetch articles", e);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [page, activeSection, search]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    setPage(1);
  }, [activeSection, search]);

  const facetTile = (key: Facet, label: string, Icon: typeof Sparkles, bg: string) => (
    <button
      onClick={() => setOpenFacet((f) => (f === key ? null : key))}
      className="relative rounded-2xl p-4 text-left overflow-hidden active:scale-[0.98] transition-transform"
      style={{ background: bg, border: "1px solid rgba(27,37,40,.06)" }}
    >
      <Icon className="w-6 h-6 mb-6" style={{ color: DARK, opacity: 0.85 }} />
      <span style={{ fontFamily: J, fontWeight: 700, fontSize: "15px", color: DARK }}>{label}</span>
      <ChevronDown
        className="absolute top-3 right-3 w-4 h-4 transition-transform"
        style={{ color: DARK, opacity: 0.5, transform: openFacet === key ? "rotate(180deg)" : "none" }}
      />
    </button>
  );

  return (
    <div style={{ background: "#faf9f5", minHeight: "100%" }}>
      {/* Header bar (logo + 検索 + ハンバーガー) */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ background: DARK }}
      >
        <Link to="/columns" style={{ textDecoration: "none" }}>
          <span
            style={{
              fontFamily: "'Outfit',sans-serif",
              fontWeight: 700,
              fontSize: "16px",
              letterSpacing: "0.04em",
              color: "white",
            }}
          >
            Recta <span style={{ color: GOLD }}>Columns</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSearch((v) => !v)}
            aria-label="検索"
            className="p-2 rounded-lg active:scale-95"
            style={{ color: "white" }}
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="メニュー"
            className="p-2 rounded-lg active:scale-95"
            style={{ color: "white" }}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 上段ナビ (大テーマ section) */}
      <div className="flex gap-4 px-5 py-2.5 overflow-x-auto" style={{ background: DARK }}>
        <SectionTab label="すべて" active={activeSection === null} onClick={() => setActiveSection(null)} />
        {sections.map((s) => (
          <SectionTab
            key={s}
            label={s}
            active={activeSection === s}
            onClick={() => setActiveSection(s)}
          />
        ))}
      </div>

      {/* 検索バー (トグル) */}
      {showSearch && (
        <div className="px-5 pt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
              placeholder="記事を検索..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-400"
              style={{ fontFamily: J, fontSize: "16px" }}
            />
          </div>
        </div>
      )}

      {/* 探すハブ (2x2 パネル) */}
      <div className="px-5 pt-4">
        <div className="grid grid-cols-2 gap-2.5">
          {facetTile("condition", "条件で探す", Sparkles, "#fef3e2")}
          {facetTile("area", "エリアで探す", MapPin, "#e8f3ef")}
          {facetTile("category", "業種で探す", Briefcase, "#eef0fb")}
          {facetTile("workstyle", "働き方で探す", Clock, "#fdeef0")}
        </div>

        {/* 展開チップ */}
        {openFacet && (
          <div className="mt-2.5 rounded-2xl bg-white p-3.5" style={{ border: "1px solid rgba(27,37,40,.08)" }}>
            <FacetChips
              facet={openFacet}
              areas={areas}
              categories={categories}
            />
          </div>
        )}
      </div>

      <div className="px-5 pt-4 space-y-4">
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
                  {(a.section || a.category) && (
                    <span
                      className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px]"
                      style={{
                        fontFamily: J,
                        fontWeight: 700,
                        background: "rgba(255,255,255,.92)",
                        color: DARK,
                      }}
                    >
                      {a.section || a.category}
                    </span>
                  )}
                </div>
                <div className="p-3.5">
                  <h3
                    className="line-clamp-2"
                    style={{ fontFamily: J, fontWeight: 700, fontSize: "14px", color: DARK, margin: 0, lineHeight: 1.5 }}
                  >
                    {a.title}
                  </h3>
                  {a.excerpt && (
                    <p
                      className="line-clamp-2"
                      style={{ fontFamily: J, fontSize: "12px", color: "rgba(27,37,40,.6)", margin: "6px 0 0", lineHeight: 1.6 }}
                    >
                      {a.excerpt}
                    </p>
                  )}
                  <p
                    style={{ fontFamily: "'Outfit',sans-serif", fontSize: "10.5px", color: "rgba(27,37,40,.4)", margin: "10px 0 0", letterSpacing: "0.05em" }}
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
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 rounded-md disabled:opacity-30" style={{ color: DARK }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ fontFamily: J, fontSize: "12px", color: DARK }}>{page} / {lastPage}</span>
            <button disabled={page >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} className="p-2 rounded-md disabled:opacity-30" style={{ color: DARK }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* みんなの相談 */}
      <div className="pb-10">
        <TrendingTopics pool={consultations} />
      </div>

      {/* ハンバーガー ドロワー */}
      {drawerOpen && (
        <NavDrawer
          sections={sections}
          onClose={() => setDrawerOpen(false)}
          onSection={(s) => {
            setActiveSection(s);
            setDrawerOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SectionTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 pb-1.5 text-[13px] transition-colors"
      style={{
        fontFamily: J,
        fontWeight: active ? 700 : 400,
        color: active ? "white" : "rgba(255,255,255,.6)",
        borderBottom: `2px solid ${active ? GOLD : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}

function FacetChips({ facet, areas, categories }: { facet: Facet; areas: MasterItem[]; categories: MasterItem[] }) {
  const chipClass = "inline-flex items-center px-3 py-1.5 rounded-full text-[12px] active:scale-95 transition-transform";
  const chipStyle = { fontFamily: J, fontWeight: 600 as const, background: "#f5f4f0", color: DARK, border: "1px solid rgba(27,37,40,.1)" };

  if (facet === "area") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {areas.map((a) => (
          <Link key={a.slug} to={`/jobs/areas/${a.slug}`} className={chipClass} style={chipStyle}>
            {a.name}
          </Link>
        ))}
      </div>
    );
  }
  if (facet === "category") {
    return (
      <div className="flex flex-wrap gap-1.5">
        {categories.map((c) => (
          <Link key={c.slug} to={`/jobs/categories/${c.slug}`} className={chipClass} style={chipStyle}>
            {c.name}
          </Link>
        ))}
      </div>
    );
  }
  const chips = facet === "condition" ? CONDITION_CHIPS : WORKSTYLE_CHIPS;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Link key={c.label} to={storeSearchUrl(c.tags)} className={chipClass} style={chipStyle}>
          {c.label}
        </Link>
      ))}
    </div>
  );
}

function NavDrawer({
  sections,
  onClose,
  onSection,
}: {
  sections: string[];
  onClose: () => void;
  onSection: (s: string | null) => void;
}) {
  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="absolute right-0 top-0 bottom-0 w-72 max-w-[80%] bg-white p-5 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        style={{ fontFamily: J }}
      >
        <div className="flex items-center justify-between mb-4">
          <span style={{ fontWeight: 700, color: DARK }}>メニュー</span>
          <button onClick={onClose} aria-label="閉じる"><X className="w-5 h-5" style={{ color: DARK }} /></button>
        </div>

        <p className="text-[11px] text-stone-400 mb-1.5">コラム</p>
        <div className="flex flex-col gap-0.5 mb-4">
          <button className="text-left py-1.5 text-[14px]" style={{ color: DARK }} onClick={() => onSection(null)}>すべての記事</button>
          {sections.map((s) => (
            <button key={s} className="text-left py-1.5 text-[14px]" style={{ color: DARK }} onClick={() => onSection(s)}>{s}</button>
          ))}
        </div>

        <p className="text-[11px] text-stone-400 mb-1.5">サイト</p>
        <div className="flex flex-col gap-0.5">
          <Link to="/" className="py-1.5 text-[14px]" style={{ color: DARK }}>トップ</Link>
          <Link to="/stores" className="py-1.5 text-[14px]" style={{ color: DARK }}>店舗を探す</Link>
          <Link to="/relocate-support" className="py-1.5 text-[14px]" style={{ color: DARK }}>上京サポート</Link>
        </div>
      </div>
    </div>
  );
}
