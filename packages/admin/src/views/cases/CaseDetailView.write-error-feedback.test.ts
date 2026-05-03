// ── Test Ownership ──────────────────────────────────────────────
// Owner: T1.4 — CaseDetailView 接线 writeFeedback.errorI18nKey
//   透传给 task/deadline modal（失败时 errorMessageKey 有值，成功时清空）。
// A4 — watch(writeFeedback) toast 反馈（非 gate-block 错误时弹 toast）。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { ref, watch, nextTick } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import { CaseRepositoryError } from "./model/CaseRepository";
import type { WriteActionFeedback } from "./model/useCaseDetailWriteActions";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";

function buildActiveAggregate() {
  return createMockAggregate(createMockDetail({ id: "CASE-ERR1" }), {
    tabCounts: { ...ZERO_TAB_COUNTS },
  });
}

function createRepoWithFailingTask(serverErrorCode: string) {
  const createTask = vi.fn().mockRejectedValue(
    new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Task creation failed",
      serverErrorCode,
    }),
  );
  const getDetailAggregate = vi.fn().mockResolvedValue(buildActiveAggregate());

  const repo = {
    getDetailAggregate,
    getDocumentItems: vi.fn().mockResolvedValue([]),
    getGeneratedDocuments: vi
      .fn()
      .mockResolvedValue({ templates: [], generated: [] }),
    getValidationData: vi.fn().mockResolvedValue({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    }),
    getBillingData: vi.fn().mockResolvedValue({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    }),
    getSubmissionPackages: vi.fn().mockResolvedValue([]),
    getDoubleReviewEntries: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    getLogEntries: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getDeadlines: vi.fn().mockResolvedValue([]),
    createTask,
  } as unknown as CaseRepository;

  return { repo, createTask, getDetailAggregate };
}

function createRepoWithFailingReminder(serverErrorCode: string) {
  const createReminder = vi.fn().mockRejectedValue(
    new CaseRepositoryError({
      code: "CASE_WRITE_ERROR",
      message: "Reminder creation failed",
      serverErrorCode,
    }),
  );
  const getDetailAggregate = vi.fn().mockResolvedValue(buildActiveAggregate());

  const repo = {
    getDetailAggregate,
    getDocumentItems: vi.fn().mockResolvedValue([]),
    getGeneratedDocuments: vi
      .fn()
      .mockResolvedValue({ templates: [], generated: [] }),
    getValidationData: vi.fn().mockResolvedValue({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    }),
    getBillingData: vi.fn().mockResolvedValue({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    }),
    getSubmissionPackages: vi.fn().mockResolvedValue([]),
    getDoubleReviewEntries: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue([]),
    getLogEntries: vi.fn().mockResolvedValue([]),
    getTasks: vi.fn().mockResolvedValue([]),
    getDeadlines: vi.fn().mockResolvedValue([]),
    createReminder,
  } as unknown as CaseRepository;

  return { repo, createReminder, getDetailAggregate };
}

describe("T1.4: createTask failure → writeFeedback.errorI18nKey propagation", () => {
  it("TASK_INVALID_ASSIGNEE_ID → errorI18nKey reflects mapped key", async () => {
    const { repo } = createRepoWithFailingTask("TASK_INVALID_ASSIGNEE_ID");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    expect(model.writeFeedback.value.errorI18nKey).toBeNull();

    const ok = await model.createTask({
      title: "Test",
      priority: "normal",
      assigneeUserId: "not-a-uuid",
    });

    expect(ok).toBe(false);
    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.taskInvalidAssigneeId",
    );
  });

  it("TASK_CREATE_FAILED → errorI18nKey reflects mapped key", async () => {
    const { repo } = createRepoWithFailingTask("TASK_CREATE_FAILED");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    const ok = await model.createTask({
      title: "Test",
      priority: "normal",
    });

    expect(ok).toBe(false);
    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.taskCreateFailed",
    );
  });

  it("clearWriteFeedback resets errorI18nKey to null", async () => {
    const { repo } = createRepoWithFailingTask("TASK_CREATE_FAILED");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    await model.createTask({ title: "Test", priority: "normal" });
    expect(model.writeFeedback.value.errorI18nKey).not.toBeNull();

    model.clearWriteFeedback();
    expect(model.writeFeedback.value.errorI18nKey).toBeNull();
    expect(model.writeFeedback.value.submitting).toBe(false);
    expect(model.writeFeedback.value.errorMessage).toBeNull();
  });
});

describe("T1.4: createReminder failure → writeFeedback.errorI18nKey propagation", () => {
  it("REMINDER_CREATE_FAILED → errorI18nKey reflects mapped key", async () => {
    const { repo } = createRepoWithFailingReminder("REMINDER_CREATE_FAILED");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    const ok = await model.createReminder({
      targetType: "case",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test",
    });

    expect(ok).toBe(false);
    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreateFailed",
    );
  });

  it("REMINDER_INVALID_CASE_ID → errorI18nKey reflects mapped key", async () => {
    const { repo } = createRepoWithFailingReminder("REMINDER_INVALID_CASE_ID");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    const ok = await model.createReminder({
      targetType: "case",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test",
    });

    expect(ok).toBe(false);
    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderInvalidCaseId",
    );
  });
});

describe("T1.4: CaseDetailView template wiring — error-message-key + clearWriteFeedback", () => {
  const templatePath = resolve(__dirname, "CaseDetailView.vue");
  const src = readFileSync(templatePath, "utf-8");

  it("CaseTaskCreateModal binds :error-message-key", () => {
    const block = extractComponentBlock(src, "CaseTaskCreateModal");
    expect(block).toBeTruthy();
    expect(block).toContain(':error-message-key="writeFeedback.errorI18nKey"');
  });

  it("CaseDeadlineCreateModal binds :error-message-key", () => {
    const block = extractComponentBlock(src, "CaseDeadlineCreateModal");
    expect(block).toBeTruthy();
    expect(block).toContain(':error-message-key="writeFeedback.errorI18nKey"');
  });

  it("CaseTaskCreateModal @close calls clearWriteFeedback()", () => {
    const block = extractComponentBlock(src, "CaseTaskCreateModal");
    expect(block).toBeTruthy();
    expect(block).toContain("clearWriteFeedback()");
  });

  it("CaseDeadlineCreateModal @close calls clearWriteFeedback()", () => {
    const block = extractComponentBlock(src, "CaseDeadlineCreateModal");
    expect(block).toBeTruthy();
    expect(block).toContain("clearWriteFeedback()");
  });

  it("destructures clearWriteFeedback from useCaseDetailModel", () => {
    expect(src).toContain("clearWriteFeedback");
  });
});

function extractComponentBlock(
  src: string,
  componentName: string,
): string | null {
  const selfClosePattern = new RegExp(`<${componentName}[^>]*/>`, "s");
  const selfMatch = selfClosePattern.exec(src);
  if (selfMatch) return selfMatch[0];

  const openPattern = new RegExp(
    `<${componentName}[\\s\\S]*?(?:/>|</${componentName}>)`,
  );
  const openMatch = openPattern.exec(src);
  return openMatch ? openMatch[0] : null;
}

// ── A4: watch(writeFeedback) → toast on non-gate-block error ────

describe("A4: CaseDetailView template wiring — watch(writeFeedback) toast", () => {
  const templatePath = resolve(__dirname, "CaseDetailView.vue");
  const src = readFileSync(templatePath, "utf-8");

  it("imports watch from vue", () => {
    expect(src).toMatch(
      /import\s*\{[^}]*\bwatch\b[^}]*\}\s*from\s*["']vue["']/,
    );
  });

  it("has a watch on writeFeedback", () => {
    expect(src).toContain("watch(writeFeedback");
  });

  it("watch body calls toast.add with tone error", () => {
    expect(src).toMatch(/toast\.add\(\s*\{[^}]*tone:\s*["']error["']/);
  });

  it("watch body guards on !fb.isGateBlock", () => {
    expect(src).toMatch(/!fb\.isGateBlock/);
  });

  it("watch body guards on fb.errorI18nKey", () => {
    expect(src).toMatch(/fb\.errorI18nKey/);
  });
});

describe("A4: watch(writeFeedback) functional — toast fires on non-gate-block error", () => {
  function setupWatcher() {
    const writeFeedback = ref<WriteActionFeedback>({
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    });
    const toastCalls: Array<{ title: string; tone: string }> = [];
    const translate = (key: string) => `translated:${key}`;

    watch(writeFeedback, (fb) => {
      if (fb.errorI18nKey && !fb.isGateBlock) {
        toastCalls.push({ title: translate(fb.errorI18nKey), tone: "error" });
      }
    });

    return { writeFeedback, toastCalls };
  }

  it("non-gate-block error → toast fires", async () => {
    const { writeFeedback, toastCalls } = setupWatcher();

    writeFeedback.value = {
      submitting: false,
      errorMessage: "Task creation failed",
      errorI18nKey: "cases.writeErrors.taskCreateFailed",
      serverErrorCode: "TASK_CREATE_FAILED",
      isGateBlock: false,
    };
    await nextTick();

    expect(toastCalls).toHaveLength(1);
    expect(toastCalls[0].title).toBe(
      "translated:cases.writeErrors.taskCreateFailed",
    );
    expect(toastCalls[0].tone).toBe("error");
  });

  it("gate-block error → toast does NOT fire", async () => {
    const { writeFeedback, toastCalls } = setupWatcher();

    writeFeedback.value = {
      submitting: false,
      errorMessage: "Gate block",
      errorI18nKey: "cases.writeErrors.gateAMissingPrimaryParty",
      serverErrorCode: "CASE_GATE_A_MISSING_PRIMARY_PARTY",
      isGateBlock: true,
    };
    await nextTick();

    expect(toastCalls).toHaveLength(0);
  });

  it("submitting state (no errorI18nKey) → toast does NOT fire", async () => {
    const { writeFeedback, toastCalls } = setupWatcher();

    writeFeedback.value = {
      submitting: true,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    };
    await nextTick();

    expect(toastCalls).toHaveLength(0);
  });

  it("success clear (null errorI18nKey) → toast does NOT fire", async () => {
    const { writeFeedback, toastCalls } = setupWatcher();

    writeFeedback.value = {
      submitting: false,
      errorMessage: "fail",
      errorI18nKey: "cases.writeErrors.unknown",
      serverErrorCode: null,
      isGateBlock: false,
    };
    await nextTick();
    expect(toastCalls).toHaveLength(1);

    writeFeedback.value = {
      submitting: false,
      errorMessage: null,
      errorI18nKey: null,
      serverErrorCode: null,
      isGateBlock: false,
    };
    await nextTick();
    expect(toastCalls).toHaveLength(1);
  });

  it("reminder error → toast fires with correct i18n key", async () => {
    const { writeFeedback, toastCalls } = setupWatcher();

    writeFeedback.value = {
      submitting: false,
      errorMessage: "Reminder creation failed",
      errorI18nKey: "cases.writeErrors.reminderCreateFailed",
      serverErrorCode: "REMINDER_CREATE_FAILED",
      isGateBlock: false,
    };
    await nextTick();

    expect(toastCalls).toHaveLength(1);
    expect(toastCalls[0].title).toBe(
      "translated:cases.writeErrors.reminderCreateFailed",
    );
  });
});

describe("A4: model integration — writeFeedback drives toast condition", () => {
  it("TASK_CREATE_FAILED → isGateBlock=false (toast should fire)", async () => {
    const { repo } = createRepoWithFailingTask("TASK_CREATE_FAILED");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    await model.createTask({ title: "Test", priority: "normal" });

    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.taskCreateFailed",
    );
    expect(model.writeFeedback.value.isGateBlock).toBe(false);
  });

  it("CASE_GATE_A_MISSING_PRIMARY_PARTY → isGateBlock=true (toast should NOT fire)", async () => {
    const { repo } = createRepoWithFailingTask(
      "CASE_GATE_A_MISSING_PRIMARY_PARTY",
    );
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    await model.createTask({ title: "Test", priority: "normal" });

    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.gateAMissingPrimaryParty",
    );
    expect(model.writeFeedback.value.isGateBlock).toBe(true);
  });

  it("REMINDER_CREATE_FAILED → isGateBlock=false (toast should fire)", async () => {
    const { repo } = createRepoWithFailingReminder("REMINDER_CREATE_FAILED");
    const model = useCaseDetailModel(ref("CASE-ERR1"), { repo });
    await flushFetch();

    await model.createReminder({
      targetType: "case",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test",
    });

    expect(model.writeFeedback.value.errorI18nKey).toBe(
      "cases.writeErrors.reminderCreateFailed",
    );
    expect(model.writeFeedback.value.isGateBlock).toBe(false);
  });
});
