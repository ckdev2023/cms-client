import type {
  DashboardRepository,
  DashboardRepositoryInput,
  DashboardScope,
  DashboardStatusTone,
  DashboardSummaryData,
  DashboardTimeWindow,
  DashboardWorkItem,
} from "./dashboardTypes";

type DashboardRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "INVALID_RESPONSE";

interface DashboardRepositoryErrorInput {
  /**
   * 错误分类代码。
   */
  code: DashboardRepositoryErrorCode;
  /**
   * 面向上层展示的错误消息。
   */
  message: string;
  /**
   * 后端返回的 HTTP 状态码。
   */
  status?: number;
  /**
   * 原始异常对象。
   */
  cause?: unknown;
}

interface DashboardRepositoryFactoryInput {
  /**
   * 可注入的请求实现，测试时可替换为 stub。
   */
  request?: typeof fetch;
  /**
   * 获取当前后台访问令牌的方法。
   */
  getToken?: () => string | null;
  /**
   * 仪表盘摘要接口路径。
   */
  apiPath?: string;
}

/**
 * 表示仪表盘摘要仓储层抛出的标准化异常。
 */
export class DashboardRepositoryError extends Error {
  /**
   *
   */
  readonly code: DashboardRepositoryErrorCode;
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建一个可供上层识别的仓储异常。
   *
   * @param input 异常输入参数。
   */
  constructor(input: DashboardRepositoryErrorInput) {
    super(input.message, { cause: input.cause });
    this.name = "DashboardRepositoryError";
    this.code = input.code;
    this.status = input.status;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function readStringField(
  record: Record<string, unknown>,
  key: string,
): string | null {
  return typeof record[key] === "string" ? record[key] : null;
}

function readNumberField(
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

  return {
    todayTasks,
    upcomingCases,
    pendingSubmissions,
    riskCases,
  };
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

function normalizeDashboardSummaryData(
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

function readMessageFromBody(body: unknown): string | null {
  if (typeof body === "string") {
    return body.trim() || null;
  }
  if (!body || typeof body !== "object") return null;

  const candidate = body as Record<string, unknown>;
  if (typeof candidate.message === "string") return candidate.message;
  if (!Array.isArray(candidate.message)) return null;

  return candidate.message
    .filter((item) => typeof item === "string")
    .join("，");
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.trim().length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildDashboardUrl(
  apiPath: string,
  params: DashboardRepositoryInput,
): string {
  const search = new URLSearchParams({
    scope: params.scope,
    timeWindow: String(params.timeWindow),
  });
  return `${apiPath}?${search.toString()}`;
}

function buildRequestHeaders(token: string | null): Record<string, string> {
  return token
    ? { Accept: "application/json", Authorization: `Bearer ${token}` }
    : { Accept: "application/json" };
}

async function requestDashboardSummary(input: {
  request: typeof fetch;
  apiPath: string;
  params: DashboardRepositoryInput;
  token: string | null;
}): Promise<Response> {
  try {
    return await input.request(buildDashboardUrl(input.apiPath, input.params), {
      method: "GET",
      headers: buildRequestHeaders(input.token),
    });
  } catch (cause) {
    throw new DashboardRepositoryError({
      code: "NETWORK",
      message: "Dashboard request failed",
      cause,
    });
  }
}

function buildBadResponseError(
  response: Response,
  body: unknown,
): DashboardRepositoryError {
  return new DashboardRepositoryError({
    code: response.status === 401 ? "UNAUTHORIZED" : "BAD_RESPONSE",
    status: response.status,
    message:
      readMessageFromBody(body) ??
      (response.status === 401
        ? "Dashboard access denied"
        : `Dashboard request failed with status ${response.status}`),
  });
}

function validateDashboardSummary(
  response: Response,
  body: unknown,
): DashboardSummaryData {
  if (!response.ok) {
    throw buildBadResponseError(response, body);
  }

  const normalized = normalizeDashboardSummaryData(body);
  if (!normalized) {
    throw new DashboardRepositoryError({
      code: "INVALID_RESPONSE",
      status: response.status,
      message: "Invalid dashboard response",
    });
  }

  return normalized;
}

/**
 * 创建仪表盘摘要仓储，实现前端到 `/api/dashboard/summary` 的请求适配。
 *
 * @param input 仓储工厂的可选依赖注入参数。
 * @returns 可供视图模型调用的仪表盘仓储。
 */
export function createDashboardRepository(
  input: DashboardRepositoryFactoryInput = {},
): DashboardRepository {
  const request = input.request ?? globalThis.fetch;
  const getToken = input.getToken ?? (() => null);
  const apiPath = input.apiPath ?? "/api/dashboard/summary";

  return {
    async getSummary(
      params: DashboardRepositoryInput,
    ): Promise<DashboardSummaryData> {
      const response = await requestDashboardSummary({
        request,
        apiPath,
        params,
        token: getToken(),
      });
      const body = await readResponseBody(response);
      return validateDashboardSummary(response, body);
    },
  };
}
