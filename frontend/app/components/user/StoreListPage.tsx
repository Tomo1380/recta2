import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Star, ChevronDown, Search as SearchIcon, X } from "lucide-react";
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
import Footer from "~/components/user/shared/Footer";
import BottomTabBar from "~/components/user/shared/BottomTabBar";
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
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
  images: (string | { url: string })[];
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

function getImageUrl(image: string | { url: string } | undefined): string | undefined {
  if (!image) return undefined;
  if (typeof image === "string") return image;
  return image.url;
}

// ---------------------------------------------------------------------------
// Editorial list-card — horizontal, light surface, gold accent
// ---------------------------------------------------------------------------

function EditorialStoreCard({ store }: { store: Store }) {
  const imageUrl = store.images && store.images.length > 0 ? getImageUrl(store.images[0]) : undefined;
  const rating = store.average_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const taiken = store.same_day_trial;

  return (
    <Link
      to={`/stores/${store.id}`}
      className="group relative block overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-lg"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      {/* Left gold accent line */}
      <span
        aria-hidden
        className="absolute inset-y-4 left-0 w-[3px] rounded-r-full"
        style={{ background: "linear-gradient(180deg, #D4AF37 0%, #c8960c 100%)" }}
      />

      <div className="flex gap-3 p-3 pl-4">
        {/* Poster */}
        <div className="relative size-[120px] shrink-0 overflow-hidden rounded-xl">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={store.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{ background: "linear-gradient(135deg, #1b2528 0%, #2a3a3f 100%)" }}
            >
              <span
                className="text-3xl font-bold"
                style={{ color: "#D4AF37", fontFamily: "'Outfit', sans-serif" }}
              >
                {store.name.charAt(0)}
              </span>
            </div>
          )}
          {/* Category pill */}
          {store.category && (
            <span
              className="absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[9px] font-semibold text-white"
              style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
            >
              {store.category}
            </span>
          )}
          {/* 体験確約 ribbon */}
          {taiken && (
            <span
              className="absolute bottom-1.5 left-1.5 rounded px-1.5 py-0.5 text-[9px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              体験確約
            </span>
          )}
        </div>

        {/* Meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="truncate text-[14.5px] font-bold leading-tight"
              style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
            >
              {store.name}
            </h3>
            {rating > 0 && (
              <div className="flex shrink-0 items-center gap-0.5">
                <Star className="size-3" style={{ color: "#D4AF37", fill: "#D4AF37" }} />
                <span
                  className="text-[11px] font-semibold tabular-nums"
                  style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
                >
                  {rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {store.area && (
            <p className="mt-0.5 text-[11px]" style={{ color: "rgba(27,37,40,0.5)" }}>
              ⌖ {store.area}
            </p>
          )}

          {/* Hourly — editorial label */}
          {(store.hourly_min || store.hourly_max) && (
            <div className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-[10px]" style={{ color: "rgba(27,37,40,0.5)" }}>
                時給
              </span>
              <span
                className="text-[15px] font-bold tabular-nums leading-none"
                style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
              >
                ¥{(store.hourly_min ?? 0).toLocaleString()}
              </span>
              {store.hourly_max && store.hourly_max !== store.hourly_min && (
                <>
                  <span className="text-[10px]" style={{ color: "rgba(27,37,40,0.4)" }}>
                    〜
                  </span>
                  <span
                    className="text-[13px] font-semibold tabular-nums leading-none"
                    style={{ color: "#D4AF37", fontFamily: "'Outfit', sans-serif" }}
                  >
                    ¥{store.hourly_max.toLocaleString()}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Rating count + feature tags */}
          <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
            {rating > 0 && (
              <>
                <div className="flex items-center">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <Star
                      key={`f-${i}`}
                      className="size-[10px]"
                      style={{ color: "#D4AF37", fill: "#D4AF37" }}
                    />
                  ))}
                  {hasHalf && (
                    <Star
                      className="size-[10px]"
                      style={{ color: "#D4AF37", fill: "#D4AF37", opacity: 0.5 }}
                    />
                  )}
                  {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star
                      key={`e-${i}`}
                      className="size-[10px]"
                      style={{ color: "rgba(212,175,55,0.3)", fill: "none" }}
                    />
                  ))}
                </div>
                {store.reviews_count !== undefined && (
                  <span className="text-[10px]" style={{ color: "rgba(27,37,40,0.4)" }}>
                    ({store.reviews_count}件)
                  </span>
                )}
              </>
            )}
          </div>

          {store.feature_tags && store.feature_tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {store.feature_tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    backgroundColor: "rgba(212,175,55,0.08)",
                    border: "1px solid rgba(212,175,55,0.18)",
                    color: "rgba(168,130,20,0.95)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function EditorialCardSkeleton() {
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-white"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.06)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <div className="flex gap-3 p-3 pl-4">
        <Skeleton className="size-[120px] shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-1 pt-1">
            <Skeleton className="h-3 w-10 rounded-full" />
            <Skeleton className="h-3 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination — editorial styling
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
              currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
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
                    : { color: "#1b2528", borderColor: "rgba(27,37,40,0.08)" }
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
// Filter bottom sheet
// ---------------------------------------------------------------------------

function FilterSheet({
  open,
  onClose,
  areas,
  categories,
  currentArea,
  currentCategory,
  onAreaChange,
  onCategoryChange,
  onClear,
}: {
  open: boolean;
  onClose: () => void;
  areas: Area[];
  categories: Category[];
  currentArea: string;
  currentCategory: string;
  onAreaChange: (slug: string) => void;
  onCategoryChange: (slug: string) => void;
  onClear: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-t-3xl bg-white p-5"
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300" />
        <div className="mb-4 flex items-center justify-between">
          <h3
            className="text-lg font-bold"
            style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
          >
            条件を絞り込む
          </h3>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X className="size-5" style={{ color: "#1b2528" }} />
          </button>
        </div>

        <div className="mb-5">
          <div
            className="mb-2 text-xs font-semibold"
            style={{ color: "rgba(27,37,40,0.55)", letterSpacing: "0.05em" }}
          >
            エリア
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full px-3 py-1.5 text-xs"
              style={
                !currentArea
                  ? {
                      backgroundColor: "rgba(212,175,55,0.1)",
                      border: "1px solid #D4AF37",
                      color: "#D4AF37",
                    }
                  : { border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }
              }
              onClick={() => onAreaChange("")}
            >
              すべて
            </button>
            {areas.map((a) => (
              <button
                key={a.id}
                className="rounded-full px-3 py-1.5 text-xs"
                style={
                  currentArea === a.slug
                    ? {
                        backgroundColor: "rgba(212,175,55,0.1)",
                        border: "1px solid #D4AF37",
                        color: "#D4AF37",
                      }
                    : { border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }
                }
                onClick={() => onAreaChange(a.slug)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div
            className="mb-2 text-xs font-semibold"
            style={{ color: "rgba(27,37,40,0.55)", letterSpacing: "0.05em" }}
          >
            カテゴリ
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-full px-3 py-1.5 text-xs"
              style={
                !currentCategory
                  ? {
                      backgroundColor: "rgba(212,175,55,0.1)",
                      border: "1px solid #D4AF37",
                      color: "#D4AF37",
                    }
                  : { border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }
              }
              onClick={() => onCategoryChange("")}
            >
              すべて
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                className="rounded-full px-3 py-1.5 text-xs"
                style={
                  currentCategory === c.slug
                    ? {
                        backgroundColor: "rgba(212,175,55,0.1)",
                        border: "1px solid #D4AF37",
                        color: "#D4AF37",
                      }
                    : { border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }
                }
                onClick={() => onCategoryChange(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 -mx-5 -mb-5 flex gap-3 border-t bg-white px-5 py-4">
          <button
            className="flex-1 rounded-full py-3 text-sm font-medium"
            style={{
              border: "1px solid rgba(27,37,40,0.12)",
              color: "#1b2528",
            }}
            onClick={onClear}
          >
            クリア
          </button>
          <button
            className="flex-1 rounded-full py-3 text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            onClick={onClose}
          >
            結果を見る
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const SORT_TABS = [
  { id: "experience_guaranteed", label: "体験確約" },
  { id: "hourly_desc", label: "時給順" },
  { id: "popular", label: "評価順" },
  { id: "newest", label: "新着" },
];

export default function StoreListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentArea = searchParams.get("area") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "experience_guaranteed";
  const currentQuery = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [showFilter, setShowFilter] = useState(false);

  const [stores, setStores] = useState<PaginatedResponse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSearchInput(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/areas").then((res) => res.json()),
      fetch("/api/categories").then((res) => res.json()),
    ])
      .then(([areasData, categoriesData]) => {
        if (!cancelled) {
          setAreas(areasData);
          setCategories(categoriesData);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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

  const handlePageChange = useCallback(
    (page: number) => {
      updateParam("page", String(page), false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [updateParam]
  );

  const handleResetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setSearchInput("");
  }, [setSearchParams]);

  const total = stores?.total ?? 0;
  const storeList = stores?.data ?? [];
  const isEmpty = !loading && storeList.length === 0;
  const isFiltered = currentArea || currentCategory || currentQuery;

  const areaName = areas.find((a) => a.slug === currentArea)?.name;
  const categoryName = categories.find((c) => c.slug === currentCategory)?.name;

  return (
    <div className="min-h-screen pb-[68px]" style={{ backgroundColor: "#f5f5f5" }}>
      {/* ----------------------------------------------------------- */}
      {/* Header — single row, Recta. brand + login                   */}
      {/* ----------------------------------------------------------- */}
      <header
        className="sticky top-0 z-30 border-b bg-white"
        style={{ borderColor: "rgba(27,37,40,0.06)" }}
      >
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight"
            style={{ color: "#1b2528", fontFamily: "'Outfit', 'Noto Sans JP', sans-serif" }}
          >
            Recta<span style={{ color: "#D4AF37" }}>.</span>
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
            style={{
              border: "1px solid rgba(27,37,40,0.12)",
              color: "#1b2528",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
              <path
                d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </svg>
            ログイン
          </Link>
        </div>
      </header>

      {/* ----------------------------------------------------------- */}
      {/* AI Chat — directly under header                             */}
      {/* ----------------------------------------------------------- */}
      <div className="mx-auto max-w-3xl">
        <AiChatPanel pageType="list" />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Filter bar — chips + sort tabs                              */}
      {/* ----------------------------------------------------------- */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            onClick={() => setShowFilter(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={
              currentArea
                ? {
                    backgroundColor: "rgba(212,175,55,0.08)",
                    border: "1px solid #D4AF37",
                    color: "#D4AF37",
                  }
                : {
                    backgroundColor: "white",
                    border: "1px solid rgba(27,37,40,0.1)",
                    color: "#1b2528",
                  }
            }
          >
            <span style={{ color: currentArea ? "#D4AF37" : "rgba(27,37,40,0.5)" }}>
              エリア
            </span>
            {areaName && <span className="font-semibold">{areaName}</span>}
            <ChevronDown className="size-3" />
          </button>
          <button
            onClick={() => setShowFilter(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
            style={
              currentCategory
                ? {
                    backgroundColor: "rgba(212,175,55,0.08)",
                    border: "1px solid #D4AF37",
                    color: "#D4AF37",
                  }
                : {
                    backgroundColor: "white",
                    border: "1px solid rgba(27,37,40,0.1)",
                    color: "#1b2528",
                  }
            }
          >
            <span style={{ color: currentCategory ? "#D4AF37" : "rgba(27,37,40,0.5)" }}>
              カテゴリ
            </span>
            {categoryName && <span className="font-semibold">{categoryName}</span>}
            <ChevronDown className="size-3" />
          </button>
        </div>

        {/* Sort tabs — gold underline */}
        <div
          className="mt-3 flex gap-5 overflow-x-auto border-b text-xs"
          style={{ borderColor: "rgba(27,37,40,0.06)" }}
        >
          {SORT_TABS.map((s) => {
            const active = currentSort === s.id;
            return (
              <button
                key={s.id}
                onClick={() => updateParam("sort", s.id)}
                className="relative whitespace-nowrap pb-2.5 pt-1 font-medium"
                style={{
                  color: active ? "#D4AF37" : "rgba(27,37,40,0.5)",
                }}
              >
                {s.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-px h-0.5"
                    style={{
                      background: "linear-gradient(90deg, #D4AF37, #c8960c)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Count                                                       */}
      {/* ----------------------------------------------------------- */}
      <div className="mx-auto flex max-w-3xl items-baseline gap-1 px-4 pt-4">
        {searchInput && (
          <button
            onClick={() => {
              setSearchInput("");
              updateParam("q", "");
            }}
            className="mr-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]"
            style={{
              backgroundColor: "rgba(212,175,55,0.08)",
              color: "#D4AF37",
            }}
          >
            「{searchInput}」 <X className="size-3" />
          </button>
        )}
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color: "#D4AF37", fontFamily: "'Outfit', sans-serif" }}
        >
          {total.toLocaleString()}
        </span>
        <span className="text-xs font-medium" style={{ color: "#1b2528" }}>
          件
        </span>
        {isFiltered && (
          <span className="ml-1 text-[11px]" style={{ color: "rgba(27,37,40,0.4)" }}>
            のお店
          </span>
        )}
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Results                                                     */}
      {/* ----------------------------------------------------------- */}
      <div className="mx-auto max-w-3xl px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <EditorialCardSkeleton key={i} />
            ))}
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(212,175,55,0.1)" }}
            >
              <SearchIcon className="size-7" style={{ color: "#D4AF37" }} />
            </div>
            <p
              className="mb-2 text-base font-bold"
              style={{
                color: "#1b2528",
                fontFamily: "'Outfit', 'Noto Sans JP', sans-serif",
              }}
            >
              条件に合うお店が見つかりませんでした
            </p>
            <p className="mb-6 text-xs" style={{ color: "rgba(27,37,40,0.5)" }}>
              検索条件を変更してお試しください
            </p>
            <button
              onClick={handleResetFilters}
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              フィルターをリセット
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {storeList.map((store) => (
                <EditorialStoreCard key={store.id} store={store} />
              ))}
            </div>

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

      {/* Recently viewed */}
      <div className="mx-auto max-w-3xl pb-4">
        <RecentlyViewedStores variant="flush" />
      </div>

      {/* Footer */}
      <Footer />

      {/* Bottom Tab Bar */}
      <BottomTabBar />

      {/* Filter sheet */}
      <FilterSheet
        open={showFilter}
        onClose={() => setShowFilter(false)}
        areas={areas}
        categories={categories}
        currentArea={currentArea}
        currentCategory={currentCategory}
        onAreaChange={(slug) => updateParam("area", slug)}
        onCategoryChange={(slug) => updateParam("category", slug)}
        onClear={() => {
          updateParam("area", "");
          updateParam("category", "");
        }}
      />
    </div>
  );
}
