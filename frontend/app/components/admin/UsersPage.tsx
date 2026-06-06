import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, ChevronLeft, ChevronRight, Users, Loader2, MessageCircle, ChevronRight as ChevronR } from "lucide-react";
import { api } from "~/lib/api";
import type { AdminPersonRow, PeopleIndexResponse, Paginated } from "~/lib/types";

/**
 * ユーザー管理 — LINE トーク (公式アカウント) 主役の「LINE利用者」一覧 (2026-06-06 FB)。
 * 行は line_user_id 軸。LINEログイン(User)はサブ属性のバッジで添える。
 * mode: talk(トーク相手のみ) / login_only(ログインのみ) / all(全員)。
 */

type Mode = "talk" | "login_only" | "all";
const MODE_TABS: { label: string; mode: Mode }[] = [
  { label: "トークあり", mode: "talk" },
  { label: "ログインのみ", mode: "login_only" },
  { label: "全員", mode: "all" },
];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function personName(p: AdminPersonRow): string {
  return p.name || p.display_name || "名前なし";
}

/** 関係を示すバッジ群 (フォロー状態 / ログイン有無)。 */
function PersonBadges({ p }: { p: AdminPersonRow }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {p.kind === "talk" ? (
        p.is_following ? (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">フォロー中</span>
        ) : (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">ブロック</span>
        )
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500">トークなし</span>
      )}
      {p.has_account ? (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
          ログイン済{p.reviews_count != null ? `・口コミ${p.reviews_count}` : ""}
        </span>
      ) : (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">友だちのみ</span>
      )}
    </div>
  );
}

function Avatar({ p }: { p: AdminPersonRow }) {
  if (p.picture_url) {
    return <img src={p.picture_url} alt="" className="w-7 h-7 rounded-md object-cover" />;
  }
  return (
    <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-[11px] text-muted-foreground">
      {personName(p)[0]}
    </div>
  );
}

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [mode, setMode] = useState<Mode>("talk");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Paginated<AdminPersonRow> | null>(null);
  const [stats, setStats] = useState<PeopleIndexResponse["stats"] | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    params.set("mode", mode);
    params.set("page", String(page));

    api
      .get<PeopleIndexResponse>(`/admin/users?${params.toString()}`)
      .then((res) => {
        if (!cancelled) {
          setData(res.people);
          setStats(res.stats);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, mode, page]);

  const people = data?.data ?? [];
  const currentPage = data?.current_page ?? 1;
  const lastPage = data?.last_page ?? 1;
  const total = data?.total ?? 0;

  const openPerson = (p: AdminPersonRow) => navigate(`/admin/people/${p.line_user_id}`);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            ユーザー管理
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            LINEトーク相手の一覧・メッセージ管理（line_user_id 基準）
          </p>
        </div>
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                トーク {stats.talk_count}名
              </span>
              <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                ログイン {stats.total_users}名
              </span>
            </>
          )}
        </div>
      </div>

      {/* Filters: 検索 + mode 切替 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="名前・line_user_id で検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <div className="flex gap-0.5 bg-muted p-0.5 rounded-lg">
          {MODE_TABS.map((t) => (
            <button
              key={t.mode}
              onClick={() => setMode(t.mode)}
              className={`px-3 py-1.5 rounded-md text-[13px] transition-all ${
                mode === t.mode ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : people.length === 0 ? (
          <div className="py-16 text-center text-[13px] text-muted-foreground">
            該当する人がいません
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">利用者</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">種別</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">メッセージ</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">最終</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {people.map((p) => (
                    <tr
                      key={p.line_user_id}
                      className={`border-b border-border last:border-0 hover:bg-muted/20 transition ${p.kind === "login_only" ? "bg-stone-50/40" : ""}`}
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <Avatar p={p} />
                          <span>{personName(p)}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4"><PersonBadges p={p} /></td>
                      <td className="py-2.5 px-4 text-muted-foreground">{p.messages_count}</td>
                      <td className="py-2.5 px-4 text-muted-foreground">{formatDate(p.last_activity)}</td>
                      <td className="py-2.5 px-4">
                        <button onClick={() => openPerson(p)} className="text-[12px] text-indigo-600 hover:text-indigo-700 transition">
                          詳細 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {people.map((p) => (
                <div
                  key={p.line_user_id}
                  onClick={() => openPerson(p)}
                  className={`px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition cursor-pointer ${p.kind === "login_only" ? "bg-stone-50/40" : ""}`}
                >
                  <div className="shrink-0"><Avatar p={p} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] truncate">{personName(p)}</span>
                    </div>
                    <div className="mt-0.5"><PersonBadges p={p} /></div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">メッセージ {p.messages_count}件 · {formatDate(p.last_activity)}</p>
                  </div>
                  <ChevronR className="w-4 h-4 text-indigo-300" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted-foreground">
          {total === 0 ? "0 件" : `全 ${total} 件中 ${(currentPage - 1) * 20 + 1}–${(currentPage - 1) * 20 + people.length} 件`}
        </p>
        {lastPage > 1 && (
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[13px] text-muted-foreground px-2">{currentPage} / {lastPage}</span>
            <button
              disabled={currentPage >= lastPage}
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              className="p-2 rounded-md hover:bg-muted disabled:opacity-30 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
