import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { Search, Plus, ChevronLeft, ChevronRight, Star, Loader2 } from "lucide-react";
import { api } from "~/lib/api";
import type { Store, Paginated } from "~/lib/types";

const STATUS_MAP: Record<string, string> = {
  published: "公開",
  unpublished: "非公開",
  draft: "下書き",
};

const STATUS_REVERSE: Record<string, string> = {
  "公開": "published",
  "非公開": "unpublished",
  "下書き": "draft",
};

const areas = ["全て", "新宿・歌舞伎町", "銀座", "六本木", "渋谷", "池袋"];
const statuses = ["全て", "公開", "非公開", "下書き"];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

export function ShopsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("全て");
  const [statusFilter, setStatusFilter] = useState("全て");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<Store[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [lastPage, setLastPage] = useState(1);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (search) params.set("search", search);
      if (areaFilter !== "全て") params.set("area", areaFilter);
      if (statusFilter !== "全て") {
        const apiStatus = STATUS_REVERSE[statusFilter];
        if (apiStatus) params.set("publish_status", apiStatus);
      }
      const res = await api.get<Paginated<Store>>(`/admin/stores?${params.toString()}`);
      setStores(res.data);
      setTotalCount(res.total);
      setLastPage(res.last_page);
    } catch (e) {
      console.error("Failed to fetch stores", e);
    } finally {
      setLoading(false);
    }
  }, [page, search, areaFilter, statusFilter]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, areaFilter, statusFilter]);

  const statusLabel = (s: Store) => STATUS_MAP[s.publish_status] || s.publish_status;

  const statusDot = (status: string) => {
    const colors: Record<string, string> = {
      "公開": "bg-emerald-500",
      "非公開": "bg-stone-400",
      "下書き": "bg-amber-500",
    };
    return colors[status] || "bg-stone-400";
  };

  const mapped = stores.map((s) => ({
    id: s.id,
    name: s.name,
    area: s.area,
    station: s.nearest_station || "—",
    type: s.category || "—",
    status: statusLabel(s),
    reviews: s.reviews_count ?? 0,
    rating: 0,
    updated: s.updated_at ? formatDate(s.updated_at) : "—",
    thumb: s.name.slice(0, 2),
  }));

  // Build page numbers for pagination
  const pageNumbers: number[] = [];
  for (let i = 1; i <= lastPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>店舗管理</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">登録店舗の一覧と管理</p>
        </div>
        <button
          onClick={() => navigate("/admin/shops/new")}
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
            placeholder="店舗名で検索..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
          />
        </div>
        <select
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          {areas.map((a) => <option key={a}>{a}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
        >
          {statuses.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : mapped.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-muted-foreground">
            該当する店舗がありません
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">店舗</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">エリア</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">業種</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">ステータス</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">口コミ</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">評価</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider">更新日</th>
                    <th className="text-left py-2.5 px-4 text-muted-foreground text-[11px] uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody>
                  {mapped.map((shop) => (
                    <tr key={shop.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[11px]">
                            {shop.thumb}
                          </div>
                          <span>{shop.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div>
                          <span className="text-[13px]">{shop.area}</span>
                          <span className="block text-[11px] text-muted-foreground">{shop.station}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="text-[12px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{shop.type}</span>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${statusDot(shop.status)}`} />
                          <span className="text-[12px] text-muted-foreground">{shop.status}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{shop.reviews}</td>
                      <td className="py-2.5 px-4">
                        {shop.rating > 0 ? (
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{shop.rating}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-muted-foreground">{shop.updated}</td>
                      <td className="py-2.5 px-4">
                        <button
                          onClick={() => navigate(`/admin/shops/${shop.id}/edit`)}
                          className="text-[12px] text-muted-foreground hover:text-foreground transition"
                        >
                          編集 →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {mapped.map((shop) => (
                <div
                  key={shop.id}
                  onClick={() => navigate(`/admin/shops/${shop.id}/edit`)}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-muted/20 transition cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-md bg-indigo-50 text-indigo-500 flex items-center justify-center text-[11px] shrink-0">
                    {shop.thumb}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]">{shop.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusDot(shop.status)}`} />
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {shop.area} · {shop.type}
                      {shop.rating > 0 && ` · ★${shop.rating}`}
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
        <p className="text-[12px] text-muted-foreground">{totalCount} 件</p>
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
                n === page
                  ? "bg-indigo-600 text-white"
                  : "hover:bg-muted transition"
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
