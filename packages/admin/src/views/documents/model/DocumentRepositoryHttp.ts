import { DocumentRepositoryError } from "./DocumentRepositoryTypes";

/**
 * 返回默认 fetch 实现。
 *
 * @returns globalThis.fetch 的包装
 */
export function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

/**
 * 构建 GET 请求 headers（含 Bearer token）。
 *
 * @param token - 认证令牌（可为 null）
 * @returns 请求头
 */
export function buildHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function buildJsonHeaders(token: string | null): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * 安全解析 JSON 响应体，失败时抛 BAD_RESPONSE 错误。
 *
 * @param response - HTTP Response 对象
 * @returns 解析后的 JSON
 */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new DocumentRepositoryError({
      code: "BAD_RESPONSE",
      message: "Document API response was not valid JSON",
      status: response.status,
      cause,
    });
  }
}

function extractServerCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const r = body as Record<string, unknown>;
  if (typeof r.message === "string") {
    const match = /^(DOCUMENT_\w+)/.exec(r.message);
    if (match) return match[1];
  }
  return typeof r.code === "string" ? r.code : undefined;
}

/**
 * 从服务端错误响应体中提取人类可读的 `message`。
 *
 * NestJS 默认错误响应形如 `{ message: string | string[], error, statusCode }`，
 * 用于让上层 toast 直接展示业务可读错误（例如
 * "Cannot follow up on a document item with status 'pending'"），
 * 避免被泛化为 `{context}: validation error`。
 *
 * @param body - 服务端响应体（已解析的 JSON）
 * @returns 抽取后的人类可读消息；不可读时返回 `undefined`
 */
function extractServerMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const r = body as Record<string, unknown>;
  const msg = r.message;
  if (typeof msg === "string" && msg.trim() !== "") return msg;
  if (Array.isArray(msg)) {
    const joined = msg.filter((m) => typeof m === "string").join("; ");
    return joined !== "" ? joined : undefined;
  }
  return undefined;
}

function handleWriteErrorResponse(
  response: Response,
  body: unknown,
  context: string,
): never {
  const serverCode = extractServerCode(body);
  const serverMessage = extractServerMessage(body);
  const withCtx = (fallback: string) =>
    serverMessage ? `${context}: ${serverMessage}` : `${context}: ${fallback}`;
  if (response.status === 401 || response.status === 403) {
    throw new DocumentRepositoryError({
      code: "UNAUTHORIZED",
      message: withCtx("authentication required"),
      status: response.status,
      serverCode,
    });
  }
  if (response.status === 409) {
    throw new DocumentRepositoryError({
      code: "CONFLICT",
      message: withCtx("conflict"),
      status: response.status,
      serverCode,
    });
  }
  if (serverCode?.includes("S9_READONLY")) {
    throw new DocumentRepositoryError({
      code: "S9_READONLY",
      message: withCtx("case is archived (S9)"),
      status: response.status,
      serverCode,
    });
  }
  if (response.status === 400) {
    throw new DocumentRepositoryError({
      code: "VALIDATION",
      message: withCtx("validation error"),
      status: response.status,
      serverCode,
    });
  }
  throw new DocumentRepositoryError({
    code: "BAD_RESPONSE",
    message: withCtx(`HTTP ${response.status}`),
    status: response.status,
    serverCode,
  });
}

/**
 * POST JSON 请求 + 统一错误处理。
 *
 * @param request - fetch 实现
 * @param url - 请求地址
 * @param token - 认证令牌
 * @param body - 请求体
 * @param context - 上下文标识（用于错误消息）
 * @returns 响应体
 */
export async function postJson(
  request: typeof fetch,
  url: string,
  token: string | null,
  body: unknown,
  context: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await request(url, {
      method: "POST",
      headers: buildJsonHeaders(token),
      body: JSON.stringify(body),
    });
  } catch (cause) {
    throw new DocumentRepositoryError({
      code: "NETWORK",
      message: `${context}: network error`,
      cause,
    });
  }
  const json = await readJson(response);
  if (!response.ok) handleWriteErrorResponse(response, json, context);
  return json;
}

/**
 * GET JSON 请求 + 统一错误处理。
 *
 * @param request - fetch 实现
 * @param url - 请求地址
 * @param token - 认证令牌
 * @param context - 上下文标识（用于错误消息）
 * @returns 响应体
 */
export async function getJson(
  request: typeof fetch,
  url: string,
  token: string | null,
  context: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await request(url, {
      method: "GET",
      headers: buildHeaders(token),
    });
  } catch (cause) {
    throw new DocumentRepositoryError({
      code: "NETWORK",
      message: `${context}: network error`,
      cause,
    });
  }
  const json = await readJson(response);
  if (!response.ok) handleWriteErrorResponse(response, json, context);
  return json;
}
