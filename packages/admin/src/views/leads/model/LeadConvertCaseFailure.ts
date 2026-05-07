import { LeadRepositoryError } from "./LeadRepositorySupport";
import { isLeadBmvGateError } from "./LeadBmvGateBinding";
import type { ServerBlocker } from "./LeadRepositorySupport";

/**
 * 转案件失败时返回的结构化错误。
 */
export type LeadConvertCaseFailure =
  | {
      /** */
      kind: "bmvGate";
      /** */
      serverErrorCode: string;
      /** */
      blockers: ServerBlocker[];
    }
  | {
      /** */
      kind: "generic";
      /** */
      messageKey: string;
      /** */
      fallbackMessage?: string;
    };

const GENERIC_CASE_MSG_KEY = "leads.errors.convertCaseFailed";

/**
 * 将 convertCase 抛出的异常映射为结构化错误。
 *
 * @param error - 捕获的异常
 * @returns 结构化失败信息
 */
export function toConvertCaseFailure(error: unknown): LeadConvertCaseFailure {
  if (error instanceof LeadRepositoryError) {
    const { serverErrorCode, serverBlockers: blockers } = error;
    if (
      serverErrorCode &&
      isLeadBmvGateError(serverErrorCode) &&
      blockers?.length
    ) {
      return { kind: "bmvGate", serverErrorCode, blockers };
    }
    return {
      kind: "generic",
      messageKey: GENERIC_CASE_MSG_KEY,
      fallbackMessage: error.message,
    };
  }
  const msg =
    error instanceof Error && error.message ? error.message : undefined;
  return {
    kind: "generic",
    messageKey: GENERIC_CASE_MSG_KEY,
    fallbackMessage: msg,
  };
}
