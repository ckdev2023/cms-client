import { isInRollout } from "../../infra/utils/rollout";

/**
 * Feature Flag 灰度发布规则。
 */
export type FeatureFlagRollout =
  | { type: "all" }
  | { type: "percentage"; percentage: number; salt: string };

/**
 * Feature Flag 记录（DB 读取后映射为驼峰）。
 */
export type FeatureFlagRow = {
  id: string;
  orgId: string;
  key: string;
  enabled: boolean;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

/**
 * Feature Flag 决策结果（带原因，便于排障）。
 */
export type FeatureFlagResolution =
  | {
      key: string;
      enabled: false;
      used: false;
      reason: "missing" | "disabled" | "rollout";
    }
  | { key: string; enabled: true; used: true };

/**
 * 基于 rollout 与 entityId 判断本次是否启用 flag。
 *
 * @param rollout 灰度规则
 * @param entityId 用于灰度分桶的实体 ID（缺失时 percentage 视为不命中）
 * @returns 是否启用
 */
export function shouldEnableFlagByRollout(
  rollout: FeatureFlagRollout,
  entityId: string | undefined,
): boolean {
  return isInRollout(rollout, entityId);
}
