/**
 * 写操作粒度化 refetch 标签——写操作成功后按 tag 选择性刷新。
 *
 * - `"detail"` 触发 aggregate 全量 refetch（保守口径）
 * - 其余 tag 对应 `DetailTabDataBundle` 的各 slice
 */
export type RefetchTag =
  | "detail"
  | "documents"
  | "forms"
  | "validation"
  | "billing"
  | "submissionPackages"
  | "doubleReview"
  | "messages"
  | "logEntries"
  | "tasks"
  | "deadlines";

export const TAGS_DETAIL: ReadonlySet<RefetchTag> = new Set(["detail"]);
export const TAGS_FORMS: ReadonlySet<RefetchTag> = new Set([
  "forms",
  "logEntries",
]);
export const TAGS_MESSAGES: ReadonlySet<RefetchTag> = new Set([
  "messages",
  "logEntries",
]);
export const TAGS_DEADLINES: ReadonlySet<RefetchTag> = new Set([
  "deadlines",
  "logEntries",
]);
export const TAGS_TASKS: ReadonlySet<RefetchTag> = new Set([
  "tasks",
  "logEntries",
]);
export const TAGS_SUBMISSIONS: ReadonlySet<RefetchTag> = new Set([
  "submissionPackages",
  "logEntries",
]);

export const ALL_TAB_TAGS: ReadonlySet<RefetchTag> = new Set<RefetchTag>([
  "documents",
  "forms",
  "validation",
  "billing",
  "submissionPackages",
  "doubleReview",
  "messages",
  "logEntries",
  "tasks",
  "deadlines",
]);
