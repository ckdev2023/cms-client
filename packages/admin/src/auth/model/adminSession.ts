import { computed, ref } from "vue";

export const ADMIN_SESSION_STORAGE_KEY = "gyosei_os_admin_session_v1";

/**
 *
 */
export interface AdminSessionStorageLike {
  /**
   *
   */
  getItem(key: string): string | null;
  /**
   *
   */
  setItem(key: string, value: string): void;
  /**
   *
   */
  removeItem(key: string): void;
}

/**
 *
 */
export interface AdminUser {
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
  initials: string;
}

/**
 *
 */
export interface AdminSession {
  /**
   *
   */
  user: AdminUser;
  /**
   *
   */
  loggedInAt: number;
}

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
export interface CreateAdminSessionControllerDeps {
  /**
   *
   */
  now?: () => number;
}

function capitalizeSegment(value: string): string {
  const [first = "", ...rest] = value;
  return first ? `${first.toUpperCase()}${rest.join("").toLowerCase()}` : "";
}

function buildUserProfile(email: string): AdminUser {
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] ?? "";
  const segments = localPart.split(/[._-]+/).filter(Boolean);
  const name =
    segments.map(capitalizeSegment).join(" ") ||
    capitalizeSegment(localPart) ||
    "Admin";
  const initials =
    (segments.length > 0 ? segments : [localPart || "admin"])
      .map((segment) => segment[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "AD";

  return {
    name,
    email: normalizedEmail,
    role: "管理员",
    initials,
  };
}

function isAdminUser(value: unknown): value is AdminUser {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.name === "string" &&
    typeof candidate.email === "string" &&
    typeof candidate.role === "string" &&
    typeof candidate.initials === "string"
  );
}

function isAdminSession(value: unknown): value is AdminSession {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.loggedInAt === "number" && isAdminUser(candidate.user)
  );
}

function readSession(
  storage: AdminSessionStorageLike | null | undefined,
): AdminSession | null {
  if (!storage) return null;

  try {
    const raw = storage.getItem(ADMIN_SESSION_STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    return isAdminSession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeSession(
  storage: AdminSessionStorageLike | null | undefined,
  session: AdminSession,
): void {
  if (!storage) return;

  try {
    storage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    /* 存储失败时保持静默 */
  }
}

function clearSession(
  storage: AdminSessionStorageLike | null | undefined,
): void {
  if (!storage) return;

  try {
    storage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch {
    /* 存储失败时保持静默 */
  }
}

/**
 * 创建后台登录态控制器，统一管理内存状态与本地持久化。
 *
 * @param deps 可注入依赖，当前仅支持时间函数
 * @returns 登录态控制器实例
 */
export function createAdminSessionController(
  deps: CreateAdminSessionControllerDeps = {},
) {
  const { now = Date.now } = deps;
  const sessionState = ref<AdminSession | null>(null);
  let hydrated = false;

  function hydrate(
    storage: AdminSessionStorageLike | null | undefined,
  ): AdminSession | null {
    if (!hydrated) {
      sessionState.value = readSession(storage);
      hydrated = true;
    }

    return sessionState.value;
  }

  function login(
    payload: AdminLoginPayload,
    storage: AdminSessionStorageLike | null | undefined,
  ): AdminSession {
    const session: AdminSession = {
      user: buildUserProfile(payload.email),
      loggedInAt: now(),
    };

    sessionState.value = session;
    hydrated = true;
    writeSession(storage, session);
    return session;
  }

  function logout(storage: AdminSessionStorageLike | null | undefined): void {
    sessionState.value = null;
    hydrated = true;
    clearSession(storage);
  }

  function reset(): void {
    sessionState.value = null;
    hydrated = false;
  }

  return {
    session: computed(() => sessionState.value),
    currentUser: computed(() => sessionState.value?.user ?? null),
    isAuthenticated: computed(() => sessionState.value !== null),
    isAdmin: computed(
      () =>
        sessionState.value?.user?.role === "管理員" ||
        sessionState.value?.user?.role === "管理员",
    ),
    hydrate,
    login,
    logout,
    reset,
  };
}

export const adminSessionController = createAdminSessionController();

/**
 * 读取浏览器可用的会话存储实现；非浏览器环境返回 `null`。
 *
 * @returns 浏览器 `localStorage` 或 `null`
 */
export function getBrowserSessionStorage(): AdminSessionStorageLike | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

/**
 * 获取后台登录态单例，并在首次访问时尝试从本地恢复。
 *
 * @returns 后台登录态控制器单例
 */
export function useAdminSession() {
  adminSessionController.hydrate(getBrowserSessionStorage());
  return adminSessionController;
}

/**
 * 判断当前后台是否已登录。
 *
 * @returns 是否存在有效登录态
 */
export function isAdminAuthenticated(): boolean {
  adminSessionController.hydrate(getBrowserSessionStorage());
  return adminSessionController.isAuthenticated.value;
}

/**
 * 判断当前登录用户是否具有管理员角色。
 *
 * @returns 已登录且角色为管理员时返回 `true`
 */
export function isAdminRole(): boolean {
  adminSessionController.hydrate(getBrowserSessionStorage());
  return adminSessionController.isAdmin.value;
}

/**
 * 以邮箱和密码创建后台登录态，并写入本地存储。
 *
 * @param payload 登录表单载荷
 * @returns 新创建的后台会话
 */
export function loginAdmin(payload: AdminLoginPayload): AdminSession {
  return adminSessionController.login(payload, getBrowserSessionStorage());
}

/**
 * 清除当前后台登录态及其本地持久化内容。
 */
export function logoutAdmin(): void {
  adminSessionController.logout(getBrowserSessionStorage());
}
