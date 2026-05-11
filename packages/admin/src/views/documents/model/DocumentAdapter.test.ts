import { describe, expect, it } from "vitest";
import {
  adaptDocumentItem,
  adaptDocumentItems,
  mapBackendStatus,
  mapOwnerSideToProvider,
  resolveProvider,
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
    expect(mapOwnerSideToProvider("supporter")).toBe("dependent_guarantor");
    expect(mapOwnerSideToProvider("customer")).toBe("dependent_guarantor");
    expect(mapOwnerSideToProvider("employer")).toBe("employer_org");
    expect(mapOwnerSideToProvider("office")).toBe("office_internal");
    expect(mapOwnerSideToProvider("nonsense")).toBe("main_applicant");
  });

  it("resolveProvider prefers providedByRole over ownerSide (NEW-V10-1: 详情列表分组与顶部完成率卡一致)", () => {
    expect(resolveProvider("applicant", "applicant")).toBe("main_applicant");
    expect(resolveProvider("supporter", "customer")).toBe(
      "dependent_guarantor",
    );
    expect(resolveProvider("office", "office")).toBe("office_internal");
    expect(resolveProvider("employer", "employer")).toBe("employer_org");
  });

  it("resolveProvider maps misclassified BMV company items away from dependent bucket", () => {
    expect(
      resolveProvider("supporter", "customer", "bmv-company-registry"),
    ).toBe("employer_org");
    expect(resolveProvider(null, "customer", "bmv-office-lease")).toBe(
      "employer_org",
    );
    expect(
      resolveProvider("employer", "customer", "bmv-financial-statement"),
    ).toBe("employer_org");
  });

  it("resolveProvider falls back to ownerSide when providedByRole is null/empty/unknown (向后兼容旧数据)", () => {
    expect(resolveProvider(null, "applicant")).toBe("main_applicant");
    expect(resolveProvider(undefined, "customer")).toBe("dependent_guarantor");
    expect(resolveProvider("", "office")).toBe("office_internal");
    expect(resolveProvider("totally-unknown", "applicant")).toBe(
      "main_applicant",
    );
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
      referenceCount: 0,
      backendStatus: "pending",
      category: undefined,
      checklistItemCode: undefined,
    });
  });

  it("uses providedByRole=supporter to bucket dependent_guarantor (NEW-V10-1 修复)", () => {
    const item = adaptDocumentItem(
      { ...ROW, ownerSide: "customer", providedByRole: "supporter" },
      () => undefined,
      NOW,
    );
    expect(item.provider).toBe("dependent_guarantor");
  });

  it("BMV checklist codes mis-tagged supporter bucket employer_org (058 backfill quirk)", () => {
    const item = adaptDocumentItem(
      {
        ...ROW,
        ownerSide: "customer",
        providedByRole: "supporter",
        checklistItemCode: "bmv-capital-proof",
      },
      () => undefined,
      NOW,
    );
    expect(item.provider).toBe("employer_org");
  });

  it("falls back to ownerSide when providedByRole is null (legacy 数据 / 058 迁移前)", () => {
    const item = adaptDocumentItem(
      { ...ROW, ownerSide: "office", providedByRole: null },
      () => undefined,
      NOW,
    );
    expect(item.provider).toBe("office_internal");
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

  it("derives sharedExpiryRisk=false when referenceCount defaults to 0 even if expired", () => {
    const item = adaptDocumentItem(
      { ...ROW, status: "approved", dueAt: "2026-04-01T00:00:00Z" },
      () => undefined,
      NOW,
    );
    expect(item.status).toBe("expired");
    expect(item.referenceCount).toBe(0);
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
