/**
 * P1 业务子步骤流转请求参数。
 *
 * `toStepCode` 必须是模板 workflowStepsBlueprint 中定义的合法步骤编码，
 * 且必须满足 BMV_STEP_TRANSITIONS 流转矩阵与并行边界检查。
 */
export type WorkflowStepTransitionInput = {
  toStepCode: string;
};

/**
 * P1 业务子步骤读模型概要 — 嵌入 CaseDetailAggregateDto。
 *
 * 仅当 case 使用 P1 模板且 currentWorkflowStepCode 非空时存在；
 * P0 案件此字段为 null。
 */
export type WorkflowStepSummary = {
  currentStepCode: string;
  currentStepLabel: string;
  parentStage: string;
  sortOrder: number;
  isTerminal: boolean;
  allowedNextSteps: string[];
  billingGate: {
    mode: "off" | "warn" | "block";
    milestone: string | null;
  } | null;
};
