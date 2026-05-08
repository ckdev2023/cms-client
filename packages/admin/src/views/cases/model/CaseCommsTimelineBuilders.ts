/**
 * Timeline message builders — 抽出自 CaseCommsLogsAdapter，
 * 将 server `action` + `payload` 映射为 i18n key 与参数。
 */

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

/**
 *
 */
export type TimelineMessageBuilder = (
  payload: Record<string, unknown>,
) => TimelineMessageResult;

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function pickFirst(
  payload: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = normalizeOptional(payload[key]);
    if (value) return value;
  }
  return "";
}

function formatColonSuffix(suffix: string): string {
  return suffix ? `：${suffix}` : "";
}

function buildStageChangeResult(
  p: Record<string, unknown>,
): TimelineMessageResult {
  return {
    key: "cases.log.timeline.stageChange",
    params: {
      from: pickFirst(p, ["from", "fromStage"]),
      to: pickFirst(p, ["to", "toStage"]),
    },
  };
}

const COMM_LOG_CHANNEL_I18N: Record<string, string> = {
  phone: "cases.detail.messages.types.phone",
  meeting: "cases.detail.messages.types.meeting",
  email: "cases.detail.messages.types.auto_email",
  internal: "cases.detail.messages.types.internal",
  client_visible: "cases.detail.messages.types.client_visible",
  internal_note: "cases.detail.messages.types.internal_note",
  client_note: "cases.detail.messages.types.client_note",
  other: "cases.detail.messages.types.other",
};

const TIMELINE_MESSAGE_BUILDERS: Record<string, TimelineMessageBuilder> = {
  "case.created": (p) => {
    const suffix = pickFirst(p, ["caseTypeCode", "case_type_code"]);
    return {
      key: "cases.log.timeline.caseCreated",
      params: {
        suffix,
        colonSuffix: formatColonSuffix(suffix),
        suffixKey: suffix ? `cases.constants.caseTypes.${suffix}` : "",
      },
    };
  },
  "case.updated": () => ({ key: "cases.log.timeline.caseUpdated" }),
  "case.deleted": () => ({ key: "cases.log.timeline.caseDeleted" }),
  "case.status_changed": buildStageChangeResult,
  "case.stage_changed": buildStageChangeResult,
  "case.billing_risk_acknowledged": (p) => {
    const suffix = pickFirst(p, ["reasonCode", "reason_code"]);
    return {
      key: "cases.log.timeline.billingRiskAck",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "case.post_approval_stage_changed": (p) => {
    const suffix = pickFirst(p, ["stage", "toStage"]);
    return {
      key: "cases.log.timeline.postApprovalStageChange",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "case.cross_group_created": (p) => {
    const suffix = pickFirst(p, ["reason"]);
    return {
      key: "cases.log.timeline.crossGroupCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "case.converted_from_lead": (p) => {
    const leadNo = pickFirst(p, ["leadNo", "lead_no"]);
    const leadId = pickFirst(p, ["leadId", "lead_id"]);
    const customerId = pickFirst(p, ["customerId", "customer_id"]);
    const leadRef = leadNo || (leadId ? leadId.slice(0, 8) : "");
    return {
      key: "cases.log.timeline.caseConvertedFromLead",
      params: { leadRef, leadNo, leadId, customerId },
    };
  },
  "case.group_transferred": (p) => ({
    key: "cases.log.timeline.groupTransferred",
    params: {
      from: pickFirst(p, ["fromGroupName", "fromGroup"]),
      to: pickFirst(p, ["toGroupName", "toGroup"]),
      reason: pickFirst(p, ["reason"]),
    },
  }),
  "case.phase_transitioned": (p) => {
    const fromPhase = pickFirst(p, ["from", "fromPhase"]);
    const toPhase = pickFirst(p, ["to", "toPhase"]);
    return {
      key: "cases.log.timeline.phaseChange",
      params: {
        fromPhaseKey: fromPhase ? `cases.constants.phases.${fromPhase}` : "",
        toPhaseKey: toPhase ? `cases.constants.phases.${toPhase}` : "",
      },
    };
  },
  "communication_log.created": (p) => {
    const rawChannel = pickFirst(p, ["channelType", "channel_type"]);
    return {
      key: "cases.log.timeline.commLogCreated",
      params: {
        suffix: rawChannel,
        colonSuffix: formatColonSuffix(rawChannel),
        suffixKey: rawChannel
          ? (COMM_LOG_CHANNEL_I18N[rawChannel] ??
            "cases.detail.messages.types.other")
          : "",
      },
    };
  },
  "communication_log.updated": () => ({
    key: "cases.log.timeline.commLogUpdated",
  }),
  "case_party.created": (p) => {
    const suffix = pickFirst(p, ["partyName", "name"]);
    return {
      key: "cases.log.timeline.casePartyCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "case_party.updated": () => ({ key: "cases.log.timeline.casePartyUpdated" }),
  "case_party.deleted": () => ({ key: "cases.log.timeline.casePartyDeleted" }),
  "document_item.created": (p) => {
    const suffix = pickFirst(p, ["itemName", "title", "name"]);
    return {
      key: "cases.log.timeline.documentItemCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "document_item.updated": () => ({
    key: "cases.log.timeline.documentItemUpdated",
  }),
  "document_file.created": (p) => {
    const suffix = pickFirst(p, ["fileName", "name"]);
    return {
      key: "cases.log.timeline.documentFileCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "document_file.updated": () => ({
    key: "cases.log.timeline.documentFileUpdated",
  }),
  "task.created": (p) => {
    const suffix = pickFirst(p, ["title", "name"]);
    return {
      key: "cases.log.timeline.taskCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "task.updated": () => ({ key: "cases.log.timeline.taskUpdated" }),
  "task.completed": () => ({ key: "cases.log.timeline.taskCompleted" }),
  "billing_record.created": (p) => {
    const suffix = pickFirst(p, ["amount", "amountLabel"]);
    return {
      key: "cases.log.timeline.billingRecordCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "billing_record.updated": () => ({
    key: "cases.log.timeline.billingRecordUpdated",
  }),
  "payment_record.created": (p) => {
    const suffix = pickFirst(p, ["amount", "amountLabel"]);
    return {
      key: "cases.log.timeline.paymentRecordCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "payment_record.updated": () => ({
    key: "cases.log.timeline.paymentRecordUpdated",
  }),
  "review_record.created": () => ({
    key: "cases.log.timeline.reviewRecordCreated",
  }),
  "review_record.approved": () => ({
    key: "cases.log.timeline.reviewRecordApproved",
  }),
  "review_record.rejected": (p) => {
    const suffix = pickFirst(p, ["reason"]);
    return {
      key: "cases.log.timeline.reviewRecordRejected",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "validation_run.created": () => ({
    key: "cases.log.timeline.validationRunCreated",
  }),
  "validation_run.passed": () => ({
    key: "cases.log.timeline.validationRunPassed",
  }),
  "validation_run.failed": () => ({
    key: "cases.log.timeline.validationRunFailed",
  }),
  "validation_run.executed": (p) => {
    const status = pickFirst(p, ["resultStatus", "result_status"]);
    if (status === "passed")
      return { key: "cases.log.timeline.validationRunPassed" };
    if (status === "failed")
      return { key: "cases.log.timeline.validationRunFailed" };
    return { key: "cases.log.timeline.validationRunExecuted" };
  },
  "submission_package.created": () => ({
    key: "cases.log.timeline.submissionPackageCreated",
  }),
  "submission_package.updated": () => ({
    key: "cases.log.timeline.submissionPackageUpdated",
  }),
  "generated_document.created": (p) => {
    const suffix = pickFirst(p, ["title", "templateName", "name"]);
    return {
      key: "cases.log.timeline.generatedDocumentCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "generated_document.updated": (p) => {
    const suffix = pickFirst(p, ["title", "templateName", "name"]);
    return {
      key: "cases.log.timeline.generatedDocumentUpdated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "generated_document.finalized": (p) => {
    const suffix = pickFirst(p, ["title", "templateName", "name"]);
    return {
      key: "cases.log.timeline.generatedDocumentFinalized",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "generated_document.exported": (p) => {
    const suffix = pickFirst(p, ["title", "templateName", "name"]);
    return {
      key: "cases.log.timeline.generatedDocumentExported",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "reminder.created": (p) => {
    const suffix = pickFirst(p, ["label", "kind", "title"]);
    return {
      key: "cases.log.timeline.reminderCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
  "case.transitioned": (p) => {
    const base = buildStageChangeResult(p);
    const phase = pickFirst(p, ["businessPhase", "business_phase"]);
    return {
      key: "cases.log.timeline.caseTransitioned",
      params: { ...base.params, phase },
    };
  },
  "residence_period.created": (p) => {
    const suffix = pickFirst(p, ["kind", "type"]);
    return {
      key: "cases.log.timeline.residencePeriodCreated",
      params: { suffix, colonSuffix: formatColonSuffix(suffix) },
    };
  },
};

/**
 * 根据 timeline action + payload 构造 i18n key 与参数；未注册的 action
 * 退化为 `cases.log.timeline.<action_underscored>` 并附带原 action 作为 fallback。
 *
 * @param action - 时间线 action 字符串
 * @param payload - 时间线 payload
 * @returns timeline 文案的 i18n key 与参数
 */
export function buildCaseTimelineMessageResult(
  action: string,
  payload: Record<string, unknown>,
): TimelineMessageResult {
  const builder = TIMELINE_MESSAGE_BUILDERS[action];
  if (builder) return builder(payload);
  return {
    key: `cases.log.timeline.${action.replace(/\./g, "_")}`,
    params: { fallback: action },
  };
}
