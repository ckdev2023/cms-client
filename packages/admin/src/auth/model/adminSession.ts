import { computed, ref } from "vue";
import {
  requestAdminLogin,
  type AdminLoginPayload,
  type AdminLoginResponse,
} from "./adminLoginApi";

export { AdminLoginRequestError } from "./adminLoginApi";
export type {
  AdminLoginPayload,
  AdminLoginResponse,
  AdminLoginResponseUser,
} from "./adminLoginApi";

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
  token: string;
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
export interface LoginAdminDeps {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  storage?: AdminSessionStorageLike | null;
  /**
   *
   */
  controller?: ReturnType<typeof createAdminSessionController>;
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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function capitalizeSegment(value: string): string {
  const [first = "", ...rest] = value;
  return first ? `${first.toUpperCase()}${rest.join("").toLowerCase()}` : "";
}

function deriveUserProfileFromEmail(email: string): {
  name: string;
  initials: string;
} {
  const normalizedEmail = normalizeEmail(email);
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

  return { name, initials };
}

function buildInitials(name: string, fallbackInitials: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) return fallbackInitials;

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (
      words
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || fallbackInitials
    );
  }

  return trimmed.slice(0, 2).toUpperCase() || fallbackInitials;
}

function buildUserProfile(
  email: string,
  role = "管理员",
  name?: string,
): AdminUser {
  const normalizedEmail = normalizeEmail(email);
  const derived = deriveUserProfileFromEmail(normalizedEmail);
  const resolvedName = name?.trim() || derived.name;

  return {
    name: resolvedName,
    email: normalizedEmail,
    role,
    initials: buildInitials(resolvedName, derived.initials),
  };
}

function isPrivilegedAdminRole(role: string | undefined): boolean {
  return (
    role === "owner" ||
    role === "manager" ||
    role === "admin" ||
    role === "管理員" ||
    role === "管理员"
  );
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
    typeof candidate.token === "string" &&
    typeof candidate.loggedInAt === "number" &&
    isAdminUser(candidate.user)
  );
}

function createSessionFromLoginResponse(
  result: AdminLoginResponse,
  now: () => number,
): AdminSession {
  return {
    token: result.token,
    user: buildUserProfile(
      result.user.email,
      result.user.role,
      result.user.name,
    ),
    loggedInAt: now(),
  };
}

function createDemoSession(
  payload: AdminLoginPayload,
  now: () => number,
): AdminSession {
  return {
    token: `demo-token:${normalizeEmail(payload.email)}`,
    user: buildUserProfile(payload.email),
    loggedInAt: now(),
  };
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

  const persistSession = (
    session: AdminSession,
    storage: AdminSessionStorageLike | null | undefined,
  ): AdminSession => {
    sessionState.value = session;
    hydrated = true;
    writeSession(storage, session);
    return session;
  };

  return {
    session: computed(() => sessionState.value),
    currentUser: computed(() => sessionState.value?.user ?? null),
    isAuthenticated: computed(() => sessionState.value !== null),
    isAdmin: computed(() =>
      isPrivilegedAdminRole(sessionState.value?.user?.role),
    ),
    hydrate(storage: AdminSessionStorageLike | null | undefined) {
      if (!hydrated) {
        sessionState.value = readSession(storage);
        hydrated = true;
      }

      return sessionState.value;
    },
    login(
      payload: AdminLoginPayload,
      storage: AdminSessionStorageLike | null | undefined,
    ) {
      return persistSession(createDemoSession(payload, now), storage);
    },
    loginFromResponse(
      result: AdminLoginResponse,
      storage: AdminSessionStorageLike | null | undefined,
    ) {
      return persistSession(
        createSessionFromLoginResponse(result, now),
        storage,
      );
    },
    logout(storage: AdminSessionStorageLike | null | undefined) {
      sessionState.value = null;
      hydrated = true;
      clearSession(storage);
    },
    reset() {
      sessionState.value = null;
      hydrated = false;
    },
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
 * 获取当前后台访问令牌。
 *
 * @returns 当前登录态 JWT；未登录时返回 `null`
 */
export function getAdminAccessToken(): string | null {
  adminSessionController.hydrate(getBrowserSessionStorage());
  return adminSessionController.session.value?.token ?? null;
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
 * @param deps 可注入依赖，如请求函数、存储实现与控制器
 * @returns 新创建的后台会话
 */
export async function loginAdmin(
  payload: AdminLoginPayload,
  deps: LoginAdminDeps = {},
): Promise<AdminSession> {
  const request = deps.request ?? globalThis.fetch;
  const storage = deps.storage ?? getBrowserSessionStorage();
  const controller = deps.controller ?? adminSessionController;

  const result = await requestAdminLogin(payload, request);
  return controller.loginFromResponse(result, storage);
}

/**
 * 清除当前后台登录态及其本地持久化内容。
 */
export function logoutAdmin(): void {
  adminSessionController.logout(getBrowserSessionStorage());
}
