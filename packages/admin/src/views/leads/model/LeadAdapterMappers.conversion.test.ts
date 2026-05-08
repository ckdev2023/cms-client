import { describe, expect, it } from "vitest";
import {
  adaptLeadListResult,
  adaptLeadDetailAggregate,
} from "./LeadAdapterMappers";

function listWrap(item: Record<string, unknown>, total = 1) {
  return {
    items: [{ id: "LEAD-X", name: "Test", status: "new", ...item }],
    total,
  };
}

describe("LeadAdapterMappers — conversion & source", () => {
  describe("adaptConversionInfo — populates convertedCustomer/Case from top-level (T11)", () => {
    function makeDetailRaw(overrides: Record<string, unknown> = {}) {
      return {
        lead: {
          id: "LEAD-CONV",
          name: "Conv Test",
          status: "signed",
          convertedCustomerId: "CUS-1",
          convertedCaseId: "CAS-1",
        },
        followups: [],
        logs: [],
        ...overrides,
      };
    }

    it("populates convertedCustomer and convertedCase when top-level objects present", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            name: "田中 花子",
            group: "Tokyo-1",
            convertedAt: "2026-05-01T10:00:00Z",
            convertedBy: "Admin",
          },
          convertedCase: {
            id: "CAS-1",
            caseNo: "CASE-202605-0001",
            caseTypeCode: "dependent_visa",
            group: "Tokyo-1",
            convertedAt: "2026-05-02T10:00:00Z",
            convertedBy: "Admin",
          },
        }),
      );

      expect(result?.detail.conversion.convertedCustomer).toEqual({
        id: "CUS-1",
        customerNo: "",
        name: "田中 花子",
        group: "Tokyo-1",
        convertedAt: "2026-05-01T10:00:00Z",
        convertedBy: "Admin",
      });
      expect(result?.detail.conversion.convertedCase).toEqual({
        id: "CAS-1",
        title: "CASE-202605-0001",
        caseNo: "CASE-202605-0001",
        type: "dependent_visa",
        group: "Tokyo-1",
        convertedAt: "2026-05-02T10:00:00Z",
        convertedBy: "Admin",
      });
    });

    it("NEW-V5-2: prefers title over caseNo when both present, exposes caseNo separately", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCase: {
            id: "CAS-3",
            title: "R-FLOW-V5 走查申请人 · 家族滞在",
            caseNo: "CASE-202605-0011",
            caseTypeCode: "dependent_visa",
            convertedAt: "2026-05-08T17:22:00Z",
            convertedBy: "Admin",
          },
        }),
      );

      const cas = result?.detail.conversion.convertedCase;
      expect(cas?.title).toBe("R-FLOW-V5 走查申请人 · 家族滞在");
      expect(cas?.caseNo).toBe("CASE-202605-0011");
    });

    it("NEW-V5-2: falls back to caseNo for title when server omits title", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCase: {
            id: "CAS-4",
            caseNo: "CASE-202605-0012",
            caseTypeCode: "dependent_visa",
          },
        }),
      );

      const cas = result?.detail.conversion.convertedCase;
      expect(cas?.title).toBe("CASE-202605-0012");
      expect(cas?.caseNo).toBe("CASE-202605-0012");
    });

    it("returns null conversion fields when server omits them", () => {
      const result = adaptLeadDetailAggregate(makeDetailRaw());

      expect(result?.detail.conversion.convertedCustomer).toBeNull();
      expect(result?.detail.conversion.convertedCase).toBeNull();
    });

    it("handles minimal server shape (id + name only for customer)", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: { id: "CUS-2", name: "佐藤" },
        }),
      );

      const cust = result?.detail.conversion.convertedCustomer;
      expect(cust).not.toBeNull();
      expect(cust?.id).toBe("CUS-2");
      expect(cust?.customerNo).toBe("");
      expect(cust?.name).toBe("佐藤");
      expect(cust?.group).toBe("");
    });

    it("maps customerNo from server DTO (B-2)", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            customerNo: "CUS-202605-0001",
            name: "田中 花子",
            group: "Tokyo-1",
            convertedAt: "2026-05-01T10:00:00Z",
            convertedBy: "Admin",
          },
        }),
      );
      expect(result?.detail.conversion.convertedCustomer?.customerNo).toBe(
        "CUS-202605-0001",
      );
    });

    it("prefers displayName over name for customer (B-2)", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            displayName: "田中 花子（表示名）",
            name: "田中 花子",
            convertedAt: "2026-05-01T10:00:00Z",
            convertedBy: "Admin",
          },
        }),
      );
      expect(result?.detail.conversion.convertedCustomer?.name).toBe(
        "田中 花子（表示名）",
      );
    });

    it("falls back to name when displayName absent (B-2)", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            name: "佐藤 太郎",
            convertedAt: "2026-05-01T10:00:00Z",
            convertedBy: "Admin",
          },
        }),
      );
      expect(result?.detail.conversion.convertedCustomer?.name).toBe(
        "佐藤 太郎",
      );
    });

    it("handles minimal server shape (id + caseNo only for case)", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCase: { id: "CAS-2", caseNo: "CASE-001" },
        }),
      );

      const cas = result?.detail.conversion.convertedCase;
      expect(cas).not.toBeNull();
      expect(cas?.id).toBe("CAS-2");
      expect(cas?.title).toBe("CASE-001");
    });

    it("R-FLOW5-A-8: reads customer.group from { id, name } object shape", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            customerNo: "CUS-202605-0013",
            name: "鈴木次郎",
            group: {
              id: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c",
              name: "tokyo-1",
            },
            convertedAt: "2026-05-07T20:37:00Z",
            convertedBy: "Admin",
          },
        }),
      );

      const cust = result?.detail.conversion.convertedCustomer;
      expect(cust).not.toBeNull();
      expect(cust?.group).toBe("tokyo-1");
    });

    it("R-FLOW5-A-8: reads case.group from { id, name } object shape", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCase: {
            id: "11a18544-56bd-4f74-95d6-fc135bad5b46",
            caseNo: "CASE-202605-0009",
            caseTypeCode: "dependent_visa",
            group: {
              id: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c",
              name: "tokyo-1",
            },
            convertedAt: "2026-05-07T20:37:00Z",
          },
        }),
      );

      const cas = result?.detail.conversion.convertedCase;
      expect(cas).not.toBeNull();
      expect(cas?.title).toBe("CASE-202605-0009");
      expect(cas?.type).toBe("dependent_visa");
      expect(cas?.group).toBe("tokyo-1");
      expect(cas?.convertedAt).toBe("2026-05-07T20:37:00Z");
    });

    it("R-FLOW5-A-8: falls back to group.id when group.name is missing", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            name: "鈴木次郎",
            group: {
              id: "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c",
              name: "",
            },
          },
        }),
      );

      const cust = result?.detail.conversion.convertedCustomer;
      expect(cust?.group).toBe("ef21fdd2-1ffc-4a27-8b47-a640d6bd021c");
    });

    it("R-FLOW5-A-8: returns empty group when server returns null", () => {
      const result = adaptLeadDetailAggregate(
        makeDetailRaw({
          convertedCustomer: {
            id: "CUS-1",
            name: "鈴木次郎",
            group: null,
          },
        }),
      );

      const cust = result?.detail.conversion.convertedCustomer;
      expect(cust?.group).toBe("");
    });
  });

  describe("readLeadClassification — source field priority (A-1)", () => {
    const listSource = (o: Record<string, unknown>) =>
      adaptLeadListResult(listWrap({ id: "LEAD-SRC", ...o }))?.items[0];

    it("prefers sourceChannel over source", () => {
      expect(
        listSource({ sourceChannel: "web", source: "admin" })?.source,
      ).toBe("web");
    });
    it("falls back to source when sourceChannel absent", () => {
      expect(listSource({ source: "referral" })?.source).toBe("referral");
    });
    it("uses sourceLabel when present", () => {
      expect(
        listSource({ sourceChannel: "web", sourceLabel: "网站表单" })
          ?.sourceLabel,
      ).toBe("网站表单");
    });
  });
});
