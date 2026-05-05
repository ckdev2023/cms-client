// ── Test Ownership ──────────────────────────────────────────────
// Owner: R38-F — RefetchTag selective refetch after write actions.
// Covers: tag-based onPartialSuccess dispatch, fallback to onSuccess,
//   and per-action tag correctness.
// Does NOT test: loader internals, adapter, or component rendering.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from "vitest";

import type { CaseRepository } from "./CaseRepository";
import type { RefetchTag } from "./useCaseDetailWriteActions";
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
    createCommunicationLog: vi.fn(async () => ({
      id: "cl1",
      success: true,
    })),
    createReminder: vi.fn(async () => ({ id: "r1", success: true })),
    createGeneratedDocument: vi.fn(async () => ({ id: "gd1" })),
    finalizeGeneratedDocument: vi.fn(async () => ({ id: "gd1" })),
    exportGeneratedDocument: vi.fn(async () => ({ id: "gd1" })),
    createTask: vi.fn(async () => ({ id: "tk1" })),
    createSubmissionPackage: vi.fn(async () => ({ id: "sp1" })),
    ...overrides,
  } as unknown as CaseRepository;
}

function makeWriteActions(opts?: {
  repoOverrides?: Partial<CaseRepository>;
  skipPartial?: boolean;
}) {
  const repo = stubRepo(opts?.repoOverrides);
  const onSuccess = vi.fn(async () => {});
  const onPartialSuccess = vi.fn(async () => {});
  const wa = createWriteActions({
    repo,
    getCaseId: () => "case-01",
    getReadonly: () => false,
    onSuccess,
    onPartialSuccess: opts?.skipPartial ? undefined : onPartialSuccess,
    onRiskModalClose: () => {},
  });
  return { wa, repo, onSuccess, onPartialSuccess };
}

function setOf(...tags: RefetchTag[]): ReadonlySet<RefetchTag> {
  return new Set(tags);
}

describe("RefetchTag — onPartialSuccess dispatch", () => {
  it("createGeneratedDocument triggers forms + logEntries", async () => {
    const { wa, onPartialSuccess, onSuccess } = makeWriteActions();
    await wa.createGeneratedDocument({
      title: "test",
      templateId: null,
      outputFormat: "pdf",
    });
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("forms", "logEntries"),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("finalizeGeneratedDocument triggers forms + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.finalizeGeneratedDocument("gd-01");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("forms", "logEntries"),
    );
  });

  it("exportGeneratedDocument triggers forms + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.exportGeneratedDocument("gd-01");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("forms", "logEntries"),
    );
  });

  it("publishMessage triggers messages + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.publishMessage({ content: "hello", channelChoice: "internal" });
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("messages", "logEntries"),
    );
  });

  it("createReminder triggers deadlines + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.createReminder({
      targetType: "case",
      remindAt: "2026-06-01",
      kind: "renewal_90d",
      memo: "test",
    });
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("deadlines", "logEntries"),
    );
  });

  it("createTask triggers tasks + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.createTask({ title: "t1", priority: "normal" });
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("tasks", "logEntries"),
    );
  });

  it("completeTask triggers tasks + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.completeTask("tk-01");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("tasks", "logEntries"),
    );
  });

  it("createSubmissionPackage triggers submissionPackages + logEntries", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.createSubmissionPackage({
      method: "post",
      note: "note",
      documentFileIds: [],
    } as never);
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(
      setOf("submissionPackages", "logEntries"),
    );
  });
});

describe("RefetchTag — detail tag (full refetch)", () => {
  it("transitionStage triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.transitionStage("S3");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("transitionWorkflowStep triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.transitionWorkflowStep("WAITING_MATERIAL");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("advancePostApprovalStage triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.advancePostApprovalStage("coe_sent");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("acknowledgeBillingRisk triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.acknowledgeBillingRisk("reason1");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("updateCaseFields triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.updateCaseFields({ visaPlan: "change_status" });
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("retryReminderCreation triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.retryReminderCreation();
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });

  it("failureClose triggers detail tag", async () => {
    const { wa, onPartialSuccess } = makeWriteActions();
    await wa.failureClose("visa_rejected");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onPartialSuccess.mock.calls[0][0]).toEqual(setOf("detail"));
  });
});

describe("RefetchTag — fallback to onSuccess", () => {
  it("falls back to onSuccess when onPartialSuccess not provided", async () => {
    const { wa, onSuccess } = makeWriteActions({ skipPartial: true });
    await wa.createGeneratedDocument({
      title: "test",
      templateId: null,
      outputFormat: "pdf",
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("onSuccess not called when onPartialSuccess handles tags", async () => {
    const { wa, onSuccess, onPartialSuccess } = makeWriteActions();
    await wa.completeTask("tk-01");
    expect(onPartialSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("on error neither onSuccess nor onPartialSuccess is called", async () => {
    const { wa, onSuccess, onPartialSuccess } = makeWriteActions({
      repoOverrides: {
        completeTask: vi.fn(async () => {
          throw new Error("boom");
        }),
      },
    });
    const ok = await wa.completeTask("tk-01");
    expect(ok).toBe(false);
    expect(onPartialSuccess).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
