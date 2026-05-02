import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { computeOverdueDays, formatDueDate } from "./BillingAdapters";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(Date.UTC(2026, 3, 20, 3, 0, 0)));
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── formatDueDate ──────────────────────────────────────────────

describe("formatDueDate (TZ-independent)", () => {
  it("formats YYYY-MM-DD date string as ja-JP style slash format", () => {
    expect(formatDueDate("2026-04-15")).toBe("2026/4/15");
  });

  it("handles single-digit month and day", () => {
    expect(formatDueDate("2026-01-05")).toBe("2026/1/5");
  });

  it("handles full ISO timestamp by slicing to date part", () => {
    expect(formatDueDate("2026-04-15T00:00:00Z")).toBe("2026/4/15");
  });

  it("returns empty string for null", () => {
    expect(formatDueDate(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDueDate("")).toBe("");
  });

  it("returns empty string for malformed input", () => {
    expect(formatDueDate("not-a-date")).toBe("");
  });
});

// ─── computeOverdueDays ─────────────────────────────────────────

describe("computeOverdueDays (TZ-independent)", () => {
  it("returns positive day count for overdue date", () => {
    expect(computeOverdueDays("2026-04-15")).toBe(5);
  });

  it("returns undefined when due date is today (not yet overdue)", () => {
    expect(computeOverdueDays("2026-04-20")).toBeUndefined();
  });

  it("returns undefined when due date is in the future", () => {
    expect(computeOverdueDays("2026-05-01")).toBeUndefined();
  });

  it("handles full ISO timestamp by slicing to date part", () => {
    expect(computeOverdueDays("2026-04-15T00:00:00Z")).toBe(5);
  });

  it("returns undefined for null", () => {
    expect(computeOverdueDays(null)).toBeUndefined();
  });

  it("returns undefined for malformed input", () => {
    expect(computeOverdueDays("bad")).toBeUndefined();
  });

  it("returns 1 for yesterday", () => {
    expect(computeOverdueDays("2026-04-19")).toBe(1);
  });
});
