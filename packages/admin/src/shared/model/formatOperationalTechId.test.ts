import { describe, expect, it } from "vitest";
import { isUuidLikeId, techIdSuffixForOps } from "./formatOperationalTechId";

describe("formatOperationalTechId", () => {
  it("detects UUID-like ids", () => {
    expect(isUuidLikeId("ed82a8dd-f088-473d-b66b-5db38980d430")).toBe(true);
    expect(isUuidLikeId("SUB-001")).toBe(false);
    expect(isUuidLikeId("")).toBe(false);
  });

  it("returns last 8 hex chars for UUID", () => {
    expect(techIdSuffixForOps("ed82a8dd-f088-473d-b66b-5db38980d430")).toBe(
      "8980d430",
    );
  });

  it("returns null for short operational codes", () => {
    expect(techIdSuffixForOps("SUB-001")).toBeNull();
    expect(techIdSuffixForOps("abc")).toBeNull();
  });

  it("returns last 8 chars for long non-uuid strings", () => {
    expect(techIdSuffixForOps("prefix-" + "x".repeat(20))).toBe("xxxxxxxx");
  });
});
