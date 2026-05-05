/**
 * Timeline action → i18n message builders（BUG-219/220 三语化）。
 *
 * 每个 builder 把 server 返回的 `payload` 转换为
 * `{ key, params }` 结构，view 层再做 `t(key, params)` 插值。
 */

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickOptionalString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = normalizeOptionalString(record[key]);
    if (value) return value;
  }
  return null;
}

/**
 *
 */
export interface TimelineMessageResult {
  /**
   *
   */
  key: string;
  /**
   *
   */
  params?: Record<string, string>;
}

function pickSuffix(payload: Record<string, unknown>, keys: string[]): string {
  return pickOptionalString(payload, keys) ?? "";
}

type TimelineMessageBuilder = (
  p: Record<string, unknown>,
) => TimelineMessageResult;

function buildStageChangeResult(
  p: Record<string, unknown>,
): TimelineMessageResult {
  const from = pickOptionalString(p, ["from", "fromStage"]) ?? "";
  const to = pickOptionalString(p, ["to", "toStage"]) ?? "";
  return { key: "cases.log.timeline.stageChange", params: { from, to } };
}

const TIMELINE_MESSAGE_BUILDERS: Record<string, TimelineMessageBuilder> = {
  "case.created": (p) => {
    const raw = pickSuffix(p, ["caseTypeCode", "case_type_code"]);
    return {
      key: "cases.log.timeline.caseCreated",
      params: {
        suffix: raw,
        suffixKey: raw ? `cases.constants.caseTypes.${raw}` : "",
      },
    };
  },
  "case.updated": () => ({ key: "cases.log.timeline.caseUpdated" }),
  "case.deleted": () => ({ key: "cases.log.timeline.caseDeleted" }),
  "case.status_changed": buildStageChangeResult,
  "case.stage_changed": buildStageChangeResult,
  "case.billing_risk_acknowledged": (p) => ({
    key: "cases.log.timeline.billingRiskAck",
    params: { suffix: pickSuffix(p, ["reasonCode", "reason_code"]) },
  }),
  "case.post_approval_stage_changed": (p) => ({
    key: "cases.log.timeline.postApprovalStageChange",
    params: { suffix: pickSuffix(p, ["stage", "toStage"]) },
  }),
  "case.cross_group_created": (p) => ({
    key: "cases.log.timeline.crossGroupCreated",
    params: { suffix: pickSuffix(p, ["reason"]) },
  }),
  "case.group_transferred": (p) => ({
    key: "cases.log.timeline.groupTransferred",
    params: {
      from: pickOptionalString(p, ["fromGroupName", "fromGroup"]) ?? "",
      to: pickOptionalString(p, ["toGroupName", "toGroup"]) ?? "",
      reason: pickOptionalString(p, ["reason"]) ?? "",
    },
  }),
  "case.phase_transitioned": (p) => {
    const fromPhase = pickOptionalString(p, ["from", "fromPhase"]) ?? "";
    const toPhase = pickOptionalString(p, ["to", "toPhase"]) ?? "";
    return {
      key: "cases.log.timeline.phaseChange",
      params: {
        fromPhaseKey: fromPhase ? `cases.constants.phases.${fromPhase}` : "",
        toPhaseKey: toPhase ? `cases.constants.phases.${toPhase}` : "",
      },
    };
  },
  "communication_log.created": (p) => ({
    key: "cases.log.timeline.commLogCreated",
    params: { suffix: pickSuffix(p, ["channelType", "channel_type"]) },
  }),
  "communication_log.updated": () => ({
    key: "cases.log.timeline.commLogUpdated",
  }),
  "case_party.created": (p) => ({
    key: "cases.log.timeline.casePartyCreated",
    params: { suffix: pickSuffix(p, ["partyName", "party_name", "name"]) },
  }),
  "case_party.updated": () => ({
    key: "cases.log.timeline.casePartyUpdated",
  }),
  "case_party.deleted": () => ({
    key: "cases.log.timeline.casePartyDeleted",
  }),
  "document_item.created": (p) => ({
    key: "cases.log.timeline.documentItemCreated",
    params: { suffix: pickSuffix(p, ["itemName", "item_name", "name"]) },
  }),
  "document_item.updated": () => ({
    key: "cases.log.timeline.documentItemUpdated",
  }),
  "document_file.created": (p) => ({
    key: "cases.log.timeline.documentFileCreated",
    params: { suffix: pickSuffix(p, ["fileName", "file_name", "name"]) },
  }),
  "document_file.updated": () => ({
    key: "cases.log.timeline.documentFileUpdated",
  }),
  "task.created": (p) => ({
    key: "cases.log.timeline.taskCreated",
    params: { suffix: pickSuffix(p, ["title", "taskTitle"]) },
  }),
  "task.updated": () => ({ key: "cases.log.timeline.taskUpdated" }),
  "task.completed": () => ({ key: "cases.log.timeline.taskCompleted" }),
  "billing_record.created": (p) => ({
    key: "cases.log.timeline.billingRecordCreated",
    params: { suffix: pickSuffix(p, ["amount", "label"]) },
  }),
  "billing_record.updated": () => ({
    key: "cases.log.timeline.billingRecordUpdated",
  }),
  "payment_record.created": (p) => ({
    key: "cases.log.timeline.paymentRecordCreated",
    params: { suffix: pickSuffix(p, ["amount", "label"]) },
  }),
  "payment_record.updated": () => ({
    key: "cases.log.timeline.paymentRecordUpdated",
  }),
  "review_record.created": () => ({
    key: "cases.log.timeline.reviewRecordCreated",
  }),
  "review_record.approved": () => ({
    key: "cases.log.timeline.reviewRecordApproved",
  }),
  "review_record.rejected": (p) => ({
    key: "cases.log.timeline.reviewRecordRejected",
    params: { suffix: pickSuffix(p, ["reason", "rejectReason"]) },
  }),
  "validation_run.created": () => ({
    key: "cases.log.timeline.validationRunCreated",
  }),
  "validation_run.passed": () => ({
    key: "cases.log.timeline.validationRunPassed",
  }),
  "validation_run.failed": () => ({
    key: "cases.log.timeline.validationRunFailed",
  }),
  "submission_package.created": () => ({
    key: "cases.log.timeline.submissionPackageCreated",
  }),
  "submission_package.updated": () => ({
    key: "cases.log.timeline.submissionPackageUpdated",
  }),
  "generated_document.created": (p) => ({
    key: "cases.log.timeline.generatedDocumentCreated",
    params: { suffix: pickSuffix(p, ["title", "templateName"]) },
  }),
  "reminder.created": (p) => ({
    key: "cases.log.timeline.reminderCreated",
    params: { suffix: pickSuffix(p, ["label", "type"]) },
  }),
  "case.transitioned": (p) => {
    const base = buildStageChangeResult(p);
    const phase = pickSuffix(p, ["businessPhase", "business_phase"]);
    return {
      key: "cases.log.timeline.caseTransitioned",
      params: { ...base.params, phase },
    };
  },
  "residence_period.created": (p) => ({
    key: "cases.log.timeline.residencePeriodCreated",
    params: { suffix: pickSuffix(p, ["kind", "type"]) },
  }),
};

/**
 *
 * @param action
 * @param payload
 */
/**
 * 将 timeline action + payload 转换为 i18n 消息结构。
 *
 * @param action - server 返回的 action 字符串（如 `"case.created"`）
 * @param payload - action 关联的 payload 对象
 * @returns 包含 i18n key 和插值参数的结构
 */
export function buildCaseTimelineMessageResult(
  action: string,
  payload: Record<string, unknown>,
): TimelineMessageResult {
  const builder = TIMELINE_MESSAGE_BUILDERS[action];
  if (builder) return builder(payload);
  const dot = action.indexOf(".");
  const fallbackKey =
    dot > 0
      ? `cases.log.timeline.${action.slice(0, dot)}_${action.slice(dot + 1)}`
      : `cases.log.timeline.${action}`;
  return { key: fallbackKey, params: { fallback: action } };
}
