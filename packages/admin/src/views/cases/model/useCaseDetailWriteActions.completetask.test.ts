// ── Test Ownership ──────────────────────────────────────────────
// Owner: p1-fe-001-02 — completeTask write action focused tests.
// Covers: completeTask lifecycle, error classification, and cross-action guards.
// Does NOT test: task adapter derivation or CaseTasksTab component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";
import { nextTick } from "vue";

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
    completeTask: vi.fn(async () => ({ id: "t1" })),
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

describe("completeTask write action", () => {
  it("calls repo.completeTask with correct taskId", async () => {
    const completeTask = vi.fn(async () => ({ id: "task-01" }));
    const repo = stubRepo({ completeTask });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "case-01",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.completeTask("task-01");
    expect(ok).toBe(true);
    expect(completeTask).toHaveBeenCalledWith("task-01");
  });

  it("submitting lifecycle: true during flight, false on success", async () => {
    let resolve!: () => void;
    const completeTask = vi.fn(
      () =>
        new Promise<{ id: string }>((r) => {
          resolve = () => r({ id: "t1" });
        }),
    );
    const repo = stubRepo({ completeTask });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p = wa.completeTask("t1");
    expect(wa.writeFeedback.value.submitting).toBe(true);
    resolve();
    await p;
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.errorMessage).toBeNull();
  });

  it("onSuccess fires after successful complete", async () => {
    const repo = stubRepo();
    const onSuccess = vi.fn();
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess,
      onRiskModalClose: () => {},
    });

    await wa.completeTask("t1");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("TASK_COMPLETE_FAILED error feedback", async () => {
    const err = makeError("TASK_COMPLETE_FAILED");
    const repo = stubRepo({
      completeTask: vi.fn(async () => {
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

    const ok = await wa.completeTask("t1");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.submitting).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe("TASK_COMPLETE_FAILED");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.taskCompleteFailed",
    );
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
  });

  it("TASK_NOT_FOUND error feedback", async () => {
    const err = makeError("TASK_NOT_FOUND");
    const repo = stubRepo({
      completeTask: vi.fn(async () => {
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

    const ok = await wa.completeTask("t-missing");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBe("TASK_NOT_FOUND");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.taskNotFound",
    );
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
  });

  it("network error shows fallback i18n", async () => {
    const repo = stubRepo({
      completeTask: vi.fn(async () => {
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

    const ok = await wa.completeTask("t1");
    expect(ok).toBe(false);
    expect(wa.writeFeedback.value.isGateBlock).toBe(false);
    expect(wa.writeFeedback.value.serverErrorCode).toBeNull();
    expect(wa.writeFeedback.value.errorMessage).toBe("Service timeout");
    expect(wa.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.unknown",
    );
  });

  it("blocked when readonly", async () => {
    const completeTask = vi.fn(async () => ({ id: "t1" }));
    const repo = stubRepo({ completeTask });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => true,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const ok = await wa.completeTask("t1");
    expect(ok).toBe(false);
    expect(completeTask).not.toHaveBeenCalled();
  });

  it("double-submit guard: second call blocked while first in-flight", async () => {
    let resolve!: () => void;
    const completeTask = vi.fn(
      () =>
        new Promise<{ id: string }>((r) => {
          resolve = () => r({ id: "t1" });
        }),
    );
    const repo = stubRepo({ completeTask });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    const p1 = wa.completeTask("t1");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const ok2 = await wa.completeTask("t2");
    expect(ok2).toBe(false);
    expect(completeTask).toHaveBeenCalledTimes(1);

    resolve();
    const ok1 = await p1;
    expect(ok1).toBe(true);
  });

  it("clearWriteFeedback resets after completeTask failure", async () => {
    const err = makeError("TASK_COMPLETE_FAILED");
    const repo = stubRepo({
      completeTask: vi.fn(async () => {
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

    await wa.completeTask("t1");
    expect(wa.writeFeedback.value.serverErrorCode).toBe("TASK_COMPLETE_FAILED");

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

describe("completeTask cross-action guards", () => {
  it("completeTask blocked while another action in-flight", async () => {
    let resolve!: () => void;
    const transitionCase = vi.fn(
      () =>
        new Promise<{ id: string; success: boolean }>((r) => {
          resolve = () => r({ id: "c1", success: true });
        }),
    );
    const completeTask = vi.fn(async () => ({ id: "t1" }));
    const repo = stubRepo({ transitionCase, completeTask });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    void wa.failureClose("visa_rejected");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const taskOk = await wa.completeTask("t1");
    expect(taskOk).toBe(false);
    expect(completeTask).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });

  it("other actions blocked while completeTask in-flight", async () => {
    let resolve!: () => void;
    const completeTask = vi.fn(
      () =>
        new Promise<{ id: string }>((r) => {
          resolve = () => r({ id: "t1" });
        }),
    );
    const retryReminderCreation = vi.fn(async () => ({
      id: "c1",
      success: true,
    }));
    const repo = stubRepo({ completeTask, retryReminderCreation });
    const wa = createWriteActions({
      repo,
      getCaseId: () => "c1",
      getReadonly: () => false,
      onSuccess: async () => {},
      onRiskModalClose: () => {},
    });

    void wa.completeTask("t1");
    expect(wa.writeFeedback.value.submitting).toBe(true);

    const retryOk = await wa.retryReminderCreation();
    expect(retryOk).toBe(false);
    expect(retryReminderCreation).not.toHaveBeenCalled();

    resolve();
    await flushFetch();
  });
});
