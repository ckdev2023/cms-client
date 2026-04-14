import { describe, expect, it } from "vitest";
import { ref } from "vue";
import { useLeadDetailModel } from "./useLeadDetailModel";

describe("useLeadDetailModel", () => {
  it("returns lead data for a known scenario key", () => {
    const id = ref("following");
    const { lead, notFound } = useLeadDetailModel(id);
    expect(lead.value).not.toBeNull();
    expect(lead.value!.name).toBe("李华");
    expect(notFound.value).toBe(false);
  });

  it("returns null and notFound for an unknown key", () => {
    const id = ref("nonexistent");
    const { lead, notFound } = useLeadDetailModel(id);
    expect(lead.value).toBeNull();
    expect(notFound.value).toBe(true);
  });

  it("reacts to ID changes", () => {
    const id = ref("following");
    const { lead } = useLeadDetailModel(id);
    expect(lead.value!.id).toBe("LEAD-2026-0035");

    id.value = "lost";
    expect(lead.value!.id).toBe("LEAD-2026-0019");
    expect(lead.value!.name).toBe("佐藤 美咲");
  });

  it("defaults activeTab to info", () => {
    const id = ref("following");
    const { activeTab } = useLeadDetailModel(id);
    expect(activeTab.value).toBe("info");
  });

  it("switchTab updates activeTab", () => {
    const id = ref("following");
    const { activeTab, switchTab } = useLeadDetailModel(id);
    switchTab("followups");
    expect(activeTab.value).toBe("followups");
    switchTab("log");
    expect(activeTab.value).toBe("log");
  });

  it("avatarInitials returns first char of name", () => {
    const id = ref("following");
    const { avatarInitials } = useLeadDetailModel(id);
    expect(avatarInitials.value).toBe("李");
  });

  it("avatarInitials returns ? for unknown lead", () => {
    const id = ref("unknown");
    const { avatarInitials } = useLeadDetailModel(id);
    expect(avatarInitials.value).toBe("?");
  });

  describe("isReadonly / banner", () => {
    it("lost lead is readonly with lost banner", () => {
      const id = ref("lost");
      const { isReadonly, banner } = useLeadDetailModel(id);
      expect(isReadonly.value).toBe(true);
      expect(banner.value).toBe("lost");
    });

    it("following lead is not readonly, no banner", () => {
      const id = ref("following");
      const { isReadonly, banner } = useLeadDetailModel(id);
      expect(isReadonly.value).toBe(false);
      expect(banner.value).toBeNull();
    });

    it("signed lead has signedNotConverted banner", () => {
      const id = ref("signed");
      const { banner } = useLeadDetailModel(id);
      expect(banner.value).toBe("signedNotConverted");
    });
  });

  describe("buttonStates", () => {
    it("lost lead disables convert buttons", () => {
      const id = ref("lost");
      const { buttonStates } = useLeadDetailModel(id);
      expect(buttonStates.value.convertCustomer).toBe("disabled");
      expect(buttonStates.value.convertCase).toBe("disabled");
      expect(buttonStates.value.markLost).toBe("hidden");
    });

    it("signedNotConverted highlights convert buttons", () => {
      const id = ref("signed");
      const { buttonStates } = useLeadDetailModel(id);
      expect(buttonStates.value.convertCustomer).toBe("highlighted");
      expect(buttonStates.value.convertCase).toBe("highlighted");
    });

    it("convertedCustomer shows view-customer", () => {
      const id = ref("converted-customer");
      const { buttonStates } = useLeadDetailModel(id);
      expect(buttonStates.value.convertCustomer).toBe("view-customer");
      expect(buttonStates.value.convertCase).toBe("enabled");
    });

    it("convertedCase shows view-customer and view-case", () => {
      const id = ref("converted-case");
      const { buttonStates } = useLeadDetailModel(id);
      expect(buttonStates.value.convertCustomer).toBe("view-customer");
      expect(buttonStates.value.convertCase).toBe("view-case");
    });

    it("normal preset for following lead", () => {
      const id = ref("following");
      const { buttonStates } = useLeadDetailModel(id);
      expect(buttonStates.value.convertCustomer).toBe("enabled");
      expect(buttonStates.value.markLost).toBe("enabled");
    });
  });

  describe("followupForm", () => {
    it("starts with blank fields", () => {
      const id = ref("following");
      const { followupForm, canSubmitFollowup } = useLeadDetailModel(id);
      expect(followupForm.channel).toBe("");
      expect(followupForm.summary).toBe("");
      expect(canSubmitFollowup.value).toBe(false);
    });

    it("canSubmitFollowup requires channel + summary and not readonly", () => {
      const id = ref("following");
      const { followupForm, canSubmitFollowup } = useLeadDetailModel(id);
      followupForm.channel = "phone";
      expect(canSubmitFollowup.value).toBe(false);
      followupForm.summary = "致电确认";
      expect(canSubmitFollowup.value).toBe(true);
    });

    it("canSubmitFollowup is false when lead is readonly", () => {
      const id = ref("lost");
      const { followupForm, canSubmitFollowup } = useLeadDetailModel(id);
      followupForm.channel = "phone";
      followupForm.summary = "test";
      expect(canSubmitFollowup.value).toBe(false);
    });

    it("submitFollowup returns snapshot and resets form", () => {
      const id = ref("following");
      const { followupForm, submitFollowup } = useLeadDetailModel(id);
      followupForm.channel = "email";
      followupForm.summary = "发送材料清单";
      followupForm.conclusion = "已确认";
      const snap = submitFollowup();
      expect(snap).not.toBeNull();
      expect(snap!.channel).toBe("email");
      expect(snap!.summary).toBe("发送材料清单");
      expect(followupForm.channel).toBe("");
      expect(followupForm.summary).toBe("");
    });

    it("submitFollowup returns null when cannot submit", () => {
      const id = ref("following");
      const { submitFollowup } = useLeadDetailModel(id);
      expect(submitFollowup()).toBeNull();
    });
  });

  describe("log filtering", () => {
    it("defaults to all category", () => {
      const id = ref("following");
      const { logCategory, filteredLog } = useLeadDetailModel(id);
      expect(logCategory.value).toBe("all");
      expect(filteredLog.value.length).toBe(4);
    });

    it("filters by status category", () => {
      const id = ref("following");
      const { setLogCategory, filteredLog } = useLeadDetailModel(id);
      setLogCategory("status");
      expect(filteredLog.value.every((e) => e.type === "status")).toBe(true);
      expect(filteredLog.value.length).toBe(2);
    });

    it("filters by owner category", () => {
      const id = ref("following");
      const { setLogCategory, filteredLog } = useLeadDetailModel(id);
      setLogCategory("owner");
      expect(filteredLog.value.every((e) => e.type === "owner")).toBe(true);
      expect(filteredLog.value.length).toBe(1);
    });

    it("filters by group category", () => {
      const id = ref("following");
      const { setLogCategory, filteredLog } = useLeadDetailModel(id);
      setLogCategory("group");
      expect(filteredLog.value.every((e) => e.type === "group")).toBe(true);
      expect(filteredLog.value.length).toBe(1);
    });

    it("returns empty for category with no matching entries", () => {
      const id = ref("lost");
      const { setLogCategory, filteredLog } = useLeadDetailModel(id);
      setLogCategory("group");
      expect(filteredLog.value.length).toBe(0);
    });
  });
});
