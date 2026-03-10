import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, MessageSquare, Star, Loader2 } from "lucide-react";
import { api } from "~/lib/api";
import type { Review, Paginated } from "~/lib/types";

const STATUS_FILTER_MAP: Record<string, string | undefined> = {
  "全て": undefined,
  "公開": "published",
  "非公開": "unpublished",
  "削除済み": "deleted",
};

const STATUS_LABEL_MAP: Record<string, string> = {
  published: "公開",
  unpublished: "非公開",
  deleted: "削除済み",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReviewsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("全て");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const statuses = ["全て", "公開", "非公開", "削除済み"];

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      const apiStatus = STATUS_FILTER_MAP[statusFilter];
      if (apiStatus) params.set("status", apiStatus);

      const res = await api.get<Paginated<Review>>(`/admin/reviews?${params.toString()}`);
      setReviews(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } catch {
      // error handled by api layer (401 redirect etc.)
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleToggleVisibility = async (review: Review) => {
    const newStatus = review.status === "published" ? "unpublished" : "published";
    await api.put(`/admin/reviews/${review.id}/status`, { status: newStatus });
    fetchReviews();
  };

  const handleDelete = async (review: Review) => {
    await api.put(`/admin/reviews/${review.id}/status`, { status: "deleted" });
    fetchReviews();
  };

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      "公開": "bg-emerald-500",
      "非公開": "bg-stone-400",
      "削除済み": "bg-red-500",
    };
    return colors[status] || "bg-stone-400";
  };

  const getStatusLabel = (review: Review) => STATUS_LABEL_MAP[review.status] || review.status;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>口コミ管理</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">ユーザーからの口コミを管理</p>
        </div>
        <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          {total} 件
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
            placeholder="ユーザー名・店舗名で検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-all ${
                statusFilter === s
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">投稿者</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">店舗</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">評価</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">本文</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">日時</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">ステータス</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider"></th>
                  </tr>
                </thead>
                {reviews.map((review) => {
                  const label = getStatusLabel(review);
                  return (
                    <tbody key={review.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                        className="border-b border-border hover:bg-muted/20 cursor-pointer transition"
                      >
                        <td className="py-2.5 px-4">
                          <span className="text-[13px]">{review.user?.line_display_name || "Unknown"}</span>
                        </td>
                        <td className="py-2.5 px-4">{review.store?.name || "Unknown"}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"
                                }`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 max-w-xs">
                          <p className="truncate text-muted-foreground">{review.body}</p>
                        </td>
                        <td className="py-2.5 px-4 text-muted-foreground whitespace-nowrap">{formatDate(review.created_at)}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${statusDot(label)}`} />
                            <span className="text-[12px] text-muted-foreground">{label}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            {review.status !== "deleted" && (
                              <button
                                className="p-1.5 rounded-md hover:bg-muted transition"
                                title={review.status === "published" ? "非公開にする" : "公開する"}
                                onClick={() => handleToggleVisibility(review)}
                              >
                                {review.status === "published" ? (
                                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </button>
                            )}
                            <button
                              className="p-1.5 rounded-md hover:bg-red-50 transition"
                              title="削除"
                              onClick={() => handleDelete(review)}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedId === review.id && (
                        <tr className="border-b border-border bg-muted/20">
                          <td colSpan={7} className="px-6 py-4">
                            <p className="text-[13px] whitespace-pre-wrap leading-relaxed text-muted-foreground">{review.body}</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {reviews.map((review) => {
              const label = getStatusLabel(review);
              return (
                <div
                  key={review.id}
                  className="bg-card border border-border rounded-xl p-4 space-y-2"
                  onClick={() => setExpandedId(expandedId === review.id ? null : review.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">{review.user?.line_display_name || "Unknown"}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusDot(label)}`} />
                    </div>
                    <span className="text-[11px] text-muted-foreground">{formatDate(review.created_at).split(" ")[0]}</span>
                  </div>
                  <p className="text-[12px] text-muted-foreground">{review.store?.name || "Unknown"}</p>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-stone-200"}`}
                      />
                    ))}
                  </div>
                  <p className={`text-[13px] text-muted-foreground ${expandedId === review.id ? "" : "line-clamp-2"}`}>
                    {review.body}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-muted-foreground">{total} 件</p>
            <div className="flex items-center gap-0.5">
              <button
                className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: lastPage }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-md text-[13px] flex items-center justify-center ${
                    page === i + 1
                      ? "bg-indigo-600 text-white"
                      : "hover:bg-muted transition"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
                disabled={page >= lastPage}
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
