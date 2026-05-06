/**
 * LeadRepositorySupport — 线索仓储基础设施层。
 *
 * 职责：
 * - 运行时上下文构建（`createRuntime`）：fetch / token / apiPath 的默认值解析。
 * - 认证 HTTP 请求（`requestAndAdapt`）：附加 auth header、JSON 序列化、响应读取。
 * - 错误归一化：将网络异常、HTTP 4xx/5xx、无效响应体统一为 `LeadRepositoryError`。
 *
 * 本文件不包含任何字段映射或 DTO 转换逻辑。
 */

import { getAdminAccessToken } from "../../../auth/model/adminSession";

/**
 *
 */
export type LeadRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "VALIDATION_ERROR"
  | "LEAD_WRITE_ERROR";

/** 服务端响应体中的结构化阻断项（如 BMV 建案门禁的 blocker）。 */
export interface ServerBlocker {
  /**
   *
   */
  code: string;
  /**
   *
   */
  message?: string;
}

interface LeadRepositoryErrorInput {
  code: LeadRepositoryErrorCode;
  message: string;
  status?: number;
  serverErrorCode?: string;
  serverBlockers?: ServerBlocker[];
  cause?: unknown;
}

/**
 *
 */
export interface LeadRepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  apiPath?: string;
}

/**
 *
 */
export interface LeadRepositoryRuntime {
  /**
   *
   */
  request: typeof fetch;
  /**
   *
   */
  getToken: () => string | null;
  /**
   *
   */
  apiPath: string;
}

/**
 *
 */
export class LeadRepositoryError extends Error {
  /**
   *
   */
  readonly code: LeadRepositoryErrorCode;
  /**
   *
   */
  readonly status?: number;
  /**
   *
   */
  readonly serverErrorCode?: string;
  /** 服务端返回的门禁阻断项列表（对应 BMV 建案门禁等结构化响应）。 */
  readonly serverBlockers?: ServerBlocker[];

  /**
   * 创建包含错误码、可选 HTTP 状态码及服务端错误码的仓库层错误。
   *
   * @param input - 结构化错误描述
   */
  constructor(input: LeadRepositoryErrorInput) {
    super(input.message, { cause: input.cause });
    this.name = "LeadRepositoryError";
    this.code = input.code;
    this.status = input.status;
    this.serverErrorCode = input.serverErrorCode;
    this.serverBlockers = input.serverBlockers;
  }
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function readMessageFromBody(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (!body || typeof body !== "object") return null;

  const record = body as Record<string, unknown>;
  const message = record.message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (!Array.isArray(message)) return null;

  const lines = message.filter(
    (item): item is string => typeof item === "string",
  );
  return lines.length > 0 ? lines.join("; ") : null;
}

function readErrorCodeFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;

  if (typeof record.code === "string" && record.code.trim())
    return record.code.trim();

  if (typeof record.errorCode === "string" && record.errorCode.trim())
    return record.errorCode.trim();

  const message = readMessageFromBody(body);
  if (!message) return null;
  const colonIdx = message.indexOf(":");
  if (colonIdx > 0 && colonIdx < 60) {
    const candidate = message.slice(0, colonIdx).trim();
    if (/^[A-Z0-9_]+$/.test(candidate)) return candidate;
  }
  return null;
}

function readServerBlockersFromBody(
  body: unknown,
): ServerBlocker[] | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return undefined;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.blockers)) return undefined;

  const blockers: ServerBlocker[] = [];
  for (const item of record.blockers) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.code !== "string" || !entry.code.trim()) continue;
    blockers.push({
      code: entry.code.trim(),
      message: typeof entry.message === "string" ? entry.message : undefined,
    });
  }
  return blockers.length > 0 ? blockers : undefined;
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text.trim()) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildRequestHeaders(
  token: string | null,
  hasJsonBody: boolean,
): Record<string, string> {
  return {
    Accept: "application/json",
    ...(hasJsonBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function buildBadResponseError(
  response: Response,
  body: unknown,
): LeadRepositoryError {
  const serverErrorCode =
    response.status === 401 ? null : readErrorCodeFromBody(body);
  const serverBlockers =
    response.status === 401 ? undefined : readServerBlockersFromBody(body);

  const code: LeadRepositoryErrorCode =
    response.status === 401
      ? "UNAUTHORIZED"
      : response.status === 400 || response.status === 422
        ? serverErrorCode
          ? "LEAD_WRITE_ERROR"
          : "VALIDATION_ERROR"
        : "BAD_RESPONSE";

  return new LeadRepositoryError({
    code,
    status: response.status,
    serverErrorCode: serverErrorCode ?? undefined,
    serverBlockers,
    message:
      readMessageFromBody(body) ??
      (response.status === 401
        ? "Lead access denied"
        : `Lead request failed with status ${response.status}`), // i18n-skip
  });
}

async function requestJson(input: {
  request: typeof fetch;
  url: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  token: string | null;
  body?: unknown;
}): Promise<{ response: Response; body: unknown }> {
  let response: Response;

  try {
    response = await input.request(input.url, {
      method: input.method,
      headers: buildRequestHeaders(input.token, input.body !== undefined),
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
  } catch (cause) {
    throw new LeadRepositoryError({
      code: "NETWORK",
      message: "Lead request failed",
      cause,
    });
  }

  const body = await readResponseBody(response);
  if (!response.ok) throw buildBadResponseError(response, body);
  return { response, body };
}

function expectValid<T>(
  value: T | null,
  response: Response,
  message: string,
): T {
  if (value !== null) return value;
  throw new LeadRepositoryError({
    code: "BAD_RESPONSE",
    status: response.status,
    message,
  });
}

/**
 * 根据工厂输入构建运行时上下文，为 fetch、令牌和 API 路径应用默认值。
 *
 * @param input - request、getToken 和 apiPath 的可选覆盖
 * @returns 包含所有必要依赖的运行时上下文
 */
export function createRuntime(
  input: LeadRepositoryFactoryInput,
): LeadRepositoryRuntime {
  return {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/admin/leads",
  };
}

/**
 * 执行认证 HTTP 请求并通过 `adapt` 函数适配 JSON 响应。
 *
 * @param input - 请求描述
 * @param input.runtime - 已解析的运行时上下文
 * @param input.url - 完整请求 URL
 * @param input.method - HTTP 方法
 * @param input.body - 可选的 JSON 请求体
 * @param input.adapt - 用于解析响应体的适配函数
 * @param input.errorMessage - 适配器返回 null 时使用的错误消息
 * @returns 类型 `T` 的适配后响应值
 */
export async function requestAndAdapt<T>(input: {
  /**
   *
   */
  runtime: LeadRepositoryRuntime;
  /**
   *
   */
  url: string;
  /**
   *
   */
  method: "GET" | "POST" | "PATCH" | "DELETE";
  /**
   *
   */
  body?: unknown;
  /**
   *
   */
  adapt: (value: unknown) => T | null;
  /**
   *
   */
  errorMessage: string;
}): Promise<T> {
  const { response, body } = await requestJson({
    request: input.runtime.request,
    url: input.url,
    method: input.method,
    token: input.runtime.getToken(),
    body: input.body,
  });

  return expectValid(input.adapt(body), response, input.errorMessage);
}
