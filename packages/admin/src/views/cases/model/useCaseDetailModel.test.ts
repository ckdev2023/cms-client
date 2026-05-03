// ── Test Ownership ──────────────────────────────────────────────
// Owner: detail composable (useCaseDetailModel) — async loading,
//   tab state, counters, risk modal, customerId back-link.
// Does NOT test: adapters, builders, real repository orchestration,
//   or other composables.
// ────────────────────────────────────────────────────────────────

import { describe, it, expect, vi } from "vitest";
import { ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import { CASE_DETAIL_TABS } from "../constants";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import {
  createDetailRepoStub,
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

const ACTIVE_DETAIL = createMockDetail();

const ARCHIVED_DETAIL = createMockDetail({
  id: "CASE-ARCHIVED",
  customerId: "CUS-ARCHIVED",
  client: "アーカイブ太郎",
  stage: "S9",
  stageCode: "S9",
  statusBadge: "archived",
  readonly: true,
  docsCounter: "",
  validation: { lastTime: "", blocking: [], warnings: [], info: [] },
  tasks: [{ done: true, label: "完了" }] as CaseDetail["tasks"],
  deadlines: [],
});

function createMockRepository(
  aggregates: Record<string, CaseDetailAggregate> = {
    "CASE-001": createMockAggregate(ACTIVE_DETAIL),
    "CASE-ARCHIVED": createMockAggregate(ARCHIVED_DETAIL),
  },
): { repo: CaseRepository; getDetailAggregate: ReturnType<typeof vi.fn> } {
  const { repo, spy: getDetailAggregate } = createDetailRepoStub(
    async (id: string) => aggregates[id] ?? null,
  );
  return { repo, getDetailAggregate };
}

// ─── Composable factory ─────────────────────────────────────────

async function createModel(
  caseId = "CASE-001",
  deps: Parameters<typeof useCaseDetailModel>[1] = {},
) {
  const { repo, getDetailAggregate } = createMockRepository();
  const caseIdRef = ref(caseId);
  const model = useCaseDetailModel(caseIdRef, { repo, ...deps });
  await flushFetch();
  return { model, caseId: caseIdRef, getDetailAggregate };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("useCaseDetailModel", () => {
  describe("async loading", () => {
    it("loads detail for a known case ID", async () => {
      const { model } = await createModel();
      expect(model.notFound.value).toBe(false);
      expect(model.detail.value).not.toBeNull();
      expect(model.detail.value!.id).toBe("CASE-001");
    });

    it("returns notFound for unknown ID", async () => {
      const { model } = await createModel("UNKNOWN-ID");
      expect(model.notFound.value).toBe(true);
      expect(model.detail.value).toBeNull();
    });

    it("loading is false after fetch completes", async () => {
      const { model } = await createModel();
      expect(model.loading.value).toBe(false);
    });

    it("error is null on successful fetch", async () => {
      const { model } = await createModel();
      expect(model.error.value).toBeNull();
    });

    it("handles repository errors gracefully", async () => {
      const failingRepo = {
        getDetailAggregate: vi.fn(async () => {
          throw new Error("Network error");
        }),
      } as unknown as CaseRepository;

      const caseId = ref("CASE-001");
      const model = useCaseDetailModel(caseId, { repo: failingRepo });
      await flushFetch();

      expect(model.error.value).toBe("Network error");
      expect(model.detail.value).toBeNull();
      expect(model.notFound.value).toBe(true);
      expect(model.loading.value).toBe(false);
    });

    it("refetches when caseId changes", async () => {
      const { model, caseId, getDetailAggregate } = await createModel();
      expect(model.detail.value).not.toBeNull();

      caseId.value = "UNKNOWN-ID";
      await flushFetch();
      expect(model.notFound.value).toBe(true);
      expect(model.detail.value).toBeNull();
      expect(getDetailAggregate).toHaveBeenCalledWith("UNKNOWN-ID");
    });

    it("refetch re-fetches from repository", async () => {
      const { model, getDetailAggregate } = await createModel();
      const callsBefore = getDetailAggregate.mock.calls.length;
      await model.refetch();
      expect(getDetailAggregate.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  describe("customerId back-link", () => {
    it("exposes customerId from aggregate", async () => {
      const { model } = await createModel();
      expect(model.customerId.value).toBe("CUS-001");
    });

    it("customerId is empty string when detail not found", async () => {
      const { model } = await createModel("UNKNOWN-ID");
      expect(model.customerId.value).toBe("");
    });

    it("customerId updates when caseId changes", async () => {
      const { model, caseId } = await createModel();
      expect(model.customerId.value).toBe("CUS-001");

      caseId.value = "CASE-ARCHIVED";
      await flushFetch();
      expect(model.customerId.value).toBe("CUS-ARCHIVED");
    });

    it("customerId resets on error", async () => {
      const failingRepo = {
        getDetailAggregate: vi.fn(async () => {
          throw new Error("fail");
        }),
      } as unknown as CaseRepository;

      const caseId = ref("CASE-001");
      const model = useCaseDetailModel(caseId, { repo: failingRepo });
      await flushFetch();

      expect(model.customerId.value).toBe("");
    });
  });

  describe("tab state", () => {
    it("defaults activeTab to overview", async () => {
      const { model } = await createModel();
      expect(model.activeTab.value).toBe("overview");
    });

    it("resolves valid initialTab", async () => {
      const { model } = await createModel("CASE-001", {
        initialTab: "billing",
      });
      expect(model.activeTab.value).toBe("billing");
    });

    it("falls back to overview for invalid initialTab", async () => {
      const { model } = await createModel("CASE-001", {
        initialTab: "bogus",
      });
      expect(model.activeTab.value).toBe("overview");
    });

    it("falls back to overview for undefined initialTab", async () => {
      const { model } = await createModel("CASE-001", {
        initialTab: undefined,
      });
      expect(model.activeTab.value).toBe("overview");
    });

    it("switchTab changes the active tab", async () => {
      const { model } = await createModel();
      model.switchTab("billing");
      expect(model.activeTab.value).toBe("billing");

      model.switchTab("documents");
      expect(model.activeTab.value).toBe("documents");
    });

    it("switchTab is a no-op when tab is already active", async () => {
      const calls: string[] = [];
      const { model } = await createModel("CASE-001", {
        initialTab: "billing",
        onTabChange: (tab) => calls.push(tab),
      });

      expect(model.activeTab.value).toBe("billing");
      model.switchTab("billing");
      expect(calls).toHaveLength(0);
    });

    it("switchTab invokes onTabChange callback", async () => {
      const calls: string[] = [];
      const { model } = await createModel("CASE-001", {
        onTabChange: (tab) => calls.push(tab),
      });

      model.switchTab("billing");
      expect(calls).toEqual(["billing"]);

      model.switchTab("documents");
      expect(calls).toEqual(["billing", "documents"]);
    });

    it("switchTab 4 times does not trigger additional fetches", async () => {
      const getDocumentItems = vi.fn(async () => []);
      const getDetailAggregate = vi.fn(async () =>
        createMockAggregate(createMockDetail()),
      );
      const repo = {
        getDetailAggregate,
        getDocumentItems,
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
        getMessages: vi.fn(async () => []),
        getLogEntries: vi.fn(async () => []),
        getTasks: vi.fn(async () => []),
        getDeadlines: vi.fn(async () => []),
      } as unknown as CaseRepository;

      const caseId = ref("CASE-001");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();

      expect(getDetailAggregate).toHaveBeenCalledTimes(1);
      expect(getDocumentItems).toHaveBeenCalledTimes(1);

      model.switchTab("billing");
      model.switchTab("documents");
      model.switchTab("validation");
      model.switchTab("log");
      await flushFetch();

      expect(getDetailAggregate).toHaveBeenCalledTimes(1);
      expect(getDocumentItems).toHaveBeenCalledTimes(1);
    });

    it("switchTab works without onTabChange callback", async () => {
      const { model } = await createModel();
      model.switchTab("log");
      expect(model.activeTab.value).toBe("log");
    });

    it("exposes the full tab definitions", async () => {
      const { model } = await createModel();
      expect(model.tabs).toBe(CASE_DETAIL_TABS);
      expect(model.tabs.length).toBe(10);
    });
  });

  describe("isReadonly", () => {
    it("reflects the detail's readonly flag", async () => {
      const { repo } = createMockRepository();
      const caseId = ref("CASE-ARCHIVED");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();
      expect(model.isReadonly.value).toBe(true);
    });

    it("is false for active cases", async () => {
      const { model } = await createModel();
      expect(model.isReadonly.value).toBe(false);
    });
  });

  describe("tabCounters", () => {
    it("returns empty when detail is null", async () => {
      const { model } = await createModel("UNKNOWN-ID");
      expect(model.tabCounters.value).toEqual({});
    });

    it("includes docsCounter for documents tab", async () => {
      const { model } = await createModel();
      expect(model.tabCounters.value.documents).toBeDefined();
      expect(model.tabCounters.value.documents!.label).toBe("8/16");
      expect(model.tabCounters.value.documents!.tone).toBe("default");
    });

    it("shows validation blocking count when present", async () => {
      const { model } = await createModel();
      expect(model.tabCounters.value.validation).toBeDefined();
      expect(model.tabCounters.value.validation!.label).toBe("卡点2");
      expect(model.tabCounters.value.validation!.tone).toBe("danger");
    });

    it("omits validation counter when no blocking items", async () => {
      const { repo } = createMockRepository();
      const caseId = ref("CASE-ARCHIVED");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();
      expect(model.tabCounters.value.validation).toBeUndefined();
    });

    it("shows pending tasks count", async () => {
      const { model } = await createModel();
      expect(model.tabCounters.value.tasks).toBeDefined();
      expect(model.tabCounters.value.tasks!.tone).toBe("warning");
      expect(model.tabCounters.value.tasks!.label).toMatch(/^待办\d+$/);
    });

    it("omits tasks counter when all done (archived)", async () => {
      const { repo } = createMockRepository();
      const caseId = ref("CASE-ARCHIVED");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();
      expect(model.tabCounters.value.tasks).toBeUndefined();
    });

    it("shows urgent deadlines count", async () => {
      const { model } = await createModel();
      expect(model.tabCounters.value.deadlines).toBeDefined();
      expect(model.tabCounters.value.deadlines!.tone).toBe("warning");
      expect(Number(model.tabCounters.value.deadlines!.label)).toBeGreaterThan(
        0,
      );
    });

    it("omits deadlines counter when no urgent deadlines", async () => {
      const { repo } = createMockRepository();
      const caseId = ref("CASE-ARCHIVED");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();
      expect(model.tabCounters.value.deadlines).toBeUndefined();
    });

    it("shows messages counter when messages are present", async () => {
      const detailWithMessages = createMockDetail({
        messages: [
          {
            id: "msg-1",
            avatar: "TY",
            avatarStyle: "primary",
            author: "Tanaka",
            type: "phone",
            typeLabelKey: "cases.detail.messages.types.phone",
            typeLabel: "電話記録",
            body: "Follow up",
            time: "2026-03-15",
          },
          {
            id: "msg-2",
            avatar: "AD",
            avatarStyle: "primary",
            author: "Admin",
            type: "internal",
            typeLabelKey: "cases.detail.messages.types.internal",
            typeLabel: "内部備註",
            body: "Note",
            time: "2026-03-16",
          },
        ],
      });
      const { repo } = createMockRepository({
        "CASE-MSG": createMockAggregate(detailWithMessages),
      });
      const caseId = ref("CASE-MSG");
      const model = useCaseDetailModel(caseId, { repo });
      await flushFetch();
      expect(model.tabCounters.value.messages).toBeDefined();
      expect(model.tabCounters.value.messages!.label).toBe("2");
      expect(model.tabCounters.value.messages!.tone).toBe("default");
    });

    it("omits messages counter when no messages", async () => {
      const { model } = await createModel();
      expect(model.tabCounters.value.messages).toBeUndefined();
    });
  });
});
