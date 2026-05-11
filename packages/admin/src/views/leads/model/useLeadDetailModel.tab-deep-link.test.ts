import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import type { LocationQuery } from "vue-router";
import { useLeadDetailModel } from "./useLeadDetailModel";
import type { LeadRepository } from "./LeadRepository";
import type { LeadDetailAggregate } from "./LeadAdapter";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";

function fixtureToAggregate(key: string): LeadDetailAggregate | null {
  const detail = LEAD_DETAIL_SAMPLES[key];
  if (!detail) return null;
  return { detail, followups: detail.followups, logs: detail.log };
}

function createStubRepo(): LeadRepository {
  return {
    getDetail: vi
      .fn()
      .mockImplementation(async (id: string) => fixtureToAggregate(id)),
    listLeads: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    createLead: vi.fn().mockResolvedValue({ id: "test" }),
    updateLead: vi.fn().mockResolvedValue({ id: "test" }),
    transitionLead: vi.fn().mockResolvedValue({ id: "test" }),
    addFollowup: vi.fn().mockResolvedValue({ id: "followup-result" }),
    listFollowups: vi.fn().mockResolvedValue([]),
    listLogs: vi.fn().mockResolvedValue([]),
    bulkAssign: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkStatus: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkFollowup: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkTags: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    bulkExport: vi.fn().mockResolvedValue({ updatedCount: 1 }),
    dedup: vi.fn().mockResolvedValue({ leads: [], customers: [] }),
    convertCustomer: vi.fn().mockResolvedValue({ id: "test" }),
    convertCase: vi.fn().mockResolvedValue({ id: "test" }),
  };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
}

describe("useLeadDetailModel — tab deep link", () => {
  it("initializes activeTab from route.query.tab = 'log'", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "log" });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();
    expect(model.activeTab.value).toBe("log");
  });

  it("initializes activeTab from route.query.tab = 'followups'", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "followups" });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();
    expect(model.activeTab.value).toBe("followups");
  });

  it("initializes activeTab from route.query.tab = 'conversion'", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "conversion" });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();
    expect(model.activeTab.value).toBe("conversion");
  });

  it("falls back to 'info' when route.query.tab is invalid", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "nonexistent" });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();
    expect(model.activeTab.value).toBe("info");
  });

  it("removes invalid route.query.tab via replaceQuery when provided", async () => {
    const routeQuery = ref<LocationQuery>({
      tab: "nonexistent",
      other: "keep",
    });
    const replaceQuery = vi.fn((patch: Record<string, string | undefined>) => {
      const next = { ...routeQuery.value };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      routeQuery.value = next;
    });
    useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
      replaceQuery,
    });
    await flush();
    expect(replaceQuery).toHaveBeenCalledWith({ tab: undefined });
    expect(routeQuery.value.tab).toBeUndefined();
    expect(routeQuery.value.other).toBe("keep");
  });

  it("normalizes invalid tab to conversion when resumeConvert=1", async () => {
    const routeQuery = ref<LocationQuery>({
      tab: "nonexistent",
      resumeConvert: "1",
    });
    const replaceQuery = vi.fn((patch: Record<string, string | undefined>) => {
      const next = { ...routeQuery.value };
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete next[k];
        else next[k] = v;
      }
      routeQuery.value = next;
    });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
      replaceQuery,
    });
    await flush();
    expect(replaceQuery).toHaveBeenCalledWith({ tab: "conversion" });
    expect(model.activeTab.value).toBe("conversion");
    expect(routeQuery.value.resumeConvert).toBe("1");
  });

  it("falls back to 'info' when route.query.tab is absent", async () => {
    const routeQuery = ref<LocationQuery>({});
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();
    expect(model.activeTab.value).toBe("info");
  });

  it("switchTab calls replaceQuery with the new tab value", async () => {
    const routeQuery = ref<LocationQuery>({});
    const replaceQuery = vi.fn();
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
      replaceQuery,
    });
    await flush();

    model.switchTab("log");
    expect(model.activeTab.value).toBe("log");
    expect(replaceQuery).toHaveBeenCalledWith({ tab: "log" });
  });

  it("switchTab to 'info' omits tab from query (clean URL)", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "log" });
    const replaceQuery = vi.fn();
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
      replaceQuery,
    });
    await flush();

    model.switchTab("info");
    expect(model.activeTab.value).toBe("info");
    expect(replaceQuery).toHaveBeenCalledWith({ tab: undefined });
  });

  it("works without replaceQuery (no-op, no crash)", async () => {
    const routeQuery = ref<LocationQuery>({ tab: "conversion" });
    const model = useLeadDetailModel(ref("following"), {
      repo: createStubRepo(),
      routeQuery,
    });
    await flush();

    expect(() => model.switchTab("log")).not.toThrow();
    expect(model.activeTab.value).toBe("log");
  });
});
