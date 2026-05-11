import { ref, computed } from "vue";
import type {
  CaseTemplatesRepository,
  CaseTemplateItem,
  CaseTemplatesListParams,
} from "./CaseTemplatesRepository";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";

/**
 *
 */
export type CaseTemplatesListErrorCode =
  | "unauthorized"
  | "request_failed"
  | null;

/**
 * 案件資料蓝图列表 model — 加载、错误处理、过滤选项。
 *
 * @param input - 仓储实例与初始查询参数
 * @param input.repository - 案件資料蓝图仓储
 * @param input.params - 初始查询参数
 * @returns 响应式列表状态与操作方法
 */
export function useCaseTemplatesListModel(input: {
  /**
   *
   */
  repository: CaseTemplatesRepository;
  /**
   *
   */
  params?: CaseTemplatesListParams;
}) {
  const items = ref<CaseTemplateItem[]>([]);
  const loading = ref(false);
  const errorCode = ref<CaseTemplatesListErrorCode>(null);

  async function load(params?: CaseTemplatesListParams) {
    loading.value = true;
    errorCode.value = null;
    try {
      const result = await input.repository.list(params);
      items.value = result.items;
    } catch (e) {
      if (e instanceof RepositoryError && e.code === "UNAUTHORIZED") {
        errorCode.value = "unauthorized";
      } else {
        errorCode.value = "request_failed";
      }
      items.value = [];
    } finally {
      loading.value = false;
    }
  }

  function refresh(params?: CaseTemplatesListParams) {
    void load(params);
  }

  const caseTypeOptions = computed(() => {
    const types = new Set(items.value.map((item) => item.caseType));
    return [...types].sort();
  });

  void load(input.params);

  return {
    items,
    loading,
    errorCode,
    refresh,
    caseTypeOptions,
  };
}
