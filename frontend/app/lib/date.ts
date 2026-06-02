/**
 * 日付フォーマット (日本向け固定タイムゾーン)。
 *
 * SSR (Node, 多くは UTC) と クライアント (ブラウザのローカル TZ = 日本では JST)
 * で `toLocaleDateString` の結果がずれると React のハイドレーション不一致になり、
 * 「2026/5/27 (server) vs 2026/5/28 (client)」のような 1 日ズレが起きる。
 * timeZone を Asia/Tokyo に固定して、サーバ / クライアント双方で同じ JST 日付を返す。
 */
export function formatDateJa(value: string | number | Date | null | undefined): string {
  if (!value) return "";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
}
