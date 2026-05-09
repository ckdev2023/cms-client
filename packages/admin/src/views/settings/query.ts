import type { LocationQuery } from "vue-router";
import type { SettingsPanel } from "./types";
import { DEFAULT_PANEL } from "./fixtures";

const VALID_PANELS: readonly SettingsPanel[] = [
  "group-management",
  "member-management",
  "role-management",
  "visibility-config",
  "storage-root",
  "feature-flags",
];

/**
 * 验证并解析 settings 面板值；非法值回退到默认面板。
 *
 * @param raw - URL query 中的原始 tab 字符串
 * @returns 类型安全的 SettingsPanel 值
 */
export function resolveSettingsPanel(raw?: string | null): SettingsPanel {
  if (raw && (VALID_PANELS as readonly string[]).includes(raw)) {
    return raw as SettingsPanel;
  }
  return DEFAULT_PANEL;
}

/**
 * 从 `route.query` 解析 settings tab 参数。
 *
 * @param query - Vue Router 的 `route.query` 对象
 * @returns 解析后的 tab 值或 `undefined`
 */
export function parseSettingsQuery(query: LocationQuery): string | undefined {
  const raw = query.tab;
  return typeof raw === "string" ? raw : undefined;
}

/**
 * 将 settings tab 参数序列化为 URL query 对象；
 * 省略默认 tab (`group-management`) 以保持 URL 简洁。
 *
 * @param tab - 当前活跃面板
 * @returns 可直接传入 `router.replace({ query })` 的对象
 */
export function buildSettingsQuery(
  tab: SettingsPanel,
): Record<string, string | undefined> {
  return {
    tab: tab !== DEFAULT_PANEL ? tab : undefined,
  };
}
