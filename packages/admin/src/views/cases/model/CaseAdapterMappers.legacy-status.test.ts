// ── Test Ownership ──────────────────────────────────────────────
// Owner: normalizeCaseStatus — legacy raw status code → i18n key
//   fallback (R-FLOW5-A-9).
// Does NOT test: list base/derived fields, detail aggregate,
//   StageChip rendering, or CaseTableRow template.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import { normalizeCaseStatus } from "./CaseAdapterMappers";

describe("normalizeCaseStatus", () => {
  it("mapsLegacyStatusValues", () => {
    expect(normalizeCaseStatus("prepare")).toBe(
      "cases.constants.caseStatuses.prepare",
    );
  });

  it("returns empty string for unknown status codes", () => {
    expect(normalizeCaseStatus("UNKNOWN")).toBe("");
    expect(normalizeCaseStatus("")).toBe("");
    expect(normalizeCaseStatus("random_value")).toBe("");
  });

  it("returns empty string for canonical BMV step codes", () => {
    expect(normalizeCaseStatus("UNDER_REVIEW")).toBe("");
    expect(normalizeCaseStatus("APPROVED")).toBe("");
    expect(normalizeCaseStatus("WAITING_MATERIAL")).toBe("");
  });

  it("is case-sensitive", () => {
    expect(normalizeCaseStatus("Prepare")).toBe("");
    expect(normalizeCaseStatus("PREPARE")).toBe("");
  });
});
