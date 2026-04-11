import { useEffect, useState, useCallback, useMemo } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { DocumentRequirement } from "@domain/documents/UserDocument";
import {
  computeCompletionRate,
  isActionableStatus,
  type CompletionRate,
} from "@domain/documents/DocumentStatusRules";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 *
 */
export type DocumentRequirementsViewState =
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
      status: "loading";
    }
  | {
      /**
       *
       */
      status: "success";
      /**
       *
       */
      requirements: DocumentRequirement[];
      /**
       *
       */
      completion: CompletionRate;
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

/**
 * P0 资料项列表 ViewModel（按案件）。
 *
 * @param caseId - 案件 ID
 * @returns state / reload / actionableCount
 */
export function useDocumentRequirementsViewModel(caseId: string) {
  const { documentRepository, logger } = useAppContainer();
  const [state, setState] = useState<DocumentRequirementsViewState>({
    status: "idle",
  });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const requirements = await documentRepository.listRequirements({
        caseId,
      });
      const completion = computeCompletionRate(requirements);
      setState({ status: "success", requirements, completion });
    } catch (e) {
      const error = toAppError(e);
      logger.error("Documents:requirements_failed", { code: error.code });
      setState({ status: "error", error });
    }
  }, [caseId, documentRepository, logger]);

  useEffect(() => {
    load();
  }, [load]);

  const actionableCount = useMemo(() => {
    if (state.status !== "success") return 0;
    return state.requirements.filter((r) => isActionableStatus(r.status))
      .length;
  }, [state]);

  return { state, reload: load, actionableCount };
}
