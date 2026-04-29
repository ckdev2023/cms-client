import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

const ACTIVE_DETAIL = createMockDetail();
const TERMINAL_DETAIL = createMockDetail({ businessPhase: "CLOSED_SUCCESS" });

function createWiredRepository(detail: CaseDetail): CaseRepository {
  const aggregate = createMockAggregate(detail);
  return {
    getDetailAggregate: vi.fn(async () => aggregate),
    getMessages: vi.fn(async () => [
      {
        id: "msg-1",
        avatar: "TY",
        avatarStyle: "primary",
        author: "Tanaka",
        type: "phone" as const,
        typeLabel: "電話記録",
        body: "Follow up call",
        time: "2026-03-15",
      },
      {
        id: "msg-2",
        avatar: "AD",
        avatarStyle: "primary",
        author: "Admin",
        type: "internal" as const,
        typeLabel: "内部備註",
        body: "Note",
        time: "2026-03-16",
      },
    ]),
    getLogEntries: vi.fn(async () => [
      {
        type: "status",
        avatar: "SY",
        avatarStyle: "primary",
        text: "cases.log.timeline.stageChange",
        textParams: { from: "S3", to: "S4" },
        category: "cases.log.category.status",
        categoryChip: "chip-primary",
        objectType: "cases.log.objectType.case",
        time: "2026-03-15",
        dotColor: "var(--primary)",
      },
    ]),
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
    transitionPhase: vi.fn(async () => ({ id: "case-001" })),
  } as unknown as CaseRepository;
}

async function createModel(
  caseId = "CASE-001",
  deps: Parameters<typeof useCaseDetailModel>[1] = {},
) {
  const caseIdRef = ref(caseId);
  const model = useCaseDetailModel(caseIdRef, {
    repo: createWiredRepository(ACTIVE_DETAIL),
    ...deps,
  });
  await flushFetch();
  await flushFetch();
  return { model, caseId: caseIdRef };
}

describe("messages/log tab wiring (p0-fe-006c-01)", () => {
  it("merges messages from repository into detail", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    const caseId = ref("CASE-001");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    await flushFetch();
    expect(model.detail.value).not.toBeNull();
    expect(model.detail.value!.messages).toHaveLength(2);
    expect(model.detail.value!.messages[0].id).toBe("msg-1");
    expect(model.detail.value!.messages[1].id).toBe("msg-2");
  });

  it("merges logEntries from repository into detail", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    const caseId = ref("CASE-001");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    await flushFetch();
    expect(model.detail.value).not.toBeNull();
    expect(model.detail.value!.logEntries).toHaveLength(1);
    expect(model.detail.value!.logEntries[0].text).toBe(
      "cases.log.timeline.stageChange",
    );
    expect(model.detail.value!.logEntries[0].textParams).toEqual({
      from: "S3",
      to: "S4",
    });
  });

  it("calls getMessages with the current caseId", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();
    expect(repo.getMessages).toHaveBeenCalledWith("CASE-001");
  });

  it("calls getLogEntries with the current caseId", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();
    expect(repo.getLogEntries).toHaveBeenCalledWith("CASE-001");
  });

  it("messages counter updates after fetchTabData completes", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();
    expect(model.tabCounters.value.messages).toBeDefined();
    expect(model.tabCounters.value.messages!.label).toBe("2");
  });

  it("gracefully handles getMessages failure", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    (repo.getMessages as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();
    expect(model.detail.value).not.toBeNull();
    expect(model.detail.value!.messages).toEqual([]);
  });

  it("gracefully handles getLogEntries failure", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    (repo.getLogEntries as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();
    expect(model.detail.value).not.toBeNull();
    expect(model.detail.value!.logEntries).toEqual([]);
  });
});

describe("showRiskModal", () => {
  it("defaults to false", async () => {
    const { model } = await createModel();
    expect(model.showRiskModal.value).toBe(false);
  });

  it("openRiskModal sets to true, closeRiskModal resets to false", async () => {
    const { model } = await createModel();
    model.openRiskModal();
    expect(model.showRiskModal.value).toBe(true);

    model.closeRiskModal();
    expect(model.showRiskModal.value).toBe(false);
  });
});

describe("routeTab bidirectional sync", () => {
  it("initializes activeTab from routeTab ref", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("billing");
  });

  it("routeTab takes priority over initialTab", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { model } = await createModel("CASE-001", {
      routeTab,
      initialTab: "log",
    });
    expect(model.activeTab.value).toBe("billing");
  });

  it("falls back to overview when routeTab is undefined", async () => {
    const routeTab = ref<string | undefined>(undefined);
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("overview");
  });

  it("falls back to overview when routeTab is invalid", async () => {
    const routeTab = ref<string | undefined>("bogus");
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("overview");
  });

  it("syncs activeTab when routeTab changes externally", async () => {
    const routeTab = ref<string | undefined>("overview");
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("overview");

    routeTab.value = "billing";
    await Promise.resolve();
    expect(model.activeTab.value).toBe("billing");

    routeTab.value = "documents";
    await Promise.resolve();
    expect(model.activeTab.value).toBe("documents");
  });

  it("does not call onTabChange when routeTab changes externally", async () => {
    const calls: string[] = [];
    const routeTab = ref<string | undefined>("overview");
    await createModel("CASE-001", {
      routeTab,
      onTabChange: (tab) => calls.push(tab),
    });

    routeTab.value = "billing";
    await Promise.resolve();
    expect(calls).toHaveLength(0);
  });

  it("switchTab still calls onTabChange when routeTab is provided", async () => {
    const calls: string[] = [];
    const routeTab = ref<string | undefined>("overview");
    const { model } = await createModel("CASE-001", {
      routeTab,
      onTabChange: (tab) => calls.push(tab),
    });

    model.switchTab("billing");
    expect(calls).toEqual(["billing"]);
  });

  it("resolves invalid routeTab change to overview", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("billing");

    routeTab.value = "bogus";
    await Promise.resolve();
    expect(model.activeTab.value).toBe("overview");
  });

  it("is a no-op when routeTab resolves to the current tab", async () => {
    const calls: string[] = [];
    const routeTab = ref<string | undefined>("billing");
    const { model } = await createModel("CASE-001", {
      routeTab,
      onTabChange: (tab) => calls.push(tab),
    });

    routeTab.value = "billing";
    await Promise.resolve();
    expect(model.activeTab.value).toBe("billing");
    expect(calls).toHaveLength(0);
  });

  it("handles routeTab going from valid to undefined (back to overview)", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { model } = await createModel("CASE-001", { routeTab });
    expect(model.activeTab.value).toBe("billing");

    routeTab.value = undefined;
    await Promise.resolve();
    expect(model.activeTab.value).toBe("overview");
  });
});

describe("phaseMenu wiring (BUG-123)", () => {
  it("exposes phaseMenu with openMenu/closeMenu/performTransition", async () => {
    const { model } = await createModel();
    expect(model.phaseMenu).toBeDefined();
    expect(typeof model.phaseMenu.openMenu).toBe("function");
    expect(typeof model.phaseMenu.closeMenu).toBe("function");
    expect(typeof model.phaseMenu.performTransition).toBe("function");
  });

  it("phaseMenu.openMenu toggles menuOpen", async () => {
    const { model } = await createModel();
    expect(model.phaseMenu.menuOpen.value).toBe(false);
    model.phaseMenu.openMenu();
    expect(model.phaseMenu.menuOpen.value).toBe(true);
    model.phaseMenu.closeMenu();
    expect(model.phaseMenu.menuOpen.value).toBe(false);
  });

  it("phaseMenu.availableTargets derived from detail businessPhase", async () => {
    const { model } = await createModel();
    expect(model.phaseMenu.availableTargets.value).toEqual(["REVIEWING"]);
  });

  it("phaseMenu.performTransition calls repo.transitionPhase", async () => {
    const repo = createWiredRepository(ACTIVE_DETAIL);
    const caseIdRef = ref("CASE-001");
    const model = useCaseDetailModel(caseIdRef, { repo });
    await flushFetch();
    await flushFetch();

    const ok = await model.phaseMenu.performTransition("REVIEWING");
    expect(ok).toBe(true);
    expect(repo.transitionPhase).toHaveBeenCalledWith("CASE-001", {
      toPhase: "REVIEWING",
      closeReason: undefined,
      resultOutcome: undefined,
    });
  });

  it("isTerminalPhase is false for active case", async () => {
    const { model } = await createModel();
    expect(model.isTerminalPhase.value).toBe(false);
  });

  it("isTerminalPhase is true for CLOSED_SUCCESS", async () => {
    const repo = createWiredRepository(TERMINAL_DETAIL);
    const caseIdRef = ref("CASE-001");
    const model = useCaseDetailModel(caseIdRef, { repo });
    await flushFetch();
    await flushFetch();
    expect(model.isTerminalPhase.value).toBe(true);
  });

  it("phaseMenu returns empty targets for terminal phase", async () => {
    const repo = createWiredRepository(TERMINAL_DETAIL);
    const caseIdRef = ref("CASE-001");
    const model = useCaseDetailModel(caseIdRef, { repo });
    await flushFetch();
    await flushFetch();
    expect(model.phaseMenu.availableTargets.value).toEqual([]);
  });
});
