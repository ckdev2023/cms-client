import { getAdminAccessToken } from "../../../auth/model/adminSession";

/**
 *
 */
export interface PermissionOverrideItem {
  /**
   *
   */
  userId: string;
  /**
   *
   */
  permission: string;
  /**
   *
   */
  effect: "grant" | "deny";
  /**
   *
   */
  reason: string | null;
  /**
   *
   */
  grantedBy: string;
  /**
   *
   */
  grantedAt: string;
  /**
   *
   */
  expiresAt: string | null;
}

/**
 *
 */
export interface SetOverrideInput {
  /**
   *
   */
  permission: string;
  /**
   *
   */
  effect: "grant" | "deny";
  /**
   *
   */
  reason: string;
  /**
   *
   */
  expiresAt?: string;
}

/**
 *
 */
export interface PermissionOverridesRepository {
  /**
   *
   */
  listOverrides(userId: string): Promise<PermissionOverrideItem[]>;
  /**
   *
   */
  setOverrides(
    userId: string,
    overrides: SetOverrideInput[],
  ): Promise<PermissionOverrideItem[]>;
  /**
   *
   */
  deleteOverride(userId: string, permission: string): Promise<void>;
}

/**
 *
 */
export interface PermissionOverridesRepositoryFactoryInput {
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
  apiBase?: string;
}

/**
 * 权限覆盖 API 请求错误。
 */
export class PermissionOverridesRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建权限覆盖请求错误。
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param options - 额外错误上下文
   * @param options.cause - 原始异常
   */
  constructor(
    message: string,
    status?: number,
    options?: {
      /**
       *
       */
      cause?: unknown;
    },
  ) {
    super(message, options);
    this.name = "PermissionOverridesRepositoryError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 后端 DTO → 前端 PermissionOverrideItem 适配。
 *
 * @param v - 原始响应值
 * @returns 适配后的 PermissionOverrideItem；无法识别时返回 `null`
 */
export function adaptOverrideItem(v: unknown): PermissionOverrideItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.permission !== "string" || typeof v.effect !== "string")
    return null;
  if (v.effect !== "grant" && v.effect !== "deny") return null;

  return {
    userId: typeof v.userId === "string" ? v.userId : "",
    permission: v.permission,
    effect: v.effect,
    reason: typeof v.reason === "string" ? v.reason : null,
    grantedBy: typeof v.grantedBy === "string" ? v.grantedBy : "",
    grantedAt: typeof v.grantedAt === "string" ? v.grantedAt : "",
    expiresAt: typeof v.expiresAt === "string" ? v.expiresAt : null,
  };
}

type ResolvedRuntime = Required<PermissionOverridesRepositoryFactoryInput>;

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

function authHeaders(
  token: string | null,
  hasBody: boolean,
): Record<string, string> {
  return {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function fetchJson(
  runtime: ResolvedRuntime,
  path: string,
  init: { method: string; body?: unknown },
): Promise<unknown> {
  let response: Response;
  const token = runtime.getToken();
  const url = `${runtime.apiBase}${path}`;

  try {
    response = await runtime.request(url, {
      method: init.method,
      headers: authHeaders(token, init.body !== undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (cause) {
    throw new PermissionOverridesRepositoryError("Request failed", undefined, {
      cause,
    });
  }

  const text = await response.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const msg =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : `Request failed with status ${response.status}`; // i18n-skip
    throw new PermissionOverridesRepositoryError(msg, response.status);
  }
  return body;
}

async function doListOverrides(
  runtime: ResolvedRuntime,
  userId: string,
): Promise<PermissionOverrideItem[]> {
  const body = await fetchJson(
    runtime,
    `/${encodeURIComponent(userId)}/permission-overrides`,
    { method: "GET" },
  );
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new PermissionOverridesRepositoryError(
      "Invalid overrides list response",
    );
  }
  return body.items
    .map(adaptOverrideItem)
    .filter((o): o is PermissionOverrideItem => o !== null);
}

async function doSetOverrides(
  runtime: ResolvedRuntime,
  userId: string,
  overrides: SetOverrideInput[],
): Promise<PermissionOverrideItem[]> {
  const body = await fetchJson(
    runtime,
    `/${encodeURIComponent(userId)}/permission-overrides`,
    { method: "PUT", body: { overrides } },
  );
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new PermissionOverridesRepositoryError(
      "Invalid set overrides response",
    );
  }
  return body.items
    .map(adaptOverrideItem)
    .filter((o): o is PermissionOverrideItem => o !== null);
}

async function doDeleteOverride(
  runtime: ResolvedRuntime,
  userId: string,
  permission: string,
): Promise<void> {
  await fetchJson(
    runtime,
    `/${encodeURIComponent(userId)}/permission-overrides/${encodeURIComponent(permission)}`,
    { method: "DELETE" },
  );
}

/**
 * 权限覆盖仓储：用户级 grant/deny 覆盖的 CRUD。
 *
 * @param input - 可选运行时依赖覆盖
 * @returns PermissionOverridesRepository 实例
 */
export function createPermissionOverridesRepository(
  input: PermissionOverridesRepositoryFactoryInput = {},
): PermissionOverridesRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiBase: input.apiBase ?? "/api/admin/users",
  };

  return {
    listOverrides: (userId) => doListOverrides(runtime, userId),
    setOverrides: (userId, overrides) =>
      doSetOverrides(runtime, userId, overrides),
    deleteOverride: (userId, permission) =>
      doDeleteOverride(runtime, userId, permission),
  };
}
