/**
 * 案件标签 / i18n 键解析器。
 *
 * 自 `constants.ts` 拆出：该文件名为 constants 却混着运行时 helper（原「Label /
 * i18n Helpers」区 87 行），是它超 max-lines 的实因。常量与解析器分家后，
 * constants.ts 回归纯声明式数据。
 *
 * 同批清掉 3 个死 helper（getBillingStatusLabel / getGateI18nKey / getGateLabel）：
 * 实测它们在删测试之前消费方就全是测试，生产侧从未调用。
 */
import type { BillingStatusKey, CaseStageId } from "./types";
import { BILLING_STATUSES, CASE_STAGES } from "./constants";

/**
 * 根据阶段 ID 获取 i18n key。
 *
 * @param stageId - 阶段 ID 或自由文本
 * @returns i18n key；未匹配时返回 `""`
 */
export function getStageI18nKey(stageId: CaseStageId | string): string {
  return CASE_STAGES[stageId as CaseStageId]?.i18nKey ?? "";
}

/**
 * BMV：管理层阶段为 `S7` 且子步骤处于在留认定后的 COE／海外査証跟踪时，
 * 与「入管提出后待回执」阶段语义不同，使用独立 i18n 键。
 */
export const BMV_S7_POST_APPROVAL_WORKFLOW_STEPS = new Set([
  "WAITING_PAYMENT",
  "COE_SENT",
  "VISA_APPLYING",
]);

/**
 * 解析案件详情等处展示的「管理层阶段」文案 i18n 键（含 BMV S7 上下文分化）。
 *
 * @param stageCode - `S1`–`S9` 等
 * @param workflowStepCode - 业务子步骤代码；非 BMV 或未进入认定后跟踪时可省略
 * @returns `cases.constants.stages.*` 键名
 */
export function resolveStageLabelI18nKey(
  stageCode: CaseStageId | string,
  workflowStepCode?: string | null,
): string {
  if (
    stageCode === "S7" &&
    workflowStepCode &&
    BMV_S7_POST_APPROVAL_WORKFLOW_STEPS.has(workflowStepCode)
  ) {
    return "cases.constants.stages.S7_post_approval";
  }
  return getStageI18nKey(stageCode);
}

/**
 * 阶段 ID → fallback 标签。
 *
 * @param stageId - 阶段 ID 或自由文本
 * @returns fallback 标签；未匹配时返回原始值
 */
export function getStageLabel(stageId: CaseStageId | string): string {
  return CASE_STAGES[stageId as CaseStageId]?.label ?? stageId;
}

/**
 * 收费状态 → i18n key。
 *
 * @param key - 收费状态键或自由文本
 * @returns i18n key；未匹配时返回 `""`
 */
export function getBillingStatusI18nKey(
  key: BillingStatusKey | string,
): string {
  return BILLING_STATUSES[key as BillingStatusKey]?.i18nKey ?? "";
}
