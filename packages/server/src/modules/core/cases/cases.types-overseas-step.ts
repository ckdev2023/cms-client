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

import type { P0Stage } from "./cases.workflow-step";

// ─── 步骤编码常量 ──────────────────────────────────────────────

export const OVERSEAS_STEP_CODES = {
  COE_SENT: "COE_SENT",
  VISA_APPLYING: "VISA_APPLYING",
  ENTRY_SUCCESS: "ENTRY_SUCCESS",
  VISA_REJECTED: "VISA_REJECTED",
} as const;

/**
 *
 */
export type OverseasStepCode =
  (typeof OVERSEAS_STEP_CODES)[keyof typeof OVERSEAS_STEP_CODES];

// ─── 步骤 → P0 阶段映射（冻结口径，与 BMV_STEP_TO_STAGE 一致）────

export const OVERSEAS_STEP_PARENT_STAGE: Readonly<
  Record<OverseasStepCode, P0Stage>
> = {
  COE_SENT: "S7",
  VISA_APPLYING: "S7",
  ENTRY_SUCCESS: "S8",
  VISA_REJECTED: "S9",
};

// ─── 步骤流转矩阵（冻结口径，与 BMV_STEP_TRANSITIONS 一致）────

export const OVERSEAS_STEP_TRANSITIONS: Readonly<
  Record<OverseasStepCode, readonly OverseasStepCode[]>
> = {
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
export const OVERSEAS_TERMINAL_STEPS: ReadonlySet<OverseasStepCode> = new Set([
  "VISA_REJECTED",
]);

// ─── 前置条件与门禁 ──────────────────────────────────────────

/**
 * COE_SENT 步骤前置条件。
 *
 * billingGate: block + final_payment
 * → 尾款未结清时硬阻断，不允许风险确认后继续。
 * → 运行时逻辑由 assertWorkflowStepBillingGate 执行。
 *
 * 前驱步骤: WAITING_PAYMENT → COE_SENT
 */
export type CoeSentPreconditions = {
  billingGate: {
    mode: "block";
    milestone: "final_payment";
  };
  previousStep: "WAITING_PAYMENT";
};

/**
 * VISA_APPLYING 步骤前置条件。
 *
 * 无收费门禁。
 * 前驱步骤: COE_SENT → VISA_APPLYING
 */
export type VisaApplyingPreconditions = {
  billingGate: null;
  previousStep: "COE_SENT";
};

/**
 * ENTRY_SUCCESS 步骤前置条件。
 *
 * 无收费门禁。
 * 前驱步骤: VISA_APPLYING → ENTRY_SUCCESS
 */
export type EntrySuccessPreconditions = {
  billingGate: null;
  previousStep: "VISA_APPLYING";
};

/**
 * VISA_REJECTED 步骤前置条件。
 *
 * 无收费门禁。终态步骤。
 * 前驱步骤: VISA_APPLYING → VISA_REJECTED
 *           UNDER_REVIEW → VISA_REJECTED（直接拒否路径）
 */
export type VisaRejectedPreconditions = {
  billingGate: null;
  previousSteps: readonly ["VISA_APPLYING", "UNDER_REVIEW"];
  isTerminal: true;
};

// ─── 写入契约（Write Contracts）──────────────────────────────

/**
 * 海外返签步骤写入契约统一入口类型。
 *
 * 写入路径有两条：
 *   1. WorkflowStepTransition: POST /cases/:id/workflow-step-transition
 *      → input: { toStepCode: string }
 *      → 只更新 current_workflow_step_code
 *      → 自动打戳由 service 处理
 *
 *   2. PostApprovalStage: POST /cases/:id/post-approval-stage
 *      → input: { stage: string } (lowercase: coe_sent / overseas_visa_applying / entry_success)
 *      → 更新 post_approval_stage + metadata.post_approval_stage
 *      → 自动打时间戳（overseas_visa_start_at / entry_confirmed_at）
 *
 * 两条路径在 P1 启用 CaseWorkflowStep 后应统一由路径 1 驱动。
 */
export type OverseasStepWriteContract = {
  workflowStepTransition: {
    endpoint: "POST /cases/:id/workflow-step-transition";
    input: { toStepCode: OverseasStepCode };
    validationRules: {
      mustBeBmvCase: true;
      mustSatisfyStepTransitionMatrix: true;
      mustSatisfyParallelBoundary: true;
      mustSatisfyBillingGate: "COE_SENT only";
    };
  };
  postApprovalStage: {
    endpoint: "POST /cases/:id/post-approval-stage";
    input: { stage: PostApprovalOverseasStage };
    validationRules: {
      mustBeValidPostApprovalStage: true;
      mustSatisfyBillingGate: "coe_sent only";
    };
  };
};

/**
 * post-approval-stage 端点使用的海外阶段值（小写蛇形）。
 *
 * 与 POST_APPROVAL_STAGES set 对齐。
 */
export type PostApprovalOverseasStage =
  | "coe_sent"
  | "overseas_visa_applying"
  | "entry_success";

/**
 * PostApprovalStage → OverseasStepCode 映射。
 *
 * post-approval 端点使用 lowercase，workflowStep 使用 UPPER_SNAKE。
 */
export const POST_APPROVAL_TO_STEP_CODE: Readonly<
  Record<PostApprovalOverseasStage, OverseasStepCode>
> = {
  coe_sent: "COE_SENT",
  overseas_visa_applying: "VISA_APPLYING",
  entry_success: "ENTRY_SUCCESS",
};

// ─── 自动打戳口径（Auto-stamp Contracts）───────────────────────

/**
 * 各步骤写入时自动填充的时间戳字段口径。
 *
 * 规则：仅在目标字段为 null 时首次写入（幂等）。
 * 时间源：数据库 now()（事务内一致性）。
 *
 * COE_SENT:
 *   → coeSentAt: 认定证明书送付时间（通过 postApprovalStage 路径时隐式写入）
 *
 * VISA_APPLYING:
 *   → overseasVisaStartAt: 海外签证申请开始时间
 *
 * ENTRY_SUCCESS:
 *   → entryConfirmedAt: 入境确认时间
 *
 * VISA_REJECTED:
 *   → 无自动打戳（终态由 result_outcome / close_reason 承载）
 */
export type OverseasStepAutoStampContract = {
  COE_SENT: {
    column: "coe_sent_at";
    tsField: "coeSentAt";
    stampCondition: "first_write_only";
    timeSource: "db_now";
  };
  VISA_APPLYING: {
    column: "overseas_visa_start_at";
    tsField: "overseasVisaStartAt";
    stampCondition: "first_write_only";
    timeSource: "db_now";
  };
  ENTRY_SUCCESS: {
    column: "entry_confirmed_at";
    tsField: "entryConfirmedAt";
    stampCondition: "first_write_only";
    timeSource: "db_now";
  };
  VISA_REJECTED: null;
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
} as const;

// ─── 读模型契约（Read Contracts）──────────────────────────────

/**
 * 海外返签步骤读模型 — 嵌入 CaseDetailAggregateDto。
 *
 * 通过 WorkflowStepSummary 传达当前步骤、允许的流转、收费门禁。
 * 通过 Case 实体传达自动打戳字段的值。
 *
 * admin 消费者应同时读取：
 *   1. workflowStep.currentStepCode → 显示当前业务子步骤
 *   2. case.coeSentAt / case.overseasVisaStartAt / case.entryConfirmedAt
 *      → 显示时间线上的关键日期
 *   3. workflowStep.billingGate → COE_SENT 时显示尾款阻断状态
 *   4. workflowStep.isTerminal → VISA_REJECTED 时显示终态
 *   5. workflowStep.allowedNextSteps → 渲染可操作按钮
 */
export type OverseasStepReadContract = {
  workflowStepSummary: {
    currentStepCode: OverseasStepCode;
    currentStepLabel: string;
    parentStage: P0Stage;
    sortOrder: number;
    isTerminal: boolean;
    allowedNextSteps: readonly string[];
    billingGate: { mode: "block"; milestone: "final_payment" } | null;
  };
  caseTimestampFields: {
    coeSentAt: string | null;
    overseasVisaStartAt: string | null;
    entryConfirmedAt: string | null;
  };
};

/**
 * 每个海外步骤的读模型快照 — 冻结 admin 消费时的预期字段值。
 */
export const OVERSEAS_STEP_READ_SNAPSHOTS: Readonly<
  Record<
    OverseasStepCode,
    {
      parentStage: P0Stage;
      sortOrder: number;
      isTerminal: boolean;
      allowedNextSteps: readonly string[];
      billingGate: { mode: "block"; milestone: "final_payment" } | null;
    }
  >
> = {
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
} as const;

/**
 *
 */
export type OverseasTimelineAction =
  (typeof OVERSEAS_TIMELINE_ACTIONS)[keyof typeof OVERSEAS_TIMELINE_ACTIONS];

/**
 * 步骤流转时间线写入载荷规格。
 *
 * 通过 workflowStepTransition 路径写入：
 *   action: case.workflow_step_transitioned
 *   payload: { from: string | null, to: string }
 *
 * 通过 postApprovalStage 路径写入：
 *   action: case.post_approval_stage_changed
 *   payload: { from: string | null, to: string }
 */
export type OverseasStepTimelinePayload = {
  from: string | null;
  to: string;
};

/**
 * 各步骤的时间线写入规格 — 冻结 admin timeline tab 的消费口径。
 *
 * admin 时间线 adapter 通过 action + payload.to 判定显示文案：
 *
 * | 步骤            | action                                | payload.to          | 描述              |
 * |----------------|---------------------------------------|---------------------|-------------------|
 * | COE_SENT       | case.workflow_step_transitioned       | COE_SENT            | 认定证明书已送付   |
 * | VISA_APPLYING  | case.workflow_step_transitioned       | VISA_APPLYING       | 海外签证流程中（`overseas_visa_start_at` 列首次打戳；`writeOverseasStepTimeline` 不追加本条） |
 * | ENTRY_SUCCESS  | case.workflow_step_transitioned       | ENTRY_SUCCESS       | 入境成功确认       |
 * | VISA_REJECTED  | case.workflow_step_transitioned       | VISA_REJECTED       | 签证申请被拒否     |
 * | COE_SENT       | case.post_approval_stage_changed      | coe_sent            | (legacy) COE 送付  |
 * | VISA_APPLYING  | case.post_approval_stage_changed      | overseas_visa_applying | (legacy) 海外返签  |
 * | ENTRY_SUCCESS  | case.post_approval_stage_changed      | entry_success       | (legacy) 入境成功  |
 *
 * 额外事件（由 service 在步骤流转后追加写入）：
 *
 * | 事件               | action                        | payload                          |
 * |-------------------|-------------------------------|----------------------------------|
 * | 签证拒否结案归因    | case.overseas_visa_rejected   | { stepCode, resultOutcome, ... } |
 * | 入境确认           | case.overseas_entry_confirmed | { entryConfirmedAt }（仅 ENTRY_SUCCESS 之后由 `writeOverseasStepTimeline` 写入） |
 */
export type OverseasStepTimelineSpec = {
  COE_SENT: {
    primaryAction: "case.workflow_step_transitioned";
    legacyAction: "case.post_approval_stage_changed";
    payload: OverseasStepTimelinePayload;
  };
  VISA_APPLYING: {
    primaryAction: "case.workflow_step_transitioned";
    legacyAction: "case.post_approval_stage_changed";
    payload: OverseasStepTimelinePayload;
  };
  ENTRY_SUCCESS: {
    primaryAction: "case.workflow_step_transitioned";
    legacyAction: "case.post_approval_stage_changed";
    payload: OverseasStepTimelinePayload;
    autoStampTimeline: {
      action: "case.overseas_entry_confirmed";
      payload: { entryConfirmedAt: string };
    };
  };
  VISA_REJECTED: {
    primaryAction: "case.workflow_step_transitioned";
    legacyAction: null;
    payload: OverseasStepTimelinePayload;
    closureTimeline: {
      action: "case.overseas_visa_rejected";
      payload: {
        stepCode: "VISA_REJECTED";
        resultOutcome: string | null;
        closeReason: string | null;
      };
    };
  };
};

// ─── 海外拒签失败结案口径 ────────────────────────────────────

/**
 * VISA_REJECTED 失败结案关联口径。
 *
 * 海外拒签后案件应收敛到失败结案分支：
 *   - parentStage = S9（由 BMV_STEP_TO_STAGE 决定）
 *   - resultOutcome 建议填充 rejected / visa_rejected
 *   - closeReason 由操作人手动填写或系统默认
 *   - 不允许从 VISA_REJECTED 流转到任何后续步骤
 *
 * 此口径不强制在 transitionWorkflowStep 中同步修改 Case.stage，
 * 但 admin 应在步骤流转为 VISA_REJECTED 后引导操作人推进 S9。
 */
export type VisaRejectedClosureContract = {
  terminalStepCode: "VISA_REJECTED";
  targetParentStage: "S9";
  suggestedResultOutcome: "rejected" | "visa_rejected";
  closeReasonRequired: false;
  autoTransitionToS9: false;
  adminGuidance: "prompt_user_to_transition_to_S9";
};

/**
 * VISA_REJECTED 结案引导常量。
 */
export const VISA_REJECTED_CLOSURE = {
  terminalStepCode: "VISA_REJECTED",
  targetParentStage: "S9",
  suggestedResultOutcomes: ["rejected", "visa_rejected"] as const,
  autoTransitionToS9: false,
} as const;

// ─── ENTRY_SUCCESS 后续口径 ──────────────────────────────────

/**
 * ENTRY_SUCCESS 后续链路口径。
 *
 * 入境成功后启用：
 *   1. ENTRY_SUCCESS → RESIDENCE_PERIOD_RECORDED（下一步骤）
 *   2. 必须录入 ResidencePeriod（成功结案前置条件）
 *   3. 自动打戳 entryConfirmedAt
 *
 * 此口径冻结后续链路入口，不提前实现 ResidencePeriod 模块。
 */
export type EntrySuccessFollowUpContract = {
  nextStep: "RESIDENCE_PERIOD_RECORDED";
  requiredBeforeSuccessClose: {
    residencePeriodRecorded: true;
    renewalReminderScheduled: true;
  };
  autoStamp: {
    entryConfirmedAt: "db_now_on_first_write";
  };
};

export const ENTRY_SUCCESS_FOLLOW_UP = {
  nextStep: "RESIDENCE_PERIOD_RECORDED",
  requiredBeforeSuccessClose: {
    residencePeriodRecorded: true,
    renewalReminderScheduled: true,
  },
} as const;
