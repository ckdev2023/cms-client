import type { CaseDetail } from "../types-detail";
import { resolveCaseTypeFlowProfile } from "./caseTypeFlowProfile";

/**
 * 用于流程特征判定：优先 `titleFallbackParts.caseTypeCode`（与 adapter 一致），
 * 否则回退 `caseType`（API 路径下二者同为代号；旧 mock 曾用展示名占 `caseType`）。
 *
 * @param detail - 案件详情（含 `titleFallbackParts` 与 `caseType`）
 * @returns 传入 `resolveCaseTypeFlowProfile` 的案件类型代号
 */
function caseTypeCodeForFlowProfile(detail: CaseDetail): string {
  const fromParts = detail.titleFallbackParts.caseTypeCode.trim();
  if (fromParts !== "") return fromParts;
  return detail.caseType;
}

const POST_SUBMISSION_PHASES = new Set([
  "UNDER_REVIEW",
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
]);

const AWAITING_COE_PHASES = new Set(["APPROVED", "WAITING_PAYMENT"]);

const COE_SENT_OVERSEAS_NEXT_PHASES = new Set(["COE_SENT"]);

const OVERSEAS_VISA_IN_PROGRESS_PHASES = new Set(["VISA_APPLYING"]);

const COMPLETED_PHASES = new Set([
  "SUCCESS",
  "ENTRY_SUCCESS",
  "RESIDENCE_PERIOD_RECORDED",
  "RENEWAL_REMINDER_SCHEDULED",
  "CLOSED_SUCCESS",
]);

function isPostApprovalCoePanelPhase(phase: string): boolean {
  return (
    AWAITING_COE_PHASES.has(phase) ||
    COE_SENT_OVERSEAS_NEXT_PHASES.has(phase) ||
    OVERSEAS_VISA_IN_PROGRESS_PHASES.has(phase)
  );
}

function closedFailedCoeNoteSuffix(detail: CaseDetail): string | null {
  if (detail.businessPhase !== "CLOSED_FAILED") return null;
  const code = detail.failureCloseout?.reasonCode ?? null;
  if (code === "VISA_REJECTED") return "noteVisaRejected";
  if (code === "APPLICATION_REJECTED") return "noteImmigrationRejected";
  return "noteFailureClosed";
}

function awaitingCoeFinalPaymentNoteSuffix(detail: CaseDetail): string | null {
  if (
    !resolveCaseTypeFlowProfile(caseTypeCodeForFlowProfile(detail)).hasCoeFlow
  )
    return null;
  const gate = detail.finalPaymentGate;
  if (!gate || gate.canAdvanceToCoe === true) return null;
  if (gate.canAdvanceToCoe !== false || !Array.isArray(gate.blockers)) {
    return null;
  }
  const codes = new Set(gate.blockers.map((b) => b.code));
  if (codes.has("final_payment_milestone_missing")) {
    return "noteAwaitingCoeMilestoneMissing";
  }
  if (codes.has("billing_risk_unacknowledged")) {
    return "noteAwaitingCoeBillingRiskUnacknowledged";
  }
  if (codes.has("final_payment_outstanding")) {
    return "noteAwaitingCoePaymentOutstanding";
  }
  return null;
}

/**
 * 根据详情状态解析「COE / 海外贴签 / 返签结果」卡片的 i18n 后缀（`cases.detail.validation.postApproval.*`）。
 *
 * @param detail - 案件详情
 * @returns postApproval 文案键后缀（不含命名空间）
 */
export function resolvePostApprovalCoeNoteKeySuffix(
  detail: CaseDetail,
): string {
  const closed = closedFailedCoeNoteSuffix(detail);
  if (closed !== null) return closed;
  const phase = detail.businessPhase;
  if (COMPLETED_PHASES.has(phase)) return "noteCompleted";
  if (phase === "VISA_REJECTED") return "noteVisaRejected";
  if (phase === "REJECTED") return "noteImmigrationRejected";

  if (
    !resolveCaseTypeFlowProfile(caseTypeCodeForFlowProfile(detail))
      .hasCoeFlow &&
    isPostApprovalCoePanelPhase(phase)
  ) {
    return "noteDomesticTypicalSansCoeChain";
  }

  if (OVERSEAS_VISA_IN_PROGRESS_PHASES.has(phase))
    return "noteOverseasVisaApplying";
  if (COE_SENT_OVERSEAS_NEXT_PHASES.has(phase)) return "noteAwaitingVisaStamp";
  if (AWAITING_COE_PHASES.has(phase)) {
    const gateSuffix = awaitingCoeFinalPaymentNoteSuffix(detail);
    if (gateSuffix !== null) return gateSuffix;
    return "noteAwaitingCoe";
  }
  if (POST_SUBMISSION_PHASES.has(phase)) return "notePostSubmission";
  return "notePreSubmission";
}
