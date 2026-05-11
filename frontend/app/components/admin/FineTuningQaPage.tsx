import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  Download,
  Loader2,
  Plus,
  Search,
  Sparkles,
  X,
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

export interface FineTuningQaPageProps {
  /**
   * Embedded mode: render without the page-level header/title and use callbacks
   * instead of navigating to /admin/fine-tuning-qa/* routes. The host (e.g. the
   * AI Chat Settings page tab) is responsible for showing/hiding an inline
   * editor.
   */
  embedded?: boolean;
  onEdit?: (id: number) => void;
  onNew?: () => void;
}

export function FineTuningQaPage({
  embedded = false,
  onEdit,
  onNew,
}: FineTuningQaPageProps = {}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>("全て");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [sort, setSort] = useState<"id_asc" | "id_desc" | "updated_desc" | "question_asc">("id_asc");
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

  // --- Re-training flow state ---
  type JobInfo = {
    id: string;
    status: string;
    fine_tuned_model: string | null;
    base_model?: string;
    created_at?: number;
  };
  const [retrainModalOpen, setRetrainModalOpen] = useState(false);
  const [retrainStarting, setRetrainStarting] = useState(false);
  const [retrainError, setRetrainError] = useState<string | null>(null);
  const [retrainEpochs, setRetrainEpochs] = useState<1 | 2 | 3>(1);
  // OpenAI fine-tunable base models. Pricing/capability differs — see notes.
  // gpt-5 family is filter-listed at OpenAI but FT availability varies per
  // model; left out of the UI until confirmed callable.
  const BASE_MODELS = [
    { id: "gpt-4.1-mini-2025-04-14", label: "gpt-4.1-mini (推奨・新しい・学習$0.80/M)" },
    { id: "gpt-4.1-nano-2025-04-14", label: "gpt-4.1-nano (超軽量・推論安い)" },
    { id: "gpt-4o-mini-2024-07-18", label: "gpt-4o-mini (現行・既存モデルと互換)" },
    { id: "gpt-4.1-2025-04-14", label: "gpt-4.1 (高性能・高価)" },
  ] as const;
  const [retrainBaseModel, setRetrainBaseModel] = useState<string>(BASE_MODELS[0].id);
  const [activeJob, setActiveJob] = useState<JobInfo | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [openAIConfigured, setOpenAIConfigured] = useState(true);
  const [applyingModel, setApplyingModel] = useState(false);
  const [applyToast, setApplyToast] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);

  // Persist last-known job id so re-opening the tab shows ongoing job status.
  const JOB_STORAGE_KEY = "recta:ft:last_job_id";

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchJobStatus = useCallback(async (jobId: string) => {
    try {
      const res = await api.get<{
        success: boolean;
        job?: {
          id: string;
          status: string;
          fine_tuned_model: string | null;
          model?: string;
          created_at?: number;
        };
      }>(`/admin/ai-chat/fine-tuning/job?job_id=${encodeURIComponent(jobId)}`);
      if (res.job) {
        setActiveJob({
          id: res.job.id,
          status: res.job.status,
          fine_tuned_model: res.job.fine_tuned_model,
          base_model: res.job.model,
          created_at: res.job.created_at,
        });
        // If terminal, stop polling.
        const terminal = ["succeeded", "failed", "cancelled"];
        if (terminal.includes(res.job.status)) {
          stopPolling();
        }
      }
    } catch (e) {
      console.error("Failed to fetch job status", e);
    }
  }, [stopPolling]);

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      // Immediate fetch, then every 30s.
      void fetchJobStatus(jobId);
      pollRef.current = window.setInterval(() => {
        void fetchJobStatus(jobId);
      }, 30000);
    },
    [fetchJobStatus, stopPolling],
  );

  // Load FT status + last job on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const status = await api.get<{
          openai_configured: boolean;
          current_model: string | null;
        }>("/admin/ai-chat/fine-tuning/status");
        if (cancelled) return;
        setCurrentModel(status.current_model);
        setOpenAIConfigured(!!status.openai_configured);
      } catch {
        /* silent */
      }

      const lastJobId =
        typeof window !== "undefined"
          ? window.localStorage.getItem(JOB_STORAGE_KEY)
          : null;
      if (lastJobId) {
        startPolling(lastJobId);
      } else {
        // No saved job_id (possibly because the /start request 502'd at the
        // proxy while the job actually started on OpenAI's side). Recover
        // by listing recent jobs and picking the most recent non-terminal
        // one as the active job.
        try {
          const list = await api.get<{
            success: boolean;
            jobs?: Array<{
              id: string;
              status: string;
              fine_tuned_model: string | null;
              model?: string;
              created_at?: number;
            }>;
          }>("/admin/ai-chat/fine-tuning/job");
          if (cancelled) return;
          const terminal = new Set(["succeeded", "failed", "cancelled"]);
          const pending = (list.jobs ?? []).find(
            (j) => !terminal.has(j.status),
          );
          if (pending) {
            setActiveJob({
              id: pending.id,
              status: pending.status,
              fine_tuned_model: pending.fine_tuned_model,
              base_model: pending.model,
              created_at: pending.created_at,
            });
            if (typeof window !== "undefined") {
              window.localStorage.setItem(JOB_STORAGE_KEY, pending.id);
            }
            startPolling(pending.id);
          }
        } catch {
          /* silent */
        }
      }
    })();
    return () => {
      cancelled = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartRetrain = async () => {
    if (retrainStarting) return;
    setRetrainStarting(true);
    setRetrainError(null);
    try {
      const res = await api.post<{
        success: boolean;
        job_id?: string;
        status?: string;
        model?: string;
        message?: string;
      }>("/admin/ai-chat/fine-tuning/start", {
        epochs: retrainEpochs,
        base_model: retrainBaseModel,
      });
      if (!res.success || !res.job_id) {
        throw new Error(res.message || "ジョブの開始に失敗しました");
      }
      const job: JobInfo = {
        id: res.job_id,
        status: res.status || "queued",
        fine_tuned_model: null,
        base_model: res.model,
      };
      setActiveJob(job);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(JOB_STORAGE_KEY, res.job_id);
      }
      setRetrainModalOpen(false);
      startPolling(res.job_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "ジョブの開始に失敗しました";
      setRetrainError(msg);
    } finally {
      setRetrainStarting(false);
    }
  };

  const handleApplyModel = async () => {
    if (!activeJob?.fine_tuned_model || applyingModel) return;
    setApplyingModel(true);
    try {
      await api.put<{ success: boolean }>(
        "/admin/ai-chat/fine-tuning/model",
        { model_id: activeJob.fine_tuned_model },
      );
      setCurrentModel(activeJob.fine_tuned_model);
      setApplyToast("本番モデルに適用しました");
      window.setTimeout(() => setApplyToast(null), 2500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "モデル適用に失敗しました";
      setRetrainError(msg);
    } finally {
      setApplyingModel(false);
    }
  };

  const handleDismissJob = () => {
    stopPolling();
    setActiveJob(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(JOB_STORAGE_KEY);
    }
  };

  // Estimate cost: $3 per 1M training tokens for gpt-4o-mini fine-tuning
  // (OpenAI 2026 pricing). Each ChatML pair (system + user + assistant)
  // averages around 500 tokens in this dataset; user-selectable epochs.
  const estimatedCostJpy = (() => {
    const activeCount = statusCounts.active;
    if (!activeCount) return 0;
    const tokensPerPair = 500;
    const totalTokens = activeCount * tokensPerPair * retrainEpochs;
    const usd = (totalTokens / 1_000_000) * 3;
    return Math.round(usd * 150);
  })();

  const jobStatusLabel = (s: string): { label: string; color: string } => {
    switch (s) {
      case "validating_files":
        return { label: "ファイル検証中", color: "text-amber-700 bg-amber-50" };
      case "queued":
        return { label: "キュー待ち", color: "text-amber-700 bg-amber-50" };
      case "running":
        return { label: "学習中", color: "text-indigo-700 bg-indigo-50" };
      case "succeeded":
        return { label: "完了", color: "text-emerald-700 bg-emerald-50" };
      case "failed":
        return { label: "失敗", color: "text-red-700 bg-red-50" };
      case "cancelled":
        return { label: "キャンセル", color: "text-stone-700 bg-stone-100" };
      default:
        return { label: s, color: "text-stone-700 bg-stone-100" };
    }
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(PER_PAGE));
      if (search) params.set("q", search);
      if (statusFilter !== "全て") params.set("status", statusFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("sort", sort);

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
  }, [page, search, statusFilter, categoryFilter, sort]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter, sort]);

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

  const handleNewClick = () => {
    if (embedded && onNew) {
      onNew();
    } else {
      navigate("/admin/fine-tuning-qa/new");
    }
  };

  const handleRowClick = (id: number) => {
    if (embedded && onEdit) {
      onEdit(id);
    } else {
      navigate(`/admin/fine-tuning-qa/${id}/edit`);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        {embedded ? (
          <div>
            <p className="text-[13px] text-muted-foreground">
              ファインチューニング学習データの編集。修正後はJSONLエクスポートしてOpenAIに再アップロード
            </p>
          </div>
        ) : (
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
        )}
        <div className="flex items-center gap-2 flex-wrap">
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
            type="button"
            onClick={() => {
              setRetrainError(null);
              setRetrainModalOpen(true);
            }}
            disabled={
              !openAIConfigured ||
              statusCounts.active === 0 ||
              (activeJob !== null &&
                !["succeeded", "failed", "cancelled"].includes(activeJob.status))
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 text-white rounded-lg text-[13px] hover:bg-amber-600 transition-all disabled:opacity-50"
            title={
              !openAIConfigured
                ? "OPENAI_API_KEY が設定されていません"
                : statusCounts.active === 0
                  ? "active な Q&A がありません"
                  : "OpenAI で fine-tuning ジョブを起動"
            }
          >
            <Sparkles className="w-4 h-4" />
            OpenAI で再学習
          </button>
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            新規作成
          </button>
        </div>
      </div>

      {/* Active job banner */}
      {activeJob && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              {["succeeded"].includes(activeJob.status) ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              ) : ["failed", "cancelled"].includes(activeJob.status) ? (
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              ) : (
                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-semibold text-stone-800">
                    Fine-tuning ジョブ
                  </span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-md ${jobStatusLabel(activeJob.status).color}`}
                  >
                    {jobStatusLabel(activeJob.status).label}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono break-all">
                  Job ID: {activeJob.id}
                </p>
                {activeJob.fine_tuned_model && (
                  <p className="text-[12px] text-emerald-700 mt-1 font-mono break-all flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    {activeJob.fine_tuned_model}
                    {currentModel === activeJob.fine_tuned_model && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded ml-1">
                        本番適用済み
                      </span>
                    )}
                  </p>
                )}
                {!activeJob.fine_tuned_model &&
                  !["failed", "cancelled"].includes(activeJob.status) && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      30秒ごとにステータスを更新します。タブを閉じてもジョブは継続します（所要 15〜30分）。
                    </p>
                  )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {activeJob.fine_tuned_model &&
                currentModel !== activeJob.fine_tuned_model && (
                  <button
                    type="button"
                    onClick={handleApplyModel}
                    disabled={applyingModel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-[12px] hover:bg-emerald-700 transition disabled:opacity-50"
                  >
                    {applyingModel ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    このモデルを本番に適用
                  </button>
                )}
              <button
                type="button"
                onClick={handleDismissJob}
                className="p-1.5 rounded-md text-muted-foreground hover:bg-muted"
                title="ジョブ表示を閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {retrainError && (
            <p className="text-[12px] text-red-600">{retrainError}</p>
          )}
          {applyToast && (
            <p className="text-[12px] text-emerald-700">{applyToast}</p>
          )}
        </div>
      )}

      {/* Re-training confirmation modal */}
      {retrainModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !retrainStarting && setRetrainModalOpen(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="text-[15px] font-semibold">
                  OpenAI で再学習しますか？
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1">
                  現在 active の{" "}
                  <strong className="text-foreground">
                    {statusCounts.active.toLocaleString()}件
                  </strong>{" "}
                  の Q&amp;A で新しい fine-tuning ジョブを開始します。
                </p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-[12px] space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">所要時間</span>
                <span className="font-mono">約15〜30分</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">推定コスト</span>
                <span className="font-mono">
                  約 ¥{estimatedCostJpy.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-start gap-2">
                <span className="text-muted-foreground shrink-0 pt-1">ベースモデル</span>
                <select
                  value={retrainBaseModel}
                  onChange={(e) => setRetrainBaseModel(e.target.value)}
                  disabled={retrainStarting}
                  className="text-[12px] font-mono border border-border rounded px-2 py-1 bg-white max-w-[280px]"
                >
                  {BASE_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">エポック数</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRetrainEpochs(n as 1 | 2 | 3)}
                      disabled={retrainStarting}
                      className={`px-2.5 py-0.5 rounded-md text-[12px] font-mono border transition ${
                        retrainEpochs === n
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white border-border hover:bg-muted"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground -mt-1">
                エポック = 学習データを通すループ数。1で軽め・速い・安い、3で深く学習。Rectaは類似テンプレが多いので 1〜2 で十分なケースが多い。
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              ※
              ジョブ完了後に「本番に適用」ボタンを押すまで、現在の本番モデルには影響しません。
            </p>
            {retrainError && (
              <p className="text-[12px] text-red-600">{retrainError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRetrainModalOpen(false)}
                disabled={retrainStarting}
                className="px-3 py-1.5 rounded-md text-[13px] border border-border hover:bg-muted disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                type="button"
                onClick={handleStartRetrain}
                disabled={retrainStarting}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 text-white rounded-md text-[13px] hover:bg-amber-600 disabled:opacity-50"
              >
                {retrainStarting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                学習を開始
              </button>
            </div>
          </div>
        </div>
      )}

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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
          title="並び順"
        >
          <option value="id_asc">投入順</option>
          <option value="id_desc">新しい順</option>
          <option value="updated_desc">最近編集した順</option>
          <option value="question_asc">質問の五十音順</option>
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
                    onClick={() => handleRowClick(it.id)}
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
