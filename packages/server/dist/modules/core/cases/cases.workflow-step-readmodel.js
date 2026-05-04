/**
 * P1 业务子步骤读模型解析 — 纯函数，不依赖 NestJS / DB。
 *
 * 从 Case 实体的 currentWorkflowStepCode 解析为
 * admin detail 页面消费的 WorkflowStepSummary。
 */
import {
  isBmvWorkflowStep,
  BMV_STEP_TRANSITIONS,
  BMV_WORKFLOW_STEP_ENUM,
  BMV_STEP_TO_STAGE,
  isTerminalStep,
} from "./cases.workflow-step";
import { BMV_WORKFLOW_STEPS_BLUEPRINT } from "./cases.template-bmv";
const BMV_STEP_LOOKUP = new Map(
  BMV_WORKFLOW_STEPS_BLUEPRINT.map((s) => [s.stepCode, s]),
);
export { BMV_STEP_LOOKUP };
/**
 * 从 case 实体解析 P1 业务子步骤读模型概要。
 * P0 案件（无 currentWorkflowStepCode）返回 null。
 *
 * @param caseEntity 案件实体
 * @returns 子步骤概要；P0 案件或无效步骤返回 null
 */
export function resolveWorkflowStepSummary(caseEntity) {
  const stepCode = caseEntity.currentWorkflowStepCode;
  if (!stepCode) return null;
  if (!isBmvWorkflowStep(stepCode)) return null;
  const blueprintItem = BMV_STEP_LOOKUP.get(stepCode);
  const label = blueprintItem?.label ?? stepCode;
  const parentStage = BMV_STEP_TO_STAGE[stepCode];
  const sortOrder =
    blueprintItem?.sortOrder ?? BMV_WORKFLOW_STEP_ENUM.indexOf(stepCode);
  const billingGate = blueprintItem?.billingGate ?? null;
  const allowedNext = BMV_STEP_TRANSITIONS[stepCode];
  return {
    currentStepCode: stepCode,
    currentStepLabel: label,
    parentStage,
    sortOrder,
    isTerminal: isTerminalStep(stepCode),
    allowedNextSteps: [...allowedNext],
    billingGate,
  };
}
//# sourceMappingURL=cases.workflow-step-readmodel.js.map
