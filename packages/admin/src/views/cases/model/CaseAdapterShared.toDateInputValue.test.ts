// ── Test Ownership ──────────────────────────────────────────────
// Owner: R30-K — toDateInputValue helper
// Locks: ISO → YYYY-MM-DD conversion for HTML date input.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { toDateInputValue } from "./CaseAdapterShared";

describe("toDateInputValue", () => {
  it("converts full ISO timestamp to YYYY-MM-DD", () => {
    expect(toDateInputValue("2026-04-15T00:00:00.000Z")).toBe("2026-04-15");
  });

  it("converts ISO date-only string", () => {
    expect(toDateInputValue("2026-09-01")).toBe("2026-09-01");
  });

  it("pads single-digit month and day", () => {
    expect(toDateInputValue("2026-01-05T12:30:00.000Z")).toBe("2026-01-05");
  });

  it("returns empty string for null", () => {
    expect(toDateInputValue(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(toDateInputValue("")).toBe("");
  });

  it("returns empty string for invalid date", () => {
    expect(toDateInputValue("not-a-date")).toBe("");
  });

  it("uses UTC to avoid timezone shifts", () => {
    const result = toDateInputValue("2026-06-30T23:59:59.999Z");
    expect(result).toBe("2026-06-30");
  });
});
