import { describe, expect, it } from "vitest";
import {
  adaptLeadConvertCustomerResult,
  adaptLeadConvertCaseResult,
} from "./LeadAdapterConvertMappers";
import { adaptLeadMutationResult } from "./LeadAdapterMappers";

describe("LeadAdapterConvertMappers (R-FLOW-D-1)", () => {
  describe("adaptLeadConvertCustomerResult", () => {
    it("maps server convert-customer shape { lead: { id }, customerId }", () => {
      const result = adaptLeadConvertCustomerResult({
        lead: { id: "LEAD-001" },
        customerId: "CUS-001",
      });
      expect(result).toEqual({ id: "LEAD-001", customerId: "CUS-001" });
    });

    it("handles root id when lead wrapper is absent", () => {
      const result = adaptLeadConvertCustomerResult({
        id: "LEAD-002",
        customerId: "CUS-002",
      });
      expect(result).toEqual({ id: "LEAD-002", customerId: "CUS-002" });
    });

    it("returns null for invalid input", () => {
      expect(adaptLeadConvertCustomerResult(null)).toBeNull();
      expect(adaptLeadConvertCustomerResult({})).toBeNull();
    });
  });

  describe("adaptLeadConvertCaseResult", () => {
    it("maps server convert-case shape { lead: { id }, caseId }", () => {
      const result = adaptLeadConvertCaseResult({
        lead: { id: "LEAD-001" },
        caseId: "CASE-001",
      });
      expect(result).toEqual({ id: "LEAD-001", caseId: "CASE-001" });
    });

    it("handles root id when lead wrapper is absent", () => {
      const result = adaptLeadConvertCaseResult({
        id: "LEAD-002",
        caseId: "CASE-002",
      });
      expect(result).toEqual({ id: "LEAD-002", caseId: "CASE-002" });
    });

    it("returns null for invalid input", () => {
      expect(adaptLeadConvertCaseResult(null)).toBeNull();
      expect(adaptLeadConvertCaseResult({})).toBeNull();
    });
  });

  describe("adaptLeadMutationResult — backward compat", () => {
    it("accepts root id", () => {
      const result = adaptLeadMutationResult({ id: "LEAD-X" });
      expect(result).toEqual({ id: "LEAD-X" });
    });

    it("accepts nested lead.id when root id is absent", () => {
      const result = adaptLeadMutationResult({ lead: { id: "LEAD-Y" } });
      expect(result).toEqual({ id: "LEAD-Y" });
    });

    it("prefers root id over nested", () => {
      const result = adaptLeadMutationResult({
        id: "ROOT",
        lead: { id: "NESTED" },
      });
      expect(result).toEqual({ id: "ROOT" });
    });

    it("returns null for empty object", () => {
      expect(adaptLeadMutationResult({})).toBeNull();
    });
  });
});
