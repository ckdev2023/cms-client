import { describe, it, expect } from "vitest";
import { formatDateTime } from "./formatDateTime";

describe("formatDateTime", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatDateTime(null, "en-US")).toBe("");
    expect(formatDateTime(undefined, "en-US")).toBe("");
    expect(formatDateTime("", "en-US")).toBe("");
  });

  it("returns empty string for invalid ISO", () => {
    expect(formatDateTime("not-a-date", "en-US")).toBe("");
  });

  it("formats a valid ISO timestamp for en-US", () => {
    const result = formatDateTime("2026-04-28T10:30:00Z", "en-US");
    expect(result).toBeTruthy();
    expect(result).toContain("04");
    expect(result).toContain("28");
    expect(result).toContain("2026");
  });

  it("formats a valid ISO timestamp for ja-JP", () => {
    const result = formatDateTime("2026-04-28T10:30:00Z", "ja-JP");
    expect(result).toBeTruthy();
    expect(result).toContain("2026");
    expect(result).toContain("04");
    expect(result).toContain("28");
  });

  it("formats a valid ISO timestamp for zh-CN", () => {
    const result = formatDateTime("2026-04-28T10:30:00Z", "zh-CN");
    expect(result).toBeTruthy();
    expect(result).toContain("2026");
  });

  it("handles date-only ISO strings", () => {
    const result = formatDateTime("2026-04-28", "en-US");
    expect(result).toBeTruthy();
    expect(result).toContain("2026");
  });
});
