import { useEffect, useState } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { CaseDetail } from "@domain/case/Case";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * CaseDetail 页面的 ViewState。
 */
export type CaseDetailViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; caseDetail: CaseDetail }
  | { status: "error"; error: AppError };

/**
 * CaseDetail 页面的 ViewModel Hook。
 *
 * @param caseId 案件 ID
 * @returns ViewModel 状态
 */
export function useCaseDetailViewModel(caseId: string) {
  const { caseRepository, logger } = useAppContainer();
  const [state, setState] = useState<CaseDetailViewState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const caseDetail = await caseRepository.getCaseDetail(caseId);
        if (cancelled) return;
        setState({ status: "success", caseDetail });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Case:detail_failed", { code: error.code });
        if (cancelled) return;
        setState({ status: "error", error });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [caseId, caseRepository, logger]);

  return { state };
}
