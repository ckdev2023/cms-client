import { getCurrentLocale, type AppLocale } from "../../../i18n";

function parseIsoDate(isoString: string | null): Date | null {
  if (!isoString) return null;
  const date = new Date(isoString);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}
function hasExplicitTime(isoString: string | null): boolean {
  return Boolean(isoString && /[T ][0-9]{2}:[0-9]{2}/.test(isoString));
}
function formatMonthDay(date: Date): string {
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
function formatTime(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function startOfDayMs(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}

function formatRelativeDayLabel(locale: AppLocale, daysAgo: number): string {
  if (daysAgo === 0) {
    switch (locale) {
      case "en-US":
        return "Today";
      case "ja-JP":
        return "今日";
      default:
        return "今天";
    }
  }

  if (daysAgo === 1) {
    switch (locale) {
      case "en-US":
        return "Yesterday";
      case "ja-JP":
        return "昨日";
      default:
        return "昨天";
    }
  }

  switch (locale) {
    case "en-US":
      return `${daysAgo} days ago`;
    case "ja-JP":
      return `${daysAgo} 日前`;
    default:
      return `${daysAgo} 天前`;
  }
}

/**
 * ISO 日付から「MM-DD」ラベルを生成する。
 *
 * @param isoString - ISO 8601 日付文字列
 * @returns 「MM-DD」形式の文字列（空なら空文字列）
 */
export function formatNextFollowUpLabel(isoString: string | null): string {
  const date = parseIsoDate(isoString);
  return date ? formatMonthDay(date) : "";
}

/**
 * 更新日時を「相対ラベル / MM-DD HH:MM」に変換する。
 *
 * @param isoString - ISO 8601 日付文字列
 * @param now - 基準時刻（テスト注入用）
 * @returns フォーマット済みラベル
 */
export function formatUpdatedAtLabel(
  isoString: string | null,
  now: Date = new Date(),
): string {
  if (!isoString) return "";
  const date = parseIsoDate(isoString);
  if (!date) return "";

  const diffDays = Math.floor(
    (startOfDayMs(now) - startOfDayMs(date)) / 86400000,
  );

  if (diffDays >= 0 && diffDays <= 3) {
    const relative = formatRelativeDayLabel(getCurrentLocale(), diffDays);
    return hasExplicitTime(isoString)
      ? `${relative} ${formatTime(date)}`
      : relative;
  }

  return hasExplicitTime(isoString)
    ? `${formatMonthDay(date)} ${formatTime(date)}`
    : formatMonthDay(date);
}
