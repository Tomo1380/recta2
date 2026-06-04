/**
 * 体入日給の計算ロジック。
 *
 * 「本入店後の通常時給」は店舗フォーム / 公開ページから撤去し、給与の起点は
 * 体入時給に一本化した。日給は「体入時給 × 1日の労働時間」で機械的に求める
 * ため、管理フォーム (ShopEditPage) と店舗詳細 (StoreDetailPage) の両方が
 * この 1 ファイルを唯一の計算元として参照する (二重実装で値がズレるのを防ぐ)。
 */

/** ナイトワークの体入は概ね 1 日 4 時間想定。日給 = 体入時給 × この値。 */
export const TRIAL_HOURS_PER_DAY = 4;

function toWageNumber(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 体入時給 (最低/最高) から日給目安の表示文字列を作る。
 *
 *   trialDailyEstimate(4500, 6000) => "18,000〜24,000円"
 *   trialDailyEstimate(4500, 4500) => "18,000円"
 *   trialDailyEstimate(4500, null) => "18,000円〜"
 *   trialDailyEstimate(null, null) => null
 */
export function trialDailyEstimate(
  min: number | string | null | undefined,
  max: number | string | null | undefined,
): string | null {
  const lo = toWageNumber(min);
  const hi = toWageNumber(max);
  const fmt = (n: number) => (n * TRIAL_HOURS_PER_DAY).toLocaleString("ja-JP");
  if (lo && hi) return lo === hi ? `${fmt(lo)}円` : `${fmt(lo)}〜${fmt(hi)}円`;
  if (lo) return `${fmt(lo)}円〜`;
  if (hi) return `〜${fmt(hi)}円`;
  return null;
}
