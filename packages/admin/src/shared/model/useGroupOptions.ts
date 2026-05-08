/**
 * 跨模块 Group 选项管理。
 *
 * Catalog 内置 fixture 三项；运行期可通过 `registerGroupAliases` 把
 * 后端 `/api/groups` 返回的 `{ id, name }` 注册到一个响应式别名表。
 *
 * 显示策略（R6-B-0 调整后）：
 * - 当输入直接命中 catalog（slug / 任一本地化 label） → 返回 catalog
 *   本地化 label（保留 fixture 演示形态，向后兼容仅用 slug 的调用方）。
 * - 当输入仅在别名表命中（典型为后端 UUID） → 取出 DB name 后再匹配
 *   catalog：**仅当 DB name 命中 catalog（slug 或任一本地化 label）时
 *   走 catalog 本地化路径**；自定义组名（未命中 catalog）仍以 DB name
 *   为权威显示值（保留 R-CONSULT-02 R2-B-3 对自定义组名的兼容）。
 *
 * 别名表使用 Vue `ref` 持有，注册后能触发 `computed` 重算，
 * 因此调用方（如 `CustomerTableRow.vue`）首屏拿到 UUID 也会在
 * App 启动时拉到 `/api/groups` 后立即 re-render 为后端 `name`。
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
 * @deprecated 使用 `getGroupOptions('filter', locale)` 或 `getGroupOptions('write', locale)` 替代。
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
 * 返回运行期已注册的后端 Group（UUID → name），供写入路径
 * （新建/批量改派）的下拉选择使用。
 *
 * R2-A-1: 写入路径必须用真实 UUID 作为 value，否则 server 端
 * UUID 列 cast 失败（500）。filter UI 仍可继续用 catalog 短码。
 *
 * R2-B-3 + P2-13: 当 DB name 命中 catalog slug 或任一本地化 label
 * 时，走 catalog 本地化路径；自定义组名（未命中 catalog）仍以
 * DB name 为权威显示值。catalog 仍用于过滤 disabled fixture 项。
 *
 * @deprecated 使用 `getGroupOptions('write', locale)` 替代。
 * @param locale - 目标显示语言；命中 catalog 时返回对应语言标签
 * @returns 形如 `{ value: id, label }` 的数组；
 *   未注册任何别名时返回空数组
 */
export function getActiveGroupAliasOptions(
  locale?: string,
): GroupSelectOption[] {
  const result: GroupSelectOption[] = [];
  for (const [id, name] of groupAliasesRef.value) {
    const catalogMatch = GROUP_CATALOG.find((g) => matchesGroupDirect(g, name));
    if (catalogMatch && catalogMatch.status === "disabled") continue;
    const label = catalogMatch
      ? catalogMatch.labels[normalizeGroupLocale(locale)]
      : name;
    result.push({ value: id, label });
  }
  return result;
}

/**
 * 返回全量 Group 选项（含 disabled），供需要完整列表的场景使用。
 *
 * @deprecated 使用 `getGroupOptions('filter', locale)` 替代。
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
 * 统一的 Group 选项入口，按使用场景（mode）返回对应选项列表。
 *
 * - `'filter'`：筛选路径，返回全量 catalog 选项（含 disabled），
 *   使用 catalog 短码作为 value，适用于列表筛选下拉。
 * - `'write'`：写入路径，返回运行期已注册的后端 Group（UUID 作为
 *   value），适用于新建/编辑表单下拉。
 *
 * @param mode - 使用场景：'filter'（筛选）或 'write'（写入）
 * @param locale - 目标显示语言
 * @returns 符合场景的 Group 选项数组
 */
export function getGroupOptions(
  mode: "filter" | "write",
  locale?: string,
): GroupSelectOption[] {
  if (mode === "write") {
    return getActiveGroupAliasOptions(locale);
  }
  return GROUP_CATALOG.map(({ value, labels }) => ({
    value,
    label: labels[normalizeGroupLocale(locale)],
  }));
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
 * 解析顺序（R6-B-0 调整后）：
 * 1. catalog 直匹配（slug / 任一本地化 label）→ 返回 catalog 本地化 label，
 *    保持 fixture 演示路径向后兼容。
 * 2. 运行期别名命中（UUID → DB name）→ 若 DB name 命中 catalog（slug
 *    或任一本地化 label），返回 catalog 本地化 label；否则以 DB name
 *    为权威显示值（保留 R2-B-3 对自定义组名的兼容）。
 * 3. 输入像 UUID 但未命中以上路径 → 占位为 `—`，避免直显 UUID。
 * 4. 其余原样返回。
 *
 * @param idOrLabel - Group ID 或显示名称
 * @param disabledSuffix - 已停用后缀文案（支持 i18n），默认"（已停用）"
 * @param locale - 目标显示语言；catalog 直匹配与 alias 命中 catalog
 *   两条路径均生效；自定义组名（未命中 catalog）不受 locale 影响
 * @returns 带状态标记的显示名称
 */
export function resolveGroupLabel(
  idOrLabel: string,
  disabledSuffix = "（已停用）",
  locale?: string,
): string {
  if (!idOrLabel?.trim()) return "—";
  const direct = GROUP_CATALOG.find((g) => matchesGroupDirect(g, idOrLabel));
  if (direct) {
    const label = direct.labels[normalizeGroupLocale(locale)];
    return direct.status === "disabled" ? `${label}${disabledSuffix}` : label;
  }
  const aliased = lookupAlias(idOrLabel);
  if (aliased) {
    const catalogForAlias = GROUP_CATALOG.find((g) =>
      matchesGroupDirect(g, aliased),
    );
    if (catalogForAlias) {
      const label = catalogForAlias.labels[normalizeGroupLocale(locale)];
      return catalogForAlias.status === "disabled"
        ? `${label}${disabledSuffix}`
        : label;
    }
    return aliased;
  }
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
