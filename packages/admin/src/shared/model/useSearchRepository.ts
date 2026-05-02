import {
  createHttpSearchRepository,
  type SearchRepository,
  type SearchRepositoryFactoryInput,
} from "../api/searchRepository";

let _singleton: SearchRepository | null = null;

/**
 * 初始化全局搜索仓储单例，应在应用根组件中调用。
 *
 * @param input - 工厂配置（getToken 必须由调用方提供，避免 shared 层依赖 auth）
 * @returns SearchRepository 单例
 */
export function initSearchRepository(
  input: SearchRepositoryFactoryInput,
): SearchRepository {
  _singleton = createHttpSearchRepository(input);
  return _singleton;
}

/**
 * 获取全局搜索仓储单例。需先调用 `initSearchRepository`。
 *
 * @returns SearchRepository 单例
 */
export function useSearchRepository(): SearchRepository {
  if (!_singleton) {
    throw new Error(
      "useSearchRepository() called before initSearchRepository(). " +
        "Call initSearchRepository() in the app root first.",
    );
  }
  return _singleton;
}

/**
 * 重置全局搜索仓储单例（仅供测试用）。
 */
export function resetSearchRepository(): void {
  _singleton = null;
}
