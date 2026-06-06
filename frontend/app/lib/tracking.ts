/**
 * アクセス解析クライアント（FB 2026-06-05 / 解析基盤）。
 *
 * PV と LINE 追加クリックを navigator.sendBeacon でバックエンドへ送る。
 * すべて client-only（SSR 中は no-op）。失敗しても UX に影響させない。
 *
 * - PV         → POST /api/track/pv      （useTrackPageView フックで各ページから）
 * - LINEクリック → POST /api/track/line-click（line.ts の openLineFriendAdd から）
 *
 * 匿名ID `recta_aid` は localStorage に保持し、ユニーク訪問の概算に使う
 * （個人を特定しない・cookie 同意不要なランダムUUID）。
 */
import { useEffect } from "react";

export type TrackPageType =
  | "home"
  | "store"
  | "column"
  | "area_landing"
  | "category_landing"
  | "store_list"
  | "relocate"
  | "glossary"
  | "other";

export interface PageViewPayload {
  page_type: TrackPageType;
  store_id?: number | null;
  article_id?: number | null;
  area?: string | null;
}

export interface LineClickPayload {
  source?: string | null;
  page_type?: TrackPageType | null;
  store_id?: number | null;
  article_id?: number | null;
  area?: string | null;
}

const ANON_KEY = "recta_aid";

function getAnonId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `aid_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return null; // localStorage 不可（プライベートモード等）でも計測を諦めるだけ
  }
}

function send(path: string, body: object): void {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    ...body,
    session_id: getAnonId(),
    path: window.location.pathname,
  });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(path, blob);
      return;
    }
  } catch {
    /* fall through to fetch */
  }

  // sendBeacon 不可環境のフォールバック（keepalive で離脱時も送る）
  void fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

/**
 * 「今いる画面」のアンビエント・コンテキスト。
 *
 * 各ページの useTrackPageView が現在の画面（page_type / store_id 等）をここに保存し、
 * 文脈を持たないグローバル CTA（右下FAB・下タブ）が押されたときに自動で拾う。
 * これにより「店舗詳細を見ながら右下FABでLINE追加」が店舗別に帰属できる。
 *
 * stale 防止: 記録時の pathname を持ち、現在の pathname と一致するときだけ信頼する。
 * 一致しなければ（計測フック未設置ページへ遷移後など）pathname から page_type のみ推定する。
 */
let ambient: (PageViewPayload & { path: string }) | null = null;

function inferPageType(path: string): TrackPageType {
  if (path === "/") return "home";
  if (path === "/stores") return "store_list";
  if (/^\/stores\/[^/]+/.test(path)) return "store";
  if (/^\/columns\/[^/]+/.test(path)) return "column";
  if (path === "/columns") return "other";
  if (/^\/jobs\/areas\//.test(path)) return "area_landing";
  if (/^\/jobs\/categories\//.test(path)) return "category_landing";
  if (path.startsWith("/relocate")) return "relocate";
  if (path.startsWith("/glossary")) return "glossary";
  return "other";
}

/** グローバル CTA 用に「今いる画面」の文脈を返す。 */
export function getAmbientContext(): LineClickPayload {
  if (typeof window === "undefined") return {};
  const path = window.location.pathname;
  if (ambient && ambient.path === path) {
    return {
      page_type: ambient.page_type,
      store_id: ambient.store_id ?? null,
      article_id: ambient.article_id ?? null,
      area: ambient.area ?? null,
    };
  }
  // 計測フック未設置ページ: pathname から種別だけ推定（ID は無し）
  return { page_type: inferPageType(path) };
}

/**
 * LINE 追加クリックを記録する（サイト内 CTA から）。
 * 「今いる画面」を下地に、CTA が明示した文脈（店舗詳細の店舗ID等）で上書きする。
 */
export function trackLineClick(payload: LineClickPayload): void {
  send("/api/track/line-click", { ...getAmbientContext(), ...payload });
}

/**
 * ページ表示（PV）を 1 回記録するフック。
 * SSR/CSR どちらの遷移でも、payload のキーが変わったタイミングで 1 回送る。
 * 同時に「今いる画面」をアンビエント・コンテキストへ保存する。
 */
export function useTrackPageView(payload: PageViewPayload): void {
  const key = `${payload.page_type}:${payload.store_id ?? ""}:${payload.article_id ?? ""}:${payload.area ?? ""}`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      ambient = { ...payload, path: window.location.pathname };
    }
    send("/api/track/pv", payload);
    // key が変われば（別ページへ遷移）再送する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
