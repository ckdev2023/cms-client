import { isInRollout } from "../../infra/utils/rollout";
/**
 * 支持的模板类型标识列表。
 */
export const templateKinds = [
  "case_type",
  "state_flow",
  "document_checklist",
  "reminder_rule_set",
  "document_template",
];
/**
 * 判断值是否为 TemplateKind。
 *
 * @param v 待校验值
 * @returns 是否为 TemplateKind
 */
export function isTemplateKind(v) {
  return typeof v === "string" && templateKinds.includes(v);
}
/**
 * 基于 rollout 与 entityId 判断本次是否使用模板配置。
 *
 * @param rollout 灰度规则
 * @param entityId 用于灰度分桶的实体 ID（缺失时 percentage 视为不命中）
 * @returns 是否使用模板
 */
export function shouldUseTemplateByRollout(rollout, entityId) {
  return isInRollout(rollout, entityId);
}
//# sourceMappingURL=templates.model.js.map
