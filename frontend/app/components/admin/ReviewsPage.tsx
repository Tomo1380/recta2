import { useState, useEffect, useCallback } from "react";
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, Trash2, MessageSquare, Star, Loader2, Plus, X, Loader } from "lucide-react";
import { api } from "~/lib/api";
import type { Review, Paginated } from "~/lib/types";
import { SortControl, type SortState } from "~/components/admin/shared/SortControl";

/** 投稿者の表示名: 管理者入力名 → ニックネーム → LINE名 → 匿名。 */
function authorLabel(review: Review): string {
  return (
    review.author_name ||
    review.user?.nickname ||
    review.user?.line_display_name ||
    "匿名"
  );
}

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
  const [sortState, setSortState] = useState<SortState>({ sort: "created_at", order: "desc" });
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [lastPage, setLastPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  // B1: 投稿者で絞り込み中の情報（user_id があれば実ユーザー、なければ author_name）。
  const [authorFilter, setAuthorFilter] = useState<{ userId: number | null; label: string } | null>(null);

  const statuses = ["全て", "公開", "非公開", "削除済み"];

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      const apiStatus = STATUS_FILTER_MAP[statusFilter];
      if (apiStatus) params.set("status", apiStatus);
      if (authorFilter?.userId) params.set("user_id", String(authorFilter.userId));
      else if (authorFilter && !authorFilter.userId) params.set("search", authorFilter.label);
      params.set("sort", sortState.sort);
      params.set("order", sortState.order);

      const res = await api.get<Paginated<Review>>(`/admin/reviews?${params.toString()}`);
      setReviews(res.data);
      setTotal(res.total);
      setLastPage(res.last_page);
    } catch {
      // error handled by api layer (401 redirect etc.)
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortState, authorFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, sortState, authorFilter]);

  // B1: 投稿者タップ → その投稿者の過去口コミ一覧に絞り込む。
  const filterByAuthor = (review: Review) => {
    setAuthorFilter({ userId: review.user_id ?? null, label: authorLabel(review) });
  };

  const handleToggleVisibility = async (review: Review) => {
    const newStatus = review.status === "published" ? "unpublished" : "published";
    await api.put(`/admin/reviews/${review.id}/status`, { status: newStatus });
    fetchReviews();
  };

  const handleDelete = async (review: Review) => {
    await api.put(`/admin/reviews/${review.id}/status`, { status: "deleted" });
    fetchReviews();
  };

  // B4: 店側返答の保存。
  const handleSaveReply = async (review: Review, reply: string) => {
    await api.put(`/admin/reviews/${review.id}`, { store_reply: reply });
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
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4" />
            {total} 件
          </span>
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            口コミを追加
          </button>
        </div>
      </div>

      {/* B2/B3: 桜口コミ・有名嬢口コミの管理者作成フォーム */}
      {showCreate && (
        <CreateReviewForm
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            fetchReviews();
          }}
        />
      )}

      {/* B1: 投稿者で絞り込み中のバナー */}
      {authorFilter && (
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-[13px]">
          <span className="text-indigo-700">
            投稿者「{authorFilter.label}」の口コミを表示中
          </span>
          <button
            onClick={() => setAuthorFilter(null)}
            className="ml-auto inline-flex items-center gap-1 text-indigo-500 hover:text-indigo-700"
          >
            <X className="w-3.5 h-3.5" /> 解除
          </button>
        </div>
      )}

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
        <SortControl value={sortState} onChange={setSortState} />
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
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="text-[13px] text-indigo-600 hover:underline"
                              title="この投稿者の口コミを絞り込み"
                              onClick={() => filterByAuthor(review)}
                            >
                              {authorLabel(review)}
                            </button>
                            {review.is_featured && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                ★有名嬢
                              </span>
                            )}
                            {!review.user_id && !review.is_featured && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">
                                桜
                              </span>
                            )}
                          </div>
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
                          <td colSpan={7} className="px-6 py-4 space-y-3">
                            <p className="text-[13px] whitespace-pre-wrap leading-relaxed text-muted-foreground">{review.body}</p>
                            <ReplyEditor review={review} onSave={handleSaveReply} />
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
                      <span className="text-[13px]">{authorLabel(review)}</span>
                      {review.is_featured && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">★</span>
                      )}
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
            <p className="text-[13px] text-muted-foreground">
              {total === 0
                ? "0 件"
                : `全 ${total} 件中 ${(page - 1) * 20 + 1}–${(page - 1) * 20 + reviews.length} 件`}
            </p>
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

/** B2/B3: 管理者が桜口コミ / 有名嬢口コミを作成するフォーム。 */
function CreateReviewForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [storeId, setStoreId] = useState("");
  const [rating, setRating] = useState(5);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = storeId.trim() !== "" && body.trim() !== "" && authorName.trim() !== "";

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/admin/reviews", {
        store_id: Number(storeId),
        rating,
        body: body.trim(),
        author_name: authorName.trim(),
        is_featured: isFeatured,
      });
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "作成に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-medium">口コミを追加（桜口コミ・有名嬢口コミ）</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] text-muted-foreground">店舗ID</label>
          <input
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            inputMode="numeric"
            placeholder="例: 12"
            className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">表示名（投稿者名）</label>
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="例: 有名キャバ嬢A / さくら"
            className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div>
          <label className="text-[11px] text-muted-foreground">評価</label>
          <div className="mt-1 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={`w-5 h-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"}`} />
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 cursor-pointer text-[13px]">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="size-4 rounded accent-amber-600"
            />
            <span>有名キャバ嬢からの口コミ（フィーチャー表示）</span>
          </label>
        </div>
      </div>
      <div>
        <label className="text-[11px] text-muted-foreground">本文</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder="口コミ本文"
          className="mt-0.5 w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>
      {error && <p className="text-[12px] text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[13px] hover:bg-muted">
          キャンセル
        </button>
        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[13px] hover:bg-indigo-700 disabled:opacity-40"
        >
          {submitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          作成
        </button>
      </div>
    </div>
  );
}

/** B4: 店側返答の入力。 */
function ReplyEditor({
  review,
  onSave,
}: {
  review: Review;
  onSave: (review: Review, reply: string) => Promise<void>;
}) {
  const [reply, setReply] = useState(review.store_reply ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(review, reply);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
      <label className="text-[12px] font-medium text-emerald-700">店側からの返答（B4）</label>
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="店舗から聞いた返答を入力（公開ページの口コミに表示されます）"
        className="w-full px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[13px] hover:bg-emerald-700 disabled:opacity-40"
        >
          {saving ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
          返答を保存
        </button>
      </div>
    </div>
  );
}
