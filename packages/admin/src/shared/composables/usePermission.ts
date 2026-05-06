import { computed, type ComputedRef } from "vue";
import {
  getDefaultPermissionsStore,
  type PermissionsStore,
} from "../model/PermissionsStore";

/**
 * usePermission の戻り値型。
 */
export interface UsePermissionReturn {
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
  /** 指定コードの有無をリアクティブに追跡する computed を返す。 */
  can(code: string): ComputedRef<boolean>;
  /**
   *
   */
  readonly loaded: ComputedRef<boolean>;
}

/**
 * usePermission 依存。テスト時にストアを差し替え可能。
 */
export interface UsePermissionDeps {
  /**
   *
   */
  store?: PermissionsStore;
}

/**
 * 権限判定 composable。テンプレート内で `v-if="has('case.export')"` のように利用する。
 *
 * @param deps - ストア依存（省略時はデフォルトシングルトンを使用）
 * @returns 権限判定メソッド群
 */
export function usePermission(
  deps: UsePermissionDeps = {},
): UsePermissionReturn {
  const store = deps.store ?? getDefaultPermissionsStore();

  return {
    has: (code: string) => store.has(code),
    hasAny: (...codes: string[]) => store.hasAny(...codes),
    hasAll: (...codes: string[]) => store.hasAll(...codes),
    can: (code: string) => computed(() => store.has(code)),
    loaded: computed(() => store.loaded.value),
  };
}
