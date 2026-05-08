import { describe, expect, it } from "vitest";
import { adaptCaseValidationData } from "./CaseAdapterValidationBilling";

function validationRun(overrides: Record<string, unknown> = {}) {
  return {
    id: "vr-001",
    executedAt: "2026-05-01T10:00:00.000Z",
    resultStatus: "failed",
    blockingCount: 0,
    warningCount: 0,
    reportPayload: null,
    ...overrides,
  };
}

describe("adaptCaseValidationData — synthetic items & fallback", () => {
  it("injects synthetic blocking item when blockingCount > 0 but report.blocking is empty", () => {
    const result = adaptCaseValidationData({
      items: [validationRun({ blockingCount: 3, reportPayload: {} })],
    });

    expect(result).not.toBeNull();
    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].titleKey).toBe(
      "cases.validation.blockingSummary",
    );
    expect(result!.blocking[0].titleParams).toEqual({ count: 3 });
    expect(result!.blocking[0].noteKey).toBe("cases.validation.refReport");
  });

  it("injects synthetic warning item when warningCount > 0 but report.warnings is empty", () => {
    const result = adaptCaseValidationData({
      items: [validationRun({ warningCount: 5, reportPayload: {} })],
    });

    expect(result).not.toBeNull();
    expect(result!.warnings).toHaveLength(1);
    expect(result!.warnings[0].titleKey).toBe(
      "cases.validation.warningSummary",
    );
    expect(result!.warnings[0].titleParams).toEqual({ count: 5 });
    expect(result!.warnings[0].noteKey).toBe("cases.validation.refReport");
  });

  it("does NOT inject synthetic item when report.blocking has real items", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          blockingCount: 1,
          reportPayload: {
            blocking: [{ title: "Missing doc", gate: "A" }],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("Missing doc");
    expect(result!.blocking[0].titleKey).toBeUndefined();
  });

  it("returns empty arrays when no report and counts are zero", () => {
    const result = adaptCaseValidationData({
      items: [validationRun({ blockingCount: 0, warningCount: 0 })],
    });

    expect(result!.blocking).toEqual([]);
    expect(result!.warnings).toEqual([]);
  });

  it("returns null for invalid input", () => {
    expect(adaptCaseValidationData(null)).toBeNull();
    expect(adaptCaseValidationData("bad")).toBeNull();
    expect(adaptCaseValidationData(42)).toBeNull();
  });

  it("returns empty result when items array is empty", () => {
    const result = adaptCaseValidationData({ items: [] });
    expect(result).toEqual({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    });
  });
});

describe("adaptCaseValidationData — adaptGateItemDto field fallback", () => {
  it("uses message as title when title/rule/code are all missing", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [{ message: "戸籍謄本が不足しています" }],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("戸籍謄本が不足しています");
  });

  it("uses description as title when title/rule/code/message are all missing", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [{ description: "申請書の署名欄が未記入" }],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("申請書の署名欄が未記入");
  });

  it("falls back message into note when primary title exists", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [
              {
                title: "書類不足",
                message: "戸籍謄本の提出が必要です",
              },
            ],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("書類不足");
    expect(result!.blocking[0].note).toBe("戸籍謄本の提出が必要です");
  });

  it("does NOT duplicate message into note when message is already the title", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [{ message: "書類不足" }],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("書類不足");
    expect(result!.blocking[0].note).toBeUndefined();
  });

  it("explicit note takes precedence over message fallback", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [
              {
                title: "書類不足",
                note: "至急対応してください",
                message: "戸籍謄本の提出が必要です",
              },
            ],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].note).toBe("至急対応してください");
  });

  it("drops items with no usable text at all", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [{ gate: "A" }, { title: "OK item" }],
          },
        }),
      ],
    });

    expect(result!.blocking).toHaveLength(1);
    expect(result!.blocking[0].title).toBe("OK item");
  });
});
