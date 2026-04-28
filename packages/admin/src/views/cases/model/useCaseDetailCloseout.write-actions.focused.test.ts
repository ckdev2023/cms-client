// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-03 — closeout write-action focused tests.
// Covers: failureClose lifecycle, readonly/double-submit guards, retryReminderCreation, and transitionStage lifecycle.
// Does NOT test: aggregate adapter mapping or useCaseDetailModel end-to-end state projection.
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

describe("failureClose write action (p1-qa-001-03)", () => {
  it("calls repo.transitionCase with toStage=S9 and no closeReason", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "CASE-FC01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose();
    expect(ok).toBe(true);
    expect(transitionCase).toHaveBeenCalledWith("CASE-FC01", {
      toStage: "S9",
      closeReason: undefined,
    });
  });

  it("passes closeReason when provided (CLIENT_WITHDRAWN)", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "CASE-FC02",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.failureClose("顧客の都合により取り下げ");
    expect(transitionCase).toHaveBeenCalledWith("CASE-FC02", {
      toStage: "S9",
      closeReason: "顧客の都合により取り下げ",
    });
  });

  it("submitting lifecycle: true during in-flight, false after success", async () => {
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

  it("onSuccess callback fires after successful failureClose", async () => {
    const onSuccess = vi.fn();
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    const ok = await wa.failureClose();
    expect(ok).toBe(true);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("CASE_FAILURE_CLOSEOUT_ATTRIBUTION_REQUIRED → gate block feedback", async () => {
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
        throw new Error("Connection refused");
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
    expect(wa.writeFeedback.value.errorMessage).toBe("Connection refused");
  });

  it("clearWriteFeedback resets after failureClose error", async () => {
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

describe("failureClose readonly & double-submit guards (p1-qa-001-03)", () => {
  it("returns false when readonly — repo not called", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
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

    const ok2 = await wa.failureClose("reason");
    expect(ok2).toBe(false);
    expect(transitionCase).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });

  it("no feedback state change when readonly blocks failureClose", async () => {
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
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
  });
});

describe("retryReminderCreation write action (p1-qa-001-03)", () => {
  it("calls repo.retryReminderCreation with correct id", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "CASE-RR01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(true);
    expect(retryReminderCreation).toHaveBeenCalledWith("CASE-RR01");
  });

  it("onSuccess fires after successful retry", async () => {
    const onSuccess = vi.fn();
    const repo = stubRepo();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    await wa.retryReminderCreation();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("CASE_REMINDER_CREATION_FAILED → correct i18n key", async () => {
    const err = makeGateError("CASE_REMINDER_CREATION_FAILED");
    const repo = stubRepo({
      retryReminderCreation: vi.fn(async () => {
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

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_REMINDER_CREATION_FAILED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
  });

  it("returns false when readonly", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(false);
    expect(retryReminderCreation).not.toHaveBeenCalled();
  });
});

describe("closeout transition lifecycle (p1-qa-001-03)", () => {
  it("transitionStage to S9 succeeds when preconditions met", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const onSuccess = vi.fn();
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "CASE-FINAL",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    const ok = await wa.transitionStage("S9");
    expect(ok).toBe(true);
    expect(transitionCase).toHaveBeenCalledWith("CASE-FINAL", {
      toStage: "S9",
      closeReason: undefined,
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(wa.writeFeedback.value).toMatchObject({
      submitting: false,
      errorMessage: null,
      isGateBlock: false,
    });
  });

  it("transitionStage to S9 blocked → feedback shows success closeout blocked", async () => {
    const err = makeGateError("CASE_SUCCESS_CLOSEOUT_BLOCKED");
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

    const ok = await wa.transitionStage("S9");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(true);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_SUCCESS_CLOSEOUT_BLOCKED",
    );
  });

  it("failureClose with reason → S9 transition includes closeReason", async () => {
    const transitionCase = vi.fn(async () => ({ id: "c1", success: true }));
    const repo = stubRepo({ transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "CASE-FAIL",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    await wa.failureClose("業務上の理由により");
    expect(transitionCase).toHaveBeenCalledWith("CASE-FAIL", {
      toStage: "S9",
      closeReason: "業務上の理由により",
    });
  });

  it("failureClose then clearWriteFeedback → clean state for next operation", async () => {
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

    const transitionCase2 = vi.fn(async () => ({ id: "c1", success: true }));
    (repo as unknown as Record<string, unknown>).transitionCase =
      transitionCase2;

    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.submitting).toBe(false);
  });
});
