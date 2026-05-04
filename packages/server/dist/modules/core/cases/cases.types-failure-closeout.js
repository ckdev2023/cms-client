/* eslint-disable jsdoc/require-returns, jsdoc/require-param-description */
// ────────────────────────────────────────────────────────────────
// P1 失败結案前置条件・帰因（CLOSED_FAILED）
//
// 統一口径：
//   - 失败結案帰因 → CaseDetailAggregateDto.failureCloseoutCheck
//   - 失败結案前置条件 → transition S*→S9 の failure path guard
//
// 失败結案は以下の 4 つの収束パスで S9 に到達する：
//   1. VISA_REJECTED — 海外返签拒否（WorkflowStep 終態）
//   2. APPLICATION_REJECTED — 入管審査拒否（S5 段階 resultOutcome=rejected）
//   3. CLIENT_WITHDRAWN — 依頼人撤回（任意段階 resultOutcome=withdrawn）
//   4. MANUAL_FAILURE_CLOSE — 操作者手動異常結案（closeReason 必須）
//
// 帰因のルール：
//   - resultOutcome ∈ {rejected, visa_rejected, withdrawn} → 明確帰因、成功結案門禁バイパス
//   - VISA_REJECTED ステップ到達 → result_outcome 自動 set、auto-attribution
//   - closeReason 明示 → MANUAL_FAILURE_CLOSE、前置条件不要
//   - 上記いずれにも該当しない S8→S9 → 帰因不明で blocking（要帰因）
//
// 権威来源：
//   - P1/01 §3 M8 結案収敛
//   - P1/03 requirement_summary: 所有路径最终必须收敛到 CLOSED_SUCCESS 或 CLOSED_FAILED
//   - cases.types-overseas-step.ts VISA_REJECTED_CLOSURE
//   - cases.types-residence-closeout.ts（success 对称）
// ────────────────────────────────────────────────────────────────
// ─── 失败帰因コード ──────────────────────────────────────────
export const FAILURE_CLOSEOUT_REASON_CODES = {
  VISA_REJECTED: "VISA_REJECTED",
  APPLICATION_REJECTED: "APPLICATION_REJECTED",
  CLIENT_WITHDRAWN: "CLIENT_WITHDRAWN",
  MANUAL_FAILURE_CLOSE: "MANUAL_FAILURE_CLOSE",
};
// ─── resultOutcome → 帰因コード マッピング ──────────────────
const OUTCOME_TO_REASON = {
  visa_rejected: FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED,
  rejected: FAILURE_CLOSEOUT_REASON_CODES.APPLICATION_REJECTED,
  withdrawn: FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
};
export const FAILURE_OUTCOME_SET = new Set(Object.keys(OUTCOME_TO_REASON));
// ─── 失败結案パス定義 ────────────────────────────────────────
/**
 * 各パスの仕様：どのルートから failure closeout に到達できるか。
 *
 * canDirectClose: true → 成功結案門禁をバイパス、追加確認不要
 * closeReasonRequired: false → closeReason の入力は任意
 */
export const FAILURE_CLOSEOUT_PATHS = {
  VISA_REJECTED: {
    reasonCode: FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED,
    label: "海外返签拒否",
    triggerCondition: "currentWorkflowStepCode === VISA_REJECTED",
    resultOutcomeValues: ["visa_rejected", "rejected"],
    canDirectClose: true,
    closeReasonRequired: false,
    adminGuidance: "prompt_transition_to_S9",
  },
  APPLICATION_REJECTED: {
    reasonCode: FAILURE_CLOSEOUT_REASON_CODES.APPLICATION_REJECTED,
    label: "入管申請拒否",
    triggerCondition: "resultOutcome === rejected (non-overseas path)",
    resultOutcomeValues: ["rejected"],
    canDirectClose: true,
    closeReasonRequired: false,
    adminGuidance: "prompt_transition_to_S9",
  },
  CLIENT_WITHDRAWN: {
    reasonCode: FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
    label: "依頼人撤回",
    triggerCondition: "resultOutcome === withdrawn",
    resultOutcomeValues: ["withdrawn"],
    canDirectClose: true,
    closeReasonRequired: false,
    adminGuidance: "prompt_transition_to_S9",
  },
  MANUAL_FAILURE_CLOSE: {
    reasonCode: FAILURE_CLOSEOUT_REASON_CODES.MANUAL_FAILURE_CLOSE,
    label: "手動異常結案",
    triggerCondition: "closeReason is provided on transition to S9",
    resultOutcomeValues: [],
    canDirectClose: true,
    closeReasonRequired: true,
    adminGuidance: "require_close_reason_input",
  },
};
function resolveOutcomeAttribution(resultOutcome) {
  if (resultOutcome === null) return null;
  const reasonCode = OUTCOME_TO_REASON[resultOutcome];
  if (!reasonCode) return null;
  const path = Object.values(FAILURE_CLOSEOUT_PATHS).find(
    (p) => p.reasonCode === reasonCode,
  );
  return {
    reasonCode,
    reasonLabel: path?.label ?? reasonCode,
    canDirectClose: path?.canDirectClose ?? true,
    closeReasonRequired: path?.closeReasonRequired ?? false,
  };
}
/**
 * 失敗態帰因を解決する純関数。
 *
 * 優先順位：
 *   1. currentWorkflowStepCode が VISA_REJECTED → VISA_REJECTED
 *   2. resultOutcome が failure outcome マップに存在 → 対応する帰因
 *   3. closeReason が提供されている → MANUAL_FAILURE_CLOSE
 *   4. いずれも不成立 → 帰因不明（null）
 * @param input 案件エンティティと結案理由
 */
export function resolveFailureAttribution(input) {
  const { caseEntity, closeReason } = input;
  if (caseEntity.currentWorkflowStepCode === "VISA_REJECTED") {
    return {
      reasonCode: FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED,
      reasonLabel: FAILURE_CLOSEOUT_PATHS.VISA_REJECTED.label,
      canDirectClose: true,
      closeReasonRequired: false,
    };
  }
  const outcomeAttr = resolveOutcomeAttribution(caseEntity.resultOutcome);
  if (outcomeAttr) return outcomeAttr;
  if (closeReason?.trim()) {
    return {
      reasonCode: FAILURE_CLOSEOUT_REASON_CODES.MANUAL_FAILURE_CLOSE,
      reasonLabel: FAILURE_CLOSEOUT_PATHS.MANUAL_FAILURE_CLOSE.label,
      canDirectClose: true,
      closeReasonRequired: true,
    };
  }
  return null;
}
// ─── 失敗結案チェック（読模型向け）──────────────────────────
const BMV_CASE_TYPE_CODE = "business_manager_visa";
/**
 * 該 case が失敗結案パスに入っているかチェックする。
 *
 * BMV 案件のみ検査。非 BMV 案件は常に { isFailurePath: false }。
 * S9 到達済みの案件も { isFailurePath: false }（既に結案完了）。
 *
 * 判定基準：
 *   - VISA_REJECTED ステップ → failure path
 *   - resultOutcome ∈ failure outcomes → failure path
 *   - それ以外 → failure path ではない
 * @param caseEntity
 */
export function checkFailureCloseout(caseEntity) {
  if (caseEntity.caseTypeCode !== BMV_CASE_TYPE_CODE) {
    return { isFailurePath: false, attribution: null };
  }
  const stage = caseEntity.stage ?? caseEntity.status;
  if (stage === "S9") {
    return { isFailurePath: false, attribution: null };
  }
  const attribution = resolveFailureAttribution({ caseEntity });
  if (attribution) {
    return { isFailurePath: true, attribution };
  }
  return { isFailurePath: false, attribution: null };
}
// ─── Transition guard 向け：失敗結案バイパス判定 ───────────
/**
 * S8→S9 の成功結案門禁バイパス可否を判定。
 *
 * failure outcome が確定している、または closeReason が提供されている場合、
 * 成功結案前置条件（入境確認・在留期間・提醒生成）をバイパスできる。
 *
 * 帰因が不明（attribution === null）で closeReason も未提供の場合、
 * BMV S8 案件は S9 への遷移がブロックされる（帰因要求）。
 * @param caseEntity
 * @param closeReason
 */
export function canBypassSuccessCloseoutForFailure(caseEntity, closeReason) {
  const attribution = resolveFailureAttribution({
    caseEntity,
    closeReason,
  });
  return attribution !== null;
}
// ─── エラーコード ────────────────────────────────────────────
export const FAILURE_CLOSEOUT_ERROR_CODES = {
  ATTRIBUTION_REQUIRED: "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
};
//# sourceMappingURL=cases.types-failure-closeout.js.map
