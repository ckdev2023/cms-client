/**
 * 配套模块 adapter seam — 冻结边界（p0-fe-002a-04）。
 *
 * 本文件声明 detail tabs 中各支撑模块的类型出口与 adapter 函数接缝。
 *
 * 已独立实现：
 * - messages / log → `CaseCommsLogsAdapter`（独立文件，自带解析器，不混入 detail 主链）
 *
 * 仅定义 seam（接缝），等后续子任务实现：
 * - documents → 待 p0-fe-002e-01 / p0-fe-006b
 * - forms     → 待 p0-fe-002e-02 / p0-fe-006b
 * - validation → 待 p0-fe-002e-02 / p0-fe-006b
 * - billing   → 待 p0-fe-002e-02 / p0-fe-006b
 * - tasks     → 待 p0-fe-002e-02 / p0-fe-006d
 * - deadlines → 待 p0-fe-002e-02 / p0-fe-006d
 *
 * 此阶段只建 seam，不提前实现所有 tabs 的最终字段映射。
 * 每个 seam 定义 `adaptXxx(value: unknown): T | null` 签名，
 * 消费者通过此签名接线，后续只需填充实现而不改变接口。
 */

import type {
  DocumentGroup,
  FormsData,
  ValidationData,
  SubmissionPackage,
  DoubleReviewEntry,
  BillingData,
  TaskItem,
  DeadlineItem,
} from "../types-detail";

// ─── Type re-exports ────────────────────────────────────────────

export type {
  DocumentItem,
  DocumentGroup,
  DocumentFileVersion,
  DocumentReviewRecord,
  DocumentReminderRecord,
  DocumentItemActions,
} from "../types-detail";

export type { FormTemplate, FormGenerated, FormsData } from "../types-detail";

export type {
  GateItem,
  ValidationData,
  SubmissionPackage,
  CorrectionPackage,
  DoubleReviewEntry,
} from "../types-detail";

export type { PaymentRow, BillingData } from "../types-detail";

export type { TaskItem } from "../types-detail";

export type { DeadlineItem } from "../types-detail";

// ─── Adapter seam functions ─────────────────────────────────────
// 每个 seam 定义 list/single 适配函数签名。
// 当前均返回 null（未实现），由 002e / 006x 子任务填充。

/**
 * Documents adapter seam — 适配资料列表 DTO 为分组视图模型。
 *
 * @param value - `/api/document-items?caseId=xxx` 返回的原始 JSON
 * @returns 按提交方分组的资料列表，格式无效时返回 `null`
 */
export function adaptCaseDocumentGroups(
  value: unknown,
): DocumentGroup[] | null {
  void value;
  return null;
}

/**
 * Forms adapter seam — 适配文书模板与生成记录列表。
 *
 * @param value - `/api/generated-documents?caseId=xxx` 返回的原始 JSON
 * @returns 模板与生成文书数据，格式无效时返回 `null`
 */
export function adaptCaseFormsData(value: unknown): FormsData | null {
  void value;
  return null;
}

/**
 * Validation adapter seam — 适配校验运行列表为门禁视图模型。
 *
 * @param value - `/api/validation-runs?caseId=xxx` 返回的原始 JSON
 * @returns 校验数据（blocking / warning / info），格式无效时返回 `null`
 */
export function adaptCaseValidationData(value: unknown): ValidationData | null {
  void value;
  return null;
}

/**
 * Billing adapter seam — 适配收费与入金记录。
 *
 * @param value - `/api/billing-plans?caseId=xxx` 与 `/api/payment-records?caseId=xxx` 的聚合
 * @returns 收费汇总与入金明细，格式无效时返回 `null`
 */
export function adaptCaseBillingData(value: unknown): BillingData | null {
  void value;
  return null;
}

/**
 * Tasks adapter seam — 适配任务列表。
 *
 * @param value - `/api/tasks?caseId=xxx` 返回的原始 JSON
 * @returns 任务列表，格式无效时返回 `null`
 */
export function adaptCaseTaskList(value: unknown): TaskItem[] | null {
  void value;
  return null;
}

/**
 * Deadlines adapter seam — 适配期限列表。
 *
 * @param value - `/api/reminders?caseId=xxx` 返回的原始 JSON
 * @returns 期限列表，格式无效时返回 `null`
 */
export function adaptCaseDeadlineList(value: unknown): DeadlineItem[] | null {
  void value;
  return null;
}

/**
 * Submission packages adapter seam — 适配提交包列表。
 *
 * @param value - `/api/submission-packages?caseId=xxx` 返回的原始 JSON
 * @returns 提交包列表，格式无效时返回 `null`
 */
export function adaptCaseSubmissionPackages(
  value: unknown,
): SubmissionPackage[] | null {
  void value;
  return null;
}

/**
 * Double review adapter seam — 适配复核记录列表。
 *
 * @param value - `/api/review-records?caseId=xxx` 返回的原始 JSON
 * @returns 复核记录列表，格式无效时返回 `null`
 */
export function adaptCaseDoubleReviewEntries(
  value: unknown,
): DoubleReviewEntry[] | null {
  void value;
  return null;
}
