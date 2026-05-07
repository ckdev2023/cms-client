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

describe("useLeadDetailModel — convertCase error surfacing (R2-B-5)", () => {
  it("returns null on success and refetches detail", async () => {
    const repo = createRepo();
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    const result = await model.convertCase(VALID_INPUT);
    await flush();

    expect(result).toBeNull();
    expect(
      (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length,
    ).toBeGreaterThan(before);
  });

  it("returns kind=bmvGate failure with blockers on CASE_BMV_GATE_BLOCKED", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "LEAD_WRITE_ERROR",
          message: "BMV gate blocked",
          status: 400,
          serverErrorCode: "CASE_BMV_GATE_BLOCKED",
          serverBlockers: [
            {
              code: "BMV_QUESTIONNAIRE_NOT_RETURNED",
              message: "Questionnaire required",
            },
            { code: "BMV_NOT_SIGNED", message: "Sign required" },
          ],
        }),
      ),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("bmvGate");
    if (result!.kind === "bmvGate") {
      expect(result!.serverErrorCode).toBe("CASE_BMV_GATE_BLOCKED");
      expect(result!.blockers).toHaveLength(2);
      expect(result!.blockers[0].code).toBe("BMV_QUESTIONNAIRE_NOT_RETURNED");
      expect(result!.blockers[1].code).toBe("BMV_NOT_SIGNED");
    }
  });

  it("returns kind=generic failure when CASE_BMV_GATE_BLOCKED has empty blockers", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "LEAD_WRITE_ERROR",
          message: "Gate blocked but no blockers",
          status: 400,
          serverErrorCode: "CASE_BMV_GATE_BLOCKED",
          serverBlockers: [],
        }),
      ),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    if (result!.kind === "generic") {
      expect(result!.messageKey).toBe("leads.errors.convertCaseFailed");
      expect(result!.fallbackMessage).toBe("Gate blocked but no blockers");
    }
  });

  it("returns kind=generic failure for non-BMV repository errors", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "VALIDATION_ERROR",
          message: "ownerUserId must be a valid UUID",
          status: 400,
        }),
      ),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    if (result!.kind === "generic") {
      expect(result!.messageKey).toBe("leads.errors.convertCaseFailed");
      expect(result!.fallbackMessage).toBe("ownerUserId must be a valid UUID");
    }
  });

  it("returns kind=generic failure with fallback message for unknown thrown values", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(new Error("network down")),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const result = await model.convertCase(VALID_INPUT);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe("generic");
    if (result!.kind === "generic") {
      expect(result!.messageKey).toBe("leads.errors.convertCaseFailed");
      expect(result!.fallbackMessage).toBe("network down");
    }
  });

  it("does NOT refetch detail when convertCase fails", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "LEAD_WRITE_ERROR",
          message: "Gate blocked",
          status: 400,
          serverErrorCode: "CASE_BMV_GATE_BLOCKED",
          serverBlockers: [{ code: "BMV_NOT_SIGNED" }],
        }),
      ),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    const before = (repo.getDetail as ReturnType<typeof vi.fn>).mock.calls
      .length;
    await model.convertCase(VALID_INPUT);
    await flush();
    expect((repo.getDetail as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      before,
    );
  });

  it("releases convertSubmitting after a failed convertCase", async () => {
    const repo = createRepo({
      convertCase: vi.fn().mockRejectedValue(
        new LeadRepositoryError({
          code: "LEAD_WRITE_ERROR",
          message: "Gate blocked",
          status: 400,
          serverErrorCode: "CASE_BMV_GATE_BLOCKED",
          serverBlockers: [{ code: "BMV_NOT_SIGNED" }],
        }),
      ),
    });
    const id = ref("converted-customer");
    const model = useLeadDetailModel(id, { repo });
    await flush();

    expect(model.convertSubmitting.value).toBe(false);
    await model.convertCase(VALID_INPUT);
    await flush();
    expect(model.convertSubmitting.value).toBe(false);
  });
});
