/**
 * 仓储基础设施层（共享版）。
 *
 * 职责：
 * - 运行时上下文构建（`createRepositoryRuntime`）：fetch / token / apiPath 解析。
 * - 认证 HTTP 请求（`requestAndAdapt`）：附加 auth header、JSON 序列化、响应读取。
 * - 错误归一化：将网络异常、HTTP 4xx/5xx、无效响应体统一为 `RepositoryError`。
 *
 * `apiPath` 与 `getToken` 不提供默认值——各 feature wrapper 必须显式注入。
 */

interface RepositoryErrorInput {
  code: string;
  message: string;
  status?: number;
  serverErrorCode?: string;
  detail?: string;
  cause?: unknown;
  errorName?: string;
}

/**
 * 仓储工厂输入。`apiPath` 和 `getToken` 为必填；各 feature wrapper 负责注入默认值。
 */
export interface RepositoryFactoryInput {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken: () => string | null;
  /**
   *
   */
  apiPath: string;
  /**
   * 400/422 + serverErrorCode 时使用的错误码。
   * 各 feature 可设为自己的写错误码（如 `"CASE_WRITE_ERROR"`）。
   * @default "WRITE_ERROR"
   */
  writeErrorCode?: string;
  /**
   * 错误消息前缀（如 `"Case"` → `"Case access denied"`）。
   * @default "Request"
   */
  entityLabel?: string;
  /**
   * `Error.name` 值（如 `"CaseRepositoryError"`）。
   * @default "RepositoryError"
   */
  errorName?: string;
}

/**
 *
 */
export interface RepositoryRuntime {
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
  /**
   *
   */
  writeErrorCode: string;
  /**
   *
   */
  entityLabel: string;
  /**
   *
   */
  errorName: string;
}

/**
 * 仓储层统一错误对象，补充状态码与服务端错误码上下文。
 */
export class RepositoryError extends Error {
  /**
   *
   */
  readonly code: string;
  /**
   *
   */
  readonly status?: number;
  /**
   *
   */
  readonly serverErrorCode?: string;
  /**
   * 服务端返回的 actionable detail（如实体 ID、字段名等补充诊断信息）。
   */
  readonly detail?: string;

  /**
   * 根据仓储错误输入构建统一错误实例。
   *
   * @param input - 错误码、消息与附加上下文
   */
  constructor(input: RepositoryErrorInput) {
    super(input.message, { cause: input.cause });
    this.name = input.errorName ?? "RepositoryError";
    this.code = input.code;
    this.status = input.status;
    this.serverErrorCode = input.serverErrorCode;
    this.detail = input.detail;
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

function readDetailFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.detail === "string" && record.detail.trim())
    return record.detail.trim();
  return null;
}

function readErrorCodeFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;

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
  writeErrorCode: string,
  entityLabel: string,
  errorName: string,
): RepositoryError {
  const serverErrorCode = readErrorCodeFromBody(body);

  const code: string =
    response.status === 401
      ? "UNAUTHORIZED"
      : response.status === 400 || response.status === 422
        ? serverErrorCode
          ? writeErrorCode
          : "VALIDATION_ERROR"
        : "BAD_RESPONSE";

  return new RepositoryError({
    code,
    status: response.status,
    serverErrorCode: serverErrorCode ?? undefined,
    detail: readDetailFromBody(body) ?? undefined,
    errorName,
    message:
      readMessageFromBody(body) ??
      (response.status === 401
        ? `${entityLabel} access denied`
        : `${entityLabel} request failed with status ${response.status}`),
  });
}

async function requestJson(input: {
  request: typeof fetch;
  url: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  token: string | null;
  body?: unknown;
  writeErrorCode: string;
  entityLabel: string;
  errorName: string;
}): Promise<{ response: Response; body: unknown }> {
  let response: Response;

  try {
    response = await input.request(input.url, {
      method: input.method,
      headers: buildRequestHeaders(input.token, input.body !== undefined),
      body: input.body !== undefined ? JSON.stringify(input.body) : undefined,
    });
  } catch (cause) {
    throw new RepositoryError({
      code: "NETWORK",
      message: `${input.entityLabel} request failed`,
      cause,
      errorName: input.errorName,
    });
  }

  const body = await readResponseBody(response);
  if (!response.ok)
    throw buildBadResponseError(
      response,
      body,
      input.writeErrorCode,
      input.entityLabel,
      input.errorName,
    );
  return { response, body };
}

function expectValid<T>(
  value: T | null,
  response: Response,
  message: string,
  errorName: string,
): T {
  if (value !== null) return value;
  throw new RepositoryError({
    code: "BAD_RESPONSE",
    status: response.status,
    message,
    errorName,
  });
}

/**
 * 根据工厂输入构建运行时上下文。`apiPath` 与 `getToken` 为必填——不提供默认值。
 *
 * @param input - 仓储工厂配置
 * @returns 完整的运行时上下文
 */
export function createRepositoryRuntime(
  input: RepositoryFactoryInput,
): RepositoryRuntime {
  return {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken,
    apiPath: input.apiPath,
    writeErrorCode: input.writeErrorCode ?? "WRITE_ERROR",
    entityLabel: input.entityLabel ?? "Request",
    errorName: input.errorName ?? "RepositoryError",
  };
}

/**
 * 执行认证 HTTP 请求并通过 `adapt` 函数适配 JSON 响应。
 *
 * @param input - 请求描述
 * @param input.runtime - 仓储运行时上下文，提供请求实现与 token 获取器
 * @param input.url - 请求地址
 * @param input.method - HTTP 方法
 * @param input.body - 可选请求体；存在时会被序列化为 JSON
 * @param input.adapt - 将响应体转换为目标类型的适配函数
 * @param input.errorMessage - 响应体不符合预期时抛出的错误消息
 * @returns 类型 `T` 的适配后响应值
 */
export async function requestAndAdapt<T>(input: {
  runtime: RepositoryRuntime;
  url: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  adapt: (value: unknown) => T | null;
  errorMessage: string;
}): Promise<T> {
  const { response, body } = await requestJson({
    request: input.runtime.request,
    url: input.url,
    method: input.method,
    token: input.runtime.getToken(),
    body: input.body,
    writeErrorCode: input.runtime.writeErrorCode,
    entityLabel: input.runtime.entityLabel,
    errorName: input.runtime.errorName,
  });

  return expectValid(
    input.adapt(body),
    response,
    input.errorMessage,
    input.runtime.errorName,
  );
}
