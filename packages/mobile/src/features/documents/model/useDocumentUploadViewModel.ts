import { useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * DocumentUpload 页面的 ViewState。
 */
export type DocumentUploadViewState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "success" }
  | { status: "error"; error: AppError };

/**
 * DocumentUpload 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态与操作
 */
export function useDocumentUploadViewModel() {
  const { documentRepository, logger } = useAppContainer();
  const [state, setState] = useState<DocumentUploadViewState>({
    status: "idle",
  });

  const upload = useCallback(
    async (params: {
      fileName: string;
      contentType: string;
      data: string;
      docType?: string;
      caseId?: string;
    }) => {
      setState({ status: "uploading" });
      try {
        await documentRepository.uploadDocument(
          {
            fileName: params.fileName,
            contentType: params.contentType,
            data: params.data,
          },
          { docType: params.docType, caseId: params.caseId },
        );
        setState({ status: "success" });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Documents:upload_failed", { code: error.code });
        setState({ status: "error", error });
      }
    },
    [documentRepository, logger],
  );

  return { state, upload };
}
