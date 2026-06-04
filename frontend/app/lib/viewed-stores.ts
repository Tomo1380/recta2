/**
 * Recently-viewed stores (localStorage helpers).
 *
 * Stored under `recta:viewed-stores` as JSON array, newest first, max 10 items.
 * Records are kept light so we can render `RecentlyViewedStores` without an extra
 * API round-trip even when the user is offline.
 */

const STORAGE_KEY = "recta:viewed-stores";
const MAX_ITEMS = 10;

export interface ViewedStore {
  id: number;
  name: string;
  area?: string;
  category?: string;
  image_url?: string;
  hourly_min?: number;
  hourly_max?: number;
  trial_hourly_min?: number | string | null;
  trial_hourly_max?: number | string | null;
  /** ms epoch — used for ordering and pruning */
  viewed_at: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getViewedStores(): ViewedStore[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is ViewedStore =>
        item && typeof item.id === "number" && typeof item.name === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Push (or refresh) a store to the front of the list.
 * Dedupes by id, keeps at most {@link MAX_ITEMS} entries.
 */
export function pushViewedStore(store: Omit<ViewedStore, "viewed_at">): void {
  if (!isBrowser()) return;
  try {
    const current = getViewedStores().filter((s) => s.id !== store.id);
    const next: ViewedStore[] = [
      { ...store, viewed_at: Date.now() },
      ...current,
    ].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage may be unavailable (private mode quota etc.) — ignore
  }
}

export function clearViewedStores(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
