import { describe, expect, it } from "vitest";
import { adaptCustomerCaseListResult } from "./CustomerAdapterCaseMapper";

describe("adaptCustomerCaseListResult — caseNumber mapping (BUG-190)", () => {
  it("maps caseNo to caseNumber", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "a63aa5f0-1111-2222-3333-444444444444",
          caseNo: "CASE-202605-0003",
          caseName: "経営管理ビザ新規",
          caseTypeCode: "business-management",
          stage: "S2",
          ownerUserId: "owner-1",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result).toHaveLength(1);
    expect(result![0].caseNumber).toBe("CASE-202605-0003");
    expect(result![0].name).toBe("経営管理ビザ新規");
  });

  it("maps caseNumber field directly when present", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "b74bb6f0-2222-3333-4444-555555555555",
          caseNumber: "CASE-202605-0010",
          caseName: "技術・人文知識・国際業務",
          caseTypeCode: "work",
          stage: "S3",
          ownerUserId: "owner-2",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].caseNumber).toBe("CASE-202605-0010");
  });

  it("prefers caseNo over caseNumber when both present", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "c85cc7f0-3333-4444-5555-666666666666",
          caseNo: "CASE-NO-FIRST",
          caseNumber: "CASE-NUMBER-SECOND",
          caseName: "Test",
          caseTypeCode: "work",
          stage: "S1",
          ownerUserId: "owner-3",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].caseNumber).toBe("CASE-NO-FIRST");
  });

  it("omits caseNumber when neither caseNo nor caseNumber is present", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "d96dd8f0-4444-5555-6666-777777777777",
          caseName: "No Number Case",
          caseTypeCode: "family",
          stage: "S1",
          ownerUserId: "owner-4",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].caseNumber).toBeUndefined();
    expect(result![0].name).toBe("No Number Case");
  });

  it("usesCaseNumberWhenCaseNameMissing", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "e07ee9f0-5555-6666-7777-888888888888",
          caseNo: "CASE-202605-0099",
          caseTypeCode: "work",
          stage: "S1",
          ownerUserId: "owner-5",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].caseNumber).toBe("CASE-202605-0099");
    expect(result![0].name).toBe("CASE-202605-0099");
  });

  it("returnsEmptyStringWhenBothMissing", () => {
    const result = adaptCustomerCaseListResult({
      items: [
        {
          id: "f18ff0a0-6666-7777-8888-999999999999",
          caseTypeCode: "family",
          stage: "S1",
          ownerUserId: "owner-6",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-02",
        },
      ],
    });

    expect(result).not.toBeNull();
    expect(result![0].caseNumber).toBeUndefined();
    expect(result![0].name).toBe("");
  });
});
