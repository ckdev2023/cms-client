import { describe, expect, it } from "vitest";
import {
  FOLLOWUP_CHANNELS,
  HEADER_BUTTON_PRESETS,
  LEAD_DETAIL_TABS,
  LEAD_STATUSES,
  LOG_CATEGORIES,
  SCOPE_OPTIONS,
  getFollowupChannelLabel,
  getLeadLogCategoryLabel,
  getLeadStatusLabel,
  type FollowupChannel,
  type LeadCreateFormFields,
  type LeadDetail,
  type LeadDetailTab,
  type LeadStatus,
} from "./types";

describe("leads/types", () => {
  describe("LEAD_STATUSES", () => {
    it("contains 6 statuses matching spec §3.6", () => {
      expect(LEAD_STATUSES).toHaveLength(6);
    });

    it("covers all LeadStatus values", () => {
      const values = LEAD_STATUSES.map((s) => s.value);
      const expected: LeadStatus[] = [
        "new",
        "following",
        "pending_sign",
        "signed",
        "converted_case",
        "lost",
      ];
      expect(values).toEqual(expected);
    });

    it("each entry has label, badgeClass, dotColor, textClass", () => {
      for (const s of LEAD_STATUSES) {
        expect(s.label).toBeTruthy();
        expect(s.badgeClass).toBeTruthy();
        expect(s.dotColor).toBeTruthy();
        expect(s.textClass).toBeTruthy();
      }
    });
  });

  describe("getLeadStatusLabel", () => {
    it("returns Chinese label for known status", () => {
      expect(getLeadStatusLabel("new")).toBe("新咨询");
      expect(getLeadStatusLabel("lost")).toBe("已流失");
    });

    it("returns raw value for unknown status", () => {
      expect(getLeadStatusLabel("unknown")).toBe("unknown");
    });

    it("returns dash for empty string", () => {
      expect(getLeadStatusLabel("")).toBe("—");
    });
  });

  describe("SCOPE_OPTIONS", () => {
    it("has 3 scope options", () => {
      expect(SCOPE_OPTIONS).toHaveLength(3);
      expect(SCOPE_OPTIONS.map((o) => o.value)).toEqual([
        "mine",
        "group",
        "all",
      ]);
    });
  });

  describe("LEAD_DETAIL_TABS", () => {
    it("contains exactly 5 tabs in the expected order", () => {
      expect(LEAD_DETAIL_TABS).toEqual([
        "info",
        "followups",
        "conversations",
        "conversion",
        "log",
      ]);
    });

    it("entries satisfy the LeadDetailTab type", () => {
      const tabs: LeadDetailTab[] = [...LEAD_DETAIL_TABS];
      expect(tabs).toHaveLength(5);
    });
  });

  describe("FOLLOWUP_CHANNELS", () => {
    it("has 4 channel types", () => {
      expect(FOLLOWUP_CHANNELS).toHaveLength(4);
      const values = FOLLOWUP_CHANNELS.map((c) => c.value);
      const expected: FollowupChannel[] = ["phone", "email", "meeting", "im"];
      expect(values).toEqual(expected);
    });

    it("each channel has label and chipClass", () => {
      for (const c of FOLLOWUP_CHANNELS) {
        expect(c.label).toBeTruthy();
        expect(c.chipClass).toBeTruthy();
      }
    });
  });

  describe("getFollowupChannelLabel", () => {
    it("returns Chinese label for known channel", () => {
      expect(getFollowupChannelLabel("phone")).toBe("电话");
      expect(getFollowupChannelLabel("im")).toBe("IM");
    });

    it("returns raw value for unknown channel", () => {
      expect(getFollowupChannelLabel("sms")).toBe("sms");
    });
  });

  describe("LOG_CATEGORIES", () => {
    it("has 5 categories with all as first and info appended (H-5)", () => {
      expect(LOG_CATEGORIES).toHaveLength(5);
      expect(LOG_CATEGORIES[0].key).toBe("all");
      expect(LOG_CATEGORIES[LOG_CATEGORIES.length - 1].key).toBe("info");
    });
  });

  describe("getLeadLogCategoryLabel", () => {
    it("returns Chinese label for known category", () => {
      expect(getLeadLogCategoryLabel("status")).toBe("状态变更");
      expect(getLeadLogCategoryLabel("all")).toBe("全部");
      expect(getLeadLogCategoryLabel("info")).toBe("其他");
    });
  });

  describe("HEADER_BUTTON_PRESETS", () => {
    it("defines 6 presets", () => {
      expect(Object.keys(HEADER_BUTTON_PRESETS)).toHaveLength(6);
    });

    it("initial preset hides convert buttons (new status)", () => {
      const initial = HEADER_BUTTON_PRESETS.initial;
      expect(initial.convertCustomer).toBe("hidden");
      expect(initial.convertCase).toBe("hidden");
      expect(initial.markLost).toBe("enabled");
      expect(initial.editInfo).toBe("enabled");
      expect(initial.changeStatus).toBe("enabled");
    });

    it("normal preset enables convertCustomer, hides convertCase (§4: no customer yet)", () => {
      const normal = HEADER_BUTTON_PRESETS.normal;
      expect(normal.convertCustomer).toBe("enabled");
      expect(normal.convertCase).toBe("hidden");
      expect(normal.markLost).toBe("enabled");
      expect(normal.editInfo).toBe("enabled");
      expect(normal.changeStatus).toBe("enabled");
    });

    it("signedNotConverted highlights convertCustomer, hides convertCase", () => {
      const preset = HEADER_BUTTON_PRESETS.signedNotConverted;
      expect(preset.convertCustomer).toBe("highlighted");
      expect(preset.convertCase).toBe("hidden");
    });

    it("convertedCustomer shows view-customer and highlights convertCase", () => {
      const preset = HEADER_BUTTON_PRESETS.convertedCustomer;
      expect(preset.convertCustomer).toBe("view-customer");
      expect(preset.convertCase).toBe("highlighted");
    });

    it("lost preset hides all action buttons", () => {
      const lost = HEADER_BUTTON_PRESETS.lost;
      expect(lost.convertCustomer).toBe("hidden");
      expect(lost.convertCase).toBe("hidden");
      expect(lost.markLost).toBe("hidden");
      expect(lost.editInfo).toBe("disabled");
    });
  });

  it("LeadCreateFormFields can be instantiated with all fields", () => {
    const form: LeadCreateFormFields = {
      name: "Test",
      phone: "090-0000-0000",
      email: "test@test.com",
      source: "web",
      referrer: "",
      businessType: "work-visa",
      group: "tokyo-1",
      owner: "suzuki",
      nextAction: "call",
      nextFollowUp: "2026-04-15",
      language: "ja",
      note: "",
    };
    expect(form.name).toBe("Test");
    expect(form.phone).toBeTruthy();
  });

  it("LeadDetail can be instantiated with required fields", () => {
    const detail: LeadDetail = {
      id: "LEAD-TEST",
      name: "Test Lead",
      status: "new",
      ownerId: "suzuki",
      ownerLabel: "铃木",
      ownerInitials: "铃",
      ownerAvatarClass: "bg-sky-100 text-sky-700",
      groupId: "tokyo-1",
      groupLabel: "东京一组",
      banner: null,
      buttons: "normal",
      readonly: false,
      conversationId: null,
      info: {
        id: "LEAD-TEST",
        name: "Test Lead",
        phone: "",
        email: "t@t.com",
        source: "web",
        referrer: "",
        businessType: "other",
        group: "东京一组",
        owner: "铃木",
        language: "ja",
        note: "",
      },
      followups: [],
      conversion: {
        dedupResult: null,
        convertedCustomer: null,
        convertedCase: null,
        conversions: [],
      },
      log: [],
    };
    expect(detail.id).toBe("LEAD-TEST");
    expect(detail.status).toBe("new");
    expect(detail.readonly).toBe(false);
  });
});
