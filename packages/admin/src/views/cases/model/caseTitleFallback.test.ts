import { describe, expect, it } from "vitest";
import { buildFallbackName, isFallbackTitle } from "./caseTitleFallback";

describe("buildFallbackName", () => {
  it("applicant + typeLabel → 'applicant · typeLabel'", () => {
    expect(buildFallbackName("張伟", "経営管理", "CASE-001", "uuid-1")).toBe(
      "張伟 · 経営管理",
    );
  });

  it("applicant only (typeLabel is dash) → applicant", () => {
    expect(buildFallbackName("張伟", "—", "CASE-001", "uuid-1")).toBe("張伟");
  });

  it("applicant only (typeLabel is empty) → applicant", () => {
    expect(buildFallbackName("張伟", "", "CASE-001", "uuid-1")).toBe("張伟");
  });

  it("typeLabel only (applicant undefined) → typeLabel", () => {
    expect(buildFallbackName(undefined, "経営管理", "CASE-001", "uuid-1")).toBe(
      "経営管理",
    );
  });

  it("typeLabel only (applicant empty) → typeLabel", () => {
    expect(buildFallbackName("  ", "経営管理", "CASE-001", "uuid-1")).toBe(
      "経営管理",
    );
  });

  it("neither applicant nor typeLabel → caseNo", () => {
    expect(buildFallbackName(undefined, "", "CASE-001", "uuid-1")).toBe(
      "CASE-001",
    );
  });

  it("all missing → id", () => {
    expect(buildFallbackName(undefined, "", undefined, "uuid-1")).toBe(
      "uuid-1",
    );
  });

  it("dash typeLabel + no applicant → caseNo", () => {
    expect(buildFallbackName(undefined, "—", "CASE-002", "uuid-2")).toBe(
      "CASE-002",
    );
  });
});

describe("isFallbackTitle", () => {
  it("name matches caseNo → true", () => {
    expect(isFallbackTitle("CASE-001", "CASE-001", "uuid-1")).toBe(true);
  });

  it("name matches id → true", () => {
    expect(isFallbackTitle("uuid-1", "CASE-001", "uuid-1")).toBe(true);
  });

  it("name is empty → true", () => {
    expect(isFallbackTitle("", "CASE-001", "uuid-1")).toBe(true);
  });

  it("name is whitespace-only → true", () => {
    expect(isFallbackTitle("   ", "CASE-001", "uuid-1")).toBe(true);
  });

  it("name is null → true", () => {
    expect(isFallbackTitle(null, "CASE-001", "uuid-1")).toBe(true);
  });

  it("name is undefined → true", () => {
    expect(isFallbackTitle(undefined, "CASE-001", "uuid-1")).toBe(true);
  });

  it("meaningful name → false", () => {
    expect(isFallbackTitle("経営管理ビザ申請", "CASE-001", "uuid-1")).toBe(
      false,
    );
  });

  it("name with surrounding whitespace that matches caseNo after trim → true", () => {
    expect(isFallbackTitle(" CASE-001 ", "CASE-001", "uuid-1")).toBe(true);
  });
});
