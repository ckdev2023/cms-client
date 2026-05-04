// ────────────────────────────────────────────────────────────────
// P1 海外返签步骤契約 — COE_SENT / VISA_APPLYING / ENTRY_SUCCESS / VISA_REJECTED
//
// 四个步骤覆盖经営管理签 Step 16–18 的 server 读写口径与时间线口径。
//
// 分层边界：
//   - 四个步骤均为 CaseWorkflowStep（P1 业务子步骤），
//     不污染 P0 的 Case.stage = S1-S9
//   - COE_SENT 前置 billingGate = block（尾款未结清硬阻断）
//   - VISA_REJECTED 是终态步骤（无后续流转）
//   - 各步骤的自动打戳与时间线写入在 cases.service.ts 中执行
//
// 权威来源：
//   - P1/01 §3 M6–M7（COE 守卫、海外返签与结果）
//   - P1/02 §3.3（core/cases M7 server tasks）
//   - cases.workflow-step.ts（BMV_STEP_TO_STAGE, BMV_STEP_TRANSITIONS）
//   - cases.template-bmv.ts（BMV_WORKFLOW_STEPS_BLUEPRINT）
//   - cases.types-final-payment.ts（COE_SENT billing gate）
//   - cases.service.ts（transitionWorkflowStep, updatePostApprovalStage）
// ────────────────────────────────────────────────────────────────
// ─── 步骤编码常量 ──────────────────────────────────────────────
export const OVERSEAS_STEP_CODES = {
  COE_SENT: "COE_SENT",
  VISA_APPLYING: "VISA_APPLYING",
  ENTRY_SUCCESS: "ENTRY_SUCCESS",
  VISA_REJECTED: "VISA_REJECTED",
};
// ─── 步骤 → P0 阶段映射（冻结口径，与 BMV_STEP_TO_STAGE 一致）────
export const OVERSEAS_STEP_PARENT_STAGE = {
  COE_SENT: "S7",
  VISA_APPLYING: "S7",
  ENTRY_SUCCESS: "S8",
  VISA_REJECTED: "S9",
};
// ─── 步骤流转矩阵（冻结口径，与 BMV_STEP_TRANSITIONS 一致）────
export const OVERSEAS_STEP_TRANSITIONS = {
  COE_SENT: ["VISA_APPLYING"],
  VISA_APPLYING: ["ENTRY_SUCCESS", "VISA_REJECTED"],
  ENTRY_SUCCESS: [],
  VISA_REJECTED: [],
};
/**
 * 海外返签终态步骤集合。
 *
 * VISA_REJECTED 是全局终态（对应 S9）。
 * ENTRY_SUCCESS 不是终态 — 后续可进入 RESIDENCE_PERIOD_RECORDED。
 */
export const OVERSEAS_TERMINAL_STEPS = new Set(["VISA_REJECTED"]);
/**
 * PostApprovalStage → OverseasStepCode 映射。
 *
 * post-approval 端点使用 lowercase，workflowStep 使用 UPPER_SNAKE。
 */
export const POST_APPROVAL_TO_STEP_CODE = {
  coe_sent: "COE_SENT",
  overseas_visa_applying: "VISA_APPLYING",
  entry_success: "ENTRY_SUCCESS",
};
/**
 * 自动打戳字段 → 步骤映射（运行时查表用）。
 */
export const OVERSEAS_STEP_AUTO_STAMP_FIELDS = {
  COE_SENT: { column: "coe_sent_at", tsField: "coeSentAt" },
  VISA_APPLYING: {
    column: "overseas_visa_start_at",
    tsField: "overseasVisaStartAt",
  },
  ENTRY_SUCCESS: { column: "entry_confirmed_at", tsField: "entryConfirmedAt" },
  VISA_REJECTED: null,
};
/**
 * 每个海外步骤的读模型快照 — 冻结 admin 消费时的预期字段值。
 */
export const OVERSEAS_STEP_READ_SNAPSHOTS = {
  COE_SENT: {
    parentStage: "S7",
    sortOrder: 10,
    isTerminal: false,
    allowedNextSteps: ["VISA_APPLYING"],
    billingGate: { mode: "block", milestone: "final_payment" },
  },
  VISA_APPLYING: {
    parentStage: "S7",
    sortOrder: 11,
    isTerminal: false,
    allowedNextSteps: ["ENTRY_SUCCESS", "VISA_REJECTED"],
    billingGate: null,
  },
  ENTRY_SUCCESS: {
    parentStage: "S8",
    sortOrder: 12,
    isTerminal: false,
    allowedNextSteps: ["RESIDENCE_PERIOD_RECORDED"],
    billingGate: null,
  },
  VISA_REJECTED: {
    parentStage: "S9",
    sortOrder: 13,
    isTerminal: true,
    allowedNextSteps: [],
    billingGate: null,
  },
};
// ─── 时间线契约（Timeline Contracts）──────────────────────────
/**
 * 海外返签步骤相关的时间线 action 枚举。
 *
 * 所有步骤流转统一使用 `case.workflow_step_transitioned`。
 * postApprovalStage 路径使用 `case.post_approval_stage_changed`。
 *
 * payload 结构冻结如下。
 */
export const OVERSEAS_TIMELINE_ACTIONS = {
  WORKFLOW_STEP_TRANSITIONED: "case.workflow_step_transitioned",
  POST_APPROVAL_STAGE_CHANGED: "case.post_approval_stage_changed",
  VISA_REJECTED_CLOSURE: "case.overseas_visa_rejected",
  ENTRY_CONFIRMED: "case.overseas_entry_confirmed",
};
/**
 * VISA_REJECTED 结案引导常量。
 */
export const VISA_REJECTED_CLOSURE = {
  terminalStepCode: "VISA_REJECTED",
  targetParentStage: "S9",
  suggestedResultOutcomes: ["rejected", "visa_rejected"],
  autoTransitionToS9: false,
};
export const ENTRY_SUCCESS_FOLLOW_UP = {
  nextStep: "RESIDENCE_PERIOD_RECORDED",
  requiredBeforeSuccessClose: {
    residencePeriodRecorded: true,
    renewalReminderScheduled: true,
  },
};
//# sourceMappingURL=cases.types-overseas-step.js.map
