/**
 * 跨模块 Group 选项管理。
 *
 * Catalog 内置 fixture 三项；运行期可通过 `registerGroupAliases` 把
 * 后端 `/api/groups` 返回的 `{ id, name }` 注册到一个响应式别名表，
 * 让 `resolveGroupLabel` 等函数透明地把 DB UUID 翻译为 catalog `value`，
 * 并继续走本地化标签。
 *
 * 别名表使用 Vue `ref` 持有，注册后能触发 `computed` 重算，
 * 因此调用方（如 `CustomerTableRow.vue`）首屏拿到 UUID 也会在
 * App 启动时拉到 `/api/groups` 后立即 re-render 为本地化分组名。
 */
import { ref } from "vue";

/**
 * Group 状态：active（正常）/ disabled（已停用）。
 */
export type OrgGroupStatus = "active" | "disabled";

type GroupLocale = "zh-CN" | "en-US" | "ja-JP";

interface GroupCatalogEntry {
  value: string;
  status: OrgGroupStatus;
  labels: Record<GroupLocale, string>;
}

/**
 * 供跨模块 Group 选择器使用的选项格式。
 */
export interface GroupSelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
}

/**
 * 带状态的 Group 选项，用于需要区分 active/disabled 的场景。
 */
export interface GroupOptionWithStatus extends GroupSelectOption {
  /**
   *
   */
  status: OrgGroupStatus;
}

/**
 * 来自 `/api/groups` 的最小别名输入：DB 主键 + 后端登记的分组名称。
 */
export interface GroupAliasEntry {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
}

const GROUP_CATALOG: readonly GroupCatalogEntry[] = [
  {
    value: "tokyo-1",
    status: "active",
    labels: {
      "zh-CN": "东京一组",
      "en-US": "Tokyo Team 1",
      "ja-JP": "東京一組",
    },
  },
  {
    value: "tokyo-2",
    status: "active",
    labels: {
      "zh-CN": "东京二组",
      "en-US": "Tokyo Team 2",
      "ja-JP": "東京二組",
    },
  },
  {
    value: "osaka",
    status: "disabled",
    labels: {
      "zh-CN": "大阪组",
      "en-US": "Osaka Team",
      "ja-JP": "大阪組",
    },
  },
] as const;

export const ALL_OPTIONS: readonly GroupOptionWithStatus[] = GROUP_CATALOG.map(
  ({ value, status, labels }) => ({
    value,
    label: labels["ja-JP"],
    status,
  }),
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const groupAliasesRef = ref<ReadonlyMap<string, string>>(new Map());

function normalizeGroupLocale(locale?: string): GroupLocale {
  const normalized = locale?.trim().toLowerCase();
  if (normalized?.startsWith("zh")) return "zh-CN";
  if (normalized?.startsWith("en")) return "en-US";
  if (normalized?.startsWith("ja")) return "ja-JP";
  return "ja-JP";
}

function localizeGroupOption(
  option: GroupCatalogEntry,
  locale?: string,
): GroupOptionWithStatus {
  const normalizedLocale = normalizeGroupLocale(locale);
  return {
    value: option.value,
    label: option.labels[normalizedLocale],
    status: option.status,
  };
}

function lookupAlias(idOrLabel: string): string | undefined {
  const trimmed = idOrLabel.trim();
  if (!trimmed) return undefined;
  return groupAliasesRef.value.get(trimmed);
}

function matchesGroupDirect(
  option: GroupCatalogEntry,
  idOrLabel: string,
): boolean {
  const normalized = idOrLabel.trim();
  return (
    option.value === normalized ||
    Object.values(option.labels).some(
      (label) =>
        label === normalized ||
        (option.status === "disabled" && normalized.startsWith(label)),
    )
  );
}

function matchesGroup(option: GroupCatalogEntry, idOrLabel: string): boolean {
  if (matchesGroupDirect(option, idOrLabel)) return true;
  const aliased = lookupAlias(idOrLabel);
  return aliased ? matchesGroupDirect(option, aliased) : false;
}

function looksLikeUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

/**
 * 注册后端 `/api/groups` 的 `{ id, name }` 列表到运行期别名表。
 *
 * 已存在的 id 会被覆盖；空白 id 或 name 会被忽略。
 *
 * @param entries - 待注册的别名列表
 */
export function registerGroupAliases(
  entries: ReadonlyArray<GroupAliasEntry>,
): void {
  const next = new Map(groupAliasesRef.value);
  let mutated = false;
  for (const entry of entries) {
    const id = entry.id?.trim();
    const name = entry.name?.trim();
    if (!id || !name) continue;
    if (next.get(id) !== name) {
      next.set(id, name);
      mutated = true;
    }
  }
  if (mutated) groupAliasesRef.value = next;
}

/**
 * 清空运行期别名表，仅供测试与登出场景使用。
 */
export function clearGroupAliases(): void {
  if (groupAliasesRef.value.size === 0) return;
  groupAliasesRef.value = new Map();
}

/**
 * 仅返回 active Group 的选项列表，供选择器/下拉/表单使用。
 *
 * @param locale - 可选语言标识；用于返回对应语言的 Group 标签
 * @returns 仅包含 value/label 的活跃 Group 数组
 */
export function getActiveGroupOptions(locale?: string): GroupSelectOption[] {
  return GROUP_CATALOG.filter((g) => g.status === "active").map(
    ({ value, labels }) => ({
      value,
      label: labels[normalizeGroupLocale(locale)],
    }),
  );
}

/**
 * 返回全量 Group 选项（含 disabled），供需要完整列表的场景使用。
 *
 * @param locale - 可选语言标识；传入时返回对应语言的完整 Group 列表
 * @returns 包含状态信息的全量 Group 数组
 */
export function getAllGroupOptions(
  locale?: string,
): readonly GroupOptionWithStatus[] {
  if (!locale) return ALL_OPTIONS;
  return GROUP_CATALOG.map((option) => localizeGroupOption(option, locale));
}

/**
 * 判断给定 Group（按 ID 或 label 匹配）是否为 disabled 状态。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabled(idOrLabel: string): boolean {
  return GROUP_CATALOG.some(
    (g) => matchesGroup(g, idOrLabel) && g.status === "disabled",
  );
}

/**
 * 仅按 label 判断是否为 disabled 状态。
 *
 * @param label - Group 显示名称
 * @returns 该 Group 是否为 disabled 状态
 */
export function isGroupDisabledByLabel(label: string): boolean {
  return GROUP_CATALOG.some(
    (g) => matchesGroup(g, label) && g.status === "disabled",
  );
}

/**
 * 解析 Group 显示名称：若 Group 为 disabled 则追加已停用后缀。
 *
 * 解析顺序：catalog 直匹配 → 通过运行期别名（UUID → name）再匹配 catalog →
 * 仍未命中且别名存在则回落到别名 name → 输入像 UUID 时占位为 `—` 隐藏原始 ID →
 * 否则原样返回。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @param disabledSuffix - 已停用后缀文案（支持 i18n），默认"（已停用）"
 * @param locale - 目标显示语言；缺省时保持当前默认日文兼容行为
 * @returns 带状态标记的显示名称
 */
export function resolveGroupLabel(
  idOrLabel: string,
  disabledSuffix = "（已停用）",
  locale?: string,
): string {
  const found = GROUP_CATALOG.find((g) => matchesGroup(g, idOrLabel));
  if (found) {
    const label = found.labels[normalizeGroupLocale(locale)];
    return found.status === "disabled" ? `${label}${disabledSuffix}` : label;
  }
  const aliased = lookupAlias(idOrLabel);
  if (aliased) return aliased;
  if (looksLikeUuid(idOrLabel)) return "—";
  return idOrLabel;
}

/**
 * 将 Group ID 或显示名称解析为稳定的 Group ID。
 *
 * 未命中已知选项时返回 `null`，避免把显示标签误当成下游表单的 groupId。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @returns 规范化后的 Group ID；未知值返回 `null`
 */
export function resolveGroupValue(idOrLabel: string): string | null {
  const found = GROUP_CATALOG.find((g) => matchesGroup(g, idOrLabel));
  return found?.value ?? null;
}
