import { describe, expect, it } from "vitest";
import { formatCaseIdentity } from "./caseIdentity";

describe("formatCaseIdentity", () => {
  it("returns caseNo when present", () => {
    expect(formatCaseIdentity("CASE-202604-0003", "uuid-x")).toBe(
      "CASE-202604-0003",
    );
  });

  it("falls back to id when caseNo is undefined", () => {
    expect(formatCaseIdentity(undefined, "uuid-x")).toBe("uuid-x");
  });

  it("falls back to id when caseNo is null", () => {
    expect(formatCaseIdentity(null, "uuid-x")).toBe("uuid-x");
  });

  it("falls back to id when caseNo is empty string", () => {
    expect(formatCaseIdentity("", "uuid-x")).toBe("uuid-x");
  });

  it("falls back to id when caseNo is whitespace-only", () => {
    expect(formatCaseIdentity("   ", "uuid-x")).toBe("uuid-x");
  });

  it("trims surrounding whitespace from caseNo", () => {
    expect(formatCaseIdentity("  CASE-001  ", "uuid-x")).toBe("CASE-001");
  });

  it("does not prefix '#' or alter formatting (parity with list cell)", () => {
    const out = formatCaseIdentity("CASE-202604-0003", "uuid-x");
    expect(out.startsWith("#")).toBe(false);
    expect(out).toBe("CASE-202604-0003");
  });
});
