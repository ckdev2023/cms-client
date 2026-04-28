// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-004-03 — COE write-action focused tests
//   Covers: advancePostApprovalStage (COE_SENT) lifecycle and
//   transitionWorkflowStep (ENTRY_SUCCESS / RESIDENCE_PERIOD_RECORDED /
//   RENEWAL_REMINDER_SCHEDULED) lifecycle.
// Does NOT test: adapter mapping internals (→ CaseAdapterDetailAggregate.*),
//   guard / residence / reminder / closeout siblings,
//   final-payment-gate derivation (→ final-payment-gate.test),
//   survey/quote gates (→ survey-quote.focused.test),
//   or Vue component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { createWriteActions } from "./useCaseDetailWriteActions";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import type { CaseRepository } from "./CaseRepository";

// ─── Helpers ──────────────────────────────────────────────────────

function stubRepo(overrides: Partial<CaseRepository> = {}): CaseRepository {
  return {
    listCases: vi.fn(),
    getSummaryCards: vi.fn(() => []),
    getDetail: vi.fn(async () => null),
    getDetailAggregate: vi.fn(async () => null),
    createCase: vi.fn(async () => ({ id: "c1", success: true })),
    updateCase: vi.fn(async () => ({ id: "c1", success: true })),
    transitionCase: vi.fn(async () => ({ id: "c1", success: true })),
    acknowledgeBillingRisk: vi.fn(async () => ({ id: "c1", success: true })),
    updatePostApprovalStage: vi.fn(async () => ({ id: "c1", success: true })),
    transitionWorkflowStep: vi.fn(async () => ({ id: "c1", success: true })),
    deleteCase: vi.fn(async () => undefined),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => []),
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    createCaseParty: vi.fn(async () => ({ id: "cp1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

function makeCoeGateError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Gate blocked: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

// ═══════════════════════════════════════════════════════════════════
//  1. COE ADVANCE — advancePostApprovalStage lifecycle
// ═══════════════════════════════════════════════════════════════════

describe("advancePostApprovalStage lifecycle (p1-fe-004-03)", () => {
  it("calls repo.updatePostApprovalStage with correct id and stage", async () => {
    const updatePostApprovalStage = vi.fn(async () => ({
      id: "BMV-001",
      success: true,
    }));
    const repo = stubRepo({ updatePostApprovalStage });
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-001",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    await wa.advancePostApprovalStage("coe_sent");
    expect(updatePostApprovalStage).toHaveBeenCalledWith("BMV-001", {
      stage: "coe_sent",
    });
  });

  it("submitting = true during in-flight, false after success", async () => {
    let resolve!: () => void;
    const updatePostApprovalStage = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ updatePostApprovalStage });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p = wa.advancePostApprovalStage("coe_sent");
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("onSuccess callback fires after successful advance", async () => {
    const repo = stubRepo();
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    const ok = await wa.advancePostApprovalStage("coe_sent");
    expect(ok).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("error feedback on billing gate block", async () => {
    const err = makeCoeGateError("CASE_POST_APPROVAL_BILLING_BLOCKED");
    const repo = stubRepo({
      updatePostApprovalStage: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.advancePostApprovalStage("coe_sent");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_POST_APPROVAL_BILLING_BLOCKED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.postApprovalBillingBlocked",
    );
  });

  it("error feedback on billing risk unacknowledged", async () => {
    const err = makeCoeGateError(
      "CASE_POST_APPROVAL_BILLING_RISK_UNACKNOWLEDGED",
    );
    const repo = stubRepo({
      updatePostApprovalStage: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.advancePostApprovalStage("coe_sent");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.postApprovalBillingRiskUnacknowledged",
    );
  });

  it("clearWriteFeedback resets after gate block error", async () => {
    const err = makeCoeGateError("CASE_POST_APPROVAL_BILLING_BLOCKED");
    const repo = stubRepo({
      updatePostApprovalStage: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.advancePostApprovalStage("coe_sent");
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);

    wa.clearWriteFeedback();
    expect(wa.writeFeedback.value).toMatchObject({
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. WORKFLOW STEP TRANSITIONS — COE_SENT / ENTRY / RESIDENCE / REMINDER
// ═══════════════════════════════════════════════════════════════════

describe("transitionWorkflowStep for post-approval steps (p1-fe-004-03)", () => {
  it("calls repo.transitionWorkflowStep with COE_SENT", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-002",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("COE_SENT");
    expect(ok).toBe(true);
    expect(transitionWorkflowStep).toHaveBeenCalledWith("BMV-002", {
      toStepCode: "COE_SENT",
    });
  });

  it("calls repo with ENTRY_SUCCESS step code", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-003",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.transitionWorkflowStep("ENTRY_SUCCESS");
    expect(transitionWorkflowStep).toHaveBeenCalledWith("BMV-003", {
      toStepCode: "ENTRY_SUCCESS",
    });
  });

  it("calls repo with RESIDENCE_PERIOD_RECORDED step code", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-004",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.transitionWorkflowStep("RESIDENCE_PERIOD_RECORDED");
    expect(transitionWorkflowStep).toHaveBeenCalledWith("BMV-004", {
      toStepCode: "RESIDENCE_PERIOD_RECORDED",
    });
  });

  it("calls repo with RENEWAL_REMINDER_SCHEDULED step code", async () => {
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-005",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.transitionWorkflowStep("RENEWAL_REMINDER_SCHEDULED");
    expect(transitionWorkflowStep).toHaveBeenCalledWith("BMV-005", {
      toStepCode: "RENEWAL_REMINDER_SCHEDULED",
    });
  });

  it("gate block error on billing gate during workflow step transition", async () => {
    const err = makeCoeGateError("CASE_WF_STEP_BILLING_GATE_BLOCKED");
    const repo = stubRepo({
      transitionWorkflowStep: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("COE_SENT");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_WF_STEP_BILLING_GATE_BLOCKED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.wfStepBillingGateBlocked",
    );
  });

  it("step not allowed error is a gate block", async () => {
    const err = makeCoeGateError("CASE_WF_STEP_NOT_ALLOWED");
    const repo = stubRepo({
      transitionWorkflowStep: vi.fn(async () => {
        throw err;
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("ENTRY_SUCCESS");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.wfStepNotAllowed",
    );
  });

  it("network error is not a gate block", async () => {
    const repo = stubRepo({
      transitionWorkflowStep: vi.fn(async () => {
        throw new Error("Network timeout");
      }),
    });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionWorkflowStep("COE_SENT");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.errorMessage).toBe("Network timeout");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.unknown",
    );
  });
});
