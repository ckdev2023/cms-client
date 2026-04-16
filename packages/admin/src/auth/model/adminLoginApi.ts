/**
 *
 */
export interface AdminLoginPayload {
  /**
   *
   */
  email: string;
  /**
   *
   */
  password: string;
}

/**
 *
 */
export interface AdminLoginResponseUser {
  /**
   *
   */
  id: string;
  /**
   *
   */
  orgId: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  role: string;
}

/**
 *
 */
export interface AdminLoginResponse {
  /**
   *
   */
  token: string;
  /**
   *
   */
  user: AdminLoginResponseUser;
}

type AdminLoginErrorCode =
  | "NETWORK"
  | "UNAUTHORIZED"
  | "BAD_RESPONSE"
  | "INVALID_RESPONSE";

/**
 * 登录请求失败错误。
 */
export class AdminLoginRequestError extends Error {
  /**
   *
   */
  readonly code: AdminLoginErrorCode;
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建登录请求错误实例。
   *
   * @param input 错误输入对象
   * @param input.code 错误分类代码
   * @param input.message 面向调用方的错误消息
   * @param input.status 可选的 HTTP 状态码
   * @param input.cause 可选的底层异常对象
   */
  constructor(input: {
    code: AdminLoginErrorCode;
    message: string;
    status?: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "AdminLoginRequestError";
    this.code = input.code;
    this.status = input.status;
  }
}

function isAdminLoginResponseUser(
  value: unknown,
): value is AdminLoginResponseUser {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.orgId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string"
  );
}

function isAdminLoginResponse(value: unknown): value is AdminLoginResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.token === "string" &&
    isAdminLoginResponseUser(candidate.user)
  );
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

/**
 * 发起后台登录请求并校验返回结构。
 *
 * @param payload 登录表单载荷
 * @param request 可注入的 `fetch` 实现
 * @returns 已通过结构校验的登录响应
 */
export async function requestAdminLogin(
  payload: AdminLoginPayload,
  request: typeof fetch,
): Promise<AdminLoginResponse> {
  let response: Response;

  try {
    response = await request("/api/auth/login", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (cause) {
    throw new AdminLoginRequestError({
      code: "NETWORK",
      message: "Network request failed",
      cause,
    });
  }

  const body = await readResponseBody(response);
  if (!response.ok) {
    throw new AdminLoginRequestError({
      code: response.status === 401 ? "UNAUTHORIZED" : "BAD_RESPONSE",
      status: response.status,
      message:
        readMessageFromBody(body) ??
        (response.status === 401
          ? "Invalid email or password"
          : `Login request failed with status ${response.status}`),
    });
  }

  if (!isAdminLoginResponse(body)) {
    throw new AdminLoginRequestError({
      code: "INVALID_RESPONSE",
      status: response.status,
      message: "Invalid login response",
    });
  }

  return body;
}
