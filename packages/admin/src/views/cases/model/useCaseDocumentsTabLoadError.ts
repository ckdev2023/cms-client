import { computed, type ComputedRef } from "vue";
import type { DocumentListErrorCode } from "../../documents/model/useDocumentListModel";
import type { ListDocumentsParams } from "../../documents/model/DocumentRepositoryTypes";

const LOAD_ERROR_KEYS: Record<DocumentListErrorCode, string> = {
  unauthorized: "cases.detail.documents.loadError.unauthorized",
  requestFailed: "cases.detail.documents.loadError.requestFailed",
  badResponse: "cases.detail.documents.loadError.badResponse",
};

/** `useDocumentListModel` 中与加载失败 UI 相关的最小切片（便于注入测试替身）。 */
export interface CaseDocumentsTabListModelSlice {
  /** 列表是否在请求中。 */
  loading: { readonly value: boolean };
  /** 最近一次列表请求的错误码；成功时为 null。 */
  errorCode: { readonly value: DocumentListErrorCode | null };
  /** 重新拉取清单（可选覆盖筛选参数）。 */
  refresh: (override?: ListDocumentsParams) => Promise<void>;
}

/**
 * 资料清单列表拉取失败时的 UI 状态（错误条文案键与重试）。
 *
 * @param listModel - 列表 model 切片
 * @returns 是否展示错误条、i18n 文案键、重试函数
 */
export function useCaseDocumentsTabLoadError(
  listModel: CaseDocumentsTabListModelSlice,
) {
  const documentsLoadFailed = computed(
    () => !listModel.loading.value && listModel.errorCode.value !== null,
  );

  const documentsLoadErrorMessageKey: ComputedRef<string> = computed(() => {
    const code = listModel.errorCode.value;
    return code ? LOAD_ERROR_KEYS[code] : LOAD_ERROR_KEYS.requestFailed;
  });

  function retryDocumentsListLoad() {
    void listModel.refresh();
  }

  return {
    documentsLoadFailed,
    documentsLoadErrorMessageKey,
    retryDocumentsListLoad,
  };
}
