// ── Test Ownership ──────────────────────────────────────────────
// Owner: R33-B — formatDate zero-padded slash (YYYY/MM/DD)
// Locks: ISO → YYYY/MM/DD conversion with zero-padding.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { formatDate } from "./CaseAdapterShared";

describe("formatDate", () => {
  it("converts full ISO timestamp to YYYY/MM/DD", () => {
    expect(formatDate("2026-04-15T00:00:00.000Z")).toMatch(
      /^\d{4}\/\d{2}\/\d{2}$/,
    );
  });

  it("pads single-digit month and day with leading zeros", () => {
    const out = formatDate("2026-05-04T00:00:00.000Z");
    expect(out).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(out).not.toMatch(/\/\d\//);
  });

  it("handles end-of-year date", () => {
    const out = formatDate("2026-12-31T15:00:00.000Z");
    expect(out).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(out).not.toMatch(/\/\d\//);
  });

  it("converts ISO date-only string", () => {
    const out = formatDate("2026-01-09");
    expect(out).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
    expect(out).not.toMatch(/\/\d\//);
  });

  it("returns empty string for null", () => {
    expect(formatDate(null)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns empty string for invalid date string", () => {
    expect(formatDate("not-a-date")).toBe("");
  });

  it("never produces unpadded single-digit segments", () => {
    const dates = [
      "2026-01-01T00:00:00.000Z",
      "2026-02-03T12:00:00.000Z",
      "2026-09-08T23:59:59.000Z",
      "2026-11-30T00:00:00.000Z",
    ];
    for (const iso of dates) {
      const out = formatDate(iso);
      expect(out).toMatch(/^\d{4}\/\d{2}\/\d{2}$/);
      expect(out).not.toMatch(/\/\d\//);
    }
  });
});
