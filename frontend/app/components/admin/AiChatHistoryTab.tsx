import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { api } from "~/lib/api";
import type { Paginated } from "~/lib/types";
import { ChatLogItem, type ChatLogItemData } from "~/components/admin/ChatLogItem";

type AiChatLogRow = ChatLogItemData & { user_id: number | null };

/**
 * AIチャット履歴タブ。個別の質問/回答ログを一覧・絞り込みする (2026-06-07 FB)。
 * これまで会話履歴を見られる場所が無かった (ダッシュボードは直近プレビューのみ、
 * 統計タブは集計のみ) ため新設。
 */
export function AiChatHistoryTab() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [mode, setMode] = useState("");
  const [pageType, setPageType] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Paginated<AiChatLogRow> | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [mode, pageType]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set("q", debounced);
    if (mode) params.set("mode", mode);
    if (pageType) params.set("page_type", pageType);
    params.set("page", String(page));
    try {
      const res = await api.get<Paginated<AiChatLogRow>>(`/admin/ai-chat/logs?${params.toString()}`);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debounced, mode, pageType, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const logs = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const selectClass = "px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="質問・回答を検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <select value={mode} onChange={(e) => setMode(e.target.value)} className={selectClass}>
          <option value="">モード: 全て</option>
          <option value="agent">Agent</option>
          <option value="finetuned">Fine-tuned</option>
        </select>
        <select value={pageType} onChange={(e) => setPageType(e.target.value)} className={selectClass}>
          <option value="">画面: 全て</option>
          <option value="top">トップ</option>
          <option value="list">一覧</option>
          <option value="detail">店舗詳細</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : logs.length === 0 ? (
        <div className="py-16 text-center text-[13px] text-muted-foreground">該当する履歴がありません</div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <ChatLogItem key={log.id} log={log} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">{total === 0 ? "0 件" : `全 ${total} 件`}</p>
        {lastPage > 1 && (
          <div className="flex items-center gap-1">
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 rounded-md hover:bg-muted disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] text-muted-foreground px-2">{currentPage} / {lastPage}</span>
            <button disabled={currentPage >= lastPage} onClick={() => setPage((p) => Math.min(lastPage, p + 1))} className="p-2 rounded-md hover:bg-muted disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
