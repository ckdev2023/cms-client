// ── Test Ownership ──────────────────────────────────────────────
// Owner: support seams for deadlines + support URL builders.
// Covers: document/review/billing/tasks/reminders URL builders and
//   adaptCaseDeadlineList mapping.
// Does NOT test: tasks focused counters, validation/billing detail tabs,
//   registry boundary, or composable refresh logic.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseDeadlineList,
  buildCaseBillingPlansUrl,
  buildCaseDocumentItemsUrl,
  buildCaseGeneratedDocumentsUrl,
  buildCasePaymentRecordsUrl,
  buildCaseRemindersUrl,
  buildCaseReviewRecordsUrl,
  buildCaseSubmissionPackagesUrl,
  buildCaseTasksUrl,
  buildCaseValidationRunsUrl,
} from "./CaseAdapterSupportSeams";

describe("URL builders", () => {
  it("buildCaseDocumentItemsUrl derives correct path", () => {
    expect(buildCaseDocumentItemsUrl("/api/cases", "case-001")).toBe(
      "/api/document-items?caseId=case-001",
    );
  });

  it("buildCaseDocumentItemsUrl encodes special characters", () => {
    expect(buildCaseDocumentItemsUrl("/api/cases", "c/a&b")).toBe(
      "/api/document-items?caseId=c%2Fa%26b",
    );
  });

  it("buildCaseGeneratedDocumentsUrl derives correct path", () => {
    expect(buildCaseGeneratedDocumentsUrl("/api/cases", "case-001")).toBe(
      "/api/generated-documents?caseId=case-001",
    );
  });

  it("buildCaseGeneratedDocumentsUrl handles trailing slash", () => {
    expect(buildCaseGeneratedDocumentsUrl("/api/cases/", "case-001")).toBe(
      "/api/generated-documents?caseId=case-001",
    );
  });
});

describe("URL builders (p0-fe-006b-02)", () => {
  it("buildCaseValidationRunsUrl derives correct path", () => {
    expect(buildCaseValidationRunsUrl("/api/cases", "case-001")).toBe(
      "/api/validation-runs?caseId=case-001",
    );
  });

  it("buildCaseReviewRecordsUrl derives correct path", () => {
    expect(buildCaseReviewRecordsUrl("/api/cases", "case-001")).toBe(
      "/api/review-records?caseId=case-001",
    );
  });

  it("buildCaseBillingPlansUrl derives correct path", () => {
    expect(buildCaseBillingPlansUrl("/api/cases", "case-001")).toBe(
      "/api/billing-plans?caseId=case-001",
    );
  });

  it("buildCasePaymentRecordsUrl derives correct path", () => {
    expect(buildCasePaymentRecordsUrl("/api/cases", "case-001")).toBe(
      "/api/payment-records?caseId=case-001",
    );
  });

  it("buildCaseSubmissionPackagesUrl derives correct path", () => {
    expect(buildCaseSubmissionPackagesUrl("/api/cases", "case-001")).toBe(
      "/api/submission-packages?caseId=case-001",
    );
  });

  it("URL builders encode special characters in caseId", () => {
    expect(buildCaseValidationRunsUrl("/api/cases", "c/a&b")).toBe(
      "/api/validation-runs?caseId=c%2Fa%26b",
    );
    expect(buildCaseBillingPlansUrl("/api/cases", "c/a&b")).toBe(
      "/api/billing-plans?caseId=c%2Fa%26b",
    );
  });

  it("URL builders handle trailing slash in apiPath", () => {
    expect(buildCaseSubmissionPackagesUrl("/api/cases/", "case-001")).toBe(
      "/api/submission-packages?caseId=case-001",
    );
    expect(buildCaseReviewRecordsUrl("/api/cases/", "case-001")).toBe(
      "/api/review-records?caseId=case-001",
    );
  });
});

describe("URL builders (p0-fe-006d-01)", () => {
  it("buildCaseTasksUrl derives correct path", () => {
    expect(buildCaseTasksUrl("/api/cases", "case-001")).toBe(
      "/api/tasks?caseId=case-001",
    );
  });

  it("buildCaseTasksUrl encodes special characters", () => {
    expect(buildCaseTasksUrl("/api/cases", "c/a&b")).toBe(
      "/api/tasks?caseId=c%2Fa%26b",
    );
  });

  it("buildCaseTasksUrl handles trailing slash", () => {
    expect(buildCaseTasksUrl("/api/cases/", "case-001")).toBe(
      "/api/tasks?caseId=case-001",
    );
  });
});

describe("adaptCaseDeadlineList", () => {
  const futureDate = (daysFromNow: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    return d.toISOString();
  };

  const reminderDto = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "rem-001",
    orgId: "org-001",
    caseId: "case-001",
    targetType: "case",
    targetId: "case-001",
    remindAt: futureDate(45),
    recipientType: "user",
    recipientId: "user-1",
    channel: "in_app",
    dedupeKey: null,
    sendStatus: "pending",
    retryCount: 0,
    sentAt: null,
    payloadSnapshot: { title: "申請書提出期限", description: "入管への提出" },
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseDeadlineList(null)).toBeNull();
    expect(adaptCaseDeadlineList(undefined)).toBeNull();
    expect(adaptCaseDeadlineList("string")).toBeNull();
    expect(adaptCaseDeadlineList(42)).toBeNull();
  });

  it("returns empty array for { items: [] }", () => {
    expect(adaptCaseDeadlineList({ items: [], total: 0 })).toEqual([]);
  });

  it("maps reminder with correct fields", () => {
    const result = adaptCaseDeadlineList({ items: [reminderDto()], total: 1 });
    expect(result).toHaveLength(1);
    const d = result![0];
    expect(d.id).toBe("rem-001");
    expect(d.title).toBe("申請書提出期限");
    expect(d.desc).toContain("入管への提出");
    expect(d.date).toBeTruthy();
    expect(d.remaining).toContain("あと");
    expect(d.severity).toBe("primary");
  });

  it("derives title from targetType when payloadSnapshot has no title", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          targetType: "billing_plan",
          payloadSnapshot: null,
        }),
      ],
    });
    expect(result![0].title).toBe("支払期限");
  });

  it("falls back to generic title when targetType is unknown and payload is null", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          targetType: "unknown_type",
          payloadSnapshot: null,
        }),
      ],
    });
    expect(result![0].title).toBe("期限");
  });

  it("derives severity danger for overdue reminders", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(-3) })],
    });
    expect(result![0].severity).toBe("danger");
    expect(result![0].remaining).toContain("超過");
  });

  it("derives severity danger for today", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: today.toISOString() })],
    });
    expect(result![0].severity).toBe("danger");
    expect(result![0].remaining).toBe("本日");
  });

  it("derives severity danger for ≤7 days", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(5) })],
    });
    expect(result![0].severity).toBe("danger");
  });

  it("derives severity warning for 8–30 days", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(15) })],
    });
    expect(result![0].severity).toBe("warning");
  });

  it("derives severity primary for 31–90 days", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(60) })],
    });
    expect(result![0].severity).toBe("primary");
  });

  it("derives severity muted for >90 days", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: futureDate(120) })],
    });
    expect(result![0].severity).toBe("muted");
  });

  it("includes sendStatus label in desc", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ sendStatus: "sent" })],
    });
    expect(result![0].desc).toContain("送信済み");
  });

  it("shows — for date when remindAt is null", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: null })],
    });
    expect(result![0].date).toBe("—");
    expect(result![0].severity).toBe("muted");
  });

  it("skips items with empty id", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ id: "" }), reminderDto({ id: "rem-002" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("rem-002");
  });

  it("accepts raw array input", () => {
    const result = adaptCaseDeadlineList([reminderDto()]);
    expect(result).toHaveLength(1);
  });

  it("maps all targetType titles", () => {
    const types = [
      { targetType: "case", expected: "案件期限" },
      { targetType: "customer", expected: "顧客関連期限" },
      { targetType: "requirement", expected: "資料提出期限" },
      { targetType: "deadline", expected: "手続き期限" },
      { targetType: "billing_plan", expected: "支払期限" },
    ];
    for (const { targetType, expected } of types) {
      const result = adaptCaseDeadlineList({
        items: [reminderDto({ targetType, payloadSnapshot: null })],
      });
      expect(result![0].title).toBe(expected);
    }
  });
});

describe("URL builders (p0-fe-006d-02)", () => {
  it("buildCaseRemindersUrl derives correct path", () => {
    expect(buildCaseRemindersUrl("/api/cases", "case-001")).toBe(
      "/api/reminders?caseId=case-001",
    );
  });

  it("buildCaseRemindersUrl encodes special characters", () => {
    expect(buildCaseRemindersUrl("/api/cases", "c/a&b")).toBe(
      "/api/reminders?caseId=c%2Fa%26b",
    );
  });

  it("buildCaseRemindersUrl handles trailing slash", () => {
    expect(buildCaseRemindersUrl("/api/cases/", "case-001")).toBe(
      "/api/reminders?caseId=case-001",
    );
  });
});
