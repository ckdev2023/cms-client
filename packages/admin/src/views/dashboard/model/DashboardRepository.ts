import type {
  DashboardGroupOption,
  DashboardRepository,
  DashboardRepositoryInput,
  DashboardSummaryData,
} from "./dashboardTypes";
import {
  normalizeDashboardGroupOptions,
  normalizeDashboardSummaryData,
} from "./dashboardNormalize";

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
  /**
   * 仪表盘分组列表接口路径。
   */
  groupsApiPath?: string;
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
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
  if (params.groupId) {
    search.set("groupId", params.groupId);
  }
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

async function requestGroups(input: {
  request: typeof fetch;
  groupsApiPath: string;
  token: string | null;
}): Promise<Response> {
  try {
    return await input.request(input.groupsApiPath, {
      method: "GET",
      headers: buildRequestHeaders(input.token),
    });
  } catch (cause) {
    throw new DashboardRepositoryError({
      code: "NETWORK",
      message: "Dashboard groups request failed",
      cause,
    });
  }
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
  const request = input.request ?? getDefaultRequest();
  const getToken = input.getToken ?? (() => null);
  const apiPath = input.apiPath ?? "/api/dashboard/summary";
  const groupsApiPath = input.groupsApiPath ?? "/api/dashboard/groups";

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

    async listGroups(): Promise<DashboardGroupOption[]> {
      const response = await requestGroups({
        request,
        groupsApiPath,
        token: getToken(),
      });
      const body = await readResponseBody(response);

      if (!response.ok) {
        throw buildBadResponseError(response, body);
      }

      const normalized = normalizeDashboardGroupOptions(body);
      if (!normalized) {
        throw new DashboardRepositoryError({
          code: "INVALID_RESPONSE",
          status: response.status,
          message: "Invalid dashboard groups response",
        });
      }

      return normalized;
    },
  };
}
