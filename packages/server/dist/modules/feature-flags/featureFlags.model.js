import { isInRollout } from "../../infra/utils/rollout";
/**
 * 基于 rollout 与 entityId 判断本次是否启用 flag。
 *
 * @param rollout 灰度规则
 * @param entityId 用于灰度分桶的实体 ID（缺失时 percentage 视为不命中）
 * @returns 是否启用
 */
export function shouldEnableFlagByRollout(rollout, entityId) {
  return isInRollout(rollout, entityId);
}
//# sourceMappingURL=featureFlags.model.js.map
