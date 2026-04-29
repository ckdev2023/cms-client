import { computed, ref, type Ref } from "vue";
import type { DocumentListItem } from "../types";
import { SAMPLE_DOCUMENTS } from "../fixtures";
import {
  DocumentRepositoryError,
  createDocumentRepository,
  type DocumentRepository,
} from "./DocumentRepository";

/**
 * 资料中心列表加载错误码：与 UI 状态映射，避免直接暴露 HTTP 细节。
 */
export type DocumentListErrorCode =
  | "unauthorized"
  | "requestFailed"
  | "badResponse";

/**
 * 资料中心列表 Hook 依赖。
 */
export interface UseDocumentListModelDeps {
  /** 自定义资料中心仓储；省略时使用默认实现（`createDocumentRepository`）。 */
  repository?: DocumentRepository;
  /**
   * 当后端返回空数组（dev / 未灌种子数据）时是否回退到本地 `SAMPLE_DOCUMENTS`。
   * 默认 `true`，便于 admin 在新环境上预览资料中心交互。
   */
  fallbackToFixturesWhenEmpty?: boolean;
}

function mapError(error: unknown): DocumentListErrorCode {
  if (!(error instanceof DocumentRepositoryError)) return "requestFailed";
  if (error.code === "UNAUTHORIZED") return "unauthorized";
  if (error.code === "BAD_RESPONSE") return "badResponse";
  return "requestFailed";
}

/**
 * 资料中心列表 ViewModel：封装真实 API 拉取 + 加载/错误状态 + 手动刷新。
 *
 * - 进入页面时自动调用一次 `repository.listDocuments()`
 * - 当后端返回空数组且 `fallbackToFixturesWhenEmpty !== false` 时回退到 `SAMPLE_DOCUMENTS`
 *   （便于在 dev 环境复用现有交互演示）
 * - 拉取失败时仍渲染 `SAMPLE_DOCUMENTS`，并在 UI 暴露 `errorCode` 让外层提示
 *
 * @param deps - 可选依赖：测试可注入仓储；线上回退到 `createDocumentRepository`
 * @returns 列表项、加载/错误状态与 `refresh` 操作
 */
export function useDocumentListModel(deps: UseDocumentListModelDeps = {}) {
  const repository = deps.repository ?? createDocumentRepository();
  const fallbackEmpty = deps.fallbackToFixturesWhenEmpty ?? true;

  const items: Ref<DocumentListItem[]> = ref([...SAMPLE_DOCUMENTS]);
  const loading = ref(false);
  const errorCode = ref<DocumentListErrorCode | null>(null);
  /** 标记最近一次成功的来源（API / fallback），便于 UI 显示提示。 */
  const source = ref<"api" | "fallback">("fallback");

  async function refresh(): Promise<void> {
    if (loading.value) return;
    loading.value = true;
    errorCode.value = null;
    try {
      const fetched = await repository.listDocuments();
      if (fetched.length === 0 && fallbackEmpty) {
        items.value = [...SAMPLE_DOCUMENTS];
        source.value = "fallback";
      } else {
        items.value = fetched;
        source.value = "api";
      }
    } catch (error) {
      errorCode.value = mapError(error);
      items.value = [...SAMPLE_DOCUMENTS];
      source.value = "fallback";
    } finally {
      loading.value = false;
    }
  }

  void refresh();

  return {
    items: computed(() => items.value),
    loading: computed(() => loading.value),
    errorCode: computed(() => errorCode.value),
    source: computed(() => source.value),
    refresh,
  };
}
