import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { api } from "~/lib/api";
import type { Article, Paginated } from "~/lib/types";

const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開",
};

const STATUS_OPTIONS = ["全て", "公開", "下書き"] as const;

function formatDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function ArticlesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("全て");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      if (statusFilter === "公開") params.set("status", "published");
      if (statusFilter === "下書き") params.set("status", "draft");

      const res = await api.get<Paginated<Article>>(`/admin/articles?${params.toString()}`);
      setArticles(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } catch (e) {
      console.error("Failed to fetch articles", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const pageNumbers: number[] = [];
  for (let i = 1; i <= lastPage; i++) pageNumbers.push(i);

  const statusDot = (s: string) =>
    s === "published" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            コラム管理
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            業界解説・店舗紹介などのコラム記事
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/articles/new")}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          新規作成
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="タイトル・本文で検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[13px] text-muted-foreground gap-2">
            <FileText className="w-6 h-6 text-stone-400" />
            該当する記事がありません
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      タイトル
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      公開日
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      更新日
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      作成者
                    </th>
                    <th className="text-right py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      文字数
                    </th>
                    <th className="text-right py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      PV
                    </th>
                    <th className="text-right py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      LINE導線
                    </th>
                    <th className="text-left py-2.5 px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {articles.map((a) => (
                    <tr
                      key={a.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition cursor-pointer"
                      onClick={() => navigate(`/admin/articles/${a.id}/edit`)}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {a.thumbnail_url ? (
                            <img
                              src={a.thumbnail_url}
                              alt=""
                              className="w-9 h-9 rounded-md object-cover bg-stone-100"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate max-w-[360px]">{a.title}</div>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[360px]">
                              /{a.slug}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {a.category ? (
                          <span className="text-[12px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                            {a.category}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDot(a.status)}`} />
                          <span className="text-[12px] text-muted-foreground">
                            {STATUS_LABELS[a.status]}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {formatDate(a.published_at)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">
                        {formatDate(a.updated_at)}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground text-[12px]">
                        {a.author_name || "—"}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">
                        {Number(a.char_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">
                        {(a.pv_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right text-muted-foreground tabular-nums">
                        {(a.line_clicks_count ?? 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <span className="text-[12px] text-muted-foreground">編集 →</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {articles.map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/admin/articles/${a.id}/edit`)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition cursor-pointer"
                >
                  {a.thumbnail_url ? (
                    <img
                      src={a.thumbnail_url}
                      alt=""
                      className="w-10 h-10 rounded-md object-cover bg-stone-100 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] truncate">{a.title}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusDot(a.status)}`} />
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                      {a.category ?? "未分類"} · {formatDate(a.updated_at)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-indigo-300" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-muted-foreground">{total} 件</p>
        <div className="flex items-center gap-0.5">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {pageNumbers.map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-8 h-8 rounded-md text-[13px] flex items-center justify-center ${
                n === page ? "bg-indigo-600 text-white" : "hover:bg-muted transition"
              }`}
            >
              {n}
            </button>
          ))}
          <button
            disabled={page >= lastPage}
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
