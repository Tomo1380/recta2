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
 * LINE友だち追加ページを開く
 * モバイルではLINEアプリが直接開き、PCではLINEのWebページが開く
 */
export function openLineFriendAdd() {
  window.open(LINE_ADD_FRIEND_URL, "_blank", "noopener,noreferrer");
}
