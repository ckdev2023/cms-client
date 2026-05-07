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

function createStubRepo(
  responses: Record<string, LeadDetailAggregate | null> = {},
) {
  const getDetailMock = vi
    .fn()
    .mockImplementation(async (id: string) => responses[id] ?? null);

  const addFollowupMock = vi.fn().mockResolvedValue({ id: "followup-result" });

  const repo: LeadRepository = {
    getDetail: getDetailMock,
    listLeads: vi
      .fn()
      .mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 }),
    createLead: vi.fn().mockResolvedValue({ id: "test" }),
    updateLead: vi.fn().mockResolvedValue({ id: "test" }),
    transitionLead: vi.fn().mockResolvedValue({ id: "test" }),
    addFollowup: addFollowupMock,
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

  return { repo, getDetailMock, addFollowupMock };
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
  const { repo, getDetailMock, addFollowupMock } = createStubRepo(responses);
  const id = ref(leadId);
  const model = useLeadDetailModel(id, { repo });
  return { id, model, repo, getDetailMock, addFollowupMock };
}

describe("useLeadDetailModel", () => {
  it("returns lead data for a known ID", async () => {
    const { model } = setupModel("following");
    await flush();
    expect(model.lead.value).not.toBeNull();
    expect(model.lead.value!.name).toBe("李华");
    expect(model.notFound.value).toBe(false);
  });

  it("returns null and notFound for an unknown ID", async () => {
    const { model } = setupModel("nonexistent");
    await flush();
    expect(model.lead.value).toBeNull();
    expect(model.notFound.value).toBe(true);
  });

  it("reacts to ID changes", async () => {
    const { id, model } = setupModel("following", ["following", "lost"]);
    await flush();
    expect(model.lead.value!.id).toBe("LEAD-2026-0035");

    id.value = "lost";
    await flush();
    expect(model.lead.value!.id).toBe("LEAD-2026-0019");
    expect(model.lead.value!.name).toBe("佐藤 美咲");
  });

  it("defaults activeTab to info", async () => {
    const { model } = setupModel("following");
    expect(model.activeTab.value).toBe("info");
  });

  it("switchTab updates activeTab", async () => {
    const { model } = setupModel("following");
    model.switchTab("followups");
    expect(model.activeTab.value).toBe("followups");
    model.switchTab("log");
    expect(model.activeTab.value).toBe("log");
  });

  it("avatarInitials returns first char of name", async () => {
    const { model } = setupModel("following");
    await flush();
    expect(model.avatarInitials.value).toBe("李");
  });

  it("avatarInitials returns ? when lead is not loaded", async () => {
    const { model } = setupModel("unknown");
    await flush();
    expect(model.avatarInitials.value).toBe("?");
  });

  describe("isReadonly / banner", () => {
    it("lost lead is readonly with lost banner", async () => {
      const { model } = setupModel("lost");
      await flush();
      expect(model.isReadonly.value).toBe(true);
      expect(model.banner.value).toBe("lost");
    });

    it("following lead is not readonly, no banner", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(model.isReadonly.value).toBe(false);
      expect(model.banner.value).toBeNull();
    });

    it("signed lead has signedNotConverted banner", async () => {
      const { model } = setupModel("signed");
      await flush();
      expect(model.banner.value).toBe("signedNotConverted");
    });
  });

  describe("buttonStates", () => {
    it("lost lead hides convert buttons (spec §4)", async () => {
      const { model } = setupModel("lost");
      await flush();
      expect(model.buttonStates.value.convertCustomer).toBe("hidden");
      expect(model.buttonStates.value.convertCase).toBe("hidden");
      expect(model.buttonStates.value.markLost).toBe("hidden");
    });

    it("signedNotConverted highlights convertCustomer, hides convertCase (§4: no customer)", async () => {
      const { model } = setupModel("signed");
      await flush();
      expect(model.buttonStates.value.convertCustomer).toBe("highlighted");
      expect(model.buttonStates.value.convertCase).toBe("hidden");
    });

    it("convertedCustomer shows view-customer and highlights convertCase", async () => {
      const { model } = setupModel("converted-customer");
      await flush();
      expect(model.buttonStates.value.convertCustomer).toBe("view-customer");
      expect(model.buttonStates.value.convertCase).toBe("highlighted");
    });

    it("convertedCase shows view-customer and view-case", async () => {
      const { model } = setupModel("converted-case");
      await flush();
      expect(model.buttonStates.value.convertCustomer).toBe("view-customer");
      expect(model.buttonStates.value.convertCase).toBe("view-case");
    });

    it("normal preset for following lead enables convertCustomer, hides convertCase", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(model.buttonStates.value.convertCustomer).toBe("enabled");
      expect(model.buttonStates.value.convertCase).toBe("hidden");
      expect(model.buttonStates.value.markLost).toBe("enabled");
    });
  });

  describe("followupForm", () => {
    it("starts with blank fields", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(model.followupForm.channel).toBe("");
      expect(model.followupForm.summary).toBe("");
      expect(model.canSubmitFollowup.value).toBe(false);
    });

    it("canSubmitFollowup requires channel + summary and not readonly", async () => {
      const { model } = setupModel("following");
      await flush();
      model.followupForm.channel = "phone";
      expect(model.canSubmitFollowup.value).toBe(false);
      model.followupForm.summary = "致电确认";
      expect(model.canSubmitFollowup.value).toBe(true);
    });

    it("canSubmitFollowup is false when lead is readonly", async () => {
      const { model } = setupModel("lost");
      await flush();
      model.followupForm.channel = "phone";
      model.followupForm.summary = "test";
      expect(model.canSubmitFollowup.value).toBe(false);
    });

    it("submitFollowup calls repo.addFollowup, resets form, and refetches", async () => {
      const { model, addFollowupMock, getDetailMock } = setupModel("following");
      await flush();

      model.followupForm.channel = "email";
      model.followupForm.summary = "发送材料清单";
      model.followupForm.conclusion = "已确认";

      const callCountBefore = getDetailMock.mock.calls.length;
      const snap = await model.submitFollowup();
      await flush();

      expect(snap).not.toBeNull();
      expect(snap!.channel).toBe("email");
      expect(snap!.summary).toBe("发送材料清单");
      expect(model.followupForm.channel).toBe("");
      expect(model.followupForm.summary).toBe("");
      expect(addFollowupMock).toHaveBeenCalledWith("following", {
        channel: "email",
        summary: "发送材料清单",
        conclusion: "已确认",
        nextAction: undefined,
        nextFollowUp: undefined,
      });
      expect(getDetailMock.mock.calls.length).toBeGreaterThan(callCountBefore);
    });

    it("submitFollowup returns null when cannot submit", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(await model.submitFollowup()).toBeNull();
    });

    it("submitFollowup returns null on API error", async () => {
      const { model, addFollowupMock } = setupModel("following");
      await flush();
      addFollowupMock.mockRejectedValueOnce(new Error("server error"));

      model.followupForm.channel = "phone";
      model.followupForm.summary = "test";
      const snap = await model.submitFollowup();
      expect(snap).toBeNull();
    });
  });

  describe("log filtering", () => {
    it("defaults to all category", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(model.logCategory.value).toBe("all");
      expect(model.filteredLog.value.length).toBe(4);
    });

    it("filters by status category", async () => {
      const { model } = setupModel("following");
      await flush();
      model.setLogCategory("status");
      expect(model.filteredLog.value.every((e) => e.type === "status")).toBe(
        true,
      );
      expect(model.filteredLog.value.length).toBe(2);
    });

    it("filters by owner category", async () => {
      const { model } = setupModel("following");
      await flush();
      model.setLogCategory("owner");
      expect(model.filteredLog.value.every((e) => e.type === "owner")).toBe(
        true,
      );
      expect(model.filteredLog.value.length).toBe(1);
    });

    it("filters by group category", async () => {
      const { model } = setupModel("following");
      await flush();
      model.setLogCategory("group");
      expect(model.filteredLog.value.every((e) => e.type === "group")).toBe(
        true,
      );
      expect(model.filteredLog.value.length).toBe(1);
    });

    it("returns empty for category with no matching entries", async () => {
      const { model } = setupModel("lost");
      await flush();
      model.setLogCategory("group");
      expect(model.filteredLog.value.length).toBe(0);
    });
  });

  describe("conversion info", () => {
    it("exposes empty conversion when no data", async () => {
      const { model } = setupModel("following");
      await flush();
      expect(model.conversion.value.convertedCustomer).toBeNull();
      expect(model.conversion.value.convertedCase).toBeNull();
      expect(model.conversionCustomerHref.value).toBeNull();
      expect(model.conversionCaseHref.value).toBeNull();
    });

    it("provides customer jump link when convertedCustomer exists", async () => {
      const { model } = setupModel("converted-customer");
      await flush();
      expect(model.conversion.value.convertedCustomer).not.toBeNull();
      expect(model.conversion.value.convertedCustomer!.id).toBe(
        "CUS-2026-0195",
      );
      expect(model.conversionCustomerHref.value).toBe(
        "#/customers/CUS-2026-0195",
      );
      expect(model.conversionCaseHref.value).toBeNull();
    });

    it("provides case jump link when convertedCase exists", async () => {
      const { model } = setupModel("converted-case");
      await flush();
      expect(model.conversion.value.convertedCase).not.toBeNull();
      expect(model.conversionCaseHref.value).toContain("#/cases/");
    });

    it("includes conversion records with time and operator", async () => {
      const { model } = setupModel("converted-customer");
      await flush();
      const records = model.conversion.value.conversions;
      expect(records.length).toBeGreaterThan(0);
      expect(records[0].time).toBeTruthy();
      expect(records[0].operator).toBeTruthy();
    });
  });

  describe("convertCustomer with dedup", () => {
    it("calls dedup then repo.convertCustomer when no matches", async () => {
      const { model, repo } = setupModel("following");
      await flush();
      await model.convertCustomer({});
      await flush();
      expect(repo.dedup).toHaveBeenCalledWith({
        phone: "080-2222-3333",
        email: "li.hua@email.com",
      });
      expect(repo.convertCustomer).toHaveBeenCalledWith("following", {});
    });

    it("passes input through to repo.convertCustomer", async () => {
      const { model, repo } = setupModel("following");
      await flush();
      const input = { customerId: "CUS-123" };
      await model.convertCustomer(input);
      await flush();
      expect(repo.convertCustomer).toHaveBeenCalledWith("following", {
        customerId: "CUS-123",
      });
    });

    it("shows dedup prompt when matches found", async () => {
      const { model, repo } = setupModel("following");
      await flush();
      vi.mocked(repo.dedup).mockResolvedValueOnce({
        leads: [
          { id: "dup-1", name: "Dup", phone: "090", email: "", status: "new" },
        ],
        customers: [],
      });
      await model.convertCustomer({});
      await flush();
      expect(model.showConvertDedupPrompt.value).toBe(true);
      expect(repo.convertCustomer).not.toHaveBeenCalled();
    });

    it("confirmConvertDedup proceeds with confirmDedup=true", async () => {
      const { model, repo } = setupModel("following");
      await flush();
      vi.mocked(repo.dedup).mockResolvedValueOnce({
        leads: [
          { id: "dup-1", name: "Dup", phone: "090", email: "", status: "new" },
        ],
        customers: [],
      });
      await model.convertCustomer({});
      await flush();
      expect(model.showConvertDedupPrompt.value).toBe(true);

      model.confirmConvertDedup();
      await flush();
      expect(repo.convertCustomer).toHaveBeenCalledWith("following", {
        confirmDedup: true,
      });
      expect(model.showConvertDedupPrompt.value).toBe(false);
    });

    it("dismissConvertDedup clears state without converting", async () => {
      const { model, repo } = setupModel("following");
      await flush();
      vi.mocked(repo.dedup).mockResolvedValueOnce({
        leads: [],
        customers: [
          { id: "cust-1", name: "C", phone: "080", email: "c@x.com" },
        ],
      });
      await model.convertCustomer({});
      await flush();
      expect(model.showConvertDedupPrompt.value).toBe(true);

      model.dismissConvertDedup();
      expect(model.showConvertDedupPrompt.value).toBe(false);
      expect(model.convertDedupResult.value).toBeNull();
      expect(repo.convertCustomer).not.toHaveBeenCalled();
    });

    it("skips dedup when lead has no phone/email", async () => {
      const { repo } = createStubRepo();
      const detail = LEAD_DETAIL_SAMPLES["lost"];
      const aggregate = detail
        ? { detail, followups: detail.followups, logs: detail.log }
        : null;
      vi.mocked(repo.getDetail).mockResolvedValue(aggregate);
      const id = ref("lost");
      const model = useLeadDetailModel(id, { repo });
      await flush();
      expect(model.lead.value).not.toBeNull();
    });
  });

  describe("loading / error state", () => {
    it("sets loading while fetching", async () => {
      const { model } = setupModel("following");
      expect(model.loading.value).toBe(true);
      await flush();
      expect(model.loading.value).toBe(false);
    });

    it("sets error on repository failure", async () => {
      const { repo } = createStubRepo();
      vi.mocked(repo.getDetail).mockRejectedValue(new Error("network error"));
      const id = ref("some-id");
      const model = useLeadDetailModel(id, { repo });
      await flush();
      expect(model.error.value).toBe("network error");
      expect(model.lead.value).toBeNull();
    });

    it("refetch reloads data from repository", async () => {
      const { model, getDetailMock } = setupModel("following");
      await flush();
      const callCount = getDetailMock.mock.calls.length;
      await model.refetch();
      await flush();
      expect(getDetailMock.mock.calls.length).toBeGreaterThan(callCount);
    });
  });
});
