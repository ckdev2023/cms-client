import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { Case } from "../model/coreEntities";

import {
  FAILURE_CLOSEOUT_REASON_CODES,
  FAILURE_CLOSEOUT_PATHS,
  FAILURE_OUTCOME_SET,
  FAILURE_CLOSEOUT_ERROR_CODES,
  resolveFailureAttribution,
  checkFailureCloseout,
  canBypassSuccessCloseoutForFailure,
} from "./cases.types-failure-closeout";
import type {
  FailureCloseoutReasonCode,
  FailureCloseoutCheckInput,
  FailureCloseoutCheckResult,
} from "./cases.types-failure-closeout";

const BASE_CASE: Case = {
  id: "case-001",
  orgId: "org-001",
  customerId: "cust-001",
  caseTypeCode: "business_manager_visa",
  status: "S8",
  stage: "S8",
  groupId: null,
  ownerUserId: "user-001",
  openedAt: "2026-01-01T00:00:00.000Z",
  dueAt: null,
  metadata: {},
  caseNo: null,
  caseName: null,
  caseSubtype: null,
  applicationType: null,
  applicationFlowType: null,
  visaPlan: null,
  postApprovalStage: null,
  coeIssuedAt: null,
  coeExpiryDate: null,
  coeSentAt: null,
  closeReason: null,
  supplementCount: 0,
  companyId: null,
  priority: "normal",
  riskLevel: "low",
  assistantUserId: null,
  sourceChannel: null,
  signedAt: null,
  acceptedAt: null,
  submissionDate: null,
  resultDate: null,
  residenceExpiryDate: null,
  archivedAt: null,
  resultOutcome: null,
  quotePrice: null,
  depositPaidCached: false,
  finalPaymentPaidCached: false,
  billingUnpaidAmountCached: 0,
  billingRiskAcknowledgedBy: null,
  billingRiskAcknowledgedAt: null,
  billingRiskAckReasonCode: null,
  billingRiskAckReasonNote: null,
  billingRiskAckEvidenceUrl: null,
  overseasVisaStartAt: null,
  entryConfirmedAt: null,
  jurisdictionAuthority: null,
  businessPhase: "CONSULTING",
  currentWorkflowStepCode: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function mc(overrides: Partial<Case> = {}): Case {
  return { ...BASE_CASE, ...overrides };
}

void describe("FAILURE_CLOSEOUT_REASON_CODES: enum stability", () => {
  void test("contains exactly 4 stable reason codes", () => {
    assert.equal(Object.values(FAILURE_CLOSEOUT_REASON_CODES).length, 4);
    assert.equal(FAILURE_CLOSEOUT_REASON_CODES.VISA_REJECTED, "VISA_REJECTED");
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.APPLICATION_REJECTED,
      "APPLICATION_REJECTED",
    );
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.CLIENT_WITHDRAWN,
      "CLIENT_WITHDRAWN",
    );
    assert.equal(
      FAILURE_CLOSEOUT_REASON_CODES.MANUAL_FAILURE_CLOSE,
      "MANUAL_FAILURE_CLOSE",
    );
  });
});

void describe("FAILURE_OUTCOME_SET: alignment with resultOutcome values", () => {
  void test("contains exactly 3 failure outcomes covering visa_rejected, rejected, withdrawn", () => {
    assert.equal(FAILURE_OUTCOME_SET.size, 3);
    assert.ok(FAILURE_OUTCOME_SET.has("visa_rejected"));
    assert.ok(FAILURE_OUTCOME_SET.has("rejected"));
    assert.ok(FAILURE_OUTCOME_SET.has("withdrawn"));
    assert.ok(!FAILURE_OUTCOME_SET.has("pending"));
    assert.ok(!FAILURE_OUTCOME_SET.has("approved"));
  });
});

void describe("FAILURE_CLOSEOUT_PATHS: path definitions", () => {
  void test("all 4 paths have consistent structure", () => {
    for (const path of Object.values(FAILURE_CLOSEOUT_PATHS)) {
      assert.ok(typeof path.reasonCode === "string");
      assert.ok(typeof path.label === "string");
      assert.ok(typeof path.canDirectClose === "boolean");
      assert.ok(typeof path.closeReasonRequired === "boolean");
      assert.ok(typeof path.adminGuidance === "string");
    }
  });

  void test("VISA_REJECTED path does not require closeReason", () => {
    assert.equal(
      FAILURE_CLOSEOUT_PATHS.VISA_REJECTED.closeReasonRequired,
      false,
    );
    assert.equal(FAILURE_CLOSEOUT_PATHS.VISA_REJECTED.canDirectClose, true);
  });

  void test("MANUAL_FAILURE_CLOSE path requires closeReason", () => {
    assert.equal(
      FAILURE_CLOSEOUT_PATHS.MANUAL_FAILURE_CLOSE.closeReasonRequired,
      true,
    );
    assert.equal(
      FAILURE_CLOSEOUT_PATHS.MANUAL_FAILURE_CLOSE.canDirectClose,
      true,
    );
  });
});

void describe("FAILURE_CLOSEOUT_ERROR_CODES: error code stability", () => {
  void test("ATTRIBUTION_REQUIRED is stable", () => {
    assert.equal(
      FAILURE_CLOSEOUT_ERROR_CODES.ATTRIBUTION_REQUIRED,
      "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
    );
  });
});

void describe("resolveFailureAttribution: VISA_REJECTED step takes priority", () => {
  void test("returns VISA_REJECTED when currentWorkflowStepCode is VISA_REJECTED", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ currentWorkflowStepCode: "VISA_REJECTED" }),
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "VISA_REJECTED");
    assert.equal(result.canDirectClose, true);
    assert.equal(result.closeReasonRequired, false);
  });

  void test("VISA_REJECTED step takes priority over resultOutcome=withdrawn", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({
        currentWorkflowStepCode: "VISA_REJECTED",
        resultOutcome: "withdrawn",
      }),
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "VISA_REJECTED");
  });
});

void describe("resolveFailureAttribution: resultOutcome mapping", () => {
  void test("resultOutcome=rejected → APPLICATION_REJECTED", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ resultOutcome: "rejected" }),
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "APPLICATION_REJECTED");
  });

  void test("resultOutcome=visa_rejected → VISA_REJECTED", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ resultOutcome: "visa_rejected" }),
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "VISA_REJECTED");
  });

  void test("resultOutcome=withdrawn → CLIENT_WITHDRAWN", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ resultOutcome: "withdrawn" }),
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "CLIENT_WITHDRAWN");
  });

  void test("resultOutcome=approved does not produce attribution", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ resultOutcome: "approved" }),
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });

  void test("resultOutcome=pending does not produce attribution", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({ resultOutcome: "pending" }),
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });
});

void describe("resolveFailureAttribution: closeReason fallback", () => {
  void test("closeReason provided → MANUAL_FAILURE_CLOSE", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc(),
      closeReason: "クライアント事情による中止",
    };
    const result = resolveFailureAttribution(input);
    assert.ok(result);
    assert.equal(result.reasonCode, "MANUAL_FAILURE_CLOSE");
    assert.equal(result.closeReasonRequired, true);
  });

  void test("empty closeReason does not produce attribution", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc(),
      closeReason: "  ",
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });

  void test("null closeReason does not produce attribution", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc(),
      closeReason: null,
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });
});

void describe("resolveFailureAttribution: no attribution when nothing set", () => {
  void test("returns null when no failure signals", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc(),
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });

  void test("returns null for case with only success signals", () => {
    const input: FailureCloseoutCheckInput = {
      caseEntity: mc({
        entryConfirmedAt: "2026-03-15T00:00:00.000Z",
        currentWorkflowStepCode: "ENTRY_SUCCESS",
      }),
    };
    const result = resolveFailureAttribution(input);
    assert.equal(result, null);
  });
});

void describe("checkFailureCloseout: BMV scoping", () => {
  void test("non-BMV case always returns isFailurePath=false", () => {
    const result = checkFailureCloseout(
      mc({ caseTypeCode: "family_stay", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, false);
    assert.equal(result.attribution, null);
  });

  void test("BMV S9 case returns isFailurePath=false (already closed)", () => {
    const result = checkFailureCloseout(
      mc({ stage: "S9", status: "S9", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, false);
  });
});

void describe("checkFailureCloseout: detecting failure paths", () => {
  void test("VISA_REJECTED step detected as failure path", () => {
    const result = checkFailureCloseout(
      mc({
        stage: "S7",
        status: "S7",
        currentWorkflowStepCode: "VISA_REJECTED",
      }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(result.attribution.reasonCode, "VISA_REJECTED");
  });

  void test("resultOutcome=rejected at S5 detected as failure path", () => {
    const result = checkFailureCloseout(
      mc({ stage: "S5", status: "S5", resultOutcome: "rejected" }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(result.attribution.reasonCode, "APPLICATION_REJECTED");
  });

  void test("resultOutcome=withdrawn at S3 detected as failure path", () => {
    const result = checkFailureCloseout(
      mc({ stage: "S3", status: "S3", resultOutcome: "withdrawn" }),
    );
    assert.equal(result.isFailurePath, true);
    assert.ok(result.attribution);
    assert.equal(result.attribution.reasonCode, "CLIENT_WITHDRAWN");
  });

  void test("normal BMV S8 case without failure signals is not a failure path", () => {
    const result = checkFailureCloseout(
      mc({ currentWorkflowStepCode: "ENTRY_SUCCESS" }),
    );
    assert.equal(result.isFailurePath, false);
    assert.equal(result.attribution, null);
  });

  void test("BMV S2 case with no failure signals is not a failure path", () => {
    const result = checkFailureCloseout(mc({ stage: "S2", status: "S2" }));
    assert.equal(result.isFailurePath, false);
  });
});

void describe("canBypassSuccessCloseoutForFailure", () => {
  void test("bypasses when VISA_REJECTED step is set", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(
        mc({ currentWorkflowStepCode: "VISA_REJECTED" }),
      ),
      true,
    );
  });

  void test("bypasses when resultOutcome=rejected", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(mc({ resultOutcome: "rejected" })),
      true,
    );
  });

  void test("bypasses when resultOutcome=visa_rejected", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(
        mc({ resultOutcome: "visa_rejected" }),
      ),
      true,
    );
  });

  void test("bypasses when resultOutcome=withdrawn", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(mc({ resultOutcome: "withdrawn" })),
      true,
    );
  });

  void test("bypasses when closeReason is provided", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(mc(), "クライアント中止"),
      true,
    );
  });

  void test("does NOT bypass when no failure signal and no closeReason", () => {
    assert.equal(canBypassSuccessCloseoutForFailure(mc()), false);
  });

  void test("does NOT bypass when closeReason is empty", () => {
    assert.equal(canBypassSuccessCloseoutForFailure(mc(), "  "), false);
  });

  void test("does NOT bypass when resultOutcome=approved", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(mc({ resultOutcome: "approved" })),
      false,
    );
  });

  void test("does NOT bypass when resultOutcome=pending", () => {
    assert.equal(
      canBypassSuccessCloseoutForFailure(mc({ resultOutcome: "pending" })),
      false,
    );
  });
});

void describe("attribution priority: step > resultOutcome > closeReason", () => {
  void test("VISA_REJECTED step wins over resultOutcome=rejected", () => {
    const attr = resolveFailureAttribution({
      caseEntity: mc({
        currentWorkflowStepCode: "VISA_REJECTED",
        resultOutcome: "rejected",
      }),
    });
    assert.ok(attr);
    assert.equal(attr.reasonCode, "VISA_REJECTED");
  });

  void test("resultOutcome wins over closeReason", () => {
    const attr = resolveFailureAttribution({
      caseEntity: mc({ resultOutcome: "withdrawn" }),
      closeReason: "some reason",
    });
    assert.ok(attr);
    assert.equal(attr.reasonCode, "CLIENT_WITHDRAWN");
  });

  void test("closeReason used only when nothing else matches", () => {
    const attr = resolveFailureAttribution({
      caseEntity: mc({ resultOutcome: "pending" }),
      closeReason: "manual close reason",
    });
    assert.ok(attr);
    assert.equal(attr.reasonCode, "MANUAL_FAILURE_CLOSE");
  });
});

void describe("contract alignment: overseas VISA_REJECTED_CLOSURE", () => {
  void test("VISA_REJECTED failure path matches overseas closure contract", () => {
    const path = FAILURE_CLOSEOUT_PATHS.VISA_REJECTED;
    assert.equal(path.reasonCode, "VISA_REJECTED");
    assert.ok(path.resultOutcomeValues.includes("rejected"));
    assert.ok(path.resultOutcomeValues.includes("visa_rejected"));
    assert.equal(path.canDirectClose, true);
    assert.equal(path.closeReasonRequired, false);
  });
});

void describe("contract alignment: service failureOutcomes bypass", () => {
  void test("FAILURE_OUTCOME_SET matches service bypass set exactly", () => {
    const serviceBypassed = new Set(["rejected", "visa_rejected", "withdrawn"]);
    assert.deepEqual(FAILURE_OUTCOME_SET, serviceBypassed);
  });
});

void describe("type contracts", () => {
  void test("FailureCloseoutReasonCode covers all enum values", () => {
    const codes: FailureCloseoutReasonCode[] = [
      "VISA_REJECTED",
      "APPLICATION_REJECTED",
      "CLIENT_WITHDRAWN",
      "MANUAL_FAILURE_CLOSE",
    ];
    assert.equal(codes.length, 4);
  });

  void test("FailureCloseoutCheckResult shapes are valid", () => {
    const ok: FailureCloseoutCheckResult = {
      isFailurePath: true,
      attribution: {
        reasonCode: "VISA_REJECTED",
        reasonLabel: "海外返签拒否",
        canDirectClose: true,
        closeReasonRequired: false,
      },
    };
    assert.equal(ok.isFailurePath, true);
    const none: FailureCloseoutCheckResult = {
      isFailurePath: false,
      attribution: null,
    };
    assert.equal(none.attribution, null);
  });
});
