/**
 * 当日 UTC の YYYY-MM-DD（`<input type="date">` の max に利用）。
 *
 * @returns ISO 年月日のみの文字列
 */
export function utcTodayIsoDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
