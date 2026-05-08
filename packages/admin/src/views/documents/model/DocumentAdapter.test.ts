import { describe, expect, it } from "vitest";
import {
  adaptDocumentItem,
  adaptDocumentItems,
  mapBackendStatus,
  mapOwnerSideToProvider,
  type DocumentItemDtoLike,
} from "./DocumentAdapter";

const NOW = new Date("2026-04-29T10:00:00Z");

const ROW: DocumentItemDtoLike = {
  id: "doc-1",
  caseId: "case-1",
  name: "护照写し",
  status: "pending",
  ownerSide: "applicant",
  dueAt: "2026-05-10T00:00:00Z",
  lastFollowUpAt: null,
};

describe("DocumentAdapter (BUG-079: API 接入)", () => {
  it("maps backend statuses to document center enum", () => {
    expect(mapBackendStatus("pending", null, NOW)).toBe("pending");
    expect(mapBackendStatus("waiting_upload", null, NOW)).toBe("pending");
    expect(mapBackendStatus("uploaded_reviewing", null, NOW)).toBe(
      "uploaded_reviewing",
    );
    expect(mapBackendStatus("revision_required", null, NOW)).toBe("rejected");
    expect(mapBackendStatus("approved", null, NOW)).toBe("approved");
    expect(mapBackendStatus("waived", null, NOW)).toBe("waived");
  });

  it("upgrades approved → expired when dueAt is past", () => {
    expect(mapBackendStatus("approved", "2026-04-01T00:00:00Z", NOW)).toBe(
      "expired",
    );
    expect(mapBackendStatus("approved", "2027-01-01T00:00:00Z", NOW)).toBe(
      "approved",
    );
  });

  it("falls back to pending when status is unknown", () => {
    expect(mapBackendStatus("totally_unknown", null, NOW)).toBe("pending");
  });

  it("maps owner_side to provider enum with sensible fallbacks", () => {
    expect(mapOwnerSideToProvider("applicant")).toBe("main_applicant");
    expect(mapOwnerSideToProvider("guarantor")).toBe("dependent_guarantor");
    expect(mapOwnerSideToProvider("employer")).toBe("employer_org");
    expect(mapOwnerSideToProvider("office")).toBe("office_internal");
    expect(mapOwnerSideToProvider("nonsense")).toBe("main_applicant");
  });

  it("adapts a backend row to a DocumentListItem with caseName lookup", () => {
    const caseLookup = (id: string) =>
      id === "case-1" ? "经管签新规" : undefined;
    const item = adaptDocumentItem(ROW, caseLookup, NOW);
    expect(item).toEqual({
      id: "doc-1",
      name: "护照写し",
      caseId: "case-1",
      caseName: "经管签新规",
      provider: "main_applicant",
      status: "pending",
      dueDate: "2026-05-10",
      dueDateLabel: "2026-05-10",
      lastReminderAt: null,
      lastReminderAtLabel: "—",
      relativePath: null,
      sharedExpiryRisk: false,
      referenceCount: 1,
      backendStatus: "pending",
      category: undefined,
      checklistItemCode: undefined,
    });
  });

  it("propagates checklistItemCode from backend row (W-6 / bug254)", () => {
    const item = adaptDocumentItem(
      { ...ROW, checklistItemCode: "fs-passport-copy" },
      () => undefined,
      NOW,
    );
    expect(item.checklistItemCode).toBe("fs-passport-copy");
  });

  it("preserves backend status and category when present (used by canRemind guard)", () => {
    const item = adaptDocumentItem(
      { ...ROW, status: "waiting_upload", category: "questionnaire" },
      () => "x",
      NOW,
    );
    expect(item.status).toBe("pending");
    expect(item.backendStatus).toBe("waiting_upload");
    expect(item.category).toBe("questionnaire");
  });

  it("falls back to caseId when caseName is missing", () => {
    const item = adaptDocumentItem(ROW, () => undefined, NOW);
    expect(item.caseName).toBe("case-1");
  });

  it("formats lastFollowUpAt to YYYY-MM-DD HH:mm", () => {
    const item = adaptDocumentItem(
      { ...ROW, lastFollowUpAt: "2026-04-20T07:25:11Z" },
      () => undefined,
      NOW,
    );
    expect(item.lastReminderAt).toBe("2026-04-20 07:25");
    expect(item.lastReminderAtLabel).toBe("2026-04-20 07:25");
  });

  it("derives sharedExpiryRisk=true when referenceCount>1 and status=expired", () => {
    const item = adaptDocumentItem(
      {
        ...ROW,
        status: "approved",
        dueAt: "2026-04-01T00:00:00Z",
        referenceCount: 3,
      },
      () => undefined,
      NOW,
    );
    expect(item.status).toBe("expired");
    expect(item.referenceCount).toBe(3);
    expect(item.sharedExpiryRisk).toBe(true);
  });

  it("derives sharedExpiryRisk=false when referenceCount=1 even if expired", () => {
    const item = adaptDocumentItem(
      { ...ROW, status: "approved", dueAt: "2026-04-01T00:00:00Z" },
      () => undefined,
      NOW,
    );
    expect(item.status).toBe("expired");
    expect(item.referenceCount).toBe(1);
    expect(item.sharedExpiryRisk).toBe(false);
  });

  it("uses referenceCount from backend when provided", () => {
    const item = adaptDocumentItem(
      { ...ROW, referenceCount: 5 },
      () => undefined,
      NOW,
    );
    expect(item.referenceCount).toBe(5);
  });

  it("filters out deleted rows in adaptDocumentItems", () => {
    const items = adaptDocumentItems(
      [ROW, { ...ROW, id: "doc-2", status: "deleted" }],
      () => undefined,
      NOW,
    );
    expect(items.map((i) => i.id)).toEqual(["doc-1"]);
  });
});
