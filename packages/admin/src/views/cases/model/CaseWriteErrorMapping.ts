// ─── Write Error Code Mapping (p1-fe-001-02) ─────────────────────
// 服务端写操作错误码 → admin i18n key 映射。
// key = server 返回的 errorCode，value = i18n key 后缀（拼接前缀 `cases.writeErrors.`）。
// 未映射的 errorCode 由 fallback key 兜底。

export const CASE_WRITE_ERROR_I18N_MAP: Record<string, string> = {
  CASE_S9_READONLY: "s9Readonly",
  CASE_TRANSITION_NOT_ALLOWED: "transitionNotAllowed",
  CASE_TRANSITION_CONFLICT: "transitionConflict",
  CASE_GATE_A_MISSING_PRIMARY_PARTY: "gateAMissingPrimaryParty",
  CASE_GATE_B_INCOMPLETE_REQUIRED_ITEMS: "gateBIncompleteRequiredItems",
  CASE_GATE_VALIDATION_RUN_MISSING: "gateValidationRunMissing",
  CASE_GATE_VALIDATION_RUN_NOT_PASSED: "gateValidationRunNotPassed",
  CASE_GATE_VALIDATION_RUN_STALE: "gateValidationRunStale",
  CASE_GATE_REVIEW_NOT_APPROVED: "gateReviewNotApproved",
  CASE_GATE_C_BILLING_RISK_UNACKNOWLEDGED: "gateCBillingRiskUnacknowledged",
  CASE_BILLING_RISK_ACK_FAILED: "billingRiskAckFailed",
  CASE_POST_APPROVAL_STAGE_INVALID: "postApprovalStageInvalid",
  CASE_POST_APPROVAL_BILLING_BLOCKED: "postApprovalBillingBlocked",
  CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED:
    "postApprovalBillingRiskUnacknowledged",
  CASE_CROSS_GROUP_REASON_REQUIRED: "crossGroupReasonRequired",
  CASE_GROUP_TRANSFER_REASON_REQUIRED: "groupTransferReasonRequired",
  CASE_GROUP_NOT_FOUND: "groupNotFound",
  CASE_INVALID_ENUM: "invalidEnum",
  CASE_NOT_FOUND: "notFound",
  CASE_REF_NOT_FOUND: "refNotFound",
  CASE_PARTY_PARENT_NOT_FOUND: "partyParentNotFound",
  CASE_PARTY_NOT_FOUND: "partyNotFound",
  CASE_PARTY_INVALID_TYPE: "partyInvalidType",
  CASE_SUCCESS_CLOSEOUT_BLOCKED: "successCloseoutBlocked",
  CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED:
    "failureCloseoutAttributionRequired",
  CASE_PRE_SIGN_GATE_SURVEY_INCOMPLETE: "preSignGateSurveyIncomplete",
  CASE_PRE_SIGN_GATE_QUOTE_UNCONFIRMED: "preSignGateQuoteUnconfirmed",
  CASE_SURVEY_UPDATE_FAILED: "surveyUpdateFailed",
  CASE_QUOTE_UPDATE_FAILED: "quoteUpdateFailed",
  CASE_WF_STEP_BILLING_GATE_BLOCKED: "wfStepBillingGateBlocked",
  CASE_WF_STEP_NOT_ALLOWED: "wfStepNotAllowed",
  CASE_REMINDER_CREATION_FAILED: "reminderCreationFailed",
  CASE_CHECKLIST_EMPTY: "checklistEmpty",
  CASE_CHECKLIST_BOOTSTRAP_NOT_EMPTY: "checklistBootstrapNotEmpty",
  CASE_CHECKLIST_BOOTSTRAP_STAGE_INVALID: "checklistBootstrapStageInvalid",
  CASE_WAITING_PAYMENT_BILLING_REQUIRED: "waitingPaymentBillingRequired",
  CASE_STAGE_BILLING_RECORD_REQUIRED: "stageBillingRecordRequired",
  TASK_INVALID_ASSIGNEE_ID: "taskInvalidAssigneeId",
  TASK_CREATE_FAILED: "taskCreateFailed",
  TASK_ASSIGNEE_NOT_FOUND: "taskAssigneeNotFound",
  REMINDER_INVALID_CASE_ID: "reminderInvalidCaseId",
  REMINDER_CREATE_FAILED: "reminderCreateFailed",
  REMINDER_REF_NOT_FOUND: "reminderRefNotFound",
  REMINDER_VALIDATION_FAILED: "reminderValidationFailed",
  TASK_INVALID_PRIORITY: "taskInvalidPriority",
  TASK_COMPLETE_FAILED: "taskCompleteFailed",
  TASK_NOT_FOUND: "taskNotFound",
  SP_CASE_NOT_FOUND: "spCaseNotFound",
  SP_NOT_FOUND: "spNotFound",
  SP_CASE_STAGE_INVALID: "spCaseStageInvalid",
  SP_SUPPLEMENT_REQUIRES_RELATED: "spSupplementRequiresRelated",
  SP_INITIAL_NO_RELATED: "spInitialNoRelated",
  SP_RELATED_NOT_FOUND: "spRelatedNotFound",
  SP_RELATED_NOT_LATEST: "spRelatedNotLatest",
  SP_RELATED_ALREADY_BRANCHED: "spRelatedAlreadyBranched",
  SP_CHAIN_DEPTH_EXCEEDED: "spChainDepthExceeded",
  SP_INVALID_SUBMISSION_KIND: "spInvalidSubmissionKind",
  SP_INVALID_ITEM_TYPE: "spInvalidItemType",
  SP_DUPLICATE_ITEM: "spDuplicateItem",
  SP_MISSING_MINIMUM_FIELDS: "spMissingMinimumFields",
  GD_CASE_NOT_FOUND: "gdCaseNotFound",
  GD_CASE_S9_READONLY: "gdCaseS9Readonly",
  GD_NOT_FOUND: "gdNotFound",
  GD_INVALID_STATUS: "gdInvalidStatus",
  GD_INVALID_TRANSITION: "gdInvalidTransition",
  GD_INVALID_OUTPUT_FORMAT: "gdInvalidOutputFormat",
  GD_TITLE_REQUIRED: "gdTitleRequired",
};

/**
 * 将服务端写操作错误码解析为完整 i18n key。
 *
 * @param serverErrorCode - 服务端返回的 `errorCode` 字段
 * @returns 完整 i18n key（如 `"cases.writeErrors.s9Readonly"`），
 *   未映射的 errorCode 返回 `"cases.writeErrors.unknown"`
 */
export function resolveWriteErrorI18nKey(
  serverErrorCode: string | undefined,
): string {
  if (!serverErrorCode) return "cases.writeErrors.unknown";
  const suffix = CASE_WRITE_ERROR_I18N_MAP[serverErrorCode];
  return suffix ? `cases.writeErrors.${suffix}` : "cases.writeErrors.unknown";
}

/**
 * 从服务端错误码判断是否为门禁级阻断（gate feedback）。
 *
 * 门禁阻断 = 操作被 Gate-A/B/C 或收费门禁拦截，用户需要先处理前置条件。
 * 普通错误 = 参数校验失败、权限不足等，直接提示即可。
 *
 * @param serverErrorCode - 服务端返回的 `errorCode` 字段
 * @returns 是否为门禁阻断
 */
export function isGateBlockError(serverErrorCode: string | undefined): boolean {
  if (!serverErrorCode) return false;
  return (
    serverErrorCode.startsWith("CASE_GATE_") ||
    serverErrorCode.startsWith("CASE_PRE_SIGN_GATE_") ||
    serverErrorCode.startsWith("CASE_WF_STEP_") ||
    serverErrorCode === "CASE_POST_APPROVAL_BILLING_BLOCKED" ||
    serverErrorCode === "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED" ||
    serverErrorCode === "CASE_SUCCESS_CLOSEOUT_BLOCKED" ||
    serverErrorCode === "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED" ||
    serverErrorCode === "CASE_WAITING_PAYMENT_BILLING_REQUIRED"
  );
}
