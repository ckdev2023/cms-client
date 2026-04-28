// ────────────────────────────────────────────────────────────────
// P1 final_payment 节点契約 — 读模型、计费真相源与守卫输入口径
//
// final_payment 是经营管理签（BMV）模板中 COE_SENT 步骤前
// 的收费阻断节点。此文件冻结三层契约：
//
//   1. 读模型（FinalPaymentNodeReadModel）
//      admin 页面消费的字段结构，嵌入 billing summary / overview
//
//   2. 计费真相源（FinalPaymentSourceOfTruth）
//      定义 final_payment 结清判定的数据来源与计算口径
//
//   3. 守卫输入口径（FinalPaymentGuardInput / FinalPaymentGuardOutput）
//      COE_SENT 步骤级与 post-approval 阶段级门禁的输入输出
//
// 权威来源：
//   - P1/01 §3 M6（尾款与 COE 守卫）
//   - P1/02 §3.3 table row 47（core/billing + core/cases）
//   - 计划 §P1-B（Step 15–20）: gate_trigger_step=COE_SENT, gate_effect_mode=block
//   - billingGuards.ts（运行时逻辑参照）
//   - billingEntities.ts（BillingPlan + BillingGateEffectMode）
//   - bmvTemplateConfig.ts（COE_SENT billingGate 蓝图定义）
//
// 分层边界：
//   - P0 收费阻断默认 warn，允许风险确认后继续
//   - P1 COE_SENT 使用 block，尾款未结清直接阻断
//   - 此文件只定义契约形状，不包含运行时逻辑
//   - 运行时逻辑位于 billingGuards.ts + cases.service.ts
// ────────────────────────────────────────────────────────────────

import type {
  BillingGateEffectMode,
  BillingPlanStatus,
} from "../model/billingEntities";

// ─── 常量 ────────────────────────────────────────────────────────

/**
 * final_payment 里程碑标识。
 *
 * 在 BMV 模板的 workflowStepsBlueprint 中，
 * COE_SENT.billingGate.milestone 使用此值。
 *
 * billingGuards.isFinalPaymentMilestone 按关键词匹配（尾款/final/結果），
 * 此常量作为程序化引用的唯一入口。
 */
export const FINAL_PAYMENT_MILESTONE = "final_payment" as const;

/**
 * 触发 final_payment 守卫的步骤编码。
 *
 * 只有流转目标为此步骤时才执行尾款守卫检查。
 */
export const FINAL_PAYMENT_GATE_TRIGGER_STEP = "COE_SENT" as const;

/**
 * final_payment 守卫的默认效果模式。
 *
 * BMV 模板 billingGateMode=block → COE_SENT 前尾款未结清时硬阻断。
 * P0 模板无此步骤，不触发此守卫。
 */
export const FINAL_PAYMENT_DEFAULT_GATE_MODE: BillingGateEffectMode = "block";

/**
 * 尾款里程碑匹配关键词。
 *
 * billingGuards.isFinalPaymentMilestone 使用 lower(milestone_name) LIKE 匹配。
 * 此数组冻结匹配口径，admin 创建节点时引导用户包含这些关键词。
 */
export const FINAL_PAYMENT_MILESTONE_KEYWORDS = [
  "尾款",
  "final",
  "結果",
] as const;

/**
 * 签约金（deposit）里程碑匹配关键词 — 对照参考。
 *
 * billingGuards.isDepositMilestone 使用 lower(milestone_name) LIKE 匹配。
 */
export const DEPOSIT_MILESTONE_KEYWORDS = ["签约", "deposit", "着手"] as const;

// ─── 读模型：FinalPaymentNodeReadModel ──────────────────────────

/**
 * final_payment 节点读模型 — admin billing tab / overview 消费。
 *
 * 数据来源：billing_records 表中 milestone_name 匹配尾款关键词的行，
 * 聚合关联的 valid payment_records。
 *
 * 字段语义：
 * - `milestoneMatched`: 是否存在匹配的 billing_records 行
 * - `planCount`: 匹配的收费计划节点数（通常 1，但允许多节点合并判定）
 * - `totalDue`: 应收总额
 * - `totalReceived`: 已收总额（仅 valid payment_records）
 * - `unpaidAmount`: 未收总额（totalDue - totalReceived, ≥ 0）
 * - `settled`: 所有匹配节点的 status 均为 paid
 * - `gateEffectMode`: 聚合后的最严模式（任一节点 block → block，否则 warn/off）
 * - `plans`: 匹配节点的摘要列表
 */
export type FinalPaymentNodeReadModel = {
  milestoneMatched: boolean;
  planCount: number;
  totalDue: number;
  totalReceived: number;
  unpaidAmount: number;
  settled: boolean;
  gateEffectMode: BillingGateEffectMode;
  plans: FinalPaymentPlanSummary[];
};

/**
 * 匹配的收费计划节点摘要。
 */
export type FinalPaymentPlanSummary = {
  id: string;
  milestoneName: string | null;
  amountDue: number;
  status: BillingPlanStatus;
  gateEffectMode: BillingGateEffectMode;
  dueDate: string | null;
};

// ─── 计费真相源：FinalPaymentSourceOfTruth ───────────────────────

/**
 * final_payment 计费真相源 — 定义数据来源、计算口径与缓存同步协议。
 *
 * 此类型为结构化文档契约，由 admin adapter 与 service 层共同引用。
 *
 * 数据来源层级：
 *   1. billing_records（主表，milestone_name 关键词匹配）
 *   2. payment_records（从表，record_status='valid' 参与汇总）
 *   3. cases 缓存列（final_payment_paid_cached, billing_unpaid_amount_cached）
 *
 * 缓存同步：
 *   billingGuards.syncBillingCacheForCase() 在回款/收费变更后调用，
 *   将聚合结果同步到 cases 行的缓存字段。
 */
export type FinalPaymentSourceOfTruth = {
  primaryTable: "billing_records";
  milestoneMatchStrategy: "keyword_like";
  milestoneMatchKeywords: readonly string[];
  paymentTable: "payment_records";
  paymentStatusFilter: "valid";
  cacheTarget: "cases";
  cacheFields: {
    finalPaymentPaid: "final_payment_paid_cached";
    unpaidAmount: "billing_unpaid_amount_cached";
  };
  syncFunction: "billingGuards.syncBillingCacheForCase";
  settledCondition: "all matched billing_records.status = 'paid'";
  gateModePrecedence: "block > warn > off";
};

/**
 * 冻结的 final_payment 计费真相源实例。
 *
 * 下游代码引用此常量验证真相源口径一致性。
 */
export const FINAL_PAYMENT_SOURCE_OF_TRUTH: FinalPaymentSourceOfTruth = {
  primaryTable: "billing_records",
  milestoneMatchStrategy: "keyword_like",
  milestoneMatchKeywords: FINAL_PAYMENT_MILESTONE_KEYWORDS,
  paymentTable: "payment_records",
  paymentStatusFilter: "valid",
  cacheTarget: "cases",
  cacheFields: {
    finalPaymentPaid: "final_payment_paid_cached",
    unpaidAmount: "billing_unpaid_amount_cached",
  },
  syncFunction: "billingGuards.syncBillingCacheForCase",
  settledCondition: "all matched billing_records.status = 'paid'",
  gateModePrecedence: "block > warn > off",
};

// ─── 守卫输入口径：FinalPaymentGuardInput ────────────────────────

/**
 * final_payment 守卫检查输入 — 喂入 billingGuards.checkFinalPaymentGuard。
 *
 * 触发条件：
 *   - 子步骤流转目标为 COE_SENT（assertWorkflowStepBillingGate）
 *   - post-approval 阶段推进至 coe_sent（assertPostApprovalBillingGate）
 *
 * 输入来源：
 *   - caseId：从流转/推进请求中获取
 *   - tx：事务连接（billingGuards 内部查询 billing_records + payment_records）
 */
export type FinalPaymentGuardInput = {
  caseId: string;
  triggerSource: "workflow_step_transition" | "post_approval_stage";
  targetStepCode: string | null;
  targetPostApprovalStage: string | null;
};

/**
 * final_payment 守卫检查输出。
 *
 * 对齐 billingGuards.FinalPaymentGuardResult：
 *   - null：无尾款节点或全部 gate_effect_mode=off → 不阻断
 *   - settled=true：尾款已结清 → 通过
 *   - settled=false：尾款未结清
 *     - gateEffectMode=block → P1 硬阻断（HTTP 400）
 *     - gateEffectMode=warn → P0 允许但需风险确认留痕
 */
export type FinalPaymentGuardOutput =
  | { result: "no_guard"; reason: "no_final_payment_plans" | "all_off" }
  | { result: "passed"; reason: "settled" }
  | {
      result: "blocked";
      gateEffectMode: "block";
      unpaid: number;
      errorCode: typeof FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_BLOCKED;
    }
  | {
      result: "warn";
      gateEffectMode: "warn";
      unpaid: number;
      requiresRiskAck: true;
      errorCode: typeof FINAL_PAYMENT_GUARD_ERROR_CODES.BILLING_RISK_UNACKNOWLEDGED;
    };

/**
 * final_payment 守卫相关的错误码。
 *
 * 对齐 CASE_WRITE_ERROR_CODES 中的对应项。
 */
export const FINAL_PAYMENT_GUARD_ERROR_CODES = {
  BILLING_BLOCKED: "CASE_POST_APPROVAL_BILLING_BLOCKED",
  BILLING_RISK_UNACKNOWLEDGED: "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
  WORKFLOW_STEP_BILLING_BLOCKED: "CASE_WORKFLOW_STEP_BILLING_BLOCKED",
} as const;

// ─── 守卫决策规则 ────────────────────────────────────────────────

/**
 * final_payment 守卫决策规则 — 纯函数，不访问 DB。
 *
 * 接受 billingGuards.checkFinalPaymentGuard 的运行时结果，
 * 以及案件当前的风险确认状态，输出守卫决策。
 *
 * 决策矩阵：
 *   | guardResult    | gateMode | riskAcked | → decision        |
 *   |---------------|----------|-----------|-------------------|
 *   | null          | -        | -         | no_guard (通过)    |
 *   | settled=true  | -        | -         | passed (通过)      |
 *   | settled=false | block    | -         | blocked (阻断)     |
 *   | settled=false | warn     | true      | passed (已确认)    |
 *   | settled=false | warn     | false     | warn (需确认)      |
 *
 * @param guardResult billingGuards.checkFinalPaymentGuard 运行时结果
 * @param billingRiskAcknowledged 案件是否已完成欠款风险确认
 * @returns 守卫决策
 */
export function decideFinalPaymentGuard(
  guardResult: FinalPaymentGuardCheckResult | null,
  billingRiskAcknowledged: boolean,
): FinalPaymentGuardDecision {
  if (guardResult === null) {
    return { decision: "pass", reason: "no_final_payment_guard" };
  }

  if (guardResult.settled) {
    return { decision: "pass", reason: "settled" };
  }

  if (guardResult.gateEffectMode === "block") {
    return {
      decision: "block",
      reason: "final_payment_unpaid_block",
      unpaid: guardResult.unpaid,
    };
  }

  if (billingRiskAcknowledged) {
    return { decision: "pass", reason: "risk_acknowledged" };
  }

  return {
    decision: "warn_requires_ack",
    reason: "final_payment_unpaid_warn",
    unpaid: guardResult.unpaid,
  };
}

/**
 * billingGuards.checkFinalPaymentGuard 运行时结果简化形状。
 *
 * 从 billingGuards.FinalPaymentGuardResult 对齐，
 * 此处重新定义以避免 cases 类型层对 billingGuards 的运行时依赖。
 */
export type FinalPaymentGuardCheckResult =
  | { settled: true }
  | { settled: false; unpaid: number; gateEffectMode: BillingGateEffectMode };

/**
 * decideFinalPaymentGuard 输出。
 */
export type FinalPaymentGuardDecision =
  | {
      decision: "pass";
      reason: "no_final_payment_guard" | "settled" | "risk_acknowledged";
    }
  | { decision: "block"; reason: "final_payment_unpaid_block"; unpaid: number }
  | {
      decision: "warn_requires_ack";
      reason: "final_payment_unpaid_warn";
      unpaid: number;
    };
