// ─── Boundary (frozen by p0-fe-002a-03, refined by p0-fe-002d) ──
// This file owns HTTP request body construction for case write operations.
// CaseRepository delegates to these builders; it never constructs payloads inline.
//
// It does NOT own:
//   - Vue Router URL query parsing/serialization → query.ts
//   - HTTP URLSearchParams / REST path           → CaseAdapterReaders.ts
//   - Response adaptation                        → CaseAdapterMappers / MutationResults / DetailAggregate
//
// Serialization rules (p0-fe-002d-04 frozen):
//   - `undefined` → omitted (field absent from payload)
//   - `null`      → preserved as JSON `null` (server clears the field)
//   - `""`        → normalized to `null` for nullable string fields
//   - `0`         → preserved (valid number; not treated as "empty")
//   - non-empty strings are trimmed before sending

import type {
  CaseBillingRiskAckInput,
  CaseCreateInput,
  CasePostApprovalInput,
  CaseTransitionInput,
  CaseWorkflowStepTransitionInput,
} from "./CaseAdapterTypes";
import {
  normalizeNullableString,
  normalizeOptionalString,
  omitUndefined,
  parseQuotePrice,
} from "./CaseAdapterWriteBuilders.shared";

export {
  normalizeNullableString,
  parseQuotePrice,
} from "./CaseAdapterWriteBuilders.shared";
export * from "./CaseAdapterWriteBuilders.update";
export * from "./CaseAdapterWriteBuilders.case-party";

// ─── Internal Helpers ───────────────────────────────────────────

// ─── Draft → CaseCreateInput Bridge ────────────────────────────

/** UI 草稿快照——从 `useCreateCaseModel` 收集的纯值，不含 Vue 响应式依赖。 */
export interface CreateCaseDraftSnapshot {
  /** 主申请人客户 ID。 */
  customerId: string;
  /** 模板 ID（对应服务端 `caseTypeCode`）。 */
  templateId: string;
  /** 申请类型（认定 / 变更 / 更新）。 */
  applicationType: string;
  /** 经自动拼接或手动编辑后的案件标题。 */
  effectiveTitle: string;
  /** 当前选中的分组 ID。 */
  group: string;
  /** 从主申请人继承的分组 ID（用于判定是否跨组）。 */
  inheritedGroup: string;
  /** 跨组原因——仅当 `group !== inheritedGroup` 时有意义。 */
  groupOverrideReason: string;
  /** 负责人用户 ID。 */
  owner: string;
  /** 截止日期（ISO 格式字符串）。 */
  dueDate: string;
  /** 报价金额（UI 文本，含可能的逗号分隔）。 */
  amount: string;
  /** P1: 签证方案（仅 BMV 案件有值）。 */
  visaPlan?: string;
}

/**
 * 将 UI 草稿快照转换为 `CaseCreateInput`——收口空值、默认值、
 * group 继承判定与 crossGroupReason 条件附带。
 *
 * 规则：
 * - 必填字段（`customerId` / `caseTypeCode` / `ownerUserId`）原样映射
 * - `stage` 固定为 `"S1"`（新建案件初始阶段）
 * - `group` 空串 → `groupId` 省略（`undefined`），由服务端决定
 * - 当 `group` 与 `inheritedGroup` 不同且两者均非空 → 附带 `crossGroupReason`
 * - `amount` 字符串经 `parseQuotePrice` 转为数值；无法解析 → 省略
 * - 其余可选字段为空串 → 省略（`undefined`），由服务端使用默认值
 *
 * 调用方应将返回值传入 `buildCreateCasePayload(result)` 做最终 HTTP 序列化。
 *
 * @param snapshot - 从 `useCreateCaseModel` 提取的纯值快照
 * @returns 可直接传入 `buildCreateCasePayload` 的类型化输入
 */
export function buildCreateCaseInputFromDraft(
  snapshot: CreateCaseDraftSnapshot,
): CaseCreateInput {
  const isCrossGroup =
    !!snapshot.group &&
    !!snapshot.inheritedGroup &&
    snapshot.group !== snapshot.inheritedGroup;

  return {
    customerId: snapshot.customerId,
    caseTypeCode: snapshot.templateId,
    ownerUserId: snapshot.owner,
    groupId: snapshot.group || undefined,
    stage: "S1",
    dueAt: snapshot.dueDate || undefined,
    caseName: snapshot.effectiveTitle || undefined,
    applicationType: snapshot.applicationType || undefined,
    quotePrice: parseQuotePrice(snapshot.amount),
    crossGroupReason: isCrossGroup
      ? snapshot.groupOverrideReason || undefined
      : undefined,
    visaPlan: snapshot.visaPlan || undefined,
  };
}

// ─── Create ─────────────────────────────────────────────────────

/**
 * 将创建案件的表单输入序列化为服务端 `POST /cases` 请求体。
 *
 * 必填字段（`customerId` / `caseTypeCode` / `ownerUserId`）原样发送；
 * 可空字段经 `normalizeNullableString` 归一化；
 * 可选非空字段经 `normalizeOptionalString` 归一化。
 *
 * @param input - 案件创建表单字段
 * @returns 可 JSON 序列化的请求体
 */
export function buildCreateCasePayload(
  input: CaseCreateInput,
): Record<string, unknown> {
  return omitUndefined({
    customerId: input.customerId,
    caseTypeCode: input.caseTypeCode,
    ownerUserId: input.ownerUserId,
    groupId: normalizeNullableString(input.groupId),
    stage: normalizeOptionalString(input.stage),
    dueAt: normalizeNullableString(input.dueAt),
    caseName: normalizeNullableString(input.caseName),
    caseSubtype: normalizeNullableString(input.caseSubtype),
    applicationType: normalizeNullableString(input.applicationType),
    priority: normalizeOptionalString(input.priority),
    riskLevel: normalizeOptionalString(input.riskLevel),
    assistantUserId: normalizeNullableString(input.assistantUserId),
    sourceChannel: normalizeNullableString(input.sourceChannel),
    signedAt: normalizeNullableString(input.signedAt),
    quotePrice: input.quotePrice,
    crossGroupReason: normalizeNullableString(input.crossGroupReason),
    visaPlan: normalizeNullableString(input.visaPlan),
  });
}

// ─── Transition ─────────────────────────────────────────────────

/**
 * 将阶段流转输入序列化为服务端 `POST /cases/:id/transition` 请求体。
 *
 * `toStage` 为必填；`closeReason` 仅在目标为 S9 时有意义。
 *
 * @param input - 流转目标阶段与可选关案原因
 * @returns 可 JSON 序列化的请求体
 */
export function buildTransitionPayload(
  input: CaseTransitionInput,
): Record<string, unknown> {
  return omitUndefined({
    toStage: input.toStage,
    closeReason: normalizeNullableString(input.closeReason),
  });
}

// ─── Billing Risk Acknowledgment ────────────────────────────────

/**
 * 将欠款风险确认输入序列化为服务端 `POST /cases/:id/billing-risk-ack` 请求体。
 *
 * `reasonCode` 为必填；`reasonNote` / `evidenceUrl` 可选。
 *
 * @param input - 确认原因码、备注与证据
 * @returns 可 JSON 序列化的请求体
 */
export function buildBillingRiskAckPayload(
  input: CaseBillingRiskAckInput,
): Record<string, unknown> {
  return omitUndefined({
    reasonCode: input.reasonCode,
    reasonNote: normalizeOptionalString(input.reasonNote),
    evidenceUrl: normalizeOptionalString(input.evidenceUrl),
  });
}

// ─── Post-Approval Stage ────────────────────────────────────────

/**
 * 将下签后阶段更新输入序列化为服务端 `POST /cases/:id/post-approval-stage` 请求体。
 *
 * `stage` 为必填，合法值：`waiting_final_payment` | `coe_sent` |
 * `overseas_visa_applying` | `entry_success`。
 *
 * @param input - 下签后阶段标识
 * @returns 可 JSON 序列化的请求体
 */
export function buildPostApprovalPayload(
  input: CasePostApprovalInput,
): Record<string, unknown> {
  return omitUndefined({
    stage: input.stage,
  });
}

// ─── Workflow Step Transition (P1) ───────────────────────────────

/**
 * 将 P1 业务子步骤流转输入序列化为服务端
 * `POST /cases/:id/workflow-step-transition` 请求体。
 *
 * `toStepCode` 为必填，值域由 BMV 蓝图中的 `stepCode` 约束。
 *
 * @param input - 目标子步骤代码
 * @returns 可 JSON 序列化的请求体
 */
export function buildWorkflowStepTransitionPayload(
  input: CaseWorkflowStepTransitionInput,
): Record<string, unknown> {
  return omitUndefined({
    toStepCode: input.toStepCode,
  });
}
