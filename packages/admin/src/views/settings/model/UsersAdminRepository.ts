import { getAdminAccessToken } from "../../../auth/model/adminSession";

/**
 * 成员管理仓储工厂依赖。
 */
export interface UsersAdminRepositoryFactoryInput {
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
  /**
   *
   */
  groupsApiBase?: string;
}

/**
 * 成员列表项。
 */
export interface MemberItem {
  /**
   *
   */
  id: string;
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
  /**
   *
   */
  status: string;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  disabledAt: string | null;
}

/**
 * 创建用户请求入参。
 */
export interface CreateMemberInput {
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
  /**
   *
   */
  initialPassword: string;
  /**
   *
   */
  primaryGroupId?: string;
}

/**
 * 成员管理仓储接口。
 */
export interface UsersAdminRepository {
  /**
   *
   */
  listMembers(): Promise<MemberItem[]>;
  /**
   *
   */
  createMember(input: CreateMemberInput): Promise<MemberItem>;
  /**
   *
   */
  updateMemberRole(userId: string, role: string): Promise<MemberItem>;
  /**
   *
   */
  disableMember(userId: string): Promise<MemberItem>;
  /**
   *
   */
  activateMember(userId: string): Promise<MemberItem>;
  /**
   *
   */
  resetPassword(userId: string): Promise<{ temporaryPassword: string }>;
  /**
   *
   */
  addGroupMember(
    groupId: string,
    userId: string,
    isPrimary?: boolean,
  ): Promise<void>;
  /**
   *
   */
  removeGroupMember(groupId: string, userId: string): Promise<void>;
}

/**
 * 成员管理请求错误。
 */
export class UsersAdminRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建成员管理请求错误。
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param options - 额外错误上下文
   * @param options.cause - 原始异常
   */
  constructor(message: string, status?: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "UsersAdminRepositoryError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Adapter helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 后端 DTO → 前端 MemberItem 适配。
 *
 * @param v - 原始响应值
 * @returns 适配后的 MemberItem；无法识别时返回 `null`
 */
export function adaptMemberItem(v: unknown): MemberItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.email !== "string") return null;

  return {
    id: v.id,
    name: typeof v.name === "string" ? v.name : "",
    email: v.email,
    role: typeof v.role === "string" ? v.role : "",
    status: typeof v.status === "string" ? v.status : "active",
    createdAt: typeof v.createdAt === "string" ? v.createdAt : "",
    disabledAt: typeof v.disabledAt === "string" ? v.disabledAt : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type ResolvedRuntime = Required<UsersAdminRepositoryFactoryInput>;

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
  base: string,
  path: string,
  init: { method: string; body?: unknown },
): Promise<unknown> {
  let response: Response;
  const token = runtime.getToken();
  const url = `${base}${path}`;

  try {
    response = await runtime.request(url, {
      method: init.method,
      headers: authHeaders(token, init.body !== undefined),
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch (cause) {
    throw new UsersAdminRepositoryError("Request failed", undefined, {
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
    throw new UsersAdminRepositoryError(msg, response.status);
  }
  return body;
}

// ---------------------------------------------------------------------------
// Method implementations
// ---------------------------------------------------------------------------

async function doListMembers(runtime: ResolvedRuntime): Promise<MemberItem[]> {
  const body = await fetchJson(runtime, runtime.apiBase, "", { method: "GET" });
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new UsersAdminRepositoryError("Invalid members list response");
  }
  return body.items
    .map(adaptMemberItem)
    .filter((m): m is MemberItem => m !== null);
}

async function doCreateMember(
  runtime: ResolvedRuntime,
  input: CreateMemberInput,
): Promise<MemberItem> {
  const body = await fetchJson(runtime, runtime.apiBase, "", {
    method: "POST",
    body: input,
  });
  const item = adaptMemberItem(body);
  if (!item) throw new UsersAdminRepositoryError("Invalid create response");
  return item;
}

async function doUpdateRole(
  runtime: ResolvedRuntime,
  userId: string,
  role: string,
): Promise<MemberItem> {
  const body = await fetchJson(
    runtime,
    runtime.apiBase,
    `/${encodeURIComponent(userId)}/role`,
    { method: "PATCH", body: { role } },
  );
  const item = adaptMemberItem(body);
  if (!item)
    throw new UsersAdminRepositoryError("Invalid update role response");
  return item;
}

async function doDisable(
  runtime: ResolvedRuntime,
  userId: string,
): Promise<MemberItem> {
  const body = await fetchJson(
    runtime,
    runtime.apiBase,
    `/${encodeURIComponent(userId)}/disable`,
    { method: "POST" },
  );
  const item = adaptMemberItem(body);
  if (!item) throw new UsersAdminRepositoryError("Invalid disable response");
  return item;
}

async function doActivate(
  runtime: ResolvedRuntime,
  userId: string,
): Promise<MemberItem> {
  const body = await fetchJson(
    runtime,
    runtime.apiBase,
    `/${encodeURIComponent(userId)}/activate`,
    { method: "POST" },
  );
  const item = adaptMemberItem(body);
  if (!item) throw new UsersAdminRepositoryError("Invalid activate response");
  return item;
}

async function doResetPassword(
  runtime: ResolvedRuntime,
  userId: string,
): Promise<{ temporaryPassword: string }> {
  const body = await fetchJson(
    runtime,
    runtime.apiBase,
    `/${encodeURIComponent(userId)}/reset-password`,
    { method: "POST" },
  );
  if (!isRecord(body) || typeof body.temporaryPassword !== "string") {
    throw new UsersAdminRepositoryError("Invalid reset password response");
  }
  return { temporaryPassword: body.temporaryPassword };
}

async function doAddGroupMember(
  runtime: ResolvedRuntime,
  groupId: string,
  userId: string,
  isPrimary?: boolean,
): Promise<void> {
  await fetchJson(
    runtime,
    runtime.groupsApiBase,
    `/${encodeURIComponent(groupId)}/members`,
    { method: "POST", body: { userId, isPrimary } },
  );
}

async function doRemoveGroupMember(
  runtime: ResolvedRuntime,
  groupId: string,
  userId: string,
): Promise<void> {
  await fetchJson(
    runtime,
    runtime.groupsApiBase,
    `/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * 成员管理仓储：用户 CRUD + 停用/恢复 + 重置密码 + 组成员管理。
 *
 * @param input - 可选运行时依赖覆盖
 * @returns UsersAdminRepository 实例
 */
export function createUsersAdminRepository(
  input: UsersAdminRepositoryFactoryInput = {},
): UsersAdminRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiBase: input.apiBase ?? "/api/users",
    groupsApiBase: input.groupsApiBase ?? "/api/groups",
  };

  return {
    listMembers: () => doListMembers(runtime),
    createMember: (i) => doCreateMember(runtime, i),
    updateMemberRole: (id, role) => doUpdateRole(runtime, id, role),
    disableMember: (id) => doDisable(runtime, id),
    activateMember: (id) => doActivate(runtime, id),
    resetPassword: (id) => doResetPassword(runtime, id),
    addGroupMember: (gid, uid, p) => doAddGroupMember(runtime, gid, uid, p),
    removeGroupMember: (gid, uid) => doRemoveGroupMember(runtime, gid, uid),
  };
}
