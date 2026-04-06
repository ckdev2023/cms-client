/**
 * Tenant-A 特有配置。
 *
 * 说明：
 * - 当前暂无首家客户特有逻辑，此文件为目录骨架占位
 * - 后续识别到特有配置（如特有字段、状态流等）时在此维护
 * - custom 模块可依赖 core，但 core 不依赖 custom
 */
export const TENANT_A_CONFIG = {
  /** 租户标识（用于 Feature Flag key 前缀）。 */
  tenantKey: "tenant_a",
} as const;
