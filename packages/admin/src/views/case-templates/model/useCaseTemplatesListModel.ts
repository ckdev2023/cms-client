import { ref, computed } from "vue";
import type {
  CaseTemplatesRepository,
  CaseTemplateItem,
  CaseTemplatesListParams,
  CaseTypeOption,
} from "./CaseTemplatesRepository";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";

/** 列表加载错误（权限或网络）。 */
export type CaseTemplatesListErrorCode =
  | "unauthorized"
  | "request_failed"
  | null;

/**
 * canonical 列表 ∪ 数据中出现但未在 canonical 中的 code，按 sort 排序。
 * @param canonical 后端下发的标准案件类型候选项（含 sort）
 * @param dataCodes 当前列表数据中已出现的案件类型代码
 * @returns 用于下拉的 case_type 代码序列
 */
export function mergeCaseTypeOptions(
  canonical: CaseTypeOption[],
  dataCodes: string[],
): string[] {
  const canonicalCodes = new Set(canonical.map((c) => c.code));
  const extra = dataCodes.filter((c) => !canonicalCodes.has(c));
  extra.sort();
  const sorted = [...canonical].sort((a, b) => a.sort - b.sort);
  return [...sorted.map((c) => c.code), ...extra];
}

/**
 * 案件資料蓝图列表 model — 加载、错误处理、过滤选项。
 *
 * @param input - 仓储与初始查询参数
 * @param input.repository - 案件資料蓝图仓储
 * @param input.params - 初始列表查询参数
 * @returns 响应式列表状态与操作方法
 */
export function useCaseTemplatesListModel(input: {
  repository: CaseTemplatesRepository;
  params?: CaseTemplatesListParams;
}) {
  const items = ref<CaseTemplateItem[]>([]);
  const loading = ref(false);
  const errorCode = ref<CaseTemplatesListErrorCode>(null);
  const canonicalOptions = ref<CaseTypeOption[]>([]);

  async function loadCaseTypeOptions() {
    try {
      canonicalOptions.value = await input.repository.getCaseTypeOptions();
    } catch {
      canonicalOptions.value = [];
    }
  }

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
    const dataCodes = [...new Set(items.value.map((item) => item.caseType))];
    return mergeCaseTypeOptions(canonicalOptions.value, dataCodes);
  });

  void loadCaseTypeOptions();
  void load(input.params);

  return {
    items,
    loading,
    errorCode,
    refresh,
    caseTypeOptions,
    canonicalOptions,
  };
}
