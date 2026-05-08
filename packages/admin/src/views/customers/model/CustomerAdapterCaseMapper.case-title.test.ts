import { describe, expect, it } from "vitest";
import { adaptCustomerCaseListResult } from "./CustomerAdapterCaseMapper";

describe("adaptCustomerCaseListResult — caseTitle priority (P1-9/10)", () => {
  it("prefers caseTitle over caseName when both present", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-title-001",
          caseTitle: "田中太郎 · dependent_visa",
          caseName: "家族滞在更新",
          caseNo: "CASE-202605-0001",
          caseTypeCode: "dependent_visa",
          stage: "S2",
          ownerUserId: "owner-1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].name).toBe("田中太郎 · dependent_visa");
  });

  it("falls back to caseName when caseTitle is absent", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-title-002",
          caseName: "経営管理ビザ新規",
          caseNo: "CASE-202605-0002",
          caseTypeCode: "business_manager_visa",
          stage: "S1",
          ownerUserId: "owner-2",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].name).toBe("経営管理ビザ新規");
  });

  it("returns empty string when both caseTitle and caseName are absent (component layer handles fallback)", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-title-003",
          caseNo: "CASE-202605-0003",
          caseTypeCode: "work",
          stage: "S1",
          ownerUserId: "owner-3",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].name).toBe("");
  });

  it("returns empty string when caseTitle, caseName, and caseNumber are all absent", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-title-004",
          caseTypeCode: "family",
          stage: "S1",
          ownerUserId: "owner-4",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].name).toBe("");
  });

  it("ignores empty-string caseTitle and falls through to caseName", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "case-title-005",
          caseTitle: "",
          caseName: "技人国更新",
          caseNo: "CASE-202605-0005",
          caseTypeCode: "work",
          stage: "S2",
          ownerUserId: "owner-5",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].name).toBe("技人国更新");
  });
});
