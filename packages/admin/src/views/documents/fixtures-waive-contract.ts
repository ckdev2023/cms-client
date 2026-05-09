/**
 * Waive 允许源状态白名单 — 与后端 `WAIVE_ALLOWED_FROM_STATUSES` 同形拷贝。
 *
 * 后端权威来源: `packages/server/src/modules/core/documents.types.ts`
 * 前端各消费方统一引用此常量；`waiveContract.test.ts` 断言前后端值集一致。
 */
export const WAIVE_ALLOWED_FROM_STATUSES = [
  "pending",
  "waiting_upload",
  "revision_required",
  "approved",
  "expired",
] as const;

/**
 *
 */
export type WaiveAllowedFromStatus =
  (typeof WAIVE_ALLOWED_FROM_STATUSES)[number];

export const WAIVE_ALLOWED_FROM_STATUSES_SET: ReadonlySet<string> = new Set(
  WAIVE_ALLOWED_FROM_STATUSES,
);
