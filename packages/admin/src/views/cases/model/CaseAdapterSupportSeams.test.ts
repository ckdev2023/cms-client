// ── Test Ownership ──────────────────────────────────────────────
// Owner: placeholder adapter seams for support modules (documents,
//   forms, validation, billing, tasks, deadlines).
// Does NOT test: list/detail adapters, write builders, repository,
//   or composable logic.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseBillingData,
  adaptCaseDeadlineList,
  adaptCaseDocumentGroups,
  adaptCaseDoubleReviewEntries,
  adaptCaseFormsData,
  adaptCaseSubmissionPackages,
  adaptCaseTaskList,
  adaptCaseValidationData,
} from "./CaseAdapterSupportSeams";

describe("CaseAdapterSupportSeams", () => {
  it("adaptCaseDocumentGroups returns null (seam placeholder)", () => {
    expect(adaptCaseDocumentGroups({ items: [] })).toBeNull();
    expect(adaptCaseDocumentGroups(null)).toBeNull();
  });

  it("adaptCaseFormsData returns null (seam placeholder)", () => {
    expect(adaptCaseFormsData({ templates: [], generated: [] })).toBeNull();
    expect(adaptCaseFormsData(undefined)).toBeNull();
  });

  it("adaptCaseValidationData returns null (seam placeholder)", () => {
    expect(adaptCaseValidationData({ lastTime: "" })).toBeNull();
  });

  it("adaptCaseBillingData returns null (seam placeholder)", () => {
    expect(adaptCaseBillingData({ total: "¥0" })).toBeNull();
  });

  it("adaptCaseTaskList returns null (seam placeholder)", () => {
    expect(adaptCaseTaskList([])).toBeNull();
  });

  it("adaptCaseDeadlineList returns null (seam placeholder)", () => {
    expect(adaptCaseDeadlineList([])).toBeNull();
  });

  it("adaptCaseSubmissionPackages returns null (seam placeholder)", () => {
    expect(adaptCaseSubmissionPackages([])).toBeNull();
  });

  it("adaptCaseDoubleReviewEntries returns null (seam placeholder)", () => {
    expect(adaptCaseDoubleReviewEntries([])).toBeNull();
  });
});
