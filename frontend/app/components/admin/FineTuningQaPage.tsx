import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Loader2,
  Plus,
  Search,
} from "lucide-react";
import { api, ApiError } from "~/lib/api";
import type { Paginated } from "~/lib/types";

export interface FineTuningQa {
  id: number;
  category: string | null;
  question: string;
  answer: string;
  tags: string[] | null;
  source: string | null;
  status: "active" | "draft" | "archived";
  created_at: string;
  updated_at: string;
}

interface IndexResponse {
  items: Paginated<FineTuningQa>;
  status_counts: { active: number; draft: number; archived: number };
  categories: string[];
}

const STATUS_LABELS: Record<string, string> = {
  active: "active",
  draft: "draft",
  archived: "archived",
};

const STATUS_OPTIONS = ["全て", "active", "draft", "archived"] as const;

const PER_PAGE = 50;

function statusDot(s: string) {
  if (s === "active") return "bg-emerald-500";
  if (s === "draft") return "bg-amber-500";
  return "bg-stone-400";
}

function truncate(s: string, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

export function FineTuningQaPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>("全て");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FineTuningQa[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [statusCounts, setStatusCounts] = useState({
    active: 0,
    draft: 0,
    archived: 0,
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(PER_PAGE));
      if (search) params.set("q", search);
      if (statusFilter !== "全て") params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);

      const res = await api.get<IndexResponse>(
        `/admin/fine-tuning/qa?${params.toString()}`,
      );
      setItems(res.items.data);
      setTotal(res.items.total);
      setLastPage(res.items.last_page);
      setStatusCounts(res.status_counts);
      setCategories(res.categories);
    } catch (e) {
      console.error("Failed to fetch fine-tuning Q&A", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, categoryFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      // We must send the bearer token, so we fetch as a blob and trigger a
      // synthetic download. (Anchor href can't include the auth header.)
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("admin_token")
          : null;
      const res = await fetch(
        `/api/admin/fine-tuning/qa/export-jsonl?status=active`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        },
      );
      if (!res.ok) {
        throw new ApiError(res.status, await res.json().catch(() => ({})));
      }
      const blob = await res.blob();

      // Try to extract filename from Content-Disposition; fall back to a default.
      let filename = "questions-export.jsonl";
      const cd = res.headers.get("Content-Disposition");
      if (cd) {
        const m = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
        if (m) filename = m[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("エクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  }

  const pageNumbers: number[] = [];
  for (let i = 1; i <= lastPage; i++) pageNumbers.push(i);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            Fine-tuning Q&amp;A
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            ファインチューニング学習データの編集。修正後はJSONLエクスポートしてOpenAIに再アップロード
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-border text-stone-700 rounded-lg text-[13px] hover:bg-stone-50 transition-all disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            JSONLエクスポート
          </button>
          <button
            onClick={() => navigate("/admin/fine-tuning-qa/new")}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* Status counts */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
          active: {statusCounts.active}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
          draft: {statusCounts.draft}
        </span>
        <span className="px-2.5 py-1 rounded-md bg-stone-50 text-stone-600 border border-stone-200">
          archived: {statusCounts.archived}
        </span>
        <span className="text-muted-foreground ml-1">
          / 合計{" "}
          {statusCounts.active + statusCounts.draft + statusCounts.archived}
          件
        </span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="質問・回答で検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          <option value="">全カテゴリ</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as (typeof STATUS_OPTIONS)[number])
          }
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
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[13px] text-muted-foreground gap-2">
            <Database className="w-6 h-6 text-stone-400" />
            該当するQ&amp;Aがありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider w-16">
                    ID
                  </th>
                  <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    質問 / 回答
                  </th>
                  <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    カテゴリ
                  </th>
                  <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="text-left py-2.5 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr
                    key={it.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition cursor-pointer"
                    onClick={() =>
                      navigate(`/admin/fine-tuning-qa/${it.id}/edit`)
                    }
                  >
                    <td className="py-2.5 px-4 text-muted-foreground">
                      #{it.id}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-stone-800">
                        {truncate(it.question, 80)}
                      </div>
                      <div className="text-[12px] text-muted-foreground mt-0.5">
                        {truncate(it.answer, 110)}
                      </div>
                    </td>
                    <td className="py-2.5 px-4">
                      {it.category ? (
                        <span className="text-[12px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                          {it.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${statusDot(
                            it.status,
                          )}`}
                        />
                        <span className="text-[12px] text-muted-foreground">
                          {STATUS_LABELS[it.status] ?? it.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="text-[12px] text-muted-foreground">
                        編集 →
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          {pageNumbers.length <= 12 ? (
            pageNumbers.map((n) => (
              <button
                key={n}
                onClick={() => setPage(n)}
                className={`w-8 h-8 rounded-md text-[13px] flex items-center justify-center ${
                  n === page
                    ? "bg-indigo-600 text-white"
                    : "hover:bg-muted transition"
                }`}
              >
                {n}
              </button>
            ))
          ) : (
            <span className="px-2 text-[12px] text-muted-foreground">
              {page} / {lastPage}
            </span>
          )}
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
