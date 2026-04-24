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
  CaseUpdateInput,
} from "./CaseAdapterTypes";

// ─── Internal Helpers ───────────────────────────────────────────

function omitUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/**
 * 归一化可空字符串：`""` / 纯空白 → `null`，非空字符串 → trim。
 * 与 `CaseAdapterShared.readNullableString`（读取侧）对称。
 *
 * @param value - 原始字符串、`null` 或 `undefined`
 * @returns 归一化后的字符串、`null` 或 `undefined`
 */
export function normalizeNullableString(
  value: string | null | undefined,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 归一化可选非空字符串：`""` / 纯空白 → `undefined`（省略），非空 → trim。
 *
 * @param value - 原始字符串或 `undefined`
 * @returns 归一化后的字符串或 `undefined`
 */
function normalizeOptionalString(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

// ─── Quote Price Parsing ────────────────────────────────────────

/**
 * 将 UI 金额字符串解析为数值。
 * 忽略千位逗号；空值或无法解析的值返回 `undefined`（builder 层省略该字段）。
 *
 * @param amount - UI 表单中的金额文本
 * @returns 有限数值或 `undefined`
 */
export function parseQuotePrice(amount: string): number | undefined {
  if (!amount) return undefined;
  const cleaned = amount.replace(/,/g, "").trim();
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

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
  });
}

// ─── Update Draft → CaseUpdateInput Bridge ──────────────────────

/**
 * 案件编辑表单的字段取值——全部字符串；空串 = 无值（nullable 字段会被归一化为 `null`，
 * 非空可选字段会被省略）。
 *
 * 字段语义与 `CaseUpdateInput` 对应键相同，类型统一为 `string` 以贴合表单控件输出。
 */
export interface UpdateCaseFormValues {
  /** 案件标题。 */
  caseName: string;
  /** 案件类型码（对应服务端 `caseTypeCode`）。 */
  caseTypeCode: string;
  /** 负责人用户 ID。 */
  ownerUserId: string;
  /** 分组 ID；变更时须配合 `groupTransferReason`。 */
  groupId: string;
  /** 截止日期（ISO 格式字符串）。 */
  dueAt: string;
  /** 申请类型（认定 / 变更 / 更新）。 */
  applicationType: string;
  /** 案件子类型（例如 engineer、family 等）。 */
  caseSubtype: string;
  /** 优先级（normal / high 等，枚举由服务端约束）。 */
  priority: string;
  /** 风险等级。 */
  riskLevel: string;
  /** 协办人用户 ID。 */
  assistantUserId: string;
  /** 受理渠道（web / offline / referral 等）。 */
  sourceChannel: string;
  /** 签约日期。 */
  signedAt: string;
  /** 受理日期。 */
  acceptedAt: string;
  /** 递交日期。 */
  submissionDate: string;
  /** 结果日期（下签 / 不许可等）。 */
  resultDate: string;
  /** 在留资格有效期。 */
  residenceExpiryDate: string;
  /** 归档时间。 */
  archivedAt: string;
  /** 结果判定（許可 / 不許可 / 取下等）。 */
  resultOutcome: string;
}

/** UI 编辑快照——捕获编辑前/后状态，供 diff 求解 patch 语义。 */
export interface UpdateCaseDraftSnapshot {
  /** 加载时的表单值（编辑前）。 */
  original: UpdateCaseFormValues;
  /** 保存时的表单值（编辑后）。 */
  current: UpdateCaseFormValues;
  /** 跨组转让原因——仅在 `groupId` 变更时发送。 */
  groupTransferReason: string;
  /** 加载时的报价金额（UI 文本，可能含逗号分隔）。 */
  originalAmount: string;
  /** 保存时的报价金额（UI 文本，可能含逗号分隔）。 */
  currentAmount: string;
}

/**
 * `CaseUpdateInput` 中的可空字符串字段——空表单值 → `null`（清除）。
 * `groupId` 亦可空，但单独处理（会联动 `groupTransferReason`）。
 */
export const UPDATE_PATCH_NULLABLE_FIELDS = [
  "caseName",
  "dueAt",
  "caseSubtype",
  "applicationType",
  "assistantUserId",
  "sourceChannel",
  "signedAt",
  "acceptedAt",
  "submissionDate",
  "resultDate",
  "residenceExpiryDate",
  "archivedAt",
  "resultOutcome",
] as const;

/** `CaseUpdateInput` 中的非空可选字符串字段——空表单值 → 省略（`undefined`）。 */
export const UPDATE_PATCH_NON_NULL_FIELDS = [
  "caseTypeCode",
  "ownerUserId",
  "priority",
  "riskLevel",
] as const;

// ─── Compile-time key-set sync guard ─────────────────────────────
// Ensures UpdateCaseFormValues keys stay in sync with field constants + groupId.
type _UpdateNullableKey = (typeof UPDATE_PATCH_NULLABLE_FIELDS)[number];
type _UpdateNonNullKey = (typeof UPDATE_PATCH_NON_NULL_FIELDS)[number];
type _UpdateAllDiffKeys = _UpdateNullableKey | _UpdateNonNullKey | "groupId";
type _UpdateFormKeys = keyof UpdateCaseFormValues;
type _NoExtraFormKeys = Exclude<_UpdateFormKeys, _UpdateAllDiffKeys>;
type _NoMissingFormKeys = Exclude<_UpdateAllDiffKeys, _UpdateFormKeys>;
type _AssertUpdateFormKeysMatch = [
  _NoExtraFormKeys,
  _NoMissingFormKeys,
] extends [never, never]
  ? true
  : "UpdateCaseFormValues keys do not match field constants — update both";
/** @internal 编译期断言——键集不匹配将导致构建失败。 */
export const _ASSERT_UPDATE_FORM_KEYS: _AssertUpdateFormKeysMatch = true;

/**
 * 将 UI 编辑快照转换为 `CaseUpdateInput`——纯 patch 语义，
 * 只包含实际变更的字段。
 *
 * 规则：
 * - 未变更字段 → 省略（`undefined`）
 * - 变更的可空字符串字段 → 新值，或 `null`（清除）
 * - 变更的非空字符串字段 → 新值，清除时省略（非空字段无法表示"清除"）
 * - `groupId` 变更 → 附带 `groupTransferReason`（非空时）
 * - `quotePrice` → 解析 UI 金额文本，仅数值变化时发送
 *
 * 调用方应将返回值传入 `buildUpdateCasePayload(result)` 做最终 HTTP 序列化。
 *
 * @param snapshot - 编辑表单的原始/当前值快照
 * @returns 仅包含变更字段的类型化输入
 */
export function buildUpdateCaseInputFromDraft(
  snapshot: UpdateCaseDraftSnapshot,
): CaseUpdateInput {
  const {
    original,
    current,
    groupTransferReason,
    originalAmount,
    currentAmount,
  } = snapshot;
  const input: CaseUpdateInput = {};

  for (const field of UPDATE_PATCH_NULLABLE_FIELDS) {
    if (current[field] !== original[field]) {
      (input as Record<string, unknown>)[field] = current[field] || null;
    }
  }

  for (const field of UPDATE_PATCH_NON_NULL_FIELDS) {
    if (current[field] !== original[field] && current[field]) {
      (input as Record<string, unknown>)[field] = current[field];
    }
  }

  if (current.groupId !== original.groupId) {
    input.groupId = current.groupId || null;
    if (groupTransferReason) {
      input.groupTransferReason = groupTransferReason;
    }
  }

  const parsedOriginal = parseQuotePrice(originalAmount);
  const parsedCurrent = parseQuotePrice(currentAmount);
  if (parsedOriginal !== parsedCurrent) {
    input.quotePrice = parsedCurrent ?? null;
  }

  return input;
}

// ─── Update ─────────────────────────────────────────────────────

/**
 * 将更新案件的表单输入序列化为服务端 `PATCH /cases/:id` 请求体。
 *
 * 所有字段均为可选；`undefined` 表示不变更、`null` 表示清除。
 * 字符串字段经归一化后发送，确保空表单值不以 `""` 形式到达服务端。
 *
 * @param input - 案件更新表单字段（仅包含需变更的字段）
 * @returns 可 JSON 序列化的请求体
 */
export function buildUpdateCasePayload(
  input: CaseUpdateInput,
): Record<string, unknown> {
  return omitUndefined({
    caseTypeCode: normalizeOptionalString(input.caseTypeCode),
    ownerUserId: normalizeOptionalString(input.ownerUserId),
    dueAt: normalizeNullableString(input.dueAt),
    caseName: normalizeNullableString(input.caseName),
    caseSubtype: normalizeNullableString(input.caseSubtype),
    applicationType: normalizeNullableString(input.applicationType),
    priority: normalizeOptionalString(input.priority),
    riskLevel: normalizeOptionalString(input.riskLevel),
    assistantUserId: normalizeNullableString(input.assistantUserId),
    sourceChannel: normalizeNullableString(input.sourceChannel),
    signedAt: normalizeNullableString(input.signedAt),
    acceptedAt: normalizeNullableString(input.acceptedAt),
    submissionDate: normalizeNullableString(input.submissionDate),
    resultDate: normalizeNullableString(input.resultDate),
    residenceExpiryDate: normalizeNullableString(input.residenceExpiryDate),
    archivedAt: normalizeNullableString(input.archivedAt),
    resultOutcome: normalizeNullableString(input.resultOutcome),
    quotePrice: input.quotePrice,
    groupId: normalizeNullableString(input.groupId),
    groupTransferReason: normalizeNullableString(input.groupTransferReason),
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
