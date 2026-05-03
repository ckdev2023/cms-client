import { describe, it, expect } from "vitest";
import { adaptCaseLogDto } from "./CaseCommsLogsAdapter";
import type { LogEntry } from "../types-detail";

function makeTimelineDto(
  action: string,
  payload: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: `log-${action}`,
    action,
    createdAt: "2026-05-01T10:00:00Z",
    actorDisplayName: "Tanaka",
    payload,
  };
}

describe("BUG-219: adapter produces i18n keys for all known event types", () => {
  const BUILDER_ACTIONS: {
    action: string;
    payload?: Record<string, unknown>;
    expectedKey: string;
  }[] = [
    {
      action: "case_party.created",
      payload: { partyName: "Alice" },
      expectedKey: "cases.log.timeline.casePartyCreated",
    },
    {
      action: "case_party.updated",
      expectedKey: "cases.log.timeline.casePartyUpdated",
    },
    {
      action: "case_party.deleted",
      expectedKey: "cases.log.timeline.casePartyDeleted",
    },
    {
      action: "document_item.created",
      payload: { itemName: "Passport" },
      expectedKey: "cases.log.timeline.documentItemCreated",
    },
    {
      action: "document_item.updated",
      expectedKey: "cases.log.timeline.documentItemUpdated",
    },
    {
      action: "document_file.created",
      payload: { fileName: "scan.pdf" },
      expectedKey: "cases.log.timeline.documentFileCreated",
    },
    {
      action: "document_file.updated",
      expectedKey: "cases.log.timeline.documentFileUpdated",
    },
    {
      action: "task.created",
      payload: { title: "Review docs" },
      expectedKey: "cases.log.timeline.taskCreated",
    },
    { action: "task.updated", expectedKey: "cases.log.timeline.taskUpdated" },
    {
      action: "task.completed",
      expectedKey: "cases.log.timeline.taskCompleted",
    },
    {
      action: "billing_record.created",
      payload: { amount: "¥50,000" },
      expectedKey: "cases.log.timeline.billingRecordCreated",
    },
    {
      action: "billing_record.updated",
      expectedKey: "cases.log.timeline.billingRecordUpdated",
    },
    {
      action: "payment_record.created",
      payload: { amount: "¥30,000" },
      expectedKey: "cases.log.timeline.paymentRecordCreated",
    },
    {
      action: "payment_record.updated",
      expectedKey: "cases.log.timeline.paymentRecordUpdated",
    },
    {
      action: "review_record.created",
      expectedKey: "cases.log.timeline.reviewRecordCreated",
    },
    {
      action: "review_record.approved",
      expectedKey: "cases.log.timeline.reviewRecordApproved",
    },
    {
      action: "review_record.rejected",
      payload: { reason: "Missing info" },
      expectedKey: "cases.log.timeline.reviewRecordRejected",
    },
    {
      action: "validation_run.created",
      expectedKey: "cases.log.timeline.validationRunCreated",
    },
    {
      action: "validation_run.passed",
      expectedKey: "cases.log.timeline.validationRunPassed",
    },
    {
      action: "validation_run.failed",
      expectedKey: "cases.log.timeline.validationRunFailed",
    },
    {
      action: "submission_package.created",
      expectedKey: "cases.log.timeline.submissionPackageCreated",
    },
    {
      action: "submission_package.updated",
      expectedKey: "cases.log.timeline.submissionPackageUpdated",
    },
    {
      action: "generated_document.created",
      payload: { title: "申請書" },
      expectedKey: "cases.log.timeline.generatedDocumentCreated",
    },
    {
      action: "reminder.created",
      payload: { label: "180日前" },
      expectedKey: "cases.log.timeline.reminderCreated",
    },
  ];

  for (const { action, payload, expectedKey } of BUILDER_ACTIONS) {
    it(`${action} → key=${expectedKey}`, () => {
      const result = adaptCaseLogDto(
        makeTimelineDto(action, payload),
      ) as LogEntry;
      expect(result).not.toBeNull();
      expect(result.text).toBe(expectedKey);
    });
  }

  it("unregistered action gets a fallback i18n key with fallback param", () => {
    const result = adaptCaseLogDto(
      makeTimelineDto("custom_entity.some_action"),
    ) as LogEntry;
    expect(result).not.toBeNull();
    expect(result.text).toBe("cases.log.timeline.custom_entity_some_action");
    expect(result.textParams).toHaveProperty(
      "fallback",
      "custom_entity.some_action",
    );
  });
});

describe("BUG-220: case.created includes suffixKey for caseTypeCode translation", () => {
  it("produces suffixKey from caseTypeCode payload field", () => {
    const result = adaptCaseLogDto(
      makeTimelineDto("case.created", { caseTypeCode: "biz_mgmt_cert_4m" }),
    ) as LogEntry;
    expect(result).not.toBeNull();
    expect(result.text).toBe("cases.log.timeline.caseCreated");
    expect(result.textParams).toHaveProperty("suffix", "biz_mgmt_cert_4m");
    expect(result.textParams).toHaveProperty(
      "suffixKey",
      "cases.constants.caseTypes.biz_mgmt_cert_4m",
    );
  });

  it("produces suffixKey from case_type_code (snake_case) payload field", () => {
    const result = adaptCaseLogDto(
      makeTimelineDto("case.created", { case_type_code: "family" }),
    ) as LogEntry;
    expect(result).not.toBeNull();
    expect(result.textParams).toHaveProperty("suffix", "family");
    expect(result.textParams).toHaveProperty(
      "suffixKey",
      "cases.constants.caseTypes.family",
    );
  });

  it("produces empty suffixKey when caseTypeCode is missing", () => {
    const result = adaptCaseLogDto(
      makeTimelineDto("case.created", {}),
    ) as LogEntry;
    expect(result).not.toBeNull();
    expect(result.textParams).toHaveProperty("suffix", "");
    expect(result.textParams).toHaveProperty("suffixKey", "");
  });
});
