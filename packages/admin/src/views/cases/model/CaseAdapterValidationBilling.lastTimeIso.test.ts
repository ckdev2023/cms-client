import { describe, expect, it } from "vitest";
import { adaptCaseValidationData } from "./CaseAdapterValidationBilling";

function validationRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "vr-001",
    executedAt: "2026-05-01T10:00:00.000Z",
    resultStatus: "passed",
    blockingCount: 0,
    warningCount: 0,
    reportPayload: null,
    ...overrides,
  };
}

describe("adaptCaseValidationData — lastTimeIso", () => {
  it("lastTimeIso equals executedAt from the latest run", () => {
    const result = adaptCaseValidationData({
      items: [validationRun({ executedAt: "2026-05-01T10:00:00.000Z" })],
    });

    expect(result).not.toBeNull();
    expect(result!.lastTimeIso).toBe("2026-05-01T10:00:00.000Z");
  });

  it("lastTimeIso picks the latest executedAt when multiple runs exist", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({ executedAt: "2026-04-01T08:00:00.000Z" }),
        validationRun({ executedAt: "2026-05-10T14:30:00.000Z" }),
        validationRun({ executedAt: "2026-03-15T12:00:00.000Z" }),
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.lastTimeIso).toBe("2026-05-10T14:30:00.000Z");
  });

  it("lastTimeIso is empty string when executedAt is null", () => {
    const result = adaptCaseValidationData({
      items: [validationRun({ executedAt: null })],
    });

    expect(result).not.toBeNull();
    expect(result!.lastTimeIso).toBe("");
  });

  it("lastTimeIso is empty string when items array is empty (no runs)", () => {
    const result = adaptCaseValidationData({ items: [] });

    expect(result).not.toBeNull();
    expect(result!.lastTimeIso).toBe("");
  });
});
