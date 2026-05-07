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

function createStubRepo(
  responses: Record<string, LeadDetailAggregate | null> = {},
) {
  const getDetailMock = vi
    .fn()
    .mockImplementation(async (id: string) => responses[id] ?? null);
  const repo: LeadRepository = {
    getDetail: getDetailMock,
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
  };
  return { repo, getDetailMock };
}

async function flush(): Promise<void> {
  await new Promise((r) => setTimeout(r, 0));
  await nextTick();
}

function setupModel(leadId: string, scenarioKeys: string[] = [leadId]) {
  const responses: Record<string, LeadDetailAggregate | null> = {};
  for (const key of scenarioKeys) {
    responses[key] = fixtureToAggregate(key);
  }
  const { repo, getDetailMock } = createStubRepo(responses);
  const id = ref(leadId);
  const model = useLeadDetailModel(id, { repo });
  return { id, model, repo, getDetailMock };
}

describe("useLeadDetailModel — convertCase (basic + already-converted skip)", () => {
  it("calls repo.convertCase with input", async () => {
    const { model, repo } = setupModel("converted-customer");
    await flush();
    const input = {
      caseTypeCode: "dependent_visa",
      ownerUserId: "suzuki",
      groupId: "tokyo-2",
    };
    await model.convertCase(input);
    await flush();
    expect(repo.convertCase).toHaveBeenCalledWith("converted-customer", input);
  });

  it("refetches detail after successful convertCase", async () => {
    const { model, getDetailMock } = setupModel("converted-customer");
    await flush();
    const callCountBefore = getDetailMock.mock.calls.length;
    await model.convertCase({
      caseTypeCode: "work",
      ownerUserId: "suzuki",
    });
    await flush();
    expect(getDetailMock.mock.calls.length).toBeGreaterThan(callCountBefore);
  });

  it("auto-chain skips CUSTOMER_ALREADY_CONVERTED and still calls convertCase", async () => {
    const { model, repo } = setupModel("signed");
    await flush();

    vi.mocked(repo.convertCustomer).mockRejectedValueOnce(
      new LeadRepositoryError({
        code: "LEAD_WRITE_ERROR",
        message: "Customer already converted",
        status: 400,
        serverErrorCode: "CUSTOMER_ALREADY_CONVERTED",
      }),
    );

    const result = await model.convertCase({
      caseTypeCode: "dependent_visa",
      ownerUserId: "suzuki",
    });
    await flush();

    expect(repo.convertCustomer).toHaveBeenCalledWith("signed", {});
    expect(repo.convertCase).toHaveBeenCalledWith("signed", {
      caseTypeCode: "dependent_visa",
      ownerUserId: "suzuki",
    });
    expect(result).toBeNull();
  });

  it("auto-chain propagates non-CUSTOMER_ALREADY_CONVERTED errors", async () => {
    const { model, repo } = setupModel("signed");
    await flush();

    vi.mocked(repo.convertCustomer).mockRejectedValueOnce(
      new LeadRepositoryError({
        code: "LEAD_WRITE_ERROR",
        message: "Some other error",
        status: 500,
        serverErrorCode: "INTERNAL_ERROR",
      }),
    );

    const result = await model.convertCase({
      caseTypeCode: "dependent_visa",
      ownerUserId: "suzuki",
    });
    await flush();

    expect(repo.convertCustomer).toHaveBeenCalled();
    expect(repo.convertCase).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
  });
});
