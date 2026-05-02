/**
 * 收费模块日期辅助 — 时区無関のパース / 表示。
 *
 * `YYYY-MM-DD` 文字列をリテラル分割し、`new Date()` の
 * タイムゾーン依存パースを回避する。
 */

/**
 * 支払期日の逾期日数を UTC 基準で算出する。
 *
 * @param dueDate - `YYYY-MM-DD` または ISO 文字列（先頭 10 文字のみ使用）
 * @returns 逾期日数（正整数）。期限前・当日・不正値は `undefined`
 */
export function computeOverdueDays(dueDate: string | null): number | undefined {
  if (!dueDate) return undefined;
  try {
    const parts = dueDate.slice(0, 10).split("-");
    if (parts.length !== 3) return undefined;
    const [y, m, d] = parts.map(Number);
    if (!y || !m || !d) return undefined;
    const dueUtc = Date.UTC(y, m - 1, d);
    if (Number.isNaN(dueUtc)) return undefined;
    const now = new Date();
    const todayUtc = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    );
    const diff = Math.floor((todayUtc - dueUtc) / 86_400_000);
    return diff > 0 ? diff : undefined;
  } catch {
    return undefined;
  }
}

/**
 * 支払期日を `YYYY/M/D`（ja-JP スラッシュ形式）で返す。
 *
 * @param dueDate - `YYYY-MM-DD` または ISO 文字列（先頭 10 文字のみ使用）
 * @returns フォーマット済み文字列。null・空・不正値は `""`
 */
export function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return "";
  const parts = dueDate.slice(0, 10).split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!year || !month || !day) return "";
  return `${year}/${month}/${day}`;
}
