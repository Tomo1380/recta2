import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Search,
  Loader2,
  UserCheck,
  UserX,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Radio,
} from "lucide-react";
import { api } from "~/lib/api";
import type { LineFriend, Paginated } from "~/lib/types";

export function LineFriendsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [friends, setFriends] = useState<LineFriend[]>([]);
  const [search, setSearch] = useState("");
  const [filterFollowing, setFilterFollowing] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchFriends = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", "20");
      if (search) params.set("search", search);
      if (filterFollowing !== "all") params.set("is_following", filterFollowing);

      const data = await api.get<Paginated<LineFriend>>(
        `/admin/line/friends?${params.toString()}`
      );
      setFriends(data.data);
      setLastPage(data.last_page);
      setTotal(data.total);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "データの取得に失敗しました";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterFollowing]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFriends();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-[13px] text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            LINE友だち管理
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            LINE公式アカウントの友だち一覧とメッセージ管理
          </p>
        </div>
        <button
          onClick={() => navigate("/admin/line/broadcast")}
          className="px-4 py-2 bg-[#06C755] text-white rounded-lg text-[13px] hover:bg-[#05b04d] transition flex items-center gap-2"
        >
          <Radio className="w-4 h-4" />
          一斉配信
        </button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="表示名・LINE IDで検索..."
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
          />
        </form>
        <select
          value={filterFollowing}
          onChange={(e) => {
            setFilterFollowing(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 max-w-[180px]"
        >
          <option value="all">すべて</option>
          <option value="1">フォロー中</option>
          <option value="0">ブロック済み</option>
        </select>
      </div>

      {/* Stats */}
      <div className="text-[12px] text-muted-foreground">
        {total} 件の友だち
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground text-[13px]">
            友だちが見つかりません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    LINE ID
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    フォロー日
                  </th>
                  <th className="text-left py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    連携ユーザー
                  </th>
                  <th className="text-right py-3 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                    メッセージ
                  </th>
                </tr>
              </thead>
              <tbody>
                {friends.map((friend) => (
                  <tr
                    key={friend.id}
                    onClick={() =>
                      navigate(
                        `/admin/line/${friend.line_user_id}/messages`
                      )
                    }
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {friend.picture_url ? (
                          <img
                            src={friend.picture_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-[11px]">
                            {(friend.display_name || "?")[0]}
                          </div>
                        )}
                        <span className="font-medium">
                          {friend.display_name || "名前なし"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                      {friend.line_user_id.slice(0, 12)}...
                    </td>
                    <td className="py-3 px-4">
                      {friend.is_following ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3" />
                          フォロー中
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-red-50 text-red-700 border border-red-200">
                          <UserX className="w-3 h-3" />
                          ブロック
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">
                      {formatDate(friend.followed_at)}
                    </td>
                    <td className="py-3 px-4">
                      {friend.user ? (
                        <span className="text-indigo-600">
                          {friend.user.line_display_name ||
                            friend.user.nickname ||
                            `ID: ${friend.user.id}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">未連携</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MessageCircle className="w-3.5 h-3.5" />
                        {friend.messages_count ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {lastPage > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-[12px] text-muted-foreground">
              {page} / {lastPage} ページ
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(Math.min(lastPage, page + 1))}
                disabled={page >= lastPage}
                className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
