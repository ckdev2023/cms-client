import { describe, it, expect } from "vitest";
import { formatDateTime, formatLocaleDateShort } from "./formatDateTime";

describe("formatDateTime", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(formatDateTime(null, "en-US")).toBe("");
    expect(formatDateTime(undefined, "en-US")).toBe("");
    expect(formatDateTime("", "en-US")).toBe("");
  });

  it("treats blank locale as runtime default for valid timestamps", () => {
    const result = formatDateTime("2026-04-28T10:30:00Z", "");
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("formats with runtime default when locale is omitted", () => {
    const result = formatDateTime("2026-04-28T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toMatch(/^\d{4}-\d{2}-\d{2}T/);
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

describe("formatLocaleDateShort", () => {
  it("returns em dash for null/undefined/empty", () => {
    expect(formatLocaleDateShort(null, "en-US")).toBe("—");
    expect(formatLocaleDateShort(undefined, "en-US")).toBe("—");
    expect(formatLocaleDateShort("", "en-US")).toBe("—");
  });

  it("formats date for en-US without CJK calendar tokens", () => {
    const result = formatLocaleDateShort("2026-05-11T00:00:00.000Z", "en-US");
    expect(result).toMatch(/May/i);
    expect(result).toContain("2026");
    expect(result).not.toMatch(/年/);
  });

  it("formats date for zh-CN with locale-appropriate numerics", () => {
    const result = formatLocaleDateShort("2026-05-11T00:00:00.000Z", "zh-CN");
    expect(result).toContain("2026");
    expect(result).toMatch(/5/);
  });
});
