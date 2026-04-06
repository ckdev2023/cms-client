import { useEffect, useState } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { CaseSummary } from "@domain/case/Case";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * CaseList 页面的 ViewState。
 */
export type CaseListViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; cases: CaseSummary[] }
  | { status: "error"; error: AppError };

/**
 * CaseList 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态
 */
export function useCaseListViewModel() {
  const { caseRepository, logger } = useAppContainer();
  const [state, setState] = useState<CaseListViewState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const cases = await caseRepository.listMyCases();
        if (cancelled) return;
        setState({ status: "success", cases });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Case:list_failed", { code: error.code });
        if (cancelled) return;
        setState({ status: "error", error });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [caseRepository, logger]);

  return { state };
}
