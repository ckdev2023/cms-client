// ── Test Ownership ──────────────────────────────────────────────
// Owner: 案件详情父子接线 wiring contract（BUG-226 / BUG-227 / BUG-228）。
// Covers:
//   1. useCaseDetailModel 暴露 publishMessage / createReminder / createGeneratedDocument
//      并正确调用 repo 层对应方法（参数校验 + 成功后 refetch）
//   2. CaseDetailView.vue template 静态扫描：所有子组件 defineEmits 声明的事件
//      在父模板上都有对应 @event listener（防再次断线）
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
  return createMockAggregate(createMockDetail({ id: "CASE-W1" }), {
    tabCounts: { ...ZERO_TAB_COUNTS },
  });
}

function createFullRepoStub() {
  const createCommunicationLog = vi.fn().mockResolvedValue({ id: "log-1" });
  const createReminder = vi.fn().mockResolvedValue({ id: "rem-1" });
  const createGeneratedDocument = vi.fn().mockResolvedValue({ id: "doc-1" });
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
    createCommunicationLog,
    createReminder,
    createGeneratedDocument,
  } as unknown as CaseRepository;

  return {
    repo,
    createCommunicationLog,
    createReminder,
    createGeneratedDocument,
    getDetailAggregate,
  };
}

describe("CaseDetailView wiring contract — publishMessage (BUG-226)", () => {
  it("publishMessage 调用 repo.createCommunicationLog 并传入正确参数", async () => {
    const { repo, createCommunicationLog, getDetailAggregate } =
      createFullRepoStub();
    const model = useCaseDetailModel(ref("CASE-W1"), { repo });
    await flushFetch();

    const callCountBefore = getDetailAggregate.mock.calls.length;

    await model.publishMessage({
      content: "hello",
      channelChoice: "internal",
    });
    await flushFetch();

    expect(createCommunicationLog).toHaveBeenCalledTimes(1);
    expect(createCommunicationLog).toHaveBeenCalledWith({
      caseId: "CASE-W1",
      content: "hello",
      channelChoice: "internal",
    });

    expect(getDetailAggregate.mock.calls.length).toBeGreaterThan(
      callCountBefore,
    );
  });

  it("publishMessage readonly 时不调用 repo", async () => {
    const { repo, createCommunicationLog } = createFullRepoStub();
    (repo.getDetailAggregate as ReturnType<typeof vi.fn>).mockResolvedValue(
      createMockAggregate(createMockDetail({ readonly: true }), {
        tabCounts: { ...ZERO_TAB_COUNTS },
      }),
    );
    const model = useCaseDetailModel(ref("CASE-RO"), { repo });
    await flushFetch();

    const ok = await model.publishMessage({
      content: "test",
      channelChoice: "phone",
    });

    expect(ok).toBe(false);
    expect(createCommunicationLog).not.toHaveBeenCalled();
  });
});

describe("CaseDetailView wiring contract — createReminder (BUG-227)", () => {
  it("createReminder 调用 repo.createReminder 并传入正确参数", async () => {
    const { repo, createReminder } = createFullRepoStub();
    const model = useCaseDetailModel(ref("CASE-W1"), { repo });
    await flushFetch();

    await model.createReminder({
      targetType: "case",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test memo",
    });
    await flushFetch();

    expect(createReminder).toHaveBeenCalledTimes(1);
    expect(createReminder).toHaveBeenCalledWith({
      caseId: "CASE-W1",
      targetType: "case",
      targetId: "CASE-W1",
      remindAt: "2026-06-01T00:00:00.000Z",
      kind: "custom",
      memo: "test memo",
    });
  });
});

describe("CaseDetailView wiring contract — createGeneratedDocument (BUG-228)", () => {
  it("createGeneratedDocument 调用 repo.createGeneratedDocument 并传入正确参数", async () => {
    const { repo, createGeneratedDocument } = createFullRepoStub();
    const model = useCaseDetailModel(ref("CASE-W1"), { repo });
    await flushFetch();

    await model.createGeneratedDocument({
      title: "申請書",
      templateId: null,
      outputFormat: "pdf",
    });
    await flushFetch();

    expect(createGeneratedDocument).toHaveBeenCalledTimes(1);
    expect(createGeneratedDocument).toHaveBeenCalledWith({
      caseId: "CASE-W1",
      title: "申請書",
      templateId: null,
      outputFormat: "pdf",
    });
  });
});

describe("CaseDetailView template static wiring scan", () => {
  const templatePath = resolve(__dirname, "CaseDetailView.vue");
  const src = readFileSync(templatePath, "utf-8");

  const REQUIRED_WIRING: Array<{
    component: string;
    event: string;
  }> = [
    { component: "CaseMessagesTab", event: "publish-message" },
    { component: "CaseDeadlinesTab", event: "open-create-deadline" },
    { component: "CaseFormsTab", event: "open-generate-modal" },
    { component: "CaseTasksTab", event: "open-create-task" },
  ];

  for (const { component, event } of REQUIRED_WIRING) {
    it(`<${component}> 模板上必须接线 @${event}`, () => {
      const componentBlock = extractComponentBlock(src, component);
      expect(
        componentBlock,
        `<${component}> not found in CaseDetailView template`,
      ).toBeTruthy();
      expect(
        componentBlock,
        `<${component}> missing @${event} listener`,
      ).toContain(`@${event}`);
    });
  }
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
