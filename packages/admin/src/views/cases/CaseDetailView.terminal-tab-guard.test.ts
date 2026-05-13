import { describe, it, expect, vi } from "vitest";
import { ref, watch, nextTick } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CASE_DETAIL_TABS } from "./constants";
import { useCaseDetailGuard } from "./model/useCaseDetailGuard";
import { useCaseDetailModel } from "./model/useCaseDetailModel";
import type { CaseRepository } from "./model/CaseRepository";
import type { CaseDetailTab } from "./types";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
  ZERO_TAB_COUNTS,
} from "./model/useCaseDetailModel.test-support";

const templatePath = resolve(__dirname, "CaseDetailView.vue");
const src = readFileSync(templatePath, "utf-8");

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

function buildActiveRepo() {
  const detail = createMockDetail({
    id: "CASE-ACTIVE",
    businessPhase: "MATERIAL_PREPARING",
    stageCode: "S3",
    stage: "S3",
    readonly: false,
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

describe("H2: terminal tab guard — click blocking", () => {
  const INACCESSIBLE_TABS: CaseDetailTab[] = [
    "validation",
    "tasks",
    "info",
    "deadlines",
    "messages",
  ];

  it("onTabClick('tasks') on archived case: guard blocks, activeTab stays on overview", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "overview",
    });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(true);
    expect(model.activeTab.value).toBe("overview");

    const guard = useCaseDetailGuard(model.detail);
    if (guard.isTabAccessible("tasks")) {
      model.switchTab("tasks");
    }

    expect(model.activeTab.value).toBe("overview");
  });

  it.each(INACCESSIBLE_TABS)(
    "onTabClick('%s') on archived case: guard blocks switch",
    async (tabKey) => {
      const repo = buildTerminalRepo();
      const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
        repo,
        initialTab: "overview",
      });
      await flushFetch();

      const guard = useCaseDetailGuard(model.detail);
      if (guard.isTabAccessible(tabKey)) {
        model.switchTab(tabKey);
      }

      expect(model.activeTab.value).toBe("overview");
    },
  );

  it.each(["forms", "documents", "billing"] as CaseDetailTab[])(
    "onTabClick('%s') on archived case: guard allows switch (readonly)",
    async (tabKey) => {
      const repo = buildTerminalRepo();
      const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
        repo,
        initialTab: "overview",
      });
      await flushFetch();

      const guard = useCaseDetailGuard(model.detail);
      if (guard.isTabAccessible(tabKey)) {
        model.switchTab(tabKey);
      }

      expect(model.activeTab.value).toBe(tabKey);
    },
  );

  it("onTabClick('log') on archived case: guard allows, activeTab switches to log", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "overview",
    });
    await flushFetch();

    const guard = useCaseDetailGuard(model.detail);
    if (guard.isTabAccessible("log")) {
      model.switchTab("log");
    }

    expect(model.activeTab.value).toBe("log");
  });

  it("onTabClick('overview') on archived case: guard allows, activeTab switches to overview", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "log",
    });
    await flushFetch();

    const guard = useCaseDetailGuard(model.detail);
    if (guard.isTabAccessible("overview")) {
      model.switchTab("overview");
    }

    expect(model.activeTab.value).toBe("overview");
  });

  it("all tabs clickable on active (non-archived) case", async () => {
    const repo = buildActiveRepo();
    const model = useCaseDetailModel(ref("CASE-ACTIVE"), {
      repo,
      initialTab: "overview",
    });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(false);

    const guard = useCaseDetailGuard(model.detail);
    for (const tab of CASE_DETAIL_TABS) {
      if (guard.isTabAccessible(tab.key)) {
        model.switchTab(tab.key);
      }
      expect(model.activeTab.value).toBe(tab.key);
    }
  });
});

describe("H2: terminal tab guard — ?tab=tasks deep-link redirect", () => {
  it("archived case with initialTab='tasks': watch redirects activeTab to 'log'", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "tasks",
    });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(true);
    expect(model.detail.value).not.toBeNull();

    const guard = useCaseDetailGuard(model.detail);

    if (!guard.isTabAccessible(model.activeTab.value)) {
      model.switchTab("log");
    }

    expect(model.activeTab.value).toBe("log");
  });

  it.each([
    "validation",
    "tasks",
    "info",
    "deadlines",
    "messages",
  ] as CaseDetailTab[])(
    "archived case with initialTab='%s': redirect to 'log'",
    async (tabKey) => {
      const repo = buildTerminalRepo();
      const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
        repo,
        initialTab: tabKey,
      });
      await flushFetch();

      const guard = useCaseDetailGuard(model.detail);

      if (!guard.isTabAccessible(model.activeTab.value)) {
        model.switchTab("log");
      }

      expect(model.activeTab.value).toBe("log");
    },
  );

  it.each(["forms", "documents", "billing"] as CaseDetailTab[])(
    "archived case with initialTab='%s': stays (readonly accessible)",
    async (tabKey) => {
      const repo = buildTerminalRepo();
      const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
        repo,
        initialTab: tabKey,
      });
      await flushFetch();

      const guard = useCaseDetailGuard(model.detail);

      if (!guard.isTabAccessible(model.activeTab.value)) {
        model.switchTab("log");
      }

      expect(model.activeTab.value).toBe(tabKey);
    },
  );

  it("archived case with initialTab='log': stays on 'log'", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "log",
    });
    await flushFetch();

    const guard = useCaseDetailGuard(model.detail);

    if (!guard.isTabAccessible(model.activeTab.value)) {
      model.switchTab("log");
    }

    expect(model.activeTab.value).toBe("log");
  });

  it("archived case with initialTab='overview': stays on 'overview'", async () => {
    const repo = buildTerminalRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      initialTab: "overview",
    });
    await flushFetch();

    const guard = useCaseDetailGuard(model.detail);

    if (!guard.isTabAccessible(model.activeTab.value)) {
      model.switchTab("log");
    }

    expect(model.activeTab.value).toBe("overview");
  });

  it("active case with initialTab='tasks': stays on 'tasks' (no redirect)", async () => {
    const repo = buildActiveRepo();
    const model = useCaseDetailModel(ref("CASE-ACTIVE"), {
      repo,
      initialTab: "tasks",
    });
    await flushFetch();

    expect(model.isTerminalPhase.value).toBe(false);

    const guard = useCaseDetailGuard(model.detail);

    if (!guard.isTabAccessible(model.activeTab.value)) {
      model.switchTab("log");
    }

    expect(model.activeTab.value).toBe("tasks");
  });
});

describe("H2: terminal tab guard — reactive redirect on phase change", () => {
  it("detail transitions to terminal → inaccessible activeTab gets redirected", async () => {
    const activeDetail = createMockDetail({
      id: "CASE-TRANSITION",
      businessPhase: "MATERIAL_PREPARING",
      stageCode: "S3",
      readonly: false,
    });
    const archivedDetail = createMockDetail({
      id: "CASE-TRANSITION",
      businessPhase: "CLOSED_SUCCESS",
      stageCode: "S9",
      readonly: true,
    });

    const detail = ref(activeDetail);
    const guard = useCaseDetailGuard(detail);
    const activeTab = ref<CaseDetailTab>("tasks");

    expect(guard.isTabAccessible("tasks")).toBe(true);
    expect(activeTab.value).toBe("tasks");

    const redirected = vi.fn();
    watch(
      [() => detail.value, activeTab],
      () => {
        if (!detail.value) return;
        if (!guard.isTabAccessible(activeTab.value)) {
          activeTab.value = "log";
          redirected();
        }
      },
      { immediate: true },
    );

    expect(redirected).not.toHaveBeenCalled();
    expect(activeTab.value).toBe("tasks");

    detail.value = archivedDetail;
    await nextTick();

    expect(guard.isTerminal.value).toBe(true);
    expect(redirected).toHaveBeenCalledTimes(1);
    expect(activeTab.value).toBe("log");
  });

  it("detail transitions from terminal to active → no redirect triggered", async () => {
    const archivedDetail = createMockDetail({
      id: "CASE-TRANSITION",
      businessPhase: "CLOSED_SUCCESS",
      stageCode: "S9",
      readonly: true,
    });
    const activeDetail = createMockDetail({
      id: "CASE-TRANSITION",
      businessPhase: "MATERIAL_PREPARING",
      stageCode: "S3",
      readonly: false,
    });

    const detail = ref(archivedDetail);
    const guard = useCaseDetailGuard(detail);
    const activeTab = ref<CaseDetailTab>("log");

    watch(
      [() => detail.value, activeTab],
      () => {
        if (!detail.value) return;
        if (!guard.isTabAccessible(activeTab.value)) {
          activeTab.value = "log";
        }
      },
      { immediate: true },
    );

    expect(activeTab.value).toBe("log");

    detail.value = activeDetail;
    await nextTick();

    expect(guard.isTerminal.value).toBe(false);
    expect(guard.isTabAccessible("tasks")).toBe(true);
    expect(activeTab.value).toBe("log");
  });
});

describe("H2: CaseDetailView template — tab guard wiring", () => {
  it("template has watch on detail+activeTab for guard redirect", () => {
    expect(src).toContain("guard.isTabAccessible(activeTab.value)");
  });

  it("watch redirects to 'log' when tab is inaccessible", () => {
    expect(src).toContain('switchTab("log")');
  });

  it("guard watch redirects with switchTab only (URL synced via model onTabChange)", () => {
    const snippet = src.slice(
      src.indexOf("[() => detail.value, activeTab]"),
      src.indexOf("[() => detail.value, activeTab]") + 500,
    );
    expect(snippet).toContain('switchTab("log")');
    expect(snippet).not.toContain("buildCaseDetailQuery");
  });

  it("onTabClick checks guard before switching", () => {
    expect(src).toContain("guard.isTabAccessible(tabKey)");
    const onTabClickBlock = src.slice(
      src.indexOf("function onTabClick("),
      src.indexOf("function onTabClick(") + 200,
    );
    expect(onTabClickBlock).toContain("if (!guard.isTabAccessible(tabKey))");
    expect(onTabClickBlock).toContain("return");
    expect(onTabClickBlock).toContain("switchTab(tabKey)");
  });

  it("tab buttons bind aria-disabled to guard", () => {
    expect(src).toContain("!guard.isTabAccessible(tab.key)");
    expect(src).toContain("aria-disabled");
  });

  it("disabled tabs get tabindex=-1", () => {
    expect(src).toContain("!guard.isTabAccessible(tab.key)");
    const tabSection = src.slice(
      src.indexOf('role="tablist"'),
      src.indexOf("</button>") + 20,
    );
    expect(tabSection).toContain("tabindex");
    expect(tabSection).toContain("-1");
  });
});
