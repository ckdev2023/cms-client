import type {
  DashboardGroupOption,
  DashboardScope,
  DashboardStatusTone,
  DashboardSummaryData,
  DashboardTimeWindow,
  DashboardWorkItem,
} from "./dashboardTypes";

/**
 * 将任意值收敛为 `Record<string, unknown>`。
 *
 * 仅当 `value` 为非 null 的对象时返回；其它情况一律返回 null，避免下游误把字符串/数组视为
 * record 进行 key 访问。
 *
 * @param value 任意未知输入。
 * @returns 收敛后的 record；非对象返回 null。
 */
export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * 读取 record 中的字符串字段。
 *
 * 仅在字段类型为 string 时返回，否则返回 null（不做强制类型转换）。
 *
 * @param record 输入 record。
 * @param key 字段名。
 * @returns 字段值；非字符串或缺失返回 null。
 */
export function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

/**
 * 读取 record 中的数值字段，支持字符串数字回退解析。
 *
 * 优先使用原生 `number`；否则尝试将非空 trim 字符串解析为 number。无法解析时返回 null。
 *
 * @param record 输入 record。
 * @param key 字段名。
 * @returns 解析后的有限 number；解析失败返回 null。
 */
export function readNumberField(
  record: Record<string, unknown>,
  key: string,
): number | null {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

function hasOptionalStringField(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return (
    record[key] === undefined ||
    record[key] === null ||
    typeof record[key] === "string"
  );
}

function hasOptionalNumberField(
  record: Record<string, unknown>,
  key: string,
): boolean {
  return (
    record[key] === undefined ||
    record[key] === null ||
    readNumberField(record, key) !== null
  );
}

function isDashboardScope(value: unknown): value is DashboardScope {
  return value === "mine" || value === "group" || value === "all";
}

function isDashboardTimeWindow(value: unknown): value is DashboardTimeWindow {
  return value === 7 || value === 30;
}

function isDashboardStatusTone(value: unknown): value is DashboardStatusTone {
  return (
    value === "info" ||
    value === "warn" ||
    value === "danger" ||
    value === "muted"
  );
}

function normalizeOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return undefined;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMetaKeyList(
  value: unknown,
): { key: string; params?: Record<string, unknown> }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result: { key: string; params?: Record<string, unknown> }[] = [];
  for (const entry of value) {
    const rec = asRecord(entry);
    if (!rec || typeof rec.key !== "string") return undefined;
    const item: { key: string; params?: Record<string, unknown> } = {
      key: rec.key,
    };
    const params = asRecord(rec.params);
    if (params) item.params = params;
    result.push(item);
  }
  return result;
}

function normalizeOptionalRecord(
  value: unknown,
): Record<string, unknown> | undefined {
  const rec = asRecord(value);
  return rec ?? undefined;
}

function normalizeDashboardWorkItem(value: unknown): DashboardWorkItem | null {
  const candidate = asRecord(value);
  if (!candidate) return null;

  const id = readStringField(candidate, "id");
  const title = readStringField(candidate, "title");
  const desc = readStringField(candidate, "desc");
  const statusLabel = readStringField(candidate, "statusLabel");
  const action = readStringField(candidate, "action");

  if (
    !id ||
    !title ||
    !isStringArray(candidate.meta) ||
    !desc ||
    !isDashboardStatusTone(candidate.status) ||
    !statusLabel ||
    !action ||
    !hasOptionalStringField(candidate, "route") ||
    !hasOptionalNumberField(candidate, "daysLeft")
  ) {
    return null;
  }

  return {
    id,
    title,
    meta: candidate.meta,
    desc,
    status: candidate.status,
    statusLabel,
    action,
    route: normalizeOptionalString(candidate.route),
    daysLeft: normalizeOptionalNumber(candidate.daysLeft),
    statusLabelKey: normalizeOptionalString(candidate.statusLabelKey),
    descKey: normalizeOptionalString(candidate.descKey),
    descParams: normalizeOptionalRecord(candidate.descParams),
    actionKey: normalizeOptionalString(candidate.actionKey),
    metaKeys: normalizeMetaKeyList(candidate.metaKeys),
  };
}

function normalizeDashboardSummary(
  value: unknown,
): DashboardSummaryData["summary"] | null {
  const summary = asRecord(value);
  if (!summary) return null;

  const todayTasks = readNumberField(summary, "todayTasks");
  const upcomingCases = readNumberField(summary, "upcomingCases");
  const pendingSubmissions = readNumberField(summary, "pendingSubmissions");
  const riskCases = readNumberField(summary, "riskCases");

  if (
    todayTasks === null ||
    upcomingCases === null ||
    pendingSubmissions === null ||
    riskCases === null
  ) {
    return null;
  }

  return { todayTasks, upcomingCases, pendingSubmissions, riskCases };
}

function normalizeDashboardWorkItemList(
  value: unknown,
): DashboardWorkItem[] | null {
  if (!Array.isArray(value)) return null;

  const items = value.map(normalizeDashboardWorkItem);
  return items.every((item) => item !== null) ? items : null;
}

function normalizeDashboardPanels(
  value: unknown,
): DashboardSummaryData["panels"] | null {
  const panels = asRecord(value);
  if (!panels) return null;

  const todo = normalizeDashboardWorkItemList(panels.todo);
  const deadlines = normalizeDashboardWorkItemList(panels.deadlines);
  const submissions = normalizeDashboardWorkItemList(panels.submissions);
  const risks = normalizeDashboardWorkItemList(panels.risks);

  if (!todo || !deadlines || !submissions || !risks) return null;

  return { todo, deadlines, submissions, risks };
}

/**
 * 将后端 dashboard summary 响应规范化为强类型 `DashboardSummaryData`。
 *
 * 任一关键字段（scope/timeWindow/summary/panels）异常时整体返回 null，
 * 由调用方决定降级策略。
 *
 * @param value 原始 API 响应。
 * @returns 规范化后的 summary；不合法时返回 null。
 */
export function normalizeDashboardSummaryData(
  value: unknown,
): DashboardSummaryData | null {
  const candidate = asRecord(value);
  if (!candidate) return null;

  const scope = candidate.scope;
  const summary = normalizeDashboardSummary(candidate.summary);
  const panels = normalizeDashboardPanels(candidate.panels);
  const timeWindow = readNumberField(candidate, "timeWindow");

  if (
    !isDashboardScope(scope) ||
    !isDashboardTimeWindow(timeWindow) ||
    !summary ||
    !panels
  ) {
    return null;
  }

  return { scope, timeWindow, summary, panels };
}

/**
 * 规范化单个 dashboard group 选项。
 *
 * 必须包含 `id` 与 `name` 字段；`isPrimary` 仅在 `=== true` 时为 true，规避字符串/0/1 的
 * 历史脏数据。
 *
 * @param value 原始 group option。
 * @returns 规范化后的 group；不合法时返回 null。
 */
export function normalizeDashboardGroupOption(
  value: unknown,
): DashboardGroupOption | null {
  const candidate = asRecord(value);
  if (!candidate) return null;

  const id = readStringField(candidate, "id");
  const name = readStringField(candidate, "name");
  if (!id || !name) return null;

  return {
    id,
    name,
    isPrimary: candidate.isPrimary === true,
  };
}

/**
 * 规范化 dashboard group 选项列表。
 *
 * 非数组直接返回 null；数组中任一元素规范化失败时整体返回 null（保留 all-or-nothing 语义，
 * 避免 UI 显示半截 group 选项）。
 *
 * @param value 原始 group options 列表。
 * @returns 规范化后的列表；不合法时返回 null。
 */
export function normalizeDashboardGroupOptions(
  value: unknown,
): DashboardGroupOption[] | null {
  if (!Array.isArray(value)) return null;

  const items = value.map(normalizeDashboardGroupOption);
  return items.every((item) => item !== null) ? items : null;
}
