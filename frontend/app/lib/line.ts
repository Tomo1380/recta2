/**
 * LINE Official Account utilities
 *
 * LINE公式アカウントの友だち追加URLを管理する。
 * Bot基本ID（@xxx）は LINE Developers 管理画面の Messaging API チャネルで確認可能。
 */

// TODO: LINE Developers管理画面からBot基本IDを取得して設定する
// Messaging API チャネル → チャネル基本設定 → Bot情報 → Bot基本ID
const LINE_OFFICIAL_ACCOUNT_ID = "@043uxuen";

/**
 * LINE公式アカウント友だち追加URL
 * - 未友だち → 友だち追加画面が表示される
 * - 友だち済み → トーク画面が直接開く
 */
export const LINE_ADD_FRIEND_URL = `https://line.me/R/ti/p/${LINE_OFFICIAL_ACCOUNT_ID}`;

/**
 * LINE 誘導の発生源を識別するためのソースキー型。
 * 既存値を追加する場合は `frontend/app/lib/line.ts` を grep して網羅性を確認すること。
 *
 * 命名規則: `<page>:<placement>`
 * - page: top / store-detail / column / chat / relocate / mypage / tab
 * - placement: 配置のニックネーム（ボタン文言の頭ではなく「どこのCTAか」を表す語）
 */
export type LineCtaSource =
  | "tab:bottom"
  | "top:chat-end"
  | "store-detail:chat-inline"
  | "store-detail:docs-inline"
  | "store-detail:map-card"
  | "store-detail:compare-result"
  | "store-detail:chat-end"
  | "column:end"
  | "relocate:end"
  | "chat:line-cta";

declare global {
  interface Window {
    // GA4/GTM の dataLayer。存在しない環境でも push() を no-op で扱う。
    dataLayer?: Array<Record<string, unknown>>;
  }
}

/**
 * LINE 友だち追加ページを開く。
 * モバイルではLINEアプリが直接開き、PCではLINEのWebページが開く。
 *
 * `source` を渡すと dataLayer に `line_add_friend` イベントを push する。
 * GA4 や GTM 側で計測タグを設定すれば、どのCTAがクリックされたかを集計できる。
 */
export function openLineFriendAdd(source?: LineCtaSource) {
  if (typeof window !== "undefined") {
    // dataLayer が無ければ作る（GTMロード前でも安全）
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "line_add_friend",
      line_cta_source: source ?? "unknown",
    });
  }
  if (typeof window !== "undefined") {
    window.open(LINE_ADD_FRIEND_URL, "_blank", "noopener,noreferrer");
  }
}
