import { getAdminAccessToken } from "../../../auth/model/adminSession";

/**
 *
 */
export interface RolesAdminRepositoryFactoryInput {
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
 *
 */
export interface RoleItem {
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
  code: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  description: string | null;
  /**
   *
   */
  isSystem: boolean;
  /**
   *
   */
  memberCount: number;
  /**
   *
   */
  createdBy: string | null;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  updatedAt: string;
}

/**
 *
 */
export interface RoleDetailItem extends RoleItem {
  /**
   *
   */
  permissions: string[];
}

/**
 *
 */
export interface CreateRoleInput {
  /**
   *
   */
  code: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  description?: string;
  /**
   *
   */
  permissions: string[];
}

/**
 *
 */
export interface UpdateRoleInput {
  /**
   *
   */
  name?: string;
  /**
   *
   */
  description?: string;
}

/**
 *
 */
export interface RolesAdminRepository {
  /**
   *
   */
  listRoles(): Promise<RoleItem[]>;
  /**
   *
   */
  getRoleDetail(id: string): Promise<RoleDetailItem>;
  /**
   *
   */
  createRole(input: CreateRoleInput): Promise<RoleDetailItem>;
  /**
   *
   */
  updateRole(id: string, input: UpdateRoleInput): Promise<RoleDetailItem>;
  /**
   *
   */
  setRolePermissions(
    id: string,
    permissions: string[],
  ): Promise<RoleDetailItem>;
  /**
   *
   */
  deleteRole(id: string): Promise<void>;
}

/**
 *
 */
export class RolesAdminRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建角色管理 API 错误。
   *
   * @param message - 错误消息
   * @param status - HTTP 状态码
   * @param options - 额外选项
   * @param options.cause - 原始异常
   */
  constructor(
    message: string,
    status?: number,
    options?: {
      /** 原因例外。 */
      cause?: unknown;
    },
  ) {
    super(message, options);
    this.name = "RolesAdminRepositoryError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 后端 DTO → 前端 RoleItem 适配。
 *
 * @param v - 原始レスポンス値
 * @returns 适配后的 RoleItem；不正な場合は `null`
 */
export function adaptRoleItem(v: unknown): RoleItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.code !== "string") return null;

  return {
    id: v.id,
    orgId: typeof v.orgId === "string" ? v.orgId : "",
    code: v.code,
    name: typeof v.name === "string" ? v.name : "",
    description: typeof v.description === "string" ? v.description : null,
    isSystem: v.isSystem === true,
    memberCount: typeof v.memberCount === "number" ? v.memberCount : 0,
    createdBy: typeof v.createdBy === "string" ? v.createdBy : null,
    createdAt: typeof v.createdAt === "string" ? v.createdAt : "",
    updatedAt: typeof v.updatedAt === "string" ? v.updatedAt : "",
  };
}

/**
 * 后端 DTO → 前端 RoleDetailItem 适配（権限コード配列含む）。
 *
 * @param v - 原始レスポンス値
 * @returns 适配后的 RoleDetailItem；不正な場合は `null`
 */
export function adaptRoleDetailItem(v: unknown): RoleDetailItem | null {
  const base = adaptRoleItem(v);
  if (!base) return null;
  const rec = v as Record<string, unknown>;
  const permissions = Array.isArray(rec.permissions)
    ? rec.permissions.filter((p): p is string => typeof p === "string")
    : [];
  return { ...base, permissions };
}

type ResolvedRuntime = Required<RolesAdminRepositoryFactoryInput>;

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
    throw new RolesAdminRepositoryError("Request failed", undefined, { cause });
  }

  const text = await response.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const msg =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : `Request failed with status ${response.status}`; // i18n-skip
    throw new RolesAdminRepositoryError(msg, response.status);
  }
  return body;
}

async function doListRoles(runtime: ResolvedRuntime): Promise<RoleItem[]> {
  const body = await fetchJson(runtime, "", { method: "GET" });
  if (!Array.isArray(body)) {
    throw new RolesAdminRepositoryError("Invalid roles list response");
  }
  return body.map(adaptRoleItem).filter((r): r is RoleItem => r !== null);
}

async function doGetRoleDetail(
  runtime: ResolvedRuntime,
  id: string,
): Promise<RoleDetailItem> {
  const body = await fetchJson(runtime, `/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  const item = adaptRoleDetailItem(body);
  if (!item)
    throw new RolesAdminRepositoryError("Invalid role detail response");
  return item;
}

async function doCreateRole(
  runtime: ResolvedRuntime,
  input: CreateRoleInput,
): Promise<RoleDetailItem> {
  const body = await fetchJson(runtime, "", { method: "POST", body: input });
  const item = adaptRoleDetailItem(body);
  if (!item)
    throw new RolesAdminRepositoryError("Invalid create role response");
  return item;
}

async function doUpdateRole(
  runtime: ResolvedRuntime,
  id: string,
  input: UpdateRoleInput,
): Promise<RoleDetailItem> {
  const body = await fetchJson(runtime, `/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: input,
  });
  const item = adaptRoleDetailItem(body);
  if (!item)
    throw new RolesAdminRepositoryError("Invalid update role response");
  return item;
}

async function doSetPermissions(
  runtime: ResolvedRuntime,
  id: string,
  permissions: string[],
): Promise<RoleDetailItem> {
  const body = await fetchJson(
    runtime,
    `/${encodeURIComponent(id)}/permissions`,
    { method: "PUT", body: { permissions } },
  );
  const item = adaptRoleDetailItem(body);
  if (!item)
    throw new RolesAdminRepositoryError("Invalid set permissions response");
  return item;
}

async function doDeleteRole(
  runtime: ResolvedRuntime,
  id: string,
): Promise<void> {
  await fetchJson(runtime, `/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/**
 * 角色管理仓储：角色 CRUD + 権限コード管理。
 *
 * @param input - 可选运行时依赖覆盖
 * @returns RolesAdminRepository 实例
 */
export function createRolesAdminRepository(
  input: RolesAdminRepositoryFactoryInput = {},
): RolesAdminRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiBase: input.apiBase ?? "/api/admin/roles",
  };

  return {
    listRoles: () => doListRoles(runtime),
    getRoleDetail: (id) => doGetRoleDetail(runtime, id),
    createRole: (i) => doCreateRole(runtime, i),
    updateRole: (id, i) => doUpdateRole(runtime, id, i),
    setRolePermissions: (id, p) => doSetPermissions(runtime, id, p),
    deleteRole: (id) => doDeleteRole(runtime, id),
  };
}
