import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "~/components/ui/select";
import { Skeleton } from "~/components/ui/skeleton";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from "~/components/ui/pagination";
import { Search, Filter } from "lucide-react";
import StoreCard from "~/components/user/shared/StoreCard";
import Footer from "~/components/user/shared/Footer";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import AiChatPanel from "~/components/user/AiChatPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Store {
  id: number;
  name: string;
  area: string;
  address: string;
  nearest_station: string;
  category: string;
  business_hours: string;
  hourly_min: number;
  hourly_max: number;
  daily_estimate: number;
  feature_tags: string[];
  description: string;
  images: string[];
  same_day_trial: boolean;
  reviews_count: number;
  average_rating: number;
}

interface PaginatedResponse {
  data: Store[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  from: number | null;
  to: number | null;
}

interface Area {
  id: number;
  name: string;
  slug: string;
  tier: number;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildStoreApiUrl(params: URLSearchParams): string {
  const query = new URLSearchParams();
  const area = params.get("area");
  const category = params.get("category");
  const q = params.get("q");
  const sort = params.get("sort");
  const page = params.get("page");

  if (area) query.set("area", area);
  if (category) query.set("category", category);
  if (q) query.set("q", q);
  if (sort) query.set("sort", sort);
  query.set("page", page || "1");

  return `/api/stores?${query.toString()}`;
}

// ---------------------------------------------------------------------------
// Skeleton Card
// ---------------------------------------------------------------------------

function StoreCardSkeleton() {
  return (
    <div
      className="overflow-hidden rounded-xl bg-white"
      style={{
        boxShadow: "0px 2px 12px rgba(0,0,0,0.04)",
        border: "1px solid rgba(73,100,110,0.15)",
      }}
    >
      <Skeleton className="h-[160px] w-full" />
      <div className="space-y-2.5 p-3.5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/3" />
        <div className="flex gap-1.5">
          <Skeleton className="h-3.5 w-10 rounded-full" />
          <Skeleton className="h-3.5 w-10 rounded-full" />
          <Skeleton className="h-3.5 w-10 rounded-full" />
        </div>
        <Skeleton className="h-4 w-1/2" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination Component
// ---------------------------------------------------------------------------

function StorePagination({
  currentPage,
  lastPage,
  onPageChange,
}: {
  currentPage: number;
  lastPage: number;
  onPageChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;

  const pages: (number | "ellipsis")[] = [];
  const delta = 2;

  for (let i = 1; i <= lastPage; i++) {
    if (
      i === 1 ||
      i === lastPage ||
      (i >= currentPage - delta && i <= currentPage + delta)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) onPageChange(currentPage - 1);
            }}
            className={
              currentPage <= 1
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
            style={{ color: "rgba(27,37,40,0.6)" }}
          />
        </PaginationItem>

        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(page);
                }}
                className="cursor-pointer"
                style={
                  page === currentPage
                    ? { backgroundColor: "#D4AF37", color: "#fff", borderColor: "#D4AF37" }
                    : { color: "#1b2528" }
                }
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < lastPage) onPageChange(currentPage + 1);
            }}
            className={
              currentPage >= lastPage
                ? "pointer-events-none opacity-50"
                : "cursor-pointer"
            }
            style={{ color: "rgba(27,37,40,0.6)" }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function StoreListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state derived from URL
  const currentArea = searchParams.get("area") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentQuery = searchParams.get("q") || "";
  const currentPage = Number(searchParams.get("page") || "1");

  // Local search input (debounce-friendly)
  const [searchInput, setSearchInput] = useState(currentQuery);

  // Data state
  const [stores, setStores] = useState<PaginatedResponse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoading, setFiltersLoading] = useState(true);

  // Keep searchInput in sync when URL changes externally
  useEffect(() => {
    setSearchInput(searchParams.get("q") || "");
  }, [searchParams]);

  // Fetch areas and categories once
  useEffect(() => {
    let cancelled = false;
    setFiltersLoading(true);

    Promise.all([
      fetch("/api/areas").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([areasData, categoriesData]) => {
        if (!cancelled) {
          setAreas(areasData);
          setCategories(categoriesData);
          setFiltersLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFiltersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch stores when search params change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(buildStoreApiUrl(searchParams))
      .then((res) => res.json())
      .then((data: PaginatedResponse) => {
        if (!cancelled) {
          setStores(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStores(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  // Update a single search param (resets page to 1 for filter changes)
  const updateParam = useCallback(
    (key: string, value: string, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        if (resetPage && key !== "page") {
          next.set("page", "1");
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // Search submit handler
  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateParam("q", searchInput.trim());
    },
    [searchInput, updateParam]
  );

  // Page change handler
  const handlePageChange = useCallback(
    (page: number) => {
      updateParam("page", String(page), false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateParam]
  );

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  }, [setSearchParams]);

  const total = stores?.total ?? 0;
  const storeList = stores?.data ?? [];
  const isEmpty = !loading && storeList.length === 0;

  return (
    <div className="min-h-screen pb-[68px]" style={{ backgroundColor: "#fafeff" }}>
      {/* ------------------------------------------------------------------ */}
      {/* Header Banner                                                      */}
      {/* ------------------------------------------------------------------ */}
      <div style={{ backgroundColor: "#1b2528" }} className="pb-6">
        <div className="mx-auto max-w-3xl px-4 pt-8 sm:px-6 lg:px-8">
          <h1
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "'Domine', 'Noto Sans JP', sans-serif" }}
          >
            お店を探す
          </h1>
          {!loading && (
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              全{total.toLocaleString()}件
            </p>
          )}

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="relative mt-4">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 size-4"
              style={{ color: "rgba(27,37,40,0.35)" }}
            />
            <Input
              type="text"
              placeholder="店名・エリア・キーワードで検索"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-11 border-none pl-11 pr-4 text-sm shadow-none"
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "14px",
                color: "#1b2528",
              }}
            />
          </form>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Filter Pills                                                       */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-3 gap-2 -mt-3">
          {/* Area */}
          <Select
            value={currentArea}
            onValueChange={(value) =>
              updateParam("area", value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger
              size="sm"
              className="rounded-full border bg-white text-xs"
              style={{ borderColor: "rgba(212,175,55,0.3)", color: "#1b2528" }}
            >
              <SelectValue placeholder="エリア" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">すべてのエリア</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.slug}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Category */}
          <Select
            value={currentCategory}
            onValueChange={(value) =>
              updateParam("category", value === "__all__" ? "" : value)
            }
          >
            <SelectTrigger
              size="sm"
              className="rounded-full border bg-white text-xs"
              style={{ borderColor: "rgba(212,175,55,0.3)", color: "#1b2528" }}
            >
              <SelectValue placeholder="業種" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">すべての業種</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Sort */}
          <Select
            value={currentSort}
            onValueChange={(value) => updateParam("sort", value)}
          >
            <SelectTrigger
              size="sm"
              className="rounded-full border bg-white text-xs"
              style={{ borderColor: "rgba(212,175,55,0.3)", color: "#1b2528" }}
            >
              <SelectValue placeholder="並び替え" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">新着順</SelectItem>
              <SelectItem value="hourly_desc">時給が高い順</SelectItem>
              <SelectItem value="hourly_asc">時給が低い順</SelectItem>
              <SelectItem value="popular">人気順</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* AI Chat */}
      <div className="mx-auto max-w-3xl px-4 pt-4 sm:px-6 lg:px-8">
        <AiChatPanel pageType="list" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Store List                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <StoreCardSkeleton key={i} />
            ))}
          </div>
        ) : isEmpty ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(212,175,55,0.1)" }}
            >
              <Filter className="size-7" style={{ color: "#D4AF37" }} />
            </div>
            <p
              className="text-lg font-bold mb-2"
              style={{ color: "#1b2528", fontFamily: "'Domine', 'Noto Sans JP', sans-serif" }}
            >
              条件に合うお店が見つかりませんでした
            </p>
            <p className="text-sm mb-6" style={{ color: "rgba(27,37,40,0.5)" }}>
              検索条件を変更してお試しください
            </p>
            <button
              onClick={handleResetFilters}
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#D4AF37" }}
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {storeList.map((store) => (
                <StoreCard
                  key={store.id}
                  id={store.id}
                  name={store.name}
                  area={store.area}
                  category={store.category}
                  hourly_min={store.hourly_min}
                  hourly_max={store.hourly_max}
                  feature_tags={store.feature_tags}
                  images={store.images}
                  average_rating={store.average_rating}
                  reviews_count={store.reviews_count}
                  className="w-full"
                />
              ))}
            </div>

            {/* Pagination */}
            {stores && (
              <StorePagination
                currentPage={stores.current_page}
                lastPage={stores.last_page}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <Footer />

      {/* Bottom Tab Bar */}
      <BottomTabBar />
    </div>
  );
}
