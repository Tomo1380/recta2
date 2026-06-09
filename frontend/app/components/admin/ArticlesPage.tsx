import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Search,
  Tags,
  X,
  ArrowUp,
  ArrowDown,
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
  const [showSections, setShowSections] = useState(false);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSections(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-border rounded-lg text-[13px] hover:bg-muted transition-all"
          >
            <Tags className="w-4 h-4" />
            大テーマを管理
          </button>
          <button
            onClick={() => navigate("/admin/articles/new")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>
      {showSections && <SectionManager onClose={() => setShowSections(false)} />}

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

type SectionItem = { name: string; article_count: number };

/**
 * 大テーマ（コラムTOP上段ナビ）の管理。追加・削除・並べ替え。
 * 削除は「選択肢から外す」だけで既存記事の値は保持する（非破壊）。使用件数を表示し、
 * 使用中のテーマを外すときは確認する。
 */
function SectionManager({ onClose }: { onClose: () => void }) {
  const [items, setItems] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ sections: SectionItem[] }>("/admin/columns/sections")
      .then((r) => setItems(r.sections))
      .catch(() => setError("読み込みに失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  const add = () => {
    const n = newName.trim();
    if (!n || items.some((i) => i.name === n)) return;
    setItems([...items, { name: n, article_count: 0 }]);
    setNewName("");
  };
  const remove = (it: SectionItem) => {
    if (
      it.article_count > 0 &&
      !confirm(
        `「${it.name}」は${it.article_count}件の記事で使われています。\n選択肢から外しても記事自体は消えませんが、コラムTOPのナビには出なくなります。外しますか？`,
      )
    ) {
      return;
    }
    setItems(items.filter((i) => i.name !== it.name));
  };
  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    setItems(next);
  };
  const save = async () => {
    try {
      setSaving(true);
      setError(null);
      const res = await api.put<{ sections: SectionItem[] }>("/admin/columns/sections", {
        sections: items.map((i) => i.name),
      });
      setItems(res.sections);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl border border-border w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-foreground font-bold">大テーマの管理</h3>
            <p className="text-[12px] text-muted-foreground mt-0.5">コラムTOP上段ナビの大テーマ。並べ替え・追加・削除できます。</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            <ul className="space-y-1.5 mb-3">
              {items.map((it, idx) => (
                <li key={it.name} className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5">
                  <div className="flex flex-col">
                    <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button onClick={() => move(idx, 1)} disabled={idx === items.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-20">
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="flex-1 text-[13px]">{it.name}</span>
                  <span className="text-[11px] text-muted-foreground">{it.article_count}件</span>
                  <button onClick={() => remove(it)} className="p-1 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-500 transition" aria-label="削除">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="text-[12px] text-muted-foreground py-2 text-center">大テーマがありません</li>
              )}
            </ul>

            <div className="flex gap-2">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
                placeholder="新しい大テーマ名"
                className="flex-1 px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button onClick={add} disabled={!newName.trim()} className="px-3 py-2 rounded-lg text-[13px] border border-border hover:bg-muted transition disabled:opacity-40">
                追加
              </button>
            </div>

            {error && <p className="text-[12px] text-red-500 mt-2">{error}</p>}

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={onClose} className="px-4 py-2 rounded-lg text-[13px] border border-border hover:bg-muted transition">
                キャンセル
              </button>
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg text-[13px] bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50">
                {saving ? "保存中…" : "保存"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
