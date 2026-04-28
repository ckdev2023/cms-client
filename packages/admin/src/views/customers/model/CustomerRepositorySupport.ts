import { getAdminAccessToken } from "../../../auth/model/adminSession";

/**
 *
 */
export type CustomerRepositoryErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "VALIDATION_ERROR";

/** 服务端响应体中的结构化阻断项。 */
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

interface CustomerRepositoryErrorInput {
  code: CustomerRepositoryErrorCode;
  message: string;
  status?: number;
  cause?: unknown;
  serverErrorCode?: string;
  serverBlockers?: ServerBlocker[];
}

/**
 *
 */
export interface CustomerRepositoryFactoryInput {
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
export interface CustomerRepositoryRuntime {
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
export class CustomerRepositoryError extends Error {
  /**
   *
   */
  readonly code: CustomerRepositoryErrorCode;
  /**
   *
   */
  readonly status?: number;
  /** 服务端返回的业务错误码（如 CASE_BMV_GATE_BLOCKED）。 */
  readonly serverErrorCode?: string;
  /** 服务端返回的门禁阻断项列表。 */
  readonly serverBlockers?: ServerBlocker[];

  /**
   * 创建客户仓储错误实例。
   *
   * @param input - 错误码、消息、状态码等错误上下文
   */
  constructor(input: CustomerRepositoryErrorInput) {
    super(input.message, { cause: input.cause });
    this.name = "CustomerRepositoryError";
    this.code = input.code;
    this.status = input.status;
    this.serverErrorCode = input.serverErrorCode;
    this.serverBlockers = input.serverBlockers;
  }
}

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function normalizeDistinctIds(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0))];
}

function readMessageFromBody(body: unknown): string | null {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (!body || typeof body !== "object") return null;

  const message = (body as Record<string, unknown>).message;
  if (typeof message === "string" && message.trim()) return message.trim();
  if (!Array.isArray(message)) return null;

  const lines = message.filter(
    (item): item is string => typeof item === "string",
  );
  return lines.length > 0 ? lines.join("; ") : null;
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

function extractServerErrorCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return undefined;
  const record = body as Record<string, unknown>;
  if (typeof record.code === "string" && record.code.trim()) return record.code;
  if (typeof record.errorCode === "string" && record.errorCode.trim())
    return record.errorCode;
  return undefined;
}

function extractServerBlockers(body: unknown): ServerBlocker[] | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body))
    return undefined;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.blockers)) return undefined;
  const blockers: ServerBlocker[] = [];
  for (const item of record.blockers) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).code === "string"
    ) {
      blockers.push({
        code: (item as Record<string, unknown>).code as string,
        message:
          typeof (item as Record<string, unknown>).message === "string"
            ? ((item as Record<string, unknown>).message as string)
            : undefined,
      });
    }
  }
  return blockers.length > 0 ? blockers : undefined;
}

function buildBadResponseError(
  response: Response,
  body: unknown,
): CustomerRepositoryError {
  const code: CustomerRepositoryErrorCode =
    response.status === 401
      ? "UNAUTHORIZED"
      : response.status === 400 || response.status === 422
        ? "VALIDATION_ERROR"
        : "BAD_RESPONSE";

  return new CustomerRepositoryError({
    code,
    status: response.status,
    message:
      readMessageFromBody(body) ??
      (response.status === 401
        ? "Customer access denied"
        : `Customer request failed with status ${response.status}`),
    serverErrorCode: extractServerErrorCode(body),
    serverBlockers: extractServerBlockers(body),
  });
}

async function requestJson(input: {
  request: typeof fetch;
  url: string;
  method: "GET" | "POST" | "PATCH";
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
    throw new CustomerRepositoryError({
      code: "NETWORK",
      message: "Customer request failed",
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
  throw new CustomerRepositoryError({
    code: "BAD_RESPONSE",
    status: response.status,
    message,
  });
}

/**
 * 校验批量操作入参，并返回去重后的客户 ID 列表。
 *
 * @param customerIds - 待批量处理的客户 ID 列表
 * @param fieldValue - 批量变更对应的字段值
 * @param fieldName - 用于报错提示的字段名
 * @returns 去重且去空后的客户 ID 列表
 */
export function assertBulkInput(
  customerIds: string[],
  fieldValue: string,
  fieldName: string,
): string[] {
  const normalizedIds = normalizeDistinctIds(customerIds);
  if (normalizedIds.length === 0) {
    throw new CustomerRepositoryError({
      code: "VALIDATION_ERROR",
      message: "customerIds must contain at least one id",
    });
  }
  if (!fieldValue.trim()) {
    throw new CustomerRepositoryError({
      code: "VALIDATION_ERROR",
      message: `${fieldName} is required`,
    });
  }
  return normalizedIds;
}

/**
 * 校验关联人新增/编辑入参。
 *
 * @param customerId - 关联所属客户 ID
 * @param name - 关联人姓名
 * @param relationId - 编辑场景下的关联人 ID
 */
export function assertRelationInput(
  customerId: string,
  name: string,
  relationId?: string,
): void {
  if (relationId !== undefined && !relationId.trim()) {
    throw new CustomerRepositoryError({
      code: "VALIDATION_ERROR",
      message: "relationId is required",
    });
  }
  if (!customerId.trim()) {
    throw new CustomerRepositoryError({
      code: "VALIDATION_ERROR",
      message: "customerId is required",
    });
  }
  if (!name.trim()) {
    throw new CustomerRepositoryError({
      code: "VALIDATION_ERROR",
      message: "name is required",
    });
  }
}

/**
 * 生成客户仓储运行时依赖。
 *
 * @param input - 仓储工厂的可选注入项
 * @returns 标准化后的仓储运行时对象
 */
export function createRuntime(
  input: CustomerRepositoryFactoryInput,
): CustomerRepositoryRuntime {
  return {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiPath: input.apiPath ?? "/api/customers",
  };
}

/**
 * 发起请求并将响应结果适配为仓储对外模型。
 *
 * @param input - 请求与适配所需参数
 * @param input.runtime - 仓储运行时依赖
 * @param input.url - 请求地址
 * @param input.method - 请求方法
 * @param input.body - 可选请求体
 * @param input.adapt - 响应体适配函数
 * @param input.errorMessage - 适配失败时抛出的错误消息
 * @returns 适配成功后的结果
 */
export async function requestAndAdapt<T>(input: {
  /**
   *
   */
  runtime: CustomerRepositoryRuntime;
  /**
   *
   */
  url: string;
  /**
   *
   */
  method: "GET" | "POST" | "PATCH";
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
