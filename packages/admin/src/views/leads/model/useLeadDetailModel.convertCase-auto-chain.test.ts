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

const VALID_INPUT = {
  caseTypeCode: "business_manager_visa",
  ownerUserId: "00000000-0000-4000-8000-000000000011",
};

describe("useLeadDetailModel — convertCase auto-chain (R3-C-2)", () => {
  it("signed + no customer → auto-chains convert-customer then convert-case", async () => {
    const repo = createRepo();
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    await flush();

    expect(result).toBeNull();
    expect(repo.convertCustomer).toHaveBeenCalledWith("signed", {});
    expect(repo.convertCase).toHaveBeenCalledWith("signed", VALID_INPUT);

    const customerOrder = (repo.convertCustomer as ReturnType<typeof vi.fn>)
      .mock.invocationCallOrder[0];
    const caseOrder = (repo.convertCase as ReturnType<typeof vi.fn>).mock
      .invocationCallOrder[0];
    expect(customerOrder).toBeLessThan(caseOrder);
  });

  it("auto-chain fails at convert-customer → returns failure without calling convert-case", async () => {
    const repo = createRepo({
      convertCustomer: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "LEAD_WRITE_ERROR",
          message: "Convert customer failed",
          status: 400,
        }),
      ),
    });
    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    expect(repo.convertCase).not.toHaveBeenCalled();
  });

  it("signed + has customer → directly calls convert-case without convert-customer", async () => {
    const repo = createRepo();
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    await flush();

    expect(result).toBeNull();
    expect(repo.convertCustomer).not.toHaveBeenCalled();
    expect(repo.convertCase).toHaveBeenCalledWith(
      "converted-customer",
      VALID_INPUT,
    );
  });

  it("non-signed lead does not trigger auto-chain", async () => {
    const repo = createRepo();
    const id = ref("following");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    await flush();

    expect(result).toBeNull();
    expect(repo.convertCustomer).not.toHaveBeenCalled();
    expect(repo.convertCase).toHaveBeenCalledWith("following", VALID_INPUT);
  });
});
