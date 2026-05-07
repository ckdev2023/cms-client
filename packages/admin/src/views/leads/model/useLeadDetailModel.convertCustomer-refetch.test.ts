import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useLeadDetailModel } from "./useLeadDetailModel";
import type { LeadRepository } from "./LeadRepository";
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

describe("useLeadDetailModel — convertCustomer refetch (H-6)", () => {
  it("refetches detail after a successful direct convertCustomer (no dedup matches)", async () => {
    const repo = createRepo();
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await model.convertCustomer({});
    await flush();

    expect(repo.dedup).toHaveBeenCalledTimes(1);
    expect(repo.convertCustomer).toHaveBeenCalledWith("signed", {});
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("refetches detail after the dedup-confirm path succeeds", async () => {
    const repo = createRepo();
    vi.mocked(repo.dedup).mockResolvedValueOnce({
      leads: [
        {
          id: "dup-1",
          name: "Duplicate Lead",
          phone: "080-2222-3333",
          email: "li.hua@email.com",
          status: "new",
        },
      ],
      customers: [],
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    await model.convertCustomer({});
    await flush();
    expect(model.showConvertDedupPrompt.value).toBe(true);
    expect(repo.convertCustomer).not.toHaveBeenCalled();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    model.confirmConvertDedup();
    await flush();
    await flush();

    expect(repo.convertCustomer).toHaveBeenCalledWith("following", {
      confirmDedup: true,
    });
    expect(model.showConvertDedupPrompt.value).toBe(false);
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("does NOT refetch detail when convertCustomer fails", async () => {
    const repo = createRepo({
      convertCustomer: vi.fn().mockRejectedValue(new Error("boom")),
    });
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await expect(model.convertCustomer({})).rejects.toThrow("boom");
    await flush();

    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );
  });

  it("does NOT refetch detail when convertCustomer is short-circuited by a dedup match", async () => {
    const repo = createRepo();
    vi.mocked(repo.dedup).mockResolvedValueOnce({
      leads: [],
      customers: [
        {
          id: "cust-1",
          name: "Existing",
          phone: "080-2222-3333",
          email: "li.hua@email.com",
        },
      ],
    });
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await model.convertCustomer({});
    await flush();

    expect(model.showConvertDedupPrompt.value).toBe(true);
    expect(repo.convertCustomer).not.toHaveBeenCalled();
    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );
  });

  it("releases convertSubmitting after a failed convertCustomer", async () => {
    const repo = createRepo({
      convertCustomer: vi.fn().mockRejectedValue(new Error("network down")),
    });
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.convertSubmitting.value).toBe(false);
    await expect(model.convertCustomer({})).rejects.toThrow("network down");
    await flush();
    expect(model.convertSubmitting.value).toBe(false);
  });

  it("ignores reentrant calls while a previous convertCustomer is still running", async () => {
    let resolve!: (v: { id: string }) => void;
    const repo = createRepo({
      convertCustomer: vi.fn().mockImplementation(
        () =>
          new Promise<{ id: string }>((r) => {
            resolve = r;
          }),
      ),
    });
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const first = model.convertCustomer({});
    await flush();
    expect(model.convertSubmitting.value).toBe(true);
    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;

    await model.convertCustomer({});
    expect(repo.convertCustomer).toHaveBeenCalledTimes(1);
    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );

    resolve({ id: "ok" });
    await first;
    await flush();
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });
});
