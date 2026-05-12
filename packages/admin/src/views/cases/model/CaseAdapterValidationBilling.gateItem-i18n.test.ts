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

describe("adaptGateItemDto — titleKey / messageKey i18n path", () => {
  it("uses titleKey and messageKey when present, title becomes empty string", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [
              {
                code: "generated_documents_present",
                titleKey:
                  "cases.validation.checks.generated_documents_present.title",
                messageKey:
                  "cases.validation.checks.generated_documents_present.message",
                message: "At least one generated document is required",
                severity: "blocking",
                passed: false,
              },
            ],
          },
        }),
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.blocking).toHaveLength(1);
    const item = result!.blocking[0];
    expect(item.title).toBe("");
    expect(item.titleKey).toBe(
      "cases.validation.checks.generated_documents_present.title",
    );
    expect(item.noteKey).toBe(
      "cases.validation.checks.generated_documents_present.message",
    );
    expect(item.note).toBeUndefined();
  });

  it("falls back to code/message chain when titleKey is absent", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            blocking: [
              {
                code: "generated_documents_finalized",
                message: "All generated documents must be final",
                severity: "blocking",
                passed: false,
              },
            ],
          },
        }),
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.blocking).toHaveLength(1);
    const item = result!.blocking[0];
    expect(item.title).toBe("generated_documents_finalized");
    expect(item.titleKey).toBeUndefined();
    expect(item.note).toBe("All generated documents must be final");
    expect(item.noteKey).toBeUndefined();
  });

  it("sets noteKey from messageKey even when titleKey makes title empty", () => {
    const result = adaptCaseValidationData({
      items: [
        validationRun({
          reportPayload: {
            info: [
              {
                code: "generated_documents_present",
                titleKey:
                  "cases.validation.checks.generated_documents_present.title",
                messageKey:
                  "cases.validation.checks.generated_documents_present.message",
                message: "At least one generated document exists",
                severity: "blocking",
                passed: true,
              },
            ],
          },
        }),
      ],
    });

    expect(result).not.toBeNull();
    expect(result!.info).toHaveLength(1);
    const item = result!.info[0];
    expect(item.titleKey).toBe(
      "cases.validation.checks.generated_documents_present.okTitle",
    );
    expect(item.noteKey).toBe(
      "cases.validation.checks.generated_documents_present.okMessage",
    );
  });
});
