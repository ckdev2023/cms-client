import { describe, expect, it, vi } from "vitest";
import { ref, nextTick } from "vue";
import { useLeadDetailModel } from "./useLeadDetailModel";
import type { LeadRepository } from "./LeadRepository";
import type { LeadDetailAggregate } from "./LeadAdapterTypes";
import { LEAD_DETAIL_SAMPLES } from "../fixtures-detail";

function createRepo(overrides: Partial<LeadRepository> = {}): LeadRepository {
  return {
    getDetail: vi.fn().mockResolvedValue(null),
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

function toAggregate(key: string): LeadDetailAggregate | null {
  const detail = LEAD_DETAIL_SAMPLES[key];
  if (!detail) return null;
  return { detail, followups: detail.followups, logs: detail.log };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
}

describe("useLeadDetailModel — dedup-confirm buttonStates reactivity (R3-D-1)", () => {
  it("buttonStates updates from signedNotConverted to convertedCustomer after confirmConvertDedup", async () => {
    const signedAggregate = toAggregate("signed")!;
    const convertedAggregate = toAggregate("converted-customer")!;

    const getDetail = vi
      .fn()
      .mockResolvedValueOnce(signedAggregate)
      .mockResolvedValue(convertedAggregate);

    const repo = createRepo({ getDetail });
    vi.mocked(repo.dedup).mockResolvedValueOnce({
      leads: [
        {
          id: "dup-1",
          name: "Dup Lead",
          phone: "080-1111-2222",
          email: "dup@email.com",
          status: "new",
        },
      ],
      customers: [],
    });

    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.buttonStates.value.convertCustomer).toBe("highlighted");
    expect(model.conversion.value.convertedCustomer).toBeNull();
    expect(model.conversionCustomerHref.value).toBeNull();

    await model.convertCustomer({});
    await flush();
    expect(model.showConvertDedupPrompt.value).toBe(true);

    model.confirmConvertDedup();
    await flush();
    await flush();

    expect(repo.convertCustomer).toHaveBeenCalledWith("signed", {
      confirmDedup: true,
    });
    expect(model.buttonStates.value.convertCustomer).toBe("view-customer");
    expect(model.conversion.value.convertedCustomer).not.toBeNull();
    expect(model.conversionCustomerHref.value).toBe(
      "#/customers/CUS-2026-0195",
    );
  });

  it("conversionCustomerHref becomes non-null after direct convertCustomer (no dedup)", async () => {
    const signedAggregate = toAggregate("signed")!;
    const convertedAggregate = toAggregate("converted-customer")!;

    const getDetail = vi
      .fn()
      .mockResolvedValueOnce(signedAggregate)
      .mockResolvedValue(convertedAggregate);

    const repo = createRepo({ getDetail });

    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.conversionCustomerHref.value).toBeNull();

    await model.convertCustomer({});
    await flush();

    expect(model.conversionCustomerHref.value).toBe(
      "#/customers/CUS-2026-0195",
    );
  });

  it("buttonStates stays signedNotConverted when refetch returns same data", async () => {
    const signedAggregate = toAggregate("signed")!;

    const getDetail = vi.fn().mockResolvedValue(signedAggregate);
    const repo = createRepo({ getDetail });
    vi.mocked(repo.dedup).mockResolvedValueOnce({
      leads: [
        {
          id: "dup-1",
          name: "Dup Lead",
          phone: "080-1111-2222",
          email: "dup@email.com",
          status: "new",
        },
      ],
      customers: [],
    });

    const id = ref("signed");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.buttonStates.value.convertCustomer).toBe("highlighted");

    await model.convertCustomer({});
    await flush();
    expect(model.showConvertDedupPrompt.value).toBe(true);

    model.confirmConvertDedup();
    await flush();
    await flush();

    expect(model.buttonStates.value.convertCustomer).toBe("highlighted");
    expect(model.conversion.value.convertedCustomer).toBeNull();
  });
});
