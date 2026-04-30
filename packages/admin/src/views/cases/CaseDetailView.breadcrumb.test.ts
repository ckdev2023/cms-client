import { describe, it, expect } from "vitest";
import { formatCaseIdentity } from "./caseIdentity";
import { createMockDetail } from "./model/useCaseDetailModel.test-support";

describe("CaseDetailView breadcrumb — formatCaseIdentity integration", () => {
  it("uses caseNo when present", () => {
    const detail = createMockDetail({
      caseNo: "CASE-202604-0011",
      id: "uuid-abc",
    });
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe("CASE-202604-0011");
  });

  it("falls back to id when caseNo is undefined", () => {
    const detail = createMockDetail({ caseNo: undefined, id: "uuid-abc" });
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe("uuid-abc");
  });

  it("falls back to id when caseNo is omitted entirely", () => {
    const detail = createMockDetail({ id: "uuid-abc" });
    delete (detail as Record<string, unknown>).caseNo;
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe("uuid-abc");
  });

  it("falls back to id when caseNo is empty string", () => {
    const detail = createMockDetail({ caseNo: "", id: "uuid-abc" });
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe("uuid-abc");
  });

  it("falls back to id when caseNo is whitespace-only", () => {
    const detail = createMockDetail({ caseNo: "   ", id: "uuid-abc" });
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label).toBe("uuid-abc");
  });

  it("does not prefix '#' — parity with list row", () => {
    const detail = createMockDetail({
      caseNo: "CASE-202604-0011",
      id: "uuid-abc",
    });
    const label = formatCaseIdentity(detail.caseNo, detail.id);
    expect(label.startsWith("#")).toBe(false);
  });
});
