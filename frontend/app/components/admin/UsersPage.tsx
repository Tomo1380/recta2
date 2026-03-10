import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronLeft, ChevronRight, Users, Loader2, MessageCircle } from "lucide-react";
import { api } from "~/lib/api";
import type { User, Paginated, UserIndexResponse } from "~/lib/types";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function statusLabel(status: string): string {
  return status === "active" ? "\u6709\u52B9" : "\u505C\u6B62";
}

function statusParam(filter: string): string | undefined {
  if (filter === "\u6709\u52B9") return "active";
  if (filter === "\u505C\u6B62") return "suspended";
  return undefined;
}

function lineStatusParam(filter: string): string | undefined {
  if (filter === "LINE\u53CB\u3060\u3061") return "friend";
  if (filter === "\u672A\u53CB\u3060\u3061") return "not_friend";
  return undefined;
}

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("\u5168\u3066");
  const [lineFilter, setLineFilter] = useState("\u5168\u3066");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Paginated<User> | null>(null);
  const [lineStats, setLineStats] = useState<{ total_users: number; line_friend_count: number } | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter, lineFilter]);

  // Fetch users
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    const status = statusParam(statusFilter);
    if (status) params.set("status", status);
    const lineStatus = lineStatusParam(lineFilter);
    if (lineStatus) params.set("line_status", lineStatus);
    params.set("page", String(page));

    api
      .get<UserIndexResponse>(`/admin/users?${params.toString()}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.users);
          setLineStats(res.line_stats);
        }
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter, lineFilter, page]);

  const users = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const lineIcon = (u: User) => {
    if (u.line_picture_url) {
      return (
        <img
          src={u.line_picture_url}
          alt={u.line_display_name || ""}
          className="w-7 h-7 rounded-md object-cover"
        />
      );
    }
    return (
      <div className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[11px]">
        {u.line_display_name?.charAt(0) ?? "?"}
      </div>
    );
  };

  const lineName = (u: User) => u.line_display_name || "Unknown";

  const lineFriendBadge = (u: User) => {
    if (u.is_line_friend) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <MessageCircle className="w-2.5 h-2.5" />
          \u53CB\u3060\u3061
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-stone-50 text-stone-500 border border-stone-200">
        \u672A\u53CB\u3060\u3061
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            \u30E6\u30FC\u30B6\u30FC\u7BA1\u7406
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            \u767B\u9332\u30E6\u30FC\u30B6\u30FC\u306E\u4E00\u89A7\u3068\u7BA1\u7406
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lineStats && (
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
              LINE\u53CB\u3060\u3061 {lineStats.line_friend_count}\u540D
            </span>
          )}
          <span className="text-[13px] text-muted-foreground flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {total} \u540D
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="\u540D\u524D\u3067\u691C\u7D22..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg">
          {["\u5168\u3066", "\u6709\u52B9", "\u505C\u6B62"].map((s) => (
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
        <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg">
          {["\u5168\u3066", "LINE\u53CB\u3060\u3061", "\u672A\u53CB\u3060\u3061"].map((s) => (
            <button
              key={s}
              onClick={() => setLineFilter(s)}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-all ${
                lineFilter === s
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u30E6\u30FC\u30B6\u30FC
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u540D
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      LINE\u53CB\u3060\u3061
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u767B\u9332\u65E5
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u6700\u7D42\u30ED\u30B0\u30A4\u30F3
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u53E3\u30B3\u30DF
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">
                      \u30B9\u30C6\u30FC\u30BF\u30B9
                    </th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20 transition"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {lineIcon(user)}
                          <span>{lineName(user)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{user.nickname || "\u2014"}</td>
                      <td className="py-2.5 px-4">{lineFriendBadge(user)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(user.created_at)}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(user.last_login_at)}</td>
                      <td className="py-2.5 px-4">{user.reviews_count ?? 0}</td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === "active" ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          <span className="text-[12px] text-muted-foreground">{statusLabel(user.status)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => navigate(`/admin/users/${user.id}`)}
                          className="text-[12px] text-muted-foreground hover:text-foreground transition"
                        >
                          \u8A73\u7D30 \u2192
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {users.map((user) => (
                <div
                  key={user.id}
                  onClick={() => navigate(`/admin/users/${user.id}`)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition cursor-pointer"
                >
                  <div className="shrink-0">{lineIcon(user)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">{lineName(user)}</span>
                      {lineFriendBadge(user)}
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${
                          user.status === "active" ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {user.nickname || "\u30D7\u30ED\u30D5\u30A3\u30FC\u30EB\u672A\u8A2D\u5B9A"} \u00B7 \u53E3\u30B3\u30DF{" "}
                      {user.reviews_count ?? 0}\u4EF6
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
        <p className="text-[12px] text-muted-foreground">
          {total} \u4EF6\u4E2D {users.length} \u4EF6\u8868\u793A
        </p>
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: lastPage }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded-md text-[13px] flex items-center justify-center ${
                p === currentPage ? "bg-indigo-600 text-white" : "hover:bg-muted transition"
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={currentPage >= lastPage}
            className="p-1.5 rounded-md hover:bg-muted transition disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
