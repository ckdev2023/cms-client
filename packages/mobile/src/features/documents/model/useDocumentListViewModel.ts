import { useEffect, useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type {
  DocumentRequirement,
  DocumentRequirementStatus,
} from "@domain/documents/UserDocument";
import {
  computeCompletionRate,
  normalizeDocumentStatus,
  DOCUMENT_STATUS_SORT_PRIORITY,
  type CompletionRate,
} from "@domain/documents/DocumentStatusRules";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 *
 */
export type DocumentListViewState =
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
 *
 */
export type DocumentListFilters = {
  /**
   *
   */
  caseId?: string;
  /**
   *
   */
  statusFilter?: DocumentRequirementStatus;
};

function sortByStatusPriority(
  items: DocumentRequirement[],
): DocumentRequirement[] {
  return items.slice().sort((a, b) => {
    const pa = DOCUMENT_STATUS_SORT_PRIORITY[a.status] ?? 99;
    const pb = DOCUMENT_STATUS_SORT_PRIORITY[b.status] ?? 99;
    return pa - pb;
  });
}

function normalizeRequirements(
  items: DocumentRequirement[],
): DocumentRequirement[] {
  return items.map((r) => ({
    ...r,
    status: normalizeDocumentStatus(r.status),
  }));
}

/**
 * 資料一覧の ViewModel。
 *
 * @param filters - 表示フィルタ（案件 ID / ステータス）
 * @returns state と reload
 */
export function useDocumentListViewModel(filters?: DocumentListFilters) {
  const { documentRepository, logger } = useAppContainer();
  const [state, setState] = useState<DocumentListViewState>({
    status: "idle",
  });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const raw = await documentRepository.listRequirements({
        caseId: filters?.caseId,
      });

      let requirements = normalizeRequirements(raw);

      if (filters?.statusFilter) {
        requirements = requirements.filter(
          (r) => r.status === filters.statusFilter,
        );
      }

      const completion = computeCompletionRate(requirements);
      const sorted = sortByStatusPriority(requirements);

      setState({ status: "success", requirements: sorted, completion });
    } catch (e) {
      const error = toAppError(e);
      logger.error("Documents:list_failed", { code: error.code });
      setState({ status: "error", error });
    }
  }, [documentRepository, logger, filters?.caseId, filters?.statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return { state, reload: load };
}
