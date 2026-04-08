import crypto from "node:crypto";

/**
 * 通用灰度分桶规则（percentage 模式）。
 */
export type PercentageRollout = {
  type: "percentage";
  percentage: number;
  salt: string;
};

/**
 * 通用灰度规则联合类型。
 */
export type RolloutRule = { type: "all" } | PercentageRollout;

/**
 * 基于 rollout 规则与 entityId 判断本次是否命中灰度。
 *
 * 算法：SHA256(salt + ":" + entityId) 取前 4 字节 unsigned int，mod 100，
 * 若结果 < percentage 则命中。
 *
 * @param rollout 灰度规则
 * @param entityId 用于灰度分桶的实体 ID（缺失时 percentage 视为不命中）
 * @returns 是否命中
 */
export function isInRollout(
  rollout: RolloutRule,
  entityId: string | undefined,
): boolean {
  if (rollout.type === "all") return true;
  if (!entityId) return false;
  const percentage = Math.max(0, Math.min(rollout.percentage, 100));
  if (percentage === 0) return false;
  if (percentage === 100) return true;
  const hash = crypto
    .createHash("sha256")
    .update(`${rollout.salt}:${entityId}`)
    .digest();
  const bucket = hash.readUInt32BE(0) % 100;
  return bucket < percentage;
}
