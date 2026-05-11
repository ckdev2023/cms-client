import { ref, type Ref } from "vue";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";
import type {
  CaseTemplatesRepository,
  CaseTemplateCreateParams,
  CaseTemplateUpdateParams,
  CaseTemplateItem,
} from "./CaseTemplatesRepository";

/**
 *
 */
export type WriteErrorCode =
  | "unauthorized"
  | "validation"
  | "request_failed"
  | null;

interface WriteState {
  saving: Ref<boolean>;
  errorCode: Ref<WriteErrorCode>;
  lastSavedItem: Ref<CaseTemplateItem | null>;
}

function classifyError(e: unknown): WriteErrorCode {
  if (e instanceof RepositoryError) {
    if (e.code === "UNAUTHORIZED") return "unauthorized";
    if (e.code === "VALIDATION_ERROR" || e.code === "CT_WRITE_ERROR")
      return "validation";
  }
  return "request_failed";
}

async function runWrite(
  state: WriteState,
  action: () => Promise<CaseTemplateItem>,
  onSuccess?: () => void,
): Promise<boolean> {
  state.saving.value = true;
  state.errorCode.value = null;
  state.lastSavedItem.value = null;
  try {
    state.lastSavedItem.value = await action();
    onSuccess?.();
    return true;
  } catch (e) {
    state.errorCode.value = classifyError(e);
    return false;
  } finally {
    state.saving.value = false;
  }
}

/**
 * 案件資料蓝图写操作 model — 创建 / 更新 / 切换启停。
 *
 * @param input - 仓储实例与操作成功后回调
 * @param input.repository - 案件資料蓝图仓储
 * @param input.onSuccess - 写操作成功后回调
 * @returns 响应式写操作状态与方法
 */
export function useCaseTemplateWriteModel(input: {
  repository: CaseTemplatesRepository;
  onSuccess?: () => void;
}) {
  const saving = ref(false);
  const errorCode = ref<WriteErrorCode>(null);
  const lastSavedItem = ref<CaseTemplateItem | null>(null);
  const s: WriteState = { saving, errorCode, lastSavedItem };

  const create = (p: CaseTemplateCreateParams) =>
    runWrite(s, () => input.repository.create(p), input.onSuccess);

  const update = (id: string, p: CaseTemplateUpdateParams) =>
    runWrite(s, () => input.repository.update(id, p), input.onSuccess);

  const toggleActive = (item: CaseTemplateItem) =>
    update(item.id, { activeFlag: !item.activeFlag });

  const clearError = () => {
    errorCode.value = null;
  };

  return {
    saving,
    errorCode,
    lastSavedItem,
    create,
    update,
    toggleActive,
    clearError,
  };
}
