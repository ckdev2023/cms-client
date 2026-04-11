import { useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { DocumentFileVersion } from "@domain/documents/UserDocument";
import type { RegisterVersionInput } from "@domain/documents/DocumentRepository";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 *
 */
export type DocumentUploadViewState =
  | {
      /**
       *
       */
      status: "idle";
    }
  | {
      /**
       *
       */
      status: "uploading";
    }
  | {
      /**
       *
       */
      status: "success"; /**
       *
       */
      version: DocumentFileVersion;
    }
  | {
      /**
       *
       */
      status: "error"; /**
       *
       */
      error: AppError;
    };

type LegacyUploadParams = {
  fileName: string;
  contentType: string;
  data: string;
  docType?: string;
  caseId?: string;
};

function placeholderVersion(params: LegacyUploadParams): DocumentFileVersion {
  return {
    id: "",
    requirementId: "",
    versionNo: 0,
    fileName: params.fileName,
    storageKeyOrUrl: "",
    mimeType: params.contentType,
    fileSize: 0,
    uploadedByType: "client_user",
    uploadedById: "",
    uploadedAt: new Date().toISOString(),
    visibleScope: "client_visible",
    reviewStatus: "pending",
    reviewBy: null,
    reviewAt: null,
    reviewComment: null,
    expiryDate: null,
  };
}

/**
 * 文档上传/登记版本 ViewModel。
 *
 * @returns ViewModel 状态与操作
 */
export function useDocumentUploadViewModel() {
  const { documentRepository, logger } = useAppContainer();
  const [state, setState] = useState<DocumentUploadViewState>({
    status: "idle",
  });

  const registerVersion = useCallback(
    async (input: RegisterVersionInput) => {
      setState({ status: "uploading" });
      try {
        const version = await documentRepository.registerVersion(input);
        setState({ status: "success", version });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Documents:register_version_failed", {
          code: error.code,
        });
        setState({ status: "error", error });
      }
    },
    [documentRepository, logger],
  );

  const upload = useCallback(
    async (params: LegacyUploadParams) => {
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
        setState({ status: "success", version: placeholderVersion(params) });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Documents:upload_failed", { code: error.code });
        setState({ status: "error", error });
      }
    },
    [documentRepository, logger],
  );

  return { state, registerVersion, upload };
}
