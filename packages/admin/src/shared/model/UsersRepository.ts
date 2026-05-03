/**
 * Users 仓储工厂依赖。
 */
export interface UsersRepositoryFactoryInput {
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
  apiBase?: string;
}

/**
 * 后端返回的用户列表项。
 */
export interface OrgUserItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  displayName: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  status: string;
}

/**
 * Users 仓储接口。
 */
export interface UsersRepository {
  /**
   *
   */
  listUsers(): Promise<OrgUserItem[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function adaptUserItem(v: unknown): OrgUserItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.id !== "string" || typeof v.displayName !== "string")
    return null;
  return {
    id: v.id,
    displayName: v.displayName,
    role: typeof v.role === "string" ? v.role : "",
    status: typeof v.status === "string" ? v.status : "",
  };
}

type ResolvedRuntime = Required<UsersRepositoryFactoryInput>;

function getDefaultRequest(): typeof fetch {
  return (...args) => globalThis.fetch(...args);
}

/**
 * Users 仓储：组织内用户列表。
 *
 * @param input - 运行时依赖（getToken 必须由调用方注入）
 * @returns Users 仓储实例
 */
export function createUsersRepository(
  input: UsersRepositoryFactoryInput,
): UsersRepository {
  const runtime: ResolvedRuntime = {
    request: input.request ?? getDefaultRequest(),
    getToken: input.getToken,
    apiBase: input.apiBase ?? "/api/users",
  };

  return {
    listUsers: () => doListUsers(runtime),
  };
}

async function doListUsers(runtime: ResolvedRuntime): Promise<OrgUserItem[]> {
  const token = runtime.getToken();
  const response = await runtime.request(runtime.apiBase, {
    method: "GET",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) return [];

  const body: unknown = await response.json();
  if (!isRecord(body) || !Array.isArray(body.items)) return [];

  return body.items
    .map(adaptUserItem)
    .filter((u): u is OrgUserItem => u !== null);
}
