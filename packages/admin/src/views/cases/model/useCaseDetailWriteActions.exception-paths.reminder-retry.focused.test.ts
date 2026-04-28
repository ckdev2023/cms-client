// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-qa-001-02 — reminder retry focused tests.
// Covers: retryReminderCreation lifecycle, error classification, and cross-action guards.
// Does NOT test: reminder adapter derivation or supplement/failureClose adapters.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import {
  isGateBlockError,
  resolveWriteErrorI18nKey,
} from "./CaseWriteErrorMapping";
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

function makeError(code: string): CaseRepositoryError {
  return new CaseRepositoryError({
    code: "CASE_WRITE_ERROR",
    message: `Error: ${code}`,
    status: 400,
    serverErrorCode: code,
  });
}

async function flushFetch(): Promise<void> {
  await nextTick();
  await new Promise<void>((r) => queueMicrotask(r));
  await nextTick();
}

describe("retryReminderCreation write action (p1-qa-001-02)", () => {
  it("calls repo.retryReminderCreation with correct caseId", async () => {
    const retryReminderCreation = vi.fn(async () => ({
      id: "BMV-REM01",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "BMV-REM01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.retryReminderCreation();
    expect(ok).toBe(true);
    expect(retryReminderCreation).toHaveBeenCalledWith("BMV-REM01");
  });

  it("submitting lifecycle: true during flight, false on success", async () => {
    let resolve!: () => void;
    const retryReminderCreation = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p = wa.retryReminderCreation();
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("onSuccess fires after successful retry", async () => {
    const repo = stubRepo();
    const onSuccess = vi.fn();
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

  it("CASE_REMINDER_CREATION_FAILED error feedback", async () => {
    const err = makeError("CASE_REMINDER_CREATION_FAILED");
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
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_REMINDER_CREATION_FAILED",
    );
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
  });

  it("network error during retry shows fallback i18n", async () => {
    const repo = stubRepo({
      retryReminderCreation: vi.fn(async () => {
        throw new Error("Service timeout");
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
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.errorMessage).toBe("Service timeout");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("blocked when readonly", async () => {
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

  it("double-submit guard: second retry blocked while first in-flight", async () => {
    let resolve!: () => void;
    const retryReminderCreation = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const repo = stubRepo({ retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p1 = wa.retryReminderCreation();
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const ok2 = await wa.retryReminderCreation();
    expect(ok2).toBe(false);
    expect(retryReminderCreation).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });

  it("clearWriteFeedback resets after reminder retry failure", async () => {
    const err = makeError("CASE_REMINDER_CREATION_FAILED");
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

    await wa.retryReminderCreation();
    expect(wa.writeFeedback.value.serverErrorCode).toBe(
      "CASE_REMINDER_CREATION_FAILED",
    );

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

describe("reminder error code classification (p1-qa-001-02)", () => {
  it("CASE_REMINDER_CREATION_FAILED → NOT a gate block", () => {
    expect(isGateBlockError("CASE_REMINDER_CREATION_FAILED")).toBe(false);
  });

  it("CASE_REMINDER_CREATION_FAILED → correct i18n key", () => {
    expect(resolveWriteErrorI18nKey("CASE_REMINDER_CREATION_FAILED")).toBe(
      "cases.writeErrors.reminderCreationFailed",
    );
  });

  it("CASE_S9_READONLY → NOT a gate block (ordinary)", () => {
    expect(isGateBlockError("CASE_S9_READONLY")).toBe(false);
    expect(resolveWriteErrorI18nKey("CASE_S9_READONLY")).toBe(
      "cases.writeErrors.s9Readonly",
    );
  });

  it("CASE_TRANSITION_CONFLICT → NOT a gate block", () => {
    expect(isGateBlockError("CASE_TRANSITION_CONFLICT")).toBe(false);
    expect(resolveWriteErrorI18nKey("CASE_TRANSITION_CONFLICT")).toBe(
      "cases.writeErrors.transitionConflict",
    );
  });
});

describe("cross-action exception guards (p1-qa-001-02)", () => {
  it("retryReminderCreation blocked while failureClose in-flight", async () => {
    let resolve!: () => void;
    const transitionCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ transitionCase, retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    void wa.failureClose("visa_rejected");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const retryOk = await wa.retryReminderCreation();
    expect(retryOk).toBe(false);
    expect(retryReminderCreation).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });

  it("failureClose blocked while retryReminderCreation in-flight", async () => {
    let resolve!: () => void;
    const retryReminderCreation = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const transitionCase = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation, transitionCase });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    void wa.retryReminderCreation();
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const failOk = await wa.failureClose("visa_rejected");
    expect(failOk).toBe(false);
    expect(transitionCase).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });

  it("transitionWorkflowStep blocked while retryReminderCreation in-flight", async () => {
    let resolve!: () => void;
    const retryReminderCreation = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const transitionWorkflowStep = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ retryReminderCreation, transitionWorkflowStep });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    void wa.retryReminderCreation();
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const stepOk = await wa.transitionWorkflowStep("ENTRY_SUCCESS");
    expect(stepOk).toBe(false);
    expect(transitionWorkflowStep).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });
});
