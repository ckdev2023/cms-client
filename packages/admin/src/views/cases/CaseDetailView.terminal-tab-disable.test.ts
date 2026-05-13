import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CASE_DETAIL_TABS } from "./constants";
import { isTabAccessibleInTerminal } from "./model/useCaseDetailGuard";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";
import type { CaseDetailTab } from "./types";

const templatePath = resolve(__dirname, "CaseDetailView.vue");
const src = readFileSync(templatePath, "utf-8");

describe("isTabAccessibleInTerminal (pure function)", () => {
  it("非终态下所有 tab 都可访问", () => {
    for (const tab of CASE_DETAIL_TABS) {
      expect(isTabAccessibleInTerminal(tab.key, false)).toBe(true);
    }
  });

  it.each([
    "log",
    "overview",
    "forms",
    "documents",
    "billing",
  ] as CaseDetailTab[])("終態下 %s 可访问", (tabKey) => {
    expect(isTabAccessibleInTerminal(tabKey, true)).toBe(true);
  });

  it.each([
    "validation",
    "tasks",
    "info",
    "deadlines",
    "messages",
  ] as CaseDetailTab[])("終態下 %s 不可访问", (tabKey) => {
    expect(isTabAccessibleInTerminal(tabKey, true)).toBe(false);
  });
});

describe("CaseDetailView template — terminal tab disabling wiring", () => {
  it("tab button 绑定 aria-disabled 到 guard.isTabAccessible", () => {
    expect(src).toContain("aria-disabled");
    expect(src).toContain("guard.isTabAccessible(tab.key)");
  });

  it("tab button 使用 onTabClick 而非 switchTab", () => {
    expect(src).toContain("onTabClick(tab.key)");
  });

  it("tab button 绑定 disabled CSS class", () => {
    expect(src).toContain("case-detail-view__tab--disabled");
  });

  it("script 定义 onTabClick 函数", () => {
    expect(src).toContain("function onTabClick(");
  });

  it("script 定义 findNextAccessibleTab 函数", () => {
    expect(src).toContain("function findNextAccessibleTab(");
  });

  it("概览/校验子面板程序化跳转使用 guardedSwitchTab（与终态守门一致）", () => {
    expect(src).toContain("function guardedSwitchTab");
    expect(src).toContain('@switch-tab="guardedSwitchTab"');
  });
});

describe("CaseDetailView — archived case tab redirect (model level)", () => {
  function buildTerminalRepo() {
    const detail = createMockDetail({
      id: "CASE-ARCHIVED",
      businessPhase: "CLOSED_SUCCESS",
      stageCode: "S9",
      stage: "S9",
      readonly: true,
    });
    const getDetailAggregate = vi
      .fn()
      .mockResolvedValue(
        createMockAggregate(detail, { tabCounts: { ...ZERO_TAB_COUNTS } }),
      );

    return {
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
    } as unknown as CaseRepository;
  }

  it("archived 案件 isTerminalPhase === true", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), { repo });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(true);
  });

  it("tasks tab 在 archived 案件下不可访问", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "tasks",
    });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(true);
    expect(
      isTabAccessibleInTerminal("tasks", model.isTerminalPhase.value),
    ).toBe(false);
  });

  it("overview tab 在 archived 案件下可访问", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), { repo });
    await flushFetch();

    expect(
      isTabAccessibleInTerminal("overview", model.isTerminalPhase.value),
    ).toBe(true);
  });

  it("log tab 在 archived 案件下可访问", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), { repo });
    await flushFetch();

    expect(isTabAccessibleInTerminal("log", model.isTerminalPhase.value)).toBe(
      true,
    );
  });
});
