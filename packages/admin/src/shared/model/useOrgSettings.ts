import { computed, ref, type Ref, type ComputedRef } from "vue";

/**
 * 本地资料根目录配置状态。
 */
export interface OrgStorageRootState {
  /**
   * 根目录显示名称
   */
  rootLabel: string | null;
  /**
   * 根目录物理路径
   */
  rootPath: string | null;
}

/**
 * 组织设置控制器返回值。
 */
export interface UseOrgSettingsReturn {
  /**
   * 当前存储根目录状态
   */
  storageRoot: Ref<OrgStorageRootState>;
  /**
   * 根目录是否已完成配置
   */
  isStorageRootConfigured: ComputedRef<boolean>;
}

/**
 * 组织设置控制器依赖。
 */
export interface UseOrgSettingsDeps {
  /**
   * 初始存储根目录数据
   */
  initialStorageRoot: OrgStorageRootState;
}

/**
 * 创建组织设置控制器实例，管理 storage root 配置状态。
 *
 * @param deps - 初始化依赖
 * @returns 响应式存储根目录状态
 */
export function createOrgSettingsController(
  deps: UseOrgSettingsDeps,
): UseOrgSettingsReturn {
  const storageRoot = ref<OrgStorageRootState>({ ...deps.initialStorageRoot });

  const isStorageRootConfigured = computed(
    () =>
      storageRoot.value.rootLabel !== null &&
      storageRoot.value.rootLabel !== "" &&
      storageRoot.value.rootPath !== null &&
      storageRoot.value.rootPath !== "",
  );

  return { storageRoot, isStorageRootConfigured };
}

let _singleton: UseOrgSettingsReturn | null = null;

/**
 * 初始化全局组织设置单例，应在应用根组件中调用。
 *
 * @param deps - 初始化依赖
 * @returns 组织设置单例
 */
export function initOrgSettings(
  deps: UseOrgSettingsDeps,
): UseOrgSettingsReturn {
  _singleton = createOrgSettingsController(deps);
  return _singleton;
}

/**
 * 获取全局组织设置单例。需先调用 `initOrgSettings`。
 *
 * @returns 组织设置单例
 */
export function useOrgSettings(): UseOrgSettingsReturn {
  if (!_singleton) {
    throw new Error(
      "useOrgSettings() called before initOrgSettings(). " +
        "Call initOrgSettings() in the app root first.",
    );
  }
  return _singleton;
}

/**
 * 重置全局组织设置单例（仅供测试用）。
 */
export function resetOrgSettings(): void {
  _singleton = null;
}
