import { describe, it, expect } from "vitest";
import { formatTimeOnly } from "./formatTimeOnly";

describe("formatTimeOnly", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatTimeOnly(null, "en-US")).toBe("");
    expect(formatTimeOnly(undefined, "en-US")).toBe("");
    expect(formatTimeOnly("", "en-US")).toBe("");
  });

  it("returns empty string for invalid ISO", () => {
    expect(formatTimeOnly("not-a-date", "en-US")).toBe("");
  });

  it("returns HH:mm format containing a colon", () => {
    const result = formatTimeOnly("2026-05-08T14:35:00Z", "en-US");
    expect(result).toBeTruthy();
    expect(result).toContain(":");
  });

  it("does not include date components", () => {
    const result = formatTimeOnly("2026-05-08T14:35:00Z", "en-US");
    expect(result).not.toContain("2026");
    expect(result).not.toContain("05");
    expect(result).not.toContain("08");
  });

  it("formats correctly for ja-JP locale", () => {
    const result = formatTimeOnly("2026-05-08T14:35:00Z", "ja-JP");
    expect(result).toBeTruthy();
    expect(result).toContain(":");
  });

  it("formats correctly for zh-CN locale", () => {
    const result = formatTimeOnly("2026-05-08T14:35:00Z", "zh-CN");
    expect(result).toBeTruthy();
    expect(result).toContain(":");
  });
});
