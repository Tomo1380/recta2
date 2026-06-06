import { useEffect, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  Search,
  X,
  Sparkles,
  MapPin,
  Briefcase,
  Clock,
} from "lucide-react";
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

/** C2: 上段ナビの大テーマ（backend Article::SECTIONS と一致。fallback 用）。 */
const SECTIONS_FALLBACK = ["夜の始め方", "エリア別比較", "地方から上京", "Q&A"];

type Facet = "condition" | "area" | "category" | "workstyle";

/**
 * 探すハブのタグ。クリックすると「記事」を tags 絞り込み (whereJsonContains) する。
 * 旧実装は /stores へ飛ばす店舗検索だったが、コラムページでは記事検索が自然なので
 * 記事フィルタに作り変えた (2026-06-06 FB)。タグ文字列は ArticleSeeder の tags と
 * 一致させること。
 */
const FACET_TAGS: Record<Facet, string[]> = {
  condition: ["未経験歓迎", "日払いOK", "ノルマなし", "高時給", "送りあり"],
  area: ["渋谷", "新宿", "歌舞伎町", "六本木", "銀座", "池袋"],
  category: ["キャバクラ", "ラウンジ", "クラブ", "ガールズバー"],
  workstyle: ["週1OK", "Wワーク歓迎", "学生歓迎"],
};

const FACET_META: { key: Facet; label: string; Icon: typeof Sparkles; sub: string }[] = [
  { key: "condition", label: "条件で探す", Icon: Sparkles, sub: "未経験・日払い・ノルマなし" },
  { key: "area", label: "エリアで探す", Icon: MapPin, sub: "渋谷・新宿・六本木 ほか" },
  { key: "category", label: "業種で探す", Icon: Briefcase, sub: "キャバクラ・ラウンジ ほか" },
  { key: "workstyle", label: "働き方で探す", Icon: Clock, sub: "週1・Wワーク・学生OK" },
];

export function meta() {
  return buildMetaTags({
    title: "コラム | Recta - ナイトワーク業界ガイド",
    description:
      "夜の始め方・エリア別比較・地方から上京・Q&A。ナイトワーク業界をやさしく学べるコラムを、条件・エリア・業種・働き方から探せます。",
    path: "/columns",
  });
}

function formatDate(s: string | null): string {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function ColumnsPage() {
  // URL クエリ (?section= / ?tag= / ?q=) で着地できるようにする。トップのテーマ入口・
  // 店舗詳細やエリアLPの関連コラム導線から、絞り込み状態でリンクされる前提。
  const [searchParams, setSearchParams] = useSearchParams();
  const initTags = (searchParams.get("tags") ?? searchParams.get("tag") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [sections, setSections] = useState<string[]>(SECTIONS_FALLBACK);
  // タグ絞り込み (探すハブ) と上タブ (section) は併用すると AND で空になりやすいので
  // 排他にする: タグを選んだら上タブは「すべて」、上タブを選んだらタグは解除。
  const [activeSection, setActiveSection] = useState<string | null>(
    initTags.length > 0 ? null : searchParams.get("section"),
  );
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<TrendingItem[]>([]);
  // C3: 探すハブ（記事を tags で絞り込む）
  const [openFacet, setOpenFacet] = useState<Facet | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>(initTags);

  // セクション選択 → タグ解除 / タグ選択 → セクション「すべて」へ (AND 衝突回避)。
  const selectSection = (s: string | null) => {
    setActiveSection(s);
    setActiveTags([]);
  };
  const toggleTag = (tag: string) => {
    setActiveSection(null);
    setActiveTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]));
  };

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
      if (activeSection) params.set("section", activeSection);
      if (search) params.set("q", search);
      if (activeTags.length > 0) params.set("tags", activeTags.join(","));
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
  }, [page, activeSection, search, activeTags]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const tagsKey = activeTags.join(",");
  useEffect(() => {
    setPage(1);
  }, [activeSection, search, tagsKey]);

  // 絞り込み状態を URL に反映 (共有・戻る操作に対応)。replace で履歴を汚さない。
  useEffect(() => {
    const next = new URLSearchParams();
    if (activeSection) next.set("section", activeSection);
    if (activeTags.length > 0) next.set("tags", tagsKey);
    if (search) next.set("q", search);
    setSearchParams(next, { replace: true });
    // setSearchParams は参照が変わるので依存に入れない (無限ループ回避)。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, tagsKey, search]);

  const facetTile = (key: Facet, label: string, Icon: typeof Sparkles, sub: string) => {
    const open = openFacet === key;
    return (
      <button
        key={key}
        onClick={() => setOpenFacet((f) => (f === key ? null : key))}
        className="relative rounded-2xl p-3.5 text-left overflow-hidden active:scale-[0.98] transition-all"
        style={{
          background: `linear-gradient(135deg, ${DARK} 0%, #2c3e46 100%)`,
          border: `1px solid ${open ? "rgba(212,175,55,.7)" : "rgba(212,175,55,.3)"}`,
          boxShadow: open
            ? "0 8px 22px rgba(212,175,55,.16), inset 0 1px 0 rgba(212,175,55,.18)"
            : "0 6px 18px rgba(27,37,40,.18), inset 0 1px 0 rgba(212,175,55,.1)",
        }}
      >
        {/* 角のゴールドグロー（高級感のアクセント） */}
        <span
          aria-hidden
          className="absolute -right-6 -top-6 w-16 h-16 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,175,55,.22), transparent 70%)" }}
        />
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center justify-center rounded-xl"
            style={{ width: 34, height: 34, background: "rgba(212,175,55,.12)", border: "1px solid rgba(212,175,55,.25)" }}
          >
            <Icon className="w-[18px] h-[18px]" style={{ color: GOLD }} />
          </span>
          <ChevronDown
            className="w-4 h-4 transition-transform"
            style={{ color: GOLD, opacity: 0.85, transform: open ? "rotate(180deg)" : "none" }}
          />
        </div>
        <div className="mt-3" style={{ fontFamily: J, fontWeight: 700, fontSize: "14px", color: "white", letterSpacing: ".02em" }}>
          {label}
        </div>
        <div className="mt-0.5 truncate" style={{ fontFamily: J, fontSize: "10px", color: "rgba(212,175,55,.85)" }}>
          {sub}
        </div>
      </button>
    );
  };

  return (
    <div style={{ background: "#faf9f5", minHeight: "100%" }}>
      {/* Header bar (logo のみ。検索は常時表示・サイト導線はパンくずに統一) */}
      <div className="flex items-center px-5 py-3" style={{ background: DARK }}>
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
      </div>

      {/* 上段ナビ (大テーマ section) */}
      <div className="flex gap-4 px-5 py-2.5 overflow-x-auto" style={{ background: DARK }}>
        <SectionTab label="すべて" active={activeSection === null} onClick={() => selectSection(null)} />
        {sections.map((s) => (
          <SectionTab
            key={s}
            label={s}
            active={activeSection === s}
            onClick={() => selectSection(s)}
          />
        ))}
      </div>

      {/* パンくず（サイト導線はハンバーガーではなくパンくずに統一） */}
      <Breadcrumb items={[{ label: "ホーム", to: "/" }, { label: "コラム" }]} />

      {/* 検索バー（常時表示） */}
      <div className="px-5 pt-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="記事を検索..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-stone-200 focus:outline-none focus:border-stone-400"
            style={{ fontFamily: J, fontSize: "16px" }}
          />
        </div>
      </div>

      {/* 探すハブ (2x2 パネル) — 記事を tags で絞り込む */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-2 mb-2.5">
          <span
            className="w-[5px] h-[5px] rounded-full shrink-0"
            style={{ background: GOLD, boxShadow: "0 0 8px rgba(212,175,55,.8)" }}
          />
          <span style={{ fontFamily: J, fontWeight: 700, fontSize: "13px", color: DARK, letterSpacing: ".04em" }}>
            コラムを探す
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {FACET_META.map((f) => facetTile(f.key, f.label, f.Icon, f.sub))}
        </div>

        {/* 展開チップ */}
        {openFacet && (
          <div className="mt-2.5 rounded-2xl bg-white p-3.5" style={{ border: "1px solid rgba(27,37,40,.08)" }}>
            <FacetChips
              facet={openFacet}
              activeTags={activeTags}
              onToggle={toggleTag}
            />
          </div>
        )}
      </div>

      {/* 絞り込み中インジケータ（複数タグ。各ピルで個別解除 / まとめて解除も可） */}
      {activeTags.length > 0 && (
        <div className="px-5 pt-3 flex flex-wrap items-center gap-1.5">
          {activeTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95"
              style={{
                fontFamily: J,
                fontSize: "12px",
                fontWeight: 700,
                background: `linear-gradient(135deg, ${GOLD} 0%, #c8960c 100%)`,
                color: DARK,
                boxShadow: "0 2px 10px rgba(212,175,55,.35)",
              }}
            >
              #{tag}
              <X className="w-3.5 h-3.5" />
            </button>
          ))}
          {activeTags.length > 1 && (
            <button
              onClick={() => setActiveTags([])}
              style={{ fontFamily: J, fontSize: "11.5px", color: "rgba(27,37,40,.5)", textDecoration: "underline" }}
            >
              すべて解除
            </button>
          )}
        </div>
      )}

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
            条件に合う記事がありません
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

function FacetChips({
  facet,
  activeTags,
  onToggle,
}: {
  facet: Facet;
  activeTags: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FACET_TAGS[facet].map((tag) => {
        const selected = activeTags.includes(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggle(tag)}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-[12px] active:scale-95 transition-transform"
            style={{
              fontFamily: J,
              fontWeight: selected ? 700 : 600,
              background: selected ? GOLD : "#f5f4f0",
              color: selected ? DARK : DARK,
              border: `1px solid ${selected ? "rgba(212,175,55,.9)" : "rgba(27,37,40,.1)"}`,
              boxShadow: selected ? "0 2px 8px rgba(212,175,55,.35)" : undefined,
            }}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
