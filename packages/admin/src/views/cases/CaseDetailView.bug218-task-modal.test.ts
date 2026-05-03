// ── Test Ownership ──────────────────────────────────────────────
// Owner: BUG-218 / BUG-235 — 「新增任务」由 router.push('/tasks') 改为
//   CaseTaskCreateModal 内联弹窗，需验证 createTask 写入链路完整、
//   以及 CaseDetailView 模板不再包含 router.push('/tasks') 跳转。
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";

function buildActiveAggregate() {
  return createMockAggregate(createMockDetail({ id: "CASE-T1" }), {
    tabCounts: { ...ZERO_TAB_COUNTS },
  });
}

function createRepoWithTaskStub() {
  const createTask = vi.fn().mockResolvedValue({ id: "task-1" });
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

describe("BUG-218: createTask wiring contract", () => {
  it("createTask 调用 repo.createTask 并传入正确参数", async () => {
    const { repo, createTask, getDetailAggregate } = createRepoWithTaskStub();
    const model = useCaseDetailModel(ref("CASE-T1"), { repo });
    await flushFetch();

    const callCountBefore = getDetailAggregate.mock.calls.length;

    await model.createTask({
      title: "Review documents",
      priority: "high",
      description: "Check all attachments",
      dueAt: "2026-06-15T00:00:00.000Z",
    });
    await flushFetch();

    expect(createTask).toHaveBeenCalledTimes(1);
    expect(createTask).toHaveBeenCalledWith({
      caseId: "CASE-T1",
      title: "Review documents",
      priority: "high",
      description: "Check all attachments",
      dueAt: "2026-06-15T00:00:00.000Z",
    });

    expect(getDetailAggregate.mock.calls.length).toBeGreaterThan(
      callCountBefore,
    );
  });

  it("createTask readonly 时不调用 repo", async () => {
    const { repo, createTask } = createRepoWithTaskStub();
    (repo.getDetailAggregate as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockAggregate(createMockDetail({ readonly: true }), {
        tabCounts: { ...ZERO_TAB_COUNTS },
      }),
    );
    const model = useCaseDetailModel(ref("CASE-RO"), { repo });
    await flushFetch();

    const ok = await model.createTask({
      title: "test",
      priority: "normal",
    });

    expect(ok).toBe(false);
    expect(createTask).not.toHaveBeenCalled();
  });
});

describe("BUG-218: CaseDetailView template no longer redirects to /tasks", () => {
  const templatePath = resolve(__dirname, "CaseDetailView.vue");
  const src = readFileSync(templatePath, "utf-8");

  it("CaseDetailView 不包含 router.push 到 /tasks", () => {
    expect(src).not.toContain('path: "/tasks"');
  });

  it("CaseDetailView 包含 CaseTaskCreateModal 组件", () => {
    expect(src).toContain("CaseTaskCreateModal");
  });

  it("CaseDetailView 包含 task-create-modal 的 open/close 接线", () => {
    expect(src).toContain(':open="taskModalOpen"');
    expect(src).toContain("taskModalOpen = false");
    expect(src).toContain("clearWriteFeedback()");
    expect(src).toContain('@submit="onTaskSubmit"');
  });
});
