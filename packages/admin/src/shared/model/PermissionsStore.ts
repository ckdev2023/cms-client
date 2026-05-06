import { ref, readonly, type DeepReadonly, type Ref } from "vue";
import type { PermissionsRepository } from "./PermissionsRepository";
import { createPermissionsRepository } from "./PermissionsRepository";

/**
 * 権限ストアの公開インターフェース。
 */
export interface PermissionsStore {
  /**
   *
   */
  readonly permissions: DeepReadonly<Ref<ReadonlySet<string>>>;
  /**
   *
   */
  readonly role: DeepReadonly<Ref<string>>;
  /**
   *
   */
  readonly loaded: DeepReadonly<Ref<boolean>>;
  /**
   *
   */
  readonly loading: DeepReadonly<Ref<boolean>>;
  /**
   *
   */
  has(code: string): boolean;
  /**
   *
   */
  hasAny(...codes: string[]): boolean;
  /**
   *
   */
  hasAll(...codes: string[]): boolean;
  /**
   *
   */
  load(): Promise<void>;
  /**
   *
   */
  reset(): void;
  /** テスト用：任意の権限セットを直接設定する。 */
  _setForTest(permissions: string[], role?: string): void;
}

/**
 * 権限ストア依存。
 */
export interface CreatePermissionsStoreDeps {
  /**
   *
   */
  repository?: PermissionsRepository;
}

type StoreState = {
  permissions: Ref<ReadonlySet<string>>;
  role: Ref<string>;
  loaded: Ref<boolean>;
  loading: Ref<boolean>;
};

function createStoreState(): StoreState {
  return {
    permissions: ref<ReadonlySet<string>>(new Set()),
    role: ref(""),
    loaded: ref(false),
    loading: ref(false),
  };
}

function buildLoad(state: StoreState, repo: PermissionsRepository) {
  return async (): Promise<void> => {
    if (state.loading.value) return;
    state.loading.value = true;
    try {
      const r = await repo.fetchMyPermissions();
      state.permissions.value = new Set(r.permissions);
      state.role.value = r.role;
      state.loaded.value = true;
    } finally {
      state.loading.value = false;
    }
  };
}

function buildReset(state: StoreState) {
  return (): void => {
    state.permissions.value = new Set();
    state.role.value = "";
    state.loaded.value = false;
    state.loading.value = false;
  };
}

/**
 * 创建权限 Store。登录后调用 `load()` 从 `/me/permissions` 拉取有效权限集合。
 *
 * @param deps - 仓储依赖（省略时使用默认实现）
 * @returns 权限 Store 实例
 */
export function createPermissionsStore(
  deps: CreatePermissionsStoreDeps = {},
): PermissionsStore {
  const repo = deps.repository ?? createPermissionsRepository();
  const s = createStoreState();

  return {
    permissions: readonly(s.permissions),
    role: readonly(s.role),
    loaded: readonly(s.loaded),
    loading: readonly(s.loading),
    has: (code) => s.permissions.value.has(code),
    hasAny: (...codes) => codes.some((c) => s.permissions.value.has(c)),
    hasAll: (...codes) => codes.every((c) => s.permissions.value.has(c)),
    load: buildLoad(s, repo),
    reset: buildReset(s),
    _setForTest(perms, testRole = "") {
      s.permissions.value = new Set(perms);
      s.role.value = testRole;
      s.loaded.value = true;
    },
  };
}

let _defaultStore: PermissionsStore | null = null;

/**
 * 获取应用全局共享的默认权限 Store 单例。
 *
 * @returns 默认权限 Store 实例
 */
export function getDefaultPermissionsStore(): PermissionsStore {
  if (!_defaultStore) {
    _defaultStore = createPermissionsStore();
  }
  return _defaultStore;
}

/**
 * テスト用：デフォルト権限ストアのシングルトンをリセットする。
 */
export function _resetDefaultPermissionsStoreForTest(): void {
  _defaultStore = null;
}
