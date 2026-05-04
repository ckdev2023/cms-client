/**
 * P1 CaseWorkflowStep — 经营管理签业务子步骤枚举、阶段映射与 S1-S9 并行边界。
 *
 * 设计原则（对齐计划 §分层边界）：
 *   - Case.stage = S1-S9 在 P0/P1 中都保持不变，驱动报表/仪表盘/Gate/SLA
 *   - CaseWorkflowStep 承接经营管理签业务细步骤，不允许把 COE_SENT、VISA_APPLYING
 *     等细步骤直接塞回 Case.stage
 *   - 两层必须并存而不混用
 *
 * 权威来源：
 *   - 计划 §分层边界
 *   - P1/01 §2（Step 1–20）
 *   - p1-sv-000-01 §4–§5
 *   - bmvTemplateConfig.ts（BMV 模板蓝图）
 */
// ── P0 管理层阶段 ──
export const P0_STAGES = ["S1", "S2", "S3", "S4", "S5", "S6", "S7", "S8", "S9"];
const P0_STAGE_SET = new Set(P0_STAGES);
/**
 * 判断字符串是否为合法 P0 管理层阶段。
 * @param value 待判断值
 * @returns 是否为 S1-S9
 */
export function isP0Stage(value) {
  return P0_STAGE_SET.has(value);
}
// ── BMV 子步骤枚举 ──
export const BMV_WORKFLOW_STEP_ENUM = [
  "WAITING_MATERIAL",
  "MATERIAL_PREPARING",
  "REVIEWING",
  "APPLYING",
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
  "APPROVED",
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
  "ENTRY_SUCCESS",
  "VISA_REJECTED",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
];
const BMV_STEP_SET = new Set(BMV_WORKFLOW_STEP_ENUM);
/**
 * 判断字符串是否为合法 BMV 子步骤编码。
 * @param value 待判断值
 * @returns 是否为 BMV 子步骤
 */
export function isBmvWorkflowStep(value) {
  return BMV_STEP_SET.has(value);
}
// ── parentStage 映射（step → S1-S9）──
/**
 * BMV 子步骤 → P0 管理层阶段的映射。
 *
 * 每个子步骤都必须映射到恰好一个 P0 阶段。
 * 阶段变更由 P0 Gate 机制驱动，不由子步骤反向触发。
 *
 * 映射口径：
 *   S2: 等待资料
 *   S3: 资料准备
 *   S4: 内部审核
 *   S5: 申请/审查/补正
 *   S6: 已下签
 *   S7: 尾款/COE/海外返签
 *   S8: 入境成功/在留期间/续签提醒
 *   S9: 签证拒否（终态）
 */
export const BMV_STEP_TO_STAGE = {
  WAITING_MATERIAL: "S2",
  MATERIAL_PREPARING: "S3",
  REVIEWING: "S4",
  APPLYING: "S5",
  UNDER_REVIEW: "S5",
  NEED_SUPPLEMENT: "S5",
  SUPPLEMENT_PROCESSING: "S5",
  APPROVED: "S6",
  WAITING_PAYMENT: "S7",
  COE_SENT: "S7",
  VISA_APPLYING: "S7",
  ENTRY_SUCCESS: "S8",
  VISA_REJECTED: "S9",
  RESIDENCE_PERIOD_RECORDED: "S8",
  RENEWAL_REMINDER_SCHEDULED: "S8",
};
/**
 * 根据 BMV 子步骤编码返回对应的 P0 管理层阶段。
 * @param stepCode BMV 子步骤编码
 * @returns 对应的 P0 阶段
 */
export function resolveParentStage(stepCode) {
  return BMV_STEP_TO_STAGE[stepCode];
}
function buildStageToStepsMap() {
  const map = {};
  for (const stage of P0_STAGES) {
    map[stage] = [];
  }
  for (const step of BMV_WORKFLOW_STEP_ENUM) {
    const stage = BMV_STEP_TO_STAGE[step];
    map[stage].push(step);
  }
  return map;
}
export const BMV_STAGE_TO_STEPS = buildStageToStepsMap();
// ── 子步骤流转规则 ──
/**
 * BMV 子步骤允许的流转矩阵。
 *
 * 与 P0 的 DEFAULT_CASE_TRANSITIONS 并行存在：
 *   - P0 transitions 驱动 Case.stage 变更
 *   - 此矩阵驱动 CaseWorkflowStep 变更
 *   - 子步骤变更不会自动触发 P0 阶段变更
 *   - P0 阶段变更可在必要时同步推进子步骤
 *
 * canLoopTo 支持补正循环：
 *   NEED_SUPPLEMENT ↔ SUPPLEMENT_PROCESSING ↔ UNDER_REVIEW
 */
export const BMV_STEP_TRANSITIONS = {
  WAITING_MATERIAL: ["MATERIAL_PREPARING"],
  MATERIAL_PREPARING: ["REVIEWING"],
  REVIEWING: ["APPLYING"],
  APPLYING: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["NEED_SUPPLEMENT", "APPROVED", "VISA_REJECTED"],
  NEED_SUPPLEMENT: ["SUPPLEMENT_PROCESSING"],
  SUPPLEMENT_PROCESSING: ["UNDER_REVIEW"],
  APPROVED: ["WAITING_PAYMENT"],
  WAITING_PAYMENT: ["COE_SENT"],
  COE_SENT: ["VISA_APPLYING"],
  VISA_APPLYING: ["ENTRY_SUCCESS", "VISA_REJECTED"],
  ENTRY_SUCCESS: ["RESIDENCE_PERIOD_RECORDED"],
  VISA_REJECTED: [],
  RESIDENCE_PERIOD_RECORDED: ["RENEWAL_REMINDER_SCHEDULED"],
  RENEWAL_REMINDER_SCHEDULED: [],
};
/**
 * 判断 BMV 子步骤流转是否合法。
 * @param from 当前子步骤
 * @param to 目标子步骤
 * @returns 是否允许流转
 */
export function isValidStepTransition(from, to) {
  const allowed = BMV_STEP_TRANSITIONS[from];
  return allowed.includes(to);
}
/**
 * 检查子步骤与当前 P0 阶段的并行边界兼容性。
 *
 * 终态步骤（如 VISA_REJECTED）放宽边界：
 * 终态步骤的 parentStage 可能超前于当前 P0 阶段（VISA_REJECTED → S9 但案件仍在 S7），
 * 此时允许步骤先行到达终态，由 admin 引导操作人后续推进 P0 阶段。
 * 若不放宽，终态步骤将不可达（S9 是只读阶段，无法先推到 S9 再设步骤）。
 *
 * @param stepCode BMV 子步骤编码
 * @param currentStage 当前 P0 管理层阶段
 * @returns 兼容性检查结果
 */
export function checkParallelBoundary(stepCode, currentStage) {
  const stepParentStage = BMV_STEP_TO_STAGE[stepCode];
  if (!isP0Stage(currentStage)) {
    return {
      compatible: false,
      stepCode,
      stepParentStage,
      currentStage,
      reason: `Invalid P0 stage: ${currentStage}`,
    };
  }
  const stageIndex = P0_STAGES.indexOf(currentStage);
  const parentIndex = P0_STAGES.indexOf(stepParentStage);
  if (parentIndex > stageIndex && !isTerminalStep(stepCode)) {
    return {
      compatible: false,
      stepCode,
      stepParentStage,
      currentStage,
      reason: `Step ${stepCode} requires stage ${stepParentStage} but case is at ${currentStage}`,
    };
  }
  return {
    compatible: true,
    stepCode,
    stepParentStage,
    currentStage,
  };
}
// ── Blueprint → CaseWorkflowStep 变换 ──
/**
 * 将模板 workflowStepsBlueprint 项转换为 CaseWorkflowStep。
 *
 * 校验 parentStage 必须是合法 P0 阶段。
 * 非法 parentStage 的项被过滤掉（静默降级）。
 *
 * @param blueprint 模板蓝图项数组
 * @returns 转换后的 CaseWorkflowStep 数组
 */
export function blueprintToWorkflowSteps(blueprint) {
  return blueprint
    .filter((item) => item.parentStage !== null && isP0Stage(item.parentStage))
    .map((item) => ({
      stepCode: item.stepCode,
      label: item.label,
      parentStage: item.parentStage,
      sortOrder: item.sortOrder,
      canLoopTo: item.canLoopTo,
      billingGate: item.billingGate,
    }));
}
// ── 终态判定 ──
const TERMINAL_STEPS = new Set(["VISA_REJECTED", "RENEWAL_REMINDER_SCHEDULED"]);
/**
 * 判断 BMV 子步骤是否为终态（无后续流转）。
 * @param stepCode BMV 子步骤编码
 * @returns 是否为终态
 */
export function isTerminalStep(stepCode) {
  return TERMINAL_STEPS.has(stepCode);
}
const TERMINAL_STAGES = new Set(["S9"]);
/**
 * 判断 P0 阶段是否为终态。
 * @param stage P0 阶段
 * @returns 是否为终态
 */
export function isTerminalStage(stage) {
  return TERMINAL_STAGES.has(stage);
}
//# sourceMappingURL=cases.workflow-step.js.map
