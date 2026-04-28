// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-005-03 — BMV failure close action focused tests.
// Covers: failureClose write-action lifecycle, readonly guard, and double-submit guard.
// Does NOT test: adapter derivation, reminder retry, or convergence assertions.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";

import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import { createWriteActions } from "./useCaseDetailWriteActions";

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
    retryReminderCreation: vi.fn(async () => ({ id: "c1", success: true })),
    ...overrides,
  } as unknown as CaseRepository;
}

function makeGateError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Gate blocked: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

describe("failureClose write action lifecycle (p1-fe-005-03)", () => {
  it("calls repo.transitionCase with toStage=S9", async () => {
    const transitionCase = vi.fn(async () => ({
      id: "case-fail01",
      success: true,
    }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "case-fail01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose();
    expect(ok).toBe(true);
    expect(transitionCase).toHaveBeenCalledWith("case-fail01", {
      toStage: "S9",
      closeReason: undefined,
    });
  });

  it("passes closeReason when provided", async () => {
    const transitionCase = vi.fn(async () => ({
      id: "case-fail01",
      success: true,
    }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "case-fail01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.failureClose("顧客の意向により取り下げ");
    expect(transitionCase).toHaveBeenCalledWith("case-fail01", {
      toStage: "S9",
      closeReason: "顧客の意向により取り下げ",
    });
  });

  it("submitting transitions from true to false on success", async () => {
    let resolve!: () => void;
    const transitionCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p = wa.failureClose();
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("onSuccess fires after successful failure close", async () => {
    const repo = stubRepo();
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    await wa.failureClose();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("error feedback when attribution required but not provided", async () => {
    const err = makeGateError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED");
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    const ok = await wa.failureClose();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.failureCloseoutAttributionRequired",
    );
  });

  it("network error is not a gate block", async () => {
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    const ok = await wa.failureClose();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.errorMessage).toBe("Network timeout");
  });

  it("clearWriteFeedback resets after failure close error", async () => {
    const err = makeGateError("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED");
    const repo = stubRepo({
      transitionCase: vi.fn(async () => {
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

    await wa.failureClose();
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

describe("failureClose readonly guard (p1-fe-005-03)", () => {
  it("returns false when readonly and does not call repo", async () => {
    const transitionCase = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose();
    expect(ok).toBe(false);
    expect(transitionCase).not.toHaveBeenCalled();
  });

  it("no feedback state change when readonly blocks", async () => {
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.failureClose();
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });
});

describe("failureClose double-submit guard (p1-fe-005-03)", () => {
  it("second failureClose returns false while first in-flight", async () => {
    let resolve!: () => void;
    const transitionCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p1 = wa.failureClose();
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const ok2 = await wa.failureClose();
    expect(ok2).toBe(false);
    expect(transitionCase).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });
});
