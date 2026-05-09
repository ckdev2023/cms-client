/**
 * Feature flag catalog（Admin UI 用）。
 *
 * !!! 新増 flag 必須同步改三処 !!!
 * 1. 本文件：注册 key + label / description / 推荐 default
 * 2. packages/server/src/modules/core/auth/localAdminBootstrap.ts upsertDefaultFeatureFlags
 *    ── 新 org 启动时写入兜底行，避免 resolve 返回 reason=missing
 * 3. 视情况新増 migration 给历史 org backfill（参照 062_default_bmv_feature_flag）
 */

/**
 * catalog 中单个 feature flag 的定义。
 */
export interface FeatureFlagDefinition {
  /** feature flag 的 key（需与 server 端一致） */
  key: string;
  /** 国际化标签键 */
  labelKey: string;
  /** 国际化描述键 */
  descriptionKey: string;
  /**
   * UI Reset 按钮写入的目标值。
   *
   * 可能与 backend resolve 在 row 缺失时返回的 enabled=false 不一致；
   * 仅用于 UI reset，不可假设等于 backend 默认值。
   */
  recommendedDefaultEnabled: boolean;
}

export const FEATURE_FLAG_CATALOG: readonly FeatureFlagDefinition[] = [
  {
    key: "bmv",
    labelKey: "settings.featureFlags.bmv.label",
    descriptionKey: "settings.featureFlags.bmv.description",
    recommendedDefaultEnabled: true,
  },
];
