import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseDetail, CaseDetailTab } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import {
  ZERO_TAB_COUNTS,
  createDetailRepoStub,
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

function d(overrides: Partial<CaseDetail> = {}): CaseDetail {
  return createMockDetail({
    id: "QA-CASE",
    customerId: "CUS-QA",
    client: "QA太郎",
    owner: "担当者QA",
    ...overrides,
  });
}

function agg(
  det: CaseDetail,
  overrides: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return createMockAggregate(det, {
    tabCounts: { ...ZERO_TAB_COUNTS },
    ownerUserId: "u1",
    ownerDisplayName: det.owner,
    ...overrides,
  });
}
function stubRepo(
  handler: (id: string) => Promise<CaseDetailAggregate | null>,
) {
  return createDetailRepoStub(handler);
}

function staticRepo(aggregate: CaseDetailAggregate) {
  return stubRepo(async () => aggregate);
}

// ─── 1. Tab Counter Derivation ───────────────────────────────────

describe("tabCounters derivation (p0-qa-001-02)", () => {
  it("empty detail produces only docsCounter", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    const counters = model.tabCounters.value;
    expect(counters.documents).toBeDefined();
    expect(counters.documents!.label).toBe("8/16");
    expect(counters.documents!.tone).toBe("default");
  });

  it("blocking validations produce validation counter with i18nKey", async () => {
    const detail = d({
      validation: {
        lastTime: "2026-04-20",
        blocking: [
          { gate: "b1", title: "住民票" },
          { gate: "b2", title: "在留カード" },
        ],
        warnings: [],
        info: [],
      },
    });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();

    const counter = model.tabCounters.value.validation!;
    expect(counter).toBeDefined();
    expect(counter.tone).toBe("danger");
    expect(counter.i18nKey).toBe("cases.constants.tabCounters.blocking");
    expect(counter.i18nParams).toEqual({ count: 2 });
    expect(counter.label).toContain("2");
  });

  it("pending tasks produce tasks counter with i18nKey", async () => {
    const detail = d({
      tasks: [
        {
          id: "t1",
          label: "Call client",
          done: false,
          status: "pending",
          due: "",
          assignee: "",
          color: "primary",
          dueColor: "muted",
        },
        {
          id: "t2",
          label: "Upload docs",
          done: true,
          status: "completed",
          due: "",
          assignee: "",
          color: "primary",
          dueColor: "muted",
        },
        {
          id: "t3",
          label: "Review",
          done: false,
          status: "pending",
          due: "",
          assignee: "",
          color: "primary",
          dueColor: "muted",
        },
      ],
    });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();

    const counter = model.tabCounters.value.tasks!;
    expect(counter).toBeDefined();
    expect(counter.tone).toBe("warning");
    expect(counter.i18nKey).toBe("cases.constants.tabCounters.pending");
    expect(counter.i18nParams).toEqual({ count: 2 });
    expect(counter.label).toContain("2");
  });

  it("all-done tasks produce no tasks counter", async () => {
    const detail = d({
      tasks: [
        {
          id: "t1",
          label: "Call client",
          done: true,
          status: "completed",
          due: "",
          assignee: "",
          color: "primary",
          dueColor: "muted",
        },
        {
          id: "t2",
          label: "Upload docs",
          done: true,
          status: "completed",
          due: "",
          assignee: "",
          color: "primary",
          dueColor: "muted",
        },
      ],
    });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.tabCounters.value.tasks).toBeUndefined();
  });

  it("danger/warning deadlines produce deadlines counter", async () => {
    const detail = d({
      deadlines: [
        {
          id: "d1",
          title: "Expiry",
          desc: "",
          date: "2026-05-01",
          remaining: "",
          severity: "danger",
        },
        {
          id: "d2",
          title: "Submission",
          desc: "",
          date: "2026-06-01",
          remaining: "",
          severity: "warning",
        },
        {
          id: "d3",
          title: "Review",
          desc: "",
          date: "2026-07-01",
          remaining: "",
          severity: "normal",
        },
      ],
    });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();

    const counter = model.tabCounters.value.deadlines!;
    expect(counter).toBeDefined();
    expect(counter.tone).toBe("warning");
    expect(counter.label).toBe("2");
  });

  it("messages produce messages counter", async () => {
    const detail = d({
      messages: [
        {
          id: "m1",
          avatar: "A",
          avatarStyle: "primary",
          author: "A",
          type: "internal",
          typeLabelKey: "cases.detail.messages.types.internal",
          typeLabel: "内部備註",
          body: "Hello",
          time: "2026-04-20",
        },
        {
          id: "m2",
          avatar: "B",
          avatarStyle: "primary",
          author: "B",
          type: "internal",
          typeLabelKey: "cases.detail.messages.types.internal",
          typeLabel: "内部備註",
          body: "World",
          time: "2026-04-20",
        },
        {
          id: "m3",
          avatar: "C",
          avatarStyle: "primary",
          author: "C",
          type: "internal",
          typeLabelKey: "cases.detail.messages.types.internal",
          typeLabel: "内部備註",
          body: "Test",
          time: "2026-04-20",
        },
      ],
    });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();

    const counter = model.tabCounters.value.messages!;
    expect(counter).toBeDefined();
    expect(counter.tone).toBe("default");
    expect(counter.label).toBe("3");
  });

  it("no docsCounter when docsCounter is empty string", async () => {
    const detail = d({ docsCounter: "" });
    const { repo } = staticRepo(agg(detail));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.tabCounters.value.documents).toBeUndefined();
  });

  it("tabCounters reset to empty on not-found → data → not-found", async () => {
    let mode: "data" | "not-found" = "data";
    const detail = d({
      validation: {
        lastTime: "",
        blocking: [{ gate: "b1", title: "X" }],
        warnings: [],
        info: [],
      },
    });
    const { repo } = stubRepo(async () => {
      if (mode === "not-found") return null;
      return agg(detail);
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.tabCounters.value.validation).toBeDefined();

    mode = "not-found";
    await model.refetch();
    await flushFetch();
    expect(model.tabCounters.value).toEqual({});
  });
});

// ─── 2. initialTab Option ────────────────────────────────────────

describe("initialTab dep option (p0-qa-001-02)", () => {
  it("model starts with initialTab when provided", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      initialTab: "billing",
    });
    expect(model.activeTab.value).toBe("billing");
  });

  it("initialTab is overridden by routeTab", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      initialTab: "billing",
      routeTab: ref<string | undefined>("documents"),
    });
    expect(model.activeTab.value).toBe("documents");
  });

  it("invalid initialTab falls back to overview", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      initialTab: "INVALID",
    });
    expect(model.activeTab.value).toBe("overview");
  });

  it("empty initialTab falls back to overview", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      initialTab: "",
    });
    expect(model.activeTab.value).toBe("overview");
  });
});

// ─── 3. switchTab Behavior ───────────────────────────────────────

describe("switchTab behavior (p0-qa-001-02)", () => {
  it("switchTab no-op when tab is already active", async () => {
    const tabChanges: CaseDetailTab[] = [];
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      onTabChange: (t) => tabChanges.push(t),
    });
    await flushFetch();

    model.switchTab("billing");
    expect(tabChanges).toEqual(["billing"]);

    model.switchTab("billing");
    expect(tabChanges).toEqual(["billing"]);
  });

  it("sequential switchTab calls fire onTabChange for each unique transition", async () => {
    const tabChanges: CaseDetailTab[] = [];
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      onTabChange: (t) => tabChanges.push(t),
    });
    await flushFetch();

    model.switchTab("billing");
    model.switchTab("documents");
    model.switchTab("log");
    model.switchTab("overview");
    expect(tabChanges).toEqual(["billing", "documents", "log", "overview"]);
  });

  it("all 10 tabs are switchable", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();

    const allTabs: CaseDetailTab[] = [
      "overview",
      "validation",
      "documents",
      "tasks",
      "info",
      "forms",
      "deadlines",
      "billing",
      "messages",
      "log",
    ];
    for (const tab of allTabs) {
      model.switchTab(tab);
      expect(model.activeTab.value).toBe(tab);
    }
  });
});

// ─── 4. routeTab Sync ────────────────────────────────────────────

describe("routeTab external sync (p0-qa-001-02)", () => {
  it("routeTab change updates activeTab without onTabChange", async () => {
    const tabChanges: CaseDetailTab[] = [];
    const routeTab = ref<string | undefined>("overview");
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), {
      repo,
      routeTab,
      onTabChange: (t) => tabChanges.push(t),
    });
    await flushFetch();

    routeTab.value = "billing";
    await nextTick();
    expect(model.activeTab.value).toBe("billing");
    expect(tabChanges).toHaveLength(0);
  });

  it("routeTab undefined falls back to overview", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo, routeTab });

    routeTab.value = undefined;
    await nextTick();
    expect(model.activeTab.value).toBe("overview");
  });

  it("routeTab invalid value falls back to overview", async () => {
    const routeTab = ref<string | undefined>("billing");
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo, routeTab });

    routeTab.value = "INVALID_TAB";
    await nextTick();
    expect(model.activeTab.value).toBe("overview");
  });
});

// ─── 5. customerName Exposure ────────────────────────────────────

describe("aggregate deep-link fields (p0-qa-001-02)", () => {
  it("customerId from aggregate is exposed as ref", async () => {
    const { repo } = staticRepo(agg(d({ customerId: "CUS-DEEP" })));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-DEEP");
  });

  it("customerId updates when caseId changes to different case", async () => {
    const aggA = agg(d({ id: "A", customerId: "CUS-A" }));
    const aggB = agg(d({ id: "B", customerId: "CUS-B" }));
    const { repo } = stubRepo(async (id) => (id === "A" ? aggA : aggB));
    const caseId = ref("A");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-A");

    caseId.value = "B";
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-B");
  });
});

// ─── 6. Risk Modal (gap from focused test) ───────────────────────

describe("risk modal state (p0-qa-001-02)", () => {
  it("toggles independently of detail state", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.showRiskModal.value).toBe(false);
    model.openRiskModal();
    expect(model.showRiskModal.value).toBe(true);
    model.closeRiskModal();
    expect(model.showRiskModal.value).toBe(false);
  });

  it("refetch does not affect risk modal state", async () => {
    const { repo } = staticRepo(agg(d()));
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    model.openRiskModal();
    await model.refetch();
    await flushFetch();
    expect(model.showRiskModal.value).toBe(true);
  });
});
