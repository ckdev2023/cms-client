import { describe, it, expect } from "vitest";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";
import { resolvePostApprovalCoeNoteKeySuffix } from "./caseValidationPostApprovalCoeNote";

function baseWorkDetail(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    caseType: "work",
    titleFallbackParts: {
      ...CASE_DETAIL_SAMPLES.work.titleFallbackParts,
      caseTypeCode: "work",
    },
    doubleReview: [],
    reviewEnabled: false,
    riskConfirmationRecord: null,
    ...overrides,
  };
}

describe("resolvePostApprovalCoeNoteKeySuffix", () => {
  it("WAITING_PAYMENT + milestone missing blocker → noteAwaitingCoeMilestoneMissing", () => {
    const suffix = resolvePostApprovalCoeNoteKeySuffix(
      baseWorkDetail({
        businessPhase: "WAITING_PAYMENT",
        finalPaymentGate: {
          paymentCleared: false,
          finalPaymentMilestoneMatched: false,
          outstandingLabel: "",
          canAdvanceToCoe: false,
          blockers: [
            {
              code: "final_payment_milestone_missing",
              label: "final_payment_milestone_missing",
            },
          ],
        },
      }),
    );
    expect(suffix).toBe("noteAwaitingCoeMilestoneMissing");
  });

  it("prioritizes billing risk over outstanding when both present", () => {
    const suffix = resolvePostApprovalCoeNoteKeySuffix(
      baseWorkDetail({
        businessPhase: "WAITING_PAYMENT",
        finalPaymentGate: {
          paymentCleared: false,
          finalPaymentMilestoneMatched: true,
          outstandingLabel: "¥1",
          canAdvanceToCoe: false,
          blockers: [
            { code: "final_payment_outstanding", label: "x" },
            { code: "billing_risk_unacknowledged", label: "y" },
          ],
        },
      }),
    );
    expect(suffix).toBe("noteAwaitingCoeBillingRiskUnacknowledged");
  });

  it("WAITING_PAYMENT + empty finalPaymentGate object → generic awaiting COE note", () => {
    expect(
      resolvePostApprovalCoeNoteKeySuffix(
        baseWorkDetail({
          businessPhase: "WAITING_PAYMENT",
          finalPaymentGate: {} as never,
        }),
      ),
    ).toBe("noteAwaitingCoe");
  });

  it("WAITING_PAYMENT + gate missing blockers array → noteAwaitingCoe", () => {
    expect(
      resolvePostApprovalCoeNoteKeySuffix(
        baseWorkDetail({
          businessPhase: "WAITING_PAYMENT",
          finalPaymentGate: {
            paymentCleared: false,
            finalPaymentMilestoneMatched: true,
            outstandingLabel: "",
            canAdvanceToCoe: false,
          } as never,
        }),
      ),
    ).toBe("noteAwaitingCoe");
  });

  it("CONTRACTED early phase → notePreSubmission", () => {
    expect(
      resolvePostApprovalCoeNoteKeySuffix(
        baseWorkDetail({ businessPhase: "CONTRACTED" }),
      ),
    ).toBe("notePreSubmission");
  });

  it("prefers titleFallbackParts.caseTypeCode when caseType is a display label (BMV gate copy)", () => {
    const suffix = resolvePostApprovalCoeNoteKeySuffix(
      baseWorkDetail({
        caseType: "経営管理（大阪）認定",
        titleFallbackParts: {
          ...CASE_DETAIL_SAMPLES.work.titleFallbackParts,
          caseTypeCode: "biz_mgmt_cert_4m",
        },
        businessPhase: "WAITING_PAYMENT",
        finalPaymentGate: {
          paymentCleared: false,
          finalPaymentMilestoneMatched: false,
          outstandingLabel: "",
          canAdvanceToCoe: false,
          blockers: [
            {
              code: "final_payment_milestone_missing",
              label: "final_payment_milestone_missing",
            },
          ],
        },
      }),
    );
    expect(suffix).toBe("noteAwaitingCoeMilestoneMissing");
  });

  it("renewal code in titleFallbackParts → domestic note while phase is post-approval COE panel", () => {
    const w = CASE_DETAIL_SAMPLES.work;
    expect(
      resolvePostApprovalCoeNoteKeySuffix({
        ...w,
        doubleReview: [],
        reviewEnabled: false,
        riskConfirmationRecord: null,
        businessPhase: "WAITING_PAYMENT",
      }),
    ).toBe("noteDomesticTypicalSansCoeChain");
  });
});
