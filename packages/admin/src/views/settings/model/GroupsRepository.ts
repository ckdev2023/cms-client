import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type {
  GroupSummary,
  GroupDetail,
  GroupMember,
  GroupStats,
  GroupStatusFilter,
} from "../types";

/**
 * Groups 仓储工厂依赖。
 */
export interface GroupsRepositoryFactoryInput {
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
 * Groups 仓储接口。
 */
export interface GroupsRepository {
  /**
   *
   */
  listGroups(status?: GroupStatusFilter): Promise<GroupSummary[]>;
  /**
   *
   */
  getGroupDetail(id: string): Promise<GroupDetail>;
  /**
   *
   */
  createGroup(input: { name: string }): Promise<GroupSummary>;
  /**
   *
   */
  renameGroup(id: string, name: string): Promise<GroupSummary>;
  /**
   *
   */
  disableGroup(
    id: string,
    reason?: string | null,
  ): Promise<{ stats: GroupStats }>;
}

/**
 * Groups 请求错误。
 */
export class GroupsRepositoryError extends Error {
  /**
   *
   */
  readonly status?: number;

  /**
   * 创建 Groups 请求错误。
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
    this.name = "GroupsRepositoryError";
    this.status = status;
  }
}

// ---------------------------------------------------------------------------
// Adapter helpers — backend DTO → frontend model
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function resolveStatus(v: Record<string, unknown>): "active" | "disabled" {
  if (v.status === "active" || v.status === "disabled") return v.status;
  return v.activeFlag === true ? "active" : "disabled";
}

function extractRefs(v: Record<string, unknown>) {
  return isRecord(v.references) ? v.references : null;
}

function countCases(
  refs: Record<string, unknown> | null,
  v: Record<string, unknown>,
) {
  return Number(refs?.caseCount ?? v.activeCaseCount ?? 0);
}

function adaptMember(v: unknown): GroupMember | null {
  if (!isRecord(v)) return null;
  return {
    name: String(v.userName ?? v.name ?? ""),
    role: String(v.userRole ?? v.role ?? ""),
    joinedAt: String(v.joinedAt ?? ""),
  };
}

function adaptMembers(raw: unknown[]): GroupMember[] {
  return raw.map(adaptMember).filter((m): m is GroupMember => m !== null);
}

function baseSummary(v: Record<string, unknown>) {
  return {
    id: v.id as string,
    name: v.name as string,
    status: resolveStatus(v),
    createdAt: String(v.createdAt ?? ""),
  };
}

/**
 * 后端 GroupSummaryDto → 前端 GroupSummary。
 *
 * @param v - 原始响应值
 * @returns 适配后的 GroupSummary；无法识别时返回 `null`
 */
export function adaptGroupSummary(v: unknown): GroupSummary | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;

  const groupNo =
    typeof v.groupNo === "string" && v.groupNo ? v.groupNo : undefined;

  return {
    ...baseSummary(v),
    ...(groupNo !== undefined ? { groupNo } : {}),
    activeCaseCount: Number(v.activeCaseCount ?? 0),
    memberCount: Number(v.memberCount ?? 0),
  };
}

/**
 * 后端 GroupDetailDto → 前端 GroupDetail。
 *
 * @param v - 原始响应值
 * @returns 适配后的 GroupDetail；无法识别时返回 `null`
 */
export function adaptGroupDetail(v: unknown): GroupDetail | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;

  const rawArr = Array.isArray(v.members) ? v.members : [];
  const members = adaptMembers(rawArr);
  const refs = extractRefs(v);

  return {
    ...baseSummary(v),
    activeCaseCount: countCases(refs, v),
    memberCount: refs
      ? members.length
      : Number(v.memberCount ?? members.length),
    groupNo: String(v.groupNo ?? ""),
    description: typeof v.description === "string" ? v.description : null,
    members,
    customerCount: Number(refs?.customerCount ?? v.customerCount ?? 0),
  };
}

/**
 * 后端 GroupDetailDto → 前端 GroupSummary（用于 create/rename 返回值）。
 *
 * @param v - 原始响应值
 * @returns 适配后的 GroupSummary；无法识别时返回 `null`
 */
export function adaptDetailAsSummary(v: unknown): GroupSummary | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;

  const rawLen = Array.isArray(v.members) ? v.members.length : 0;
  const refs = extractRefs(v);
  const groupNo =
    typeof v.groupNo === "string" && v.groupNo ? v.groupNo : undefined;

  return {
    ...baseSummary(v),
    ...(groupNo !== undefined ? { groupNo } : {}),
    activeCaseCount: countCases(refs, v),
    memberCount: refs ? rawLen : Number(v.memberCount ?? 0),
  };
}

/**
 * 后端 GroupDetailDto（含 references）→ 前端 `{ stats: GroupStats }`。
 *
 * @param v - 原始响应值
 * @returns 适配后的 stats；无法识别时返回 `null`
 */
export function adaptDisableResult(v: unknown): { stats: GroupStats } | null {
  if (!isRecord(v)) return null;
  const refs = extractRefs(v);
  if (!refs) return null;

  return {
    stats: {
      customerCount: Number(refs.customerCount ?? 0),
      activeCaseCount: Number(refs.caseCount ?? 0),
    },
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

type ResolvedRuntime = Required<GroupsRepositoryFactoryInput>;

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
    throw new GroupsRepositoryError("Groups request failed", undefined, {
      cause,
    });
  }

  const text = await response.text();
  const body = text.trim() ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const msg =
      isRecord(body) && typeof body.message === "string"
        ? body.message
        : `Groups request failed with status ${response.status}`;
    throw new GroupsRepositoryError(msg, response.status);
  }
  return body;
}

function requireAdapt<T>(value: T | null, message: string): T {
  if (value === null) throw new GroupsRepositoryError(message);
  return value;
}

// ---------------------------------------------------------------------------
// Method implementations
// ---------------------------------------------------------------------------

async function doListGroups(
  runtime: ResolvedRuntime,
  status?: GroupStatusFilter,
): Promise<GroupSummary[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : "";
  const body = await fetchJson(runtime, qs, { method: "GET" });

  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new GroupsRepositoryError("Invalid groups list response");
  }
  return body.items
    .map(adaptGroupSummary)
    .filter((g): g is GroupSummary => g !== null);
}

async function doGetDetail(
  runtime: ResolvedRuntime,
  id: string,
): Promise<GroupDetail> {
  const body = await fetchJson(runtime, `/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  return requireAdapt(adaptGroupDetail(body), "Invalid group detail response");
}

async function doCreateGroup(
  runtime: ResolvedRuntime,
  name: string,
): Promise<GroupSummary> {
  const body = await fetchJson(runtime, "", {
    method: "POST",
    body: { name },
  });
  return requireAdapt(
    adaptDetailAsSummary(body),
    "Invalid create group response",
  );
}

async function doRenameGroup(
  runtime: ResolvedRuntime,
  id: string,
  name: string,
): Promise<GroupSummary> {
  const body = await fetchJson(runtime, `/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: { name },
  });
  return requireAdapt(
    adaptDetailAsSummary(body),
    "Invalid rename group response",
  );
}

async function doDisableGroup(
  runtime: ResolvedRuntime,
  id: string,
  reason?: string | null,
): Promise<{ stats: GroupStats }> {
  const payload: Record<string, unknown> = {};
  if (reason !== undefined) payload.reason = reason;

  const body = await fetchJson(runtime, `/${encodeURIComponent(id)}/disable`, {
    method: "POST",
    body: payload,
  });
  return requireAdapt(
    adaptDisableResult(body),
    "Invalid disable group response",
  );
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Groups 仓储：分组 CRUD + 停用。
 *
 * @param input - 可选运行时依赖覆盖
 * @returns Groups 仓储实例
 */
export function createGroupsRepository(
  input: GroupsRepositoryFactoryInput = {},
): GroupsRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken ?? getAdminAccessToken,
    apiBase: input.apiBase ?? "/api/groups",
  };

  return {
    listGroups: (s) => doListGroups(runtime, s),
    getGroupDetail: (id) => doGetDetail(runtime, id),
    createGroup: ({ name }) => doCreateGroup(runtime, name),
    renameGroup: (id, name) => doRenameGroup(runtime, id, name),
    disableGroup: (id, reason) => doDisableGroup(runtime, id, reason),
  };
}
