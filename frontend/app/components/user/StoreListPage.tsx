import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router";
import { Star, ChevronDown, Search as SearchIcon, X, SlidersHorizontal, Check } from "lucide-react";
import {
  addToCompareTray,
  COMPARE_MAX_ITEMS,
  getCompareTray,
  removeFromCompareTray,
  subscribeCompareTray,
  type CompareTrayItem,
} from "~/lib/compare-tray";
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
import RecentlyViewedStores from "~/components/user/shared/RecentlyViewedStores";
import AiChatPanel from "~/components/user/AiChatPanel";
import { Breadcrumb } from "~/components/user/shared/Breadcrumb";
import { LUXE } from "~/lib/luxe-tokens";

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
  /** 体入タイプ: 'same_day' (体験確約) / 'normal' (体入可能) / 'none' (体入なし) */
  trial_type: "same_day" | "normal" | "none";
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

interface Area { id: number; name: string; slug: string; tier: number; }
interface Category { id: number; name: string; slug: string; color: string; }

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
  const url = typeof image === "string" ? image : image.url;
  // 空白のみ / 空文字は未設定扱いにし、フォールバックを出す。
  return url && url.trim() !== "" ? url : undefined;
}

// ---------------------------------------------------------------------------
// Editorial list card — 1-column compact, full-height gold accent on the left
// ---------------------------------------------------------------------------

function EditorialStoreCard({
  store,
  tray,
}: {
  store: Store;
  tray: CompareTrayItem[];
}) {
  const imageUrl = store.images && store.images.length > 0 ? getImageUrl(store.images[0]) : undefined;
  // src が壊れて読めない場合 (ファイル削除済み等) も頭文字フォールバックへ退避。
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = imageUrl && !imgFailed;
  const rating = store.average_rating ?? 0;
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const inTray = tray.some((t) => t.id === store.id);
  const trayFull = tray.length >= COMPARE_MAX_ITEMS;

  const toggleCompare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (inTray) {
      removeFromCompareTray(store.id);
      return;
    }
    if (trayFull) return; // 4件 cap、disabled 表示
    addToCompareTray({
      id: store.id,
      name: store.name,
      area: store.area,
      category: store.category,
      image_url: imageUrl,
    });
  };

  return (
    <Link
      to={`/stores/${store.id}`}
      className="group relative flex overflow-hidden rounded-xl bg-white transition-shadow active:scale-[0.99]"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.04)",
        border: inTray ? "1px solid #D4AF37" : "1px solid rgba(27,37,40,0.06)",
      }}
    >
      {/* Full-height gold accent bar */}
      <span
        aria-hidden
        className="w-[3px] shrink-0"
        style={{ background: "linear-gradient(180deg, #D4AF37 0%, #c8960c 100%)" }}
      />

      <div className="flex flex-1 gap-3 p-2.5">
        {/* Poster */}
        <div className="relative size-[96px] shrink-0 overflow-hidden rounded-lg">
          {showImage ? (
            <img
              src={imageUrl}
              alt={store.name}
              loading="lazy"
              decoding="async"
              width={96}
              height={96}
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
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
              className="absolute left-1 top-1 rounded px-1.5 py-0.5 text-[8.5px] font-semibold text-white"
              style={{ backgroundColor: "rgba(200,96,128,0.9)" }}
            >
              {store.category}
            </span>
          )}
          {/* 体入リボン — 体験確約はゴールド、体入可能は控えめ。体入なしはなし。 */}
          {store.trial_type === "same_day" && (
            <span
              className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[8.5px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              体験確約
            </span>
          )}
          {store.trial_type === "normal" && (
            <span
              className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[8.5px] font-bold text-white"
              style={{ background: "rgba(27,37,40,0.6)" }}
            >
              体入あり
            </span>
          )}
          {/* Compare checkbox — 画像の右上に重ねる（背面の評価★を妨げない位置） */}
          <button
            type="button"
            onClick={toggleCompare}
            disabled={!inTray && trayFull}
            aria-pressed={inTray}
            aria-label={
              inTray
                ? `${store.name} を比較から外す`
                : trayFull
                  ? `比較は最大${COMPARE_MAX_ITEMS}件まで`
                  : `${store.name} を比較に追加`
            }
            title={!inTray && trayFull ? `比較は最大${COMPARE_MAX_ITEMS}件まで` : undefined}
            className="absolute top-1 right-1 z-10 inline-flex items-center justify-center rounded-md active:scale-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              width: 22,
              height: 22,
              background: inTray ? "#D4AF37" : "rgba(255,255,255,0.92)",
              border: inTray ? "1px solid #D4AF37" : "1px solid rgba(27,37,40,0.15)",
              color: inTray ? "white" : "rgba(27,37,40,0.55)",
              cursor: !inTray && trayFull ? "not-allowed" : "pointer",
              boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            <Check size={12} aria-hidden style={{ opacity: inTray ? 1 : 0.85 }} />
          </button>
        </div>

        {/* Meta */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-2">
            <h3
              className="truncate text-[14px] font-bold leading-tight"
              style={{ color: "#1b2528" }}
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
            <p className="mt-0.5 text-[10.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>
              ⌖ {store.area}
            </p>
          )}

          {/* Hourly — 片方しか無いとき "¥0 〜" にしないように、欠けてる側は
              空白にしてレンジ「〜¥6,000」「¥4,000〜」を表現する。最低額と
              最高額で色/サイズが違うと「片方が安そう」「片方が強調されてる」
              ように読まれるので、ラベル以外は同じ色・同じウェイトで揃える。 */}
          {(store.hourly_min || store.hourly_max) && (
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[9.5px]" style={{ color: "rgba(27,37,40,0.5)" }}>体入時給</span>
              {store.hourly_min ? (
                <span
                  className="text-[14px] font-bold tabular-nums leading-none"
                  style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
                >
                  ¥{store.hourly_min.toLocaleString()}
                </span>
              ) : null}
              {store.hourly_max && store.hourly_max !== store.hourly_min && (
                <>
                  <span className="text-[9.5px]" style={{ color: "rgba(27,37,40,0.35)" }}>〜</span>
                  <span
                    className="text-[14px] font-bold tabular-nums leading-none"
                    style={{ color: "#1b2528", fontFamily: "'Outfit', sans-serif" }}
                  >
                    ¥{store.hourly_max.toLocaleString()}
                  </span>
                </>
              )}
              {store.hourly_min && !store.hourly_max && (
                <span className="text-[9.5px]" style={{ color: "rgba(27,37,40,0.35)" }}>〜</span>
              )}
            </div>
          )}

          {/* Reviews count + tags */}
          <div className="mt-auto flex flex-wrap items-center gap-1 pt-1.5">
            {rating > 0 && (
              <>
                <div className="flex items-center">
                  {Array.from({ length: fullStars }).map((_, i) => (
                    <Star key={`f-${i}`} className="size-[9px]" style={{ color: "#D4AF37", fill: "#D4AF37" }} />
                  ))}
                  {hasHalf && (
                    <Star className="size-[9px]" style={{ color: "#D4AF37", fill: "#D4AF37", opacity: 0.5 }} />
                  )}
                  {Array.from({ length: emptyStars }).map((_, i) => (
                    <Star key={`e-${i}`} className="size-[9px]" style={{ color: "rgba(212,175,55,0.3)", fill: "none" }} />
                  ))}
                </div>
                {store.reviews_count !== undefined && (
                  <span className="text-[9px]" style={{ color: "rgba(27,37,40,0.4)" }}>
                    ({store.reviews_count}件)
                  </span>
                )}
              </>
            )}
            {store.feature_tags?.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full px-1.5 py-px text-[9px] font-medium"
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
        </div>
      </div>
    </Link>
  );
}

function EditorialCardSkeleton() {
  return (
    <div
      className="relative flex overflow-hidden rounded-xl bg-white"
      style={{
        boxShadow: "0 4px 14px rgba(0,0,0,0.05)",
        border: "1px solid rgba(27,37,40,0.06)",
      }}
    >
      <span className="w-[3px] shrink-0 bg-gradient-to-b from-[#D4AF37] to-[#c8960c]" />
      <div className="flex flex-1 gap-3 p-2.5">
        <Skeleton className="size-[96px] shrink-0 rounded-lg" />
        <div className="flex-1 space-y-2 py-1">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-2.5 w-1/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <div className="flex gap-1 pt-0.5">
            <Skeleton className="h-2.5 w-10 rounded-full" />
            <Skeleton className="h-2.5 w-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function StorePagination({
  currentPage, lastPage, onPageChange,
}: {
  currentPage: number; lastPage: number; onPageChange: (page: number) => void;
}) {
  if (lastPage <= 1) return null;
  const pages: (number | "ellipsis")[] = [];
  const delta = 2;
  for (let i = 1; i <= lastPage; i++) {
    if (i === 1 || i === lastPage || (i >= currentPage - delta && i <= currentPage + delta)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "ellipsis") {
      pages.push("ellipsis");
    }
  }
  return (
    <Pagination className="mt-6">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => { e.preventDefault(); if (currentPage > 1) onPageChange(currentPage - 1); }}
            className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            style={{ color: "rgba(27,37,40,0.6)" }}
          />
        </PaginationItem>
        {pages.map((page, idx) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}><PaginationEllipsis /></PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href="#"
                isActive={page === currentPage}
                onClick={(e) => { e.preventDefault(); onPageChange(page); }}
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
            onClick={(e) => { e.preventDefault(); if (currentPage < lastPage) onPageChange(currentPage + 1); }}
            className={currentPage >= lastPage ? "pointer-events-none opacity-50" : "cursor-pointer"}
            style={{ color: "rgba(27,37,40,0.6)" }}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

// ---------------------------------------------------------------------------
// Filter bottom sheet — slides up, body-scroll-locked, footer doesn't overlap
// ---------------------------------------------------------------------------

function FilterSheet({
  open, onClose, areas, categories, currentArea, currentCategory,
  onAreaChange, onCategoryChange, onClear,
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
  // Mount management for transition
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Trigger transition on next frame
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = "hidden";
    } else {
      setVisible(false);
      document.body.style.overflow = "";
      const t = setTimeout(() => setMounted(false), 280);
      return () => clearTimeout(t);
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{
        backgroundColor: visible ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        transition: "background-color 250ms ease",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-t-3xl bg-white shadow-2xl"
        style={{
          maxHeight: "82vh",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3 pb-1">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
          <div className="flex items-center justify-between">
            <h3
              className="text-base font-bold"
              style={{ color: "#1b2528" }}
            >
              条件を絞り込む
            </h3>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-gray-100"
              aria-label="閉じる"
            >
              <X className="size-4" style={{ color: "#1b2528" }} />
            </button>
          </div>
        </div>

        {/* Body — scrollable, with padding-bottom equal to footer height */}
        <div className="flex-1 overflow-y-auto px-5 pb-6" style={{ paddingBottom: "92px" }}>
          <div className="mt-3">
            <div
              className="mb-2 text-[11px] font-semibold uppercase"
              style={{ color: "rgba(27,37,40,0.55)", letterSpacing: "0.08em" }}
            >
              エリア
            </div>
            <div className="flex flex-wrap gap-1.5">
              <SheetChip active={!currentArea} onClick={() => onAreaChange("")}>すべて</SheetChip>
              {areas.map((a) => (
                <SheetChip
                  key={a.id}
                  active={currentArea === a.slug}
                  onClick={() => onAreaChange(a.slug)}
                >
                  {a.name}
                </SheetChip>
              ))}
            </div>
          </div>

          <div className="mt-5">
            <div
              className="mb-2 text-[11px] font-semibold uppercase"
              style={{ color: "rgba(27,37,40,0.55)", letterSpacing: "0.08em" }}
            >
              カテゴリ
            </div>
            <div className="flex flex-wrap gap-1.5">
              <SheetChip active={!currentCategory} onClick={() => onCategoryChange("")}>すべて</SheetChip>
              {categories.map((c) => (
                <SheetChip
                  key={c.id}
                  active={currentCategory === c.slug}
                  onClick={() => onCategoryChange(c.slug)}
                >
                  {c.name}
                </SheetChip>
              ))}
            </div>
          </div>
        </div>

        {/* Footer — absolute over the body so chips can scroll under */}
        <div
          className="absolute inset-x-0 bottom-0 flex gap-2 border-t bg-white px-5 py-3"
          style={{ borderColor: "rgba(27,37,40,0.08)" }}
        >
          <button
            className="flex-1 rounded-full py-2.5 text-sm font-medium"
            style={{ border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }}
            onClick={onClear}
          >
            クリア
          </button>
          <button
            className="flex-1 rounded-full py-2.5 text-sm font-semibold text-white"
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

function SheetChip({
  active, children, onClick,
}: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-xs"
      style={
        active
          ? {
              backgroundColor: "rgba(212,175,55,0.1)",
              border: "1px solid #D4AF37",
              color: "#D4AF37",
              fontWeight: 600,
            }
          : { border: "1px solid rgba(27,37,40,0.12)", color: "#1b2528" }
      }
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

const SORT_TABS = [
  { id: "priority", label: "おすすめ順" },
  { id: "experience_guaranteed", label: "体験確約" },
  { id: "hourly_desc", label: "時給順" },
  { id: "popular", label: "評価順" },
  { id: "newest", label: "新着" },
];

export default function StoreListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const currentArea = searchParams.get("area") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentSort = searchParams.get("sort") || "priority";
  const currentQuery = searchParams.get("q") || "";

  const [searchInput, setSearchInput] = useState(currentQuery);
  const [showFilter, setShowFilter] = useState(false);

  const [stores, setStores] = useState<PaginatedResponse | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // API 取得失敗 (ネットワーク/サーバエラー) を「0 件」と区別するためのフラグ。
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // 比較トレイ。localStorage と同期し、SelectionBar とカードのチェック状態の SSoT。
  const [compareTray, setCompareTray] = useState<CompareTrayItem[]>([]);

  useEffect(() => {
    setCompareTray(getCompareTray());
    return subscribeCompareTray(() => setCompareTray(getCompareTray()));
  }, []);

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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetch(buildStoreApiUrl(searchParams))
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PaginatedResponse) => {
        if (!cancelled) {
          setStores(data);
          setLoading(false);
        }
      })
      .catch(() => {
        // 取得失敗は「0 件」ではなくエラーとして扱い、専用表示・再試行を出す。
        if (!cancelled) { setStores(null); setLoadError(true); setLoading(false); }
      });
    return () => { cancelled = true; };
  }, [searchParams, reloadKey]);

  const updateParam = useCallback(
    (key: string, value: string, resetPage = true) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (resetPage && key !== "page") next.set("page", "1");
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
  const isEmpty = !loading && !loadError && storeList.length === 0;

  const areaName = areas.find((a) => a.slug === currentArea)?.name;
  const categoryName = categories.find((c) => c.slug === currentCategory)?.name;
  const activeChipsCount = (currentArea ? 1 : 0) + (currentCategory ? 1 : 0);

  return (
    <>
      {/* ----------------------------------------------------------- */}
      {/* Editorial poster hero — "STORES / お店一覧" (with login)    */}
      {/* ----------------------------------------------------------- */}
      <section
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1b2528 0%, #243034 60%, #1b2528 100%)",
        }}
      >
        {/* Gold glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            top: "-30%",
            right: "-10%",
            width: "60%",
            height: "160%",
            background: "radial-gradient(ellipse at center, rgba(212,175,55,0.22) 0%, transparent 60%)",
          }}
        />
        {/* Pink accent */}
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            bottom: "-40%",
            left: "-10%",
            width: "55%",
            height: "120%",
            background: "radial-gradient(ellipse at center, rgba(200,96,128,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative px-5 pb-6 pt-6">
          <div
            className="text-[10px] font-bold uppercase"
            style={{ color: "rgba(212,175,55,0.85)", fontFamily: "'Outfit', sans-serif", letterSpacing: "0.22em" }}
          >
            STORES
          </div>
          <div className="mt-1 flex items-end justify-between gap-4">
            <h1
              className="text-[26px] font-bold leading-none text-white"
            >
              お店一覧
            </h1>
            <div className="flex items-baseline gap-1">
              <span
                className="text-[28px] font-bold leading-none tabular-nums"
                style={{ color: "#D4AF37", fontFamily: "'Outfit', sans-serif" }}
              >
                {total.toLocaleString()}
              </span>
              <span className="text-[11px] font-medium text-white/70">件</span>
            </div>
          </div>
          {/* Gold underline */}
          <div className="mt-3 flex items-center gap-2">
            <span className="size-1 rounded-full" style={{ backgroundColor: "#D4AF37" }} />
            <span
              className="h-px flex-1"
              style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.7), rgba(212,175,55,0))" }}
            />
            <span
              className="text-[10px] font-light text-white/55"
              style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: "0.14em" }}
            >
              Rectaで探す、理想の一店
            </span>
          </div>
        </div>
      </section>

      <Breadcrumb
        items={[
          { label: "ホーム", to: "/" },
          { label: "店舗一覧" },
        ]}
      />

      {/* ----------------------------------------------------------- */}
      {/* AI Chat — breathing room from hero                          */}
      {/* ----------------------------------------------------------- */}
      <div className="px-4 pt-4">
        <AiChatPanel pageType="list" />
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Action bar — single filter button + active chips counter    */}
      {/* ----------------------------------------------------------- */}
      <div className="flex items-center gap-2 px-4 pt-5">
        <button
          onClick={() => setShowFilter(true)}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
          style={{
            backgroundColor: activeChipsCount > 0 ? "rgba(212,175,55,0.08)" : "white",
            border: `1px solid ${activeChipsCount > 0 ? "#D4AF37" : "rgba(27,37,40,0.1)"}`,
            color: activeChipsCount > 0 ? "#D4AF37" : "#1b2528",
          }}
        >
          <SlidersHorizontal className="size-3.5" />
          絞り込み
          {activeChipsCount > 0 && (
            <span
              className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              {activeChipsCount}
            </span>
          )}
        </button>
        {/* Active chips (compact, removable) */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
          {areaName && (
            <button
              onClick={() => updateParam("area", "")}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(212,175,55,0.1)", color: "#D4AF37" }}
            >
              {areaName} <X className="size-3" />
            </button>
          )}
          {categoryName && (
            <button
              onClick={() => updateParam("category", "")}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(200,96,128,0.1)", color: "rgba(200,96,128,0.9)" }}
            >
              {categoryName} <X className="size-3" />
            </button>
          )}
          {currentQuery && (
            <button
              onClick={() => { setSearchInput(""); updateParam("q", ""); }}
              className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium"
              style={{ backgroundColor: "rgba(27,37,40,0.06)", color: "rgba(27,37,40,0.7)" }}
            >
              「{currentQuery}」 <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Sort tabs — gold underline                                  */}
      {/* ----------------------------------------------------------- */}
      <div className="px-4">
        <div
          className="mt-3 flex gap-5 overflow-x-auto overflow-y-hidden border-b text-xs"
          style={{ borderColor: "rgba(27,37,40,0.06)" }}
        >
          {SORT_TABS.map((s) => {
            const active = currentSort === s.id;
            return (
              <button
                key={s.id}
                onClick={() => updateParam("sort", s.id)}
                className="relative whitespace-nowrap pb-2 pt-1 font-medium"
                style={{ color: active ? "#D4AF37" : "rgba(27,37,40,0.5)" }}
              >
                {s.label}
                {active && (
                  <span
                    className="absolute inset-x-0 -bottom-px h-0.5"
                    style={{ background: "linear-gradient(90deg, #D4AF37, #c8960c)" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Results                                                     */}
      {/* ----------------------------------------------------------- */}
      <div className="px-3 pt-4 pb-6">
        {loading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <EditorialCardSkeleton key={i} />
            ))}
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(212,175,55,0.1)" }}
            >
              <SearchIcon className="size-7" style={{ color: "#D4AF37" }} />
            </div>
            <p className="mb-2 text-base font-bold" style={{ color: "#1b2528" }}>
              お店の情報を取得できませんでした
            </p>
            <p className="mb-6 text-xs" style={{ color: "rgba(27,37,40,0.5)" }}>
              通信環境をご確認のうえ、再度お試しください
            </p>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-full px-6 py-2.5 text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg, #D4AF37, #c8960c)" }}
            >
              再読み込み
            </button>
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div
              className="mb-4 flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(212,175,55,0.1)" }}
            >
              <SearchIcon className="size-7" style={{ color: "#D4AF37" }} />
            </div>
            <p
              className="mb-2 text-base font-bold"
              style={{ color: "#1b2528" }}
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
            <div className="space-y-2.5">
              {storeList.map((store) => (
                <EditorialStoreCard key={store.id} store={store} tray={compareTray} />
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
      <div className="pb-4">
        <RecentlyViewedStores variant="flush" />
      </div>

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
    </>
  );
}
