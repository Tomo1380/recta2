/**
 * Compare tray — 「比較に追加した店舗ID」の localStorage 保持。
 *
 * フィードバック原文「即決できない人に並べて選ばせる」を受けて、
 * **2〜4件**まで選ばせて横スクロール比較表で比較する UX に進化させた。
 * 上限は心理学的な比較限界 (Miller's 4±1) と、スマホ幅で横スクロール
 * 3 タップで全件見える上限から 4 件とする。
 *
 * 一覧ページのチェックボックス + 追従バー + 比較画面の「追加」スロット
 * から共通で読み書きされる SSoT。
 *
 * RecentlyViewedStores (viewed-stores.ts) と異なり、こちらは
 * 「ユーザーが意図的に比較対象として選んだ店舗」のみ保持する。
 */

const STORAGE_KEY = "recta:compare-tray";
export const COMPARE_MAX_ITEMS = 4;
const EVENT_NAME = "recta:compare-tray-changed";

export interface CompareTrayItem {
  id: number;
  name: string;
  area?: string;
  category?: string;
  image_url?: string;
  /** ms epoch */
  added_at: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitChange() {
  if (!isBrowser()) return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

/**
 * 攻撃者が DevTools で localStorage に javascript:/data: URL を仕込んでも
 * `<img src>` に到達しないように、image_url は http(s) または内部 storage パスのみ許可。
 */
function isSafeImageUrl(value: unknown): value is string {
  return typeof value === "string" && /^(https?:\/\/|\/storage\/)/.test(value);
}

export function getCompareTray(): CompareTrayItem[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is CompareTrayItem =>
          item && typeof item.id === "number" && typeof item.name === "string",
      )
      .map((item) => ({
        ...item,
        // 不正な image_url は drop（カードは画像なしフォールバックで描画される）
        image_url: isSafeImageUrl(item.image_url) ? item.image_url : undefined,
      }));
  } catch {
    return [];
  }
}

/**
 * 既に同じIDがあれば何もしない（重複追加禁止）。
 * 容量を超えたら最古を弾く。
 * @returns 追加後の tray
 */
export function addToCompareTray(store: Omit<CompareTrayItem, "added_at">): CompareTrayItem[] {
  if (!isBrowser()) return [];
  const current = getCompareTray();
  if (current.some((s) => s.id === store.id)) return current;
  const next = [...current, { ...store, added_at: Date.now() }].slice(-COMPARE_MAX_ITEMS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  } catch {
    // ignore quota error
  }
  return next;
}

export function removeFromCompareTray(id: number): CompareTrayItem[] {
  if (!isBrowser()) return [];
  const next = getCompareTray().filter((s) => s.id !== id);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    emitChange();
  } catch {
    // ignore
  }
  return next;
}

export function clearCompareTray(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    emitChange();
  } catch {
    // ignore
  }
}

/**
 * Compare tray の変更を購読する。
 * 別タブからの storage イベント + 同一タブからの CustomEvent の両方を拾う。
 */
export function subscribeCompareTray(listener: () => void): () => void {
  if (!isBrowser()) return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT_NAME, listener as EventListener);
  };
}
