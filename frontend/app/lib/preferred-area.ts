/**
 * Preferred area (localStorage)
 *
 * トップページで `/stores?area=...` リンクをタップした際の slug を保存して、
 * 次回トップ訪問時にピックアップ店舗をそのエリアで優先表示するために使う。
 */

const STORAGE_KEY = "recta:preferred-area";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPreferredArea(): string | null {
  if (!isBrowser()) return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v && v.length > 0 && v.length < 64 ? v : null;
  } catch {
    return null;
  }
}

export function setPreferredArea(slug: string | null | undefined): void {
  if (!isBrowser()) return;
  try {
    if (!slug) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    // localStorage 不可なら諦める
  }
}
