import { useEffect, useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { UserDocumentSummary } from "@domain/documents/UserDocument";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * DocumentList 页面的 ViewState。
 */
export type DocumentListViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; documents: UserDocumentSummary[] }
  | { status: "error"; error: AppError };

/**
 * DocumentList 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态与操作
 */
export function useDocumentListViewModel() {
  const { documentRepository, logger } = useAppContainer();
  const [state, setState] = useState<DocumentListViewState>({
    status: "idle",
  });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const documents = await documentRepository.listMyDocuments();
      setState({ status: "success", documents });
    } catch (e) {
      const error = toAppError(e);
      logger.error("Documents:list_failed", { code: error.code });
      setState({ status: "error", error });
    }
  }, [documentRepository, logger]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
