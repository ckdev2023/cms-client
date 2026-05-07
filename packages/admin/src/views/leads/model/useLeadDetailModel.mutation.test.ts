import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useLeadDetailModel } from "./useLeadDetailModel";
import type { LeadRepository } from "./LeadRepository";
import { LeadRepositoryError } from "./LeadRepository";
import type { LeadDetailAggregate } from "./LeadAdapter";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";

function fixtureToAggregate(key: string): LeadDetailAggregate | null {
  const detail = LEAD_DETAIL_SAMPLES[key];
  if (!detail) return null;
  return { detail, followups: detail.followups, logs: detail.log };
}

function createRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    getDetail: vi
      .fn()
      .mockImplementation(async (id: string) => fixtureToAggregate(id) ?? null),
    listLeads: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    createLead: vi.fn().mockResolvedValue({ id: "test" }),
    updateLead: vi.fn().mockResolvedValue({ id: "test" }),
    transitionLead: vi.fn().mockResolvedValue({ id: "test" }),
    addFollowup: vi.fn().mockResolvedValue({ id: "test" }),
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
    ...overrides,
  };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
}

describe("useLeadDetailModel — updateLead (R2-B-4)", () => {
  it("returns null on success and refetches detail", async () => {
    const repo = createRepo();
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    const result = await model.updateLead({ name: "新姓名" });
    await flush();

    expect(result).toBeNull();
    expect(repo.updateLead).toHaveBeenCalledWith("following", {
      name: "新姓名",
    });
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("returns kind=generic with updateFailed messageKey on repository error", async () => {
    const repo = createRepo({
      updateLead: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "VALIDATION_ERROR",
          message: "phone format invalid",
          status: 400,
        }),
      ),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.updateLead({ phone: "abc" });
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    expect(result!.messageKey).toBe("leads.errors.updateFailed");
    expect(result!.fallbackMessage).toBe("phone format invalid");
  });

  it("does NOT refetch detail when updateLead fails", async () => {
    const repo = createRepo({
      updateLead: vi.fn().mockRejectedValue(new Error("network")),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await model.updateLead({ name: "x" });
    await flush();
    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );
  });

  it("releases updateSubmitting after a failed updateLead", async () => {
    const repo = createRepo({
      updateLead: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.updateSubmitting.value).toBe(false);
    await model.updateLead({ name: "x" });
    await flush();
    expect(model.updateSubmitting.value).toBe(false);
  });

  it("ignores reentrant calls while a previous updateLead is still running", async () => {
    let resolve!: (v: { id: string }) => void;
    const repo = createRepo({
      updateLead: vi.fn().mockImplementation(
        () =>
          new Promise<{ id: string }>((r) => {
            resolve = r;
          }),
      ),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const first = model.updateLead({ name: "a" });
    await flush();
    const reentry = await model.updateLead({ name: "b" });
    expect(reentry).toBeNull();
    expect(repo.updateLead).toHaveBeenCalledTimes(1);

    resolve({ id: "ok" });
    await first;
  });
});

describe("useLeadDetailModel — transitionStatus (R2-B-4)", () => {
  it("returns null on success and refetches detail", async () => {
    const repo = createRepo();
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    const result = await model.transitionStatus({ toStatus: "pending_sign" });
    await flush();

    expect(result).toBeNull();
    expect(repo.transitionLead).toHaveBeenCalledWith("following", {
      toStatus: "pending_sign",
    });
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("returns kind=generic with transitionFailed messageKey on repository error", async () => {
    const repo = createRepo({
      transitionLead: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "VALIDATION_ERROR",
          message: "Transition not allowed",
          status: 400,
        }),
      ),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.transitionStatus({ toStatus: "pending_sign" });
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    expect(result!.messageKey).toBe("leads.errors.transitionFailed");
    expect(result!.fallbackMessage).toBe("Transition not allowed");
  });

  it("does NOT refetch detail when transitionStatus fails", async () => {
    const repo = createRepo({
      transitionLead: vi.fn().mockRejectedValue(new Error("nope")),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await model.transitionStatus({ toStatus: "pending_sign" });
    await flush();
    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );
  });

  it("releases transitionSubmitting after a failed transitionStatus", async () => {
    const repo = createRepo({
      transitionLead: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.transitionSubmitting.value).toBe(false);
    await model.transitionStatus({ toStatus: "pending_sign" });
    await flush();
    expect(model.transitionSubmitting.value).toBe(false);
  });
});

describe("useLeadDetailModel — markLost (R2-B-4)", () => {
  it("returns null on success and forwards lostReason to transitionLead", async () => {
    const repo = createRepo();
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    const result = await model.markLost("客户选择了其他事务所");
    await flush();

    expect(result).toBeNull();
    expect(repo.transitionLead).toHaveBeenCalledWith("following", {
      toStatus: "lost",
      lostReason: "客户选择了其他事务所",
    });
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("returns kind=generic with markLostFailed messageKey on repository error", async () => {
    const repo = createRepo({
      transitionLead: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "VALIDATION_ERROR",
          message: "lost_reason is required",
          status: 400,
        }),
      ),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.markLost("放弃");
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    expect(result!.messageKey).toBe("leads.errors.markLostFailed");
    expect(result!.fallbackMessage).toBe("lost_reason is required");
  });

  it("releases markLostSubmitting after a failed markLost", async () => {
    const repo = createRepo({
      transitionLead: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.markLostSubmitting.value).toBe(false);
    await model.markLost("放弃");
    await flush();
    expect(model.markLostSubmitting.value).toBe(false);
  });
});
