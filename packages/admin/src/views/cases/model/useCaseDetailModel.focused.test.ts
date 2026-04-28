import { describe, expect, it } from "vitest";
import { nextTick, ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import type { CaseDetailAggregate } from "./CaseAdapterDetailContracts";
import {
  ZERO_TAB_COUNTS,
  createDetailRepoStub,
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

function d(overrides: Parameters<typeof createMockDetail>[0] = {}) {
  return createMockDetail(overrides);
}

function agg(
  detail: ReturnType<typeof createMockDetail>,
  overrides: Partial<CaseDetailAggregate> = {},
): CaseDetailAggregate {
  return createMockAggregate(detail, {
    tabCounts: { ...ZERO_TAB_COUNTS },
    ownerUserId: "u1",
    ...overrides,
  });
}

const AGG_ACTIVE = agg(d({ id: "CASE-ACTIVE", customerId: "CUS-ACTIVE" }));
const AGG_ARCHIVED = agg(
  d({
    id: "CASE-ARCHIVED",
    customerId: "CUS-ARCHIVED",
    client: "アーカイブ太郎",
    stage: "S9",
    stageCode: "S9",
    statusBadge: "archived",
    readonly: true,
  }),
);

function stubRepo(
  handler: (id: string) => Promise<CaseDetailAggregate | null>,
) {
  return createDetailRepoStub(handler);
}

function mapRepo(
  map: Record<string, CaseDetailAggregate> = {
    "CASE-ACTIVE": AGG_ACTIVE,
    "CASE-ARCHIVED": AGG_ARCHIVED,
  },
) {
  return stubRepo(async (id) => map[id] ?? null);
}

describe("loading lifecycle (p0-fe-005-03)", () => {
  it("loading is true during in-flight fetch", async () => {
    let resolve: ((v: CaseDetailAggregate | null) => void) | undefined;
    const { repo } = stubRepo(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const model = useCaseDetailModel(ref("X"), { repo });
    await nextTick();
    expect(model.loading.value).toBe(true);
    resolve!(AGG_ACTIVE);
    await flushFetch();
    expect(model.loading.value).toBe(false);
    expect(model.detail.value).not.toBeNull();
  });

  it("loading false→true→false on refetch", async () => {
    let resolve: ((v: CaseDetailAggregate | null) => void) | undefined;
    const { repo } = stubRepo(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const model = useCaseDetailModel(ref("X"), { repo });
    resolve!(AGG_ACTIVE);
    await flushFetch();
    expect(model.loading.value).toBe(false);
    const p = model.refetch();
    await nextTick();
    expect(model.loading.value).toBe(true);
    resolve!(AGG_ACTIVE);
    await p;
    await flushFetch();
    expect(model.loading.value).toBe(false);
  });

  it("discards stale fetch when caseId changes rapidly", async () => {
    let n = 0;
    const { repo } = stubRepo(async (id) => {
      n++;
      if (n === 1) {
        await new Promise((r) => setTimeout(r, 80));
        return agg(d({ id: "STALE", customerId: "CUS-STALE" }));
      }
      return id === "CASE-ARCHIVED" ? AGG_ARCHIVED : AGG_ACTIVE;
    });
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    caseId.value = "CASE-ARCHIVED";
    await new Promise((r) => setTimeout(r, 120));
    await flushFetch();
    expect(model.detail.value?.id).toBe("CASE-ARCHIVED");
    expect(model.customerId.value).toBe("CUS-ARCHIVED");
  });

  it("successful fetch after error clears error state", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("network timeout");
      return AGG_ACTIVE;
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.error.value).toBe("network timeout");

    fail = false;
    await model.refetch();
    await flushFetch();
    expect(model.error.value).toBeNull();
    expect(model.detail.value).not.toBeNull();
    expect(model.loading.value).toBe(false);
  });

  it("non-Error throw is stringified", async () => {
    const { repo } = stubRepo(async () => {
      throw "raw string";
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.error.value).toBe("raw string");
    expect(model.detail.value).toBeNull();
  });

  it("loading is false after error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("fail");
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBe("fail");
  });

  it("every call receives the current caseId", async () => {
    const { repo, spy } = mapRepo();
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(spy).toHaveBeenCalledWith("CASE-ACTIVE");

    caseId.value = "CASE-ARCHIVED";
    await flushFetch();
    expect(spy).toHaveBeenCalledWith("CASE-ARCHIVED");

    await model.refetch();
    await flushFetch();
    expect(spy).toHaveBeenLastCalledWith("CASE-ARCHIVED");
  });
});

describe("empty / not-found state (p0-fe-005-03)", () => {
  it("all deriveds neutral when ID unknown", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("UNKNOWN"), { repo });
    await flushFetch();
    expect(model.notFound.value).toBe(true);
    expect(model.detail.value).toBeNull();
    expect(model.customerId.value).toBe("");
    expect(model.isReadonly.value).toBe(false);
    expect(model.tabCounters.value).toEqual({});
    expect(model.loading.value).toBe(false);
    expect(model.error.value).toBeNull();
  });

  it("notFound true→false when caseId becomes valid", async () => {
    const { repo } = mapRepo();
    const caseId = ref("UNKNOWN");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.notFound.value).toBe(true);

    caseId.value = "CASE-ACTIVE";
    await flushFetch();
    expect(model.notFound.value).toBe(false);
    expect(model.detail.value!.id).toBe("CASE-ACTIVE");
  });

  it("notFound false→true when caseId becomes invalid", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.notFound.value).toBe(false);

    caseId.value = "NONEXISTENT";
    await flushFetch();
    expect(model.notFound.value).toBe(true);
    expect(model.detail.value).toBeNull();
    expect(model.customerId.value).toBe("");
  });

  it("notFound true after repository error", async () => {
    const { repo } = stubRepo(async () => {
      throw new Error("500");
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.notFound.value).toBe(true);
    expect(model.error.value).toBe("500");
  });

  it("isReadonly false when detail is null", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("UNKNOWN"), { repo });
    await flushFetch();
    expect(model.detail.value).toBeNull();
    expect(model.isReadonly.value).toBe(false);
  });

  it("tabCounters empty when detail is null", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("UNKNOWN"), { repo });
    await flushFetch();
    expect(model.tabCounters.value).toEqual({});
  });

  it("switchTab works when detail is null", async () => {
    const calls: string[] = [];
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("UNKNOWN"), {
      repo,
      onTabChange: (t) => calls.push(t),
    });
    await flushFetch();
    expect(model.notFound.value).toBe(true);
    model.switchTab("billing");
    expect(model.activeTab.value).toBe("billing");
    expect(calls).toEqual(["billing"]);
  });

  it("showRiskModal works when detail is null", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("UNKNOWN"), { repo });
    await flushFetch();
    model.openRiskModal();
    expect(model.showRiskModal.value).toBe(true);
    model.closeRiskModal();
    expect(model.showRiskModal.value).toBe(false);
  });
});

describe("read-only state (p0-fe-005-03)", () => {
  it("isReadonly true for S9 archived", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), { repo });
    await flushFetch();
    expect(model.isReadonly.value).toBe(true);
  });

  it("isReadonly false for active", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("CASE-ACTIVE"), { repo });
    await flushFetch();
    expect(model.isReadonly.value).toBe(false);
  });

  it("transitions active→archived", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.isReadonly.value).toBe(false);

    caseId.value = "CASE-ARCHIVED";
    await flushFetch();
    expect(model.isReadonly.value).toBe(true);
  });

  it("transitions archived→active", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ARCHIVED");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.isReadonly.value).toBe(true);

    caseId.value = "CASE-ACTIVE";
    await flushFetch();
    expect(model.isReadonly.value).toBe(false);
  });

  it("resets to false on not-found", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ARCHIVED");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.isReadonly.value).toBe(true);

    caseId.value = "UNKNOWN";
    await flushFetch();
    expect(model.isReadonly.value).toBe(false);
  });

  it("archived detail still exposes data fields", async () => {
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), { repo });
    await flushFetch();
    const d = model.detail.value!;
    expect(d.id).toBe("CASE-ARCHIVED");
    expect(d.client).toBe("アーカイブ太郎");
    expect(d.customerId).toBe("CUS-ARCHIVED");
  });

  it("tabs navigable in readonly state", async () => {
    const calls: string[] = [];
    const { repo } = mapRepo();
    const model = useCaseDetailModel(ref("CASE-ARCHIVED"), {
      repo,
      onTabChange: (t) => calls.push(t),
    });
    await flushFetch();
    expect(model.isReadonly.value).toBe(true);
    model.switchTab("documents");
    model.switchTab("billing");
    expect(model.activeTab.value).toBe("billing");
    expect(calls).toEqual(["documents", "billing"]);
  });
});

describe("customer back-link contract (p0-fe-005-03)", () => {
  it("mirrors aggregate.customerId for both active and archived", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ACTIVE");

    caseId.value = "CASE-ARCHIVED";
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ARCHIVED");

    caseId.value = "CASE-ACTIVE";
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ACTIVE");
  });

  it("resets to empty on not-found", async () => {
    const { repo } = mapRepo();
    const caseId = ref("CASE-ACTIVE");
    const model = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ACTIVE");
    caseId.value = "NONEXISTENT";
    await flushFetch();
    expect(model.customerId.value).toBe("");
  });

  it("resets to empty on repository error", async () => {
    let fail = false;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("fail");
      return AGG_ACTIVE;
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ACTIVE");
    fail = true;
    await model.refetch();
    await flushFetch();
    expect(model.customerId.value).toBe("");
  });

  it("always a string (empty-customerId aggregate)", async () => {
    const a = agg(d({ customerId: "" }), { customerId: "" });
    const { repo } = stubRepo(async () => a);
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(typeof model.customerId.value).toBe("string");
    expect(model.customerId.value).toBe("");
  });

  it("recovers from error to valid value", async () => {
    let fail = true;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("temp");
      return AGG_ACTIVE;
    });
    const model = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(model.customerId.value).toBe("");
    fail = false;
    await model.refetch();
    await flushFetch();
    expect(model.customerId.value).toBe("CUS-ACTIVE");
    expect(model.error.value).toBeNull();
  });
});

describe("combined lifecycle (p0-fe-005-03)", () => {
  it("full cycle: not-found → active → archived → error → recovery", async () => {
    let mode: "not-found" | "active" | "archived" | "error" = "not-found";
    const { repo } = stubRepo(async () => {
      if (mode === "error") throw new Error("server down");
      if (mode === "not-found") return null;
      return mode === "archived" ? AGG_ARCHIVED : AGG_ACTIVE;
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.isReadonly.value).toBe(false);
    expect(m.customerId.value).toBe("");

    mode = "active";
    await m.refetch();
    await flushFetch();
    expect(m.notFound.value).toBe(false);
    expect(m.customerId.value).toBe("CUS-ACTIVE");

    mode = "archived";
    await m.refetch();
    await flushFetch();
    expect(m.isReadonly.value).toBe(true);
    expect(m.customerId.value).toBe("CUS-ARCHIVED");

    mode = "error";
    await m.refetch();
    await flushFetch();
    expect(m.notFound.value).toBe(true);
    expect(m.customerId.value).toBe("");

    mode = "active";
    await m.refetch();
    await flushFetch();
    expect(m.error.value).toBeNull();
    expect(m.customerId.value).toBe("CUS-ACTIVE");
  });

  it("tab state persists across caseId changes and errors", async () => {
    let fail = false;
    const { repo } = stubRepo(async () => {
      if (fail) throw new Error("fail");
      return AGG_ACTIVE;
    });
    const caseId = ref("CASE-ACTIVE");
    const m = useCaseDetailModel(caseId, { repo });
    await flushFetch();
    m.switchTab("billing");
    caseId.value = "X";
    await flushFetch();
    expect(m.activeTab.value).toBe("billing");
    fail = true;
    await m.refetch();
    await flushFetch();
    expect(m.activeTab.value).toBe("billing");
    fail = false;
    await m.refetch();
    await flushFetch();
    expect(m.activeTab.value).toBe("billing");
  });

  it("concurrent refetch: only the latest wins", async () => {
    let n = 0;
    const { repo } = stubRepo(async () => {
      const idx = ++n;
      await new Promise((r) => setTimeout(r, idx === 1 ? 80 : 10));
      return agg(d({ id: `CASE-${idx}`, customerId: `CUS-${idx}` }));
    });
    const m = useCaseDetailModel(ref("X"), { repo });
    m.refetch();
    m.refetch();
    await new Promise((r) => setTimeout(r, 150));
    await flushFetch();
    expect(m.detail.value!.id).not.toBe("CASE-1");
    expect(m.loading.value).toBe(false);
  });
});
