import { describe, expect, it } from "vitest";
import {
  BUSINESS_TYPE_OPTIONS,
  DEDUP_PRESETS,
  GROUP_OPTIONS,
  LANGUAGE_OPTIONS,
  LEAD_DETAIL_SAMPLES,
  LEAD_SAMPLES,
  LEAD_SOURCE_OPTIONS,
  OWNER_OPTIONS,
} from "./fixtures";

describe("leads/fixtures", () => {
  describe("LEAD_SAMPLES (list)", () => {
    it("provides 8 sample leads matching the 8 demo scenarios", () => {
      expect(LEAD_SAMPLES).toHaveLength(8);
    });

    it("each lead has required fields", () => {
      for (const lead of LEAD_SAMPLES) {
        expect(lead.id).toBeTruthy();
        expect(lead.name).toBeTruthy();
        expect(lead.status).toBeTruthy();
        expect(lead.ownerId).toBeTruthy();
        expect(lead.groupId).toBeTruthy();
      }
    });

    it("covers all 6 lead statuses across the 8 rows", () => {
      const statuses = new Set(LEAD_SAMPLES.map((l) => l.status));
      expect(statuses).toContain("new");
      expect(statuses).toContain("following");
      expect(statuses).toContain("pending_sign");
      expect(statuses).toContain("signed");
      expect(statuses).toContain("converted_case");
      expect(statuses).toContain("lost");
    });

    it("lost row has dimmed highlight", () => {
      const lost = LEAD_SAMPLES.find((l) => l.status === "lost");
      expect(lost).toBeDefined();
      expect(lost!.rowHighlight).toBe("dimmed");
    });

    it("signed-not-converted row has warning highlight", () => {
      const warning = LEAD_SAMPLES.find(
        (l) => l.status === "signed" && l.convertedCustomerId === null,
      );
      expect(warning).toBeDefined();
      expect(warning!.rowHighlight).toBe("warning");
      expect(warning!.warningText).toBeTruthy();
    });

    it("dedup rows reference dedup presets", () => {
      const dedupLeads = LEAD_SAMPLES.filter((l) => l.dedupHint !== null);
      expect(dedupLeads).toHaveLength(2);
      expect(dedupLeads.map((l) => l.dedupHint).sort()).toEqual([
        "emailMatchCustomer",
        "phoneMatchLead",
      ]);
    });

    it("converted_case row has both convertedCustomerId and convertedCaseId", () => {
      const converted = LEAD_SAMPLES.find((l) => l.status === "converted_case");
      expect(converted).toBeDefined();
      expect(converted!.convertedCustomerId).toBeTruthy();
      expect(converted!.convertedCaseId).toBeTruthy();
    });
  });

  describe("option arrays", () => {
    it("GROUP_OPTIONS has at least 3 options", () => {
      expect(GROUP_OPTIONS.length).toBeGreaterThanOrEqual(3);
      for (const opt of GROUP_OPTIONS) {
        expect(opt.value).toBeTruthy();
        expect(opt.label).toBeTruthy();
      }
    });

    it("OWNER_OPTIONS has at least 3 options with initials", () => {
      expect(OWNER_OPTIONS.length).toBeGreaterThanOrEqual(3);
      for (const opt of OWNER_OPTIONS) {
        expect(opt.value).toBeTruthy();
        expect(opt.label).toBeTruthy();
        expect(opt.initials).toBeTruthy();
        expect(opt.avatarClass).toBeTruthy();
      }
    });

    it("BUSINESS_TYPE_OPTIONS has 6 business types", () => {
      expect(BUSINESS_TYPE_OPTIONS).toHaveLength(6);
    });

    it("LEAD_SOURCE_OPTIONS has 5 sources", () => {
      expect(LEAD_SOURCE_OPTIONS).toHaveLength(5);
    });

    it("LANGUAGE_OPTIONS has 4 languages", () => {
      expect(LANGUAGE_OPTIONS).toHaveLength(4);
    });
  });

  describe("DEDUP_PRESETS", () => {
    it("has phoneMatchLead and emailMatchCustomer presets", () => {
      expect(DEDUP_PRESETS.phoneMatchLead).toBeDefined();
      expect(DEDUP_PRESETS.emailMatchCustomer).toBeDefined();
    });

    it("phoneMatchLead matches by phone to a lead", () => {
      const p = DEDUP_PRESETS.phoneMatchLead;
      expect(p.type).toBe("lead");
      expect(p.matchField).toBe("phone");
      expect(p.message).toBeTruthy();
    });

    it("emailMatchCustomer matches by email to a customer", () => {
      const p = DEDUP_PRESETS.emailMatchCustomer;
      expect(p.type).toBe("customer");
      expect(p.matchField).toBe("email");
      expect(p.message).toBeTruthy();
    });
  });

  describe("LEAD_DETAIL_SAMPLES", () => {
    it("has 8 detail scenarios", () => {
      expect(Object.keys(LEAD_DETAIL_SAMPLES)).toHaveLength(8);
    });

    it("each detail has complete info tab fields", () => {
      for (const d of Object.values(LEAD_DETAIL_SAMPLES)) {
        expect(d.info.id).toBeTruthy();
        expect(d.info.name).toBeTruthy();
        expect(typeof d.info.phone).toBe("string");
        expect(typeof d.info.email).toBe("string");
        expect(d.info.source).toBeTruthy();
        expect(d.info.businessType).toBeTruthy();
        expect(d.info.group).toBeTruthy();
        expect(d.info.owner).toBeTruthy();
        expect(d.info.language).toBeTruthy();
      }
    });

    it("lost scenario is readonly with lost banner", () => {
      const lost = LEAD_DETAIL_SAMPLES["lost"];
      expect(lost).toBeDefined();
      expect(lost.readonly).toBe(true);
      expect(lost.banner).toBe("lost");
      expect(lost.buttons).toBe("lost");
    });

    it("signed scenario has signedNotConverted banner", () => {
      const signed = LEAD_DETAIL_SAMPLES["signed"];
      expect(signed).toBeDefined();
      expect(signed.banner).toBe("signedNotConverted");
      expect(signed.buttons).toBe("signedNotConverted");
    });

    it("converted-case scenario has both convertedCustomer and convertedCase", () => {
      const cc = LEAD_DETAIL_SAMPLES["converted-case"];
      expect(cc).toBeDefined();
      expect(cc.conversion.convertedCustomer).toBeTruthy();
      expect(cc.conversion.convertedCase).toBeTruthy();
      expect(cc.conversion.conversions).toHaveLength(2);
    });

    it("dedup-lead scenario has dedupResult matching a lead", () => {
      const dl = LEAD_DETAIL_SAMPLES["dedup-lead"];
      expect(dl).toBeDefined();
      expect(dl.conversion.dedupResult).toBeTruthy();
      expect(dl.conversion.dedupResult!.type).toBe("lead");
    });

    it("empty-followups scenario has no followup records", () => {
      const ef = LEAD_DETAIL_SAMPLES["empty-followups"];
      expect(ef).toBeDefined();
      expect(ef.followups).toHaveLength(0);
    });

    it("each detail has at least one log entry", () => {
      for (const d of Object.values(LEAD_DETAIL_SAMPLES)) {
        expect(d.log.length).toBeGreaterThan(0);
        for (const entry of d.log) {
          expect(entry.type).toBeTruthy();
          expect(entry.operator).toBeTruthy();
          expect(entry.time).toBeTruthy();
        }
      }
    });
  });
});
