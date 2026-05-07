import { describe, expect, it } from "vitest";
import {
  adaptLeadDetailAggregate,
  adaptLeadListResult,
} from "./LeadAdapterMappers";

function listWrap(item: Record<string, unknown>, total = 1) {
  return {
    items: [{ id: "LEAD-X", name: "Test", status: "new", ...item }],
    total,
  };
}

describe("LeadAdapterMappers — walkthrough/QA tags sanitize (admin adapter bottom guard)", () => {
  describe("adaptLeadListResult", () => {
    it("strips R<n>-/R<n>_, test-, mcp-, tmp- pattern tags so list chips never surface them", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-T5",
          tags: [
            "R5-walk",
            "VIP",
            "test-foo",
            "面談済",
            "mcp_bar",
            "TMP-baz",
            "R12-edge",
            "優先",
          ],
        }),
      );
      expect(result?.items[0].tags).toEqual(["VIP", "面談済", "優先"]);
    });
    it("keeps real business tags that look similar to walkthrough patterns", () => {
      const result = adaptLeadListResult(
        listWrap({
          id: "LEAD-T6",
          tags: ["Rapid-development", "RC1-keep", "R-no-digit", "紹介"],
        }),
      );
      expect(result?.items[0].tags).toEqual([
        "Rapid-development",
        "RC1-keep",
        "R-no-digit",
        "紹介",
      ]);
    });
  });

  describe("adaptLeadDetailAggregate", () => {
    it("strips walkthrough/QA tag patterns from detail info.tags", () => {
      const result = adaptLeadDetailAggregate({
        lead: {
          id: "LEAD-DETAIL-WALK",
          name: "Test",
          status: "following",
          tags: ["R5-walk", "VIP", "test-foo", "紹介"],
        },
        followups: [],
        logs: [],
      });
      expect(result?.detail.info.tags).toEqual(["VIP", "紹介"]);
    });
  });
});
