import { describe, expect, it } from "vitest";
import type { DocumentListItem } from "../types";
import type { DocumentFileDto } from "./DocumentRepositoryTypes";
import {
  deriveActions,
  toCaseDetailItem,
  toCaseDetailItems,
  toDocumentListItem,
  toFileVersion,
  toFileVersions,
  type DetailItemEnrichment,
  type ReverseContext,
} from "./DocumentDetailItemAdapter";

// ─── Fixtures ────────────────────────────────────────────────────

const BASE_LIST_ITEM: DocumentListItem = {
  id: "doc-1",
  name: "護照写し",
  caseId: "case-1",
  caseName: "経管签新規",
  provider: "main_applicant",
  status: "pending",
  dueDate: "2026-05-10",
  dueDateLabel: "2026-05-10",
  lastReminderAt: null,
  lastReminderAtLabel: "—",
  relativePath: null,
  sharedExpiryRisk: false,
  referenceCount: 1,
};

const BASE_FILE_DTO: DocumentFileDto = {
  id: "file-1",
  requirementId: "doc-1",
  fileName: "passport.pdf",
  fileUrl: null,
  relativePath: "/cases/case-1/passport.pdf",
  fileKey: "abc",
  versionNo: 1,
  storageType: "local_server",
  reviewStatus: "pending",
  reviewBy: null,
  reviewAt: null,
  expiryDate: "2027-01-01",
  uploadedBy: "user-1",
  uploadedAt: "2026-04-20T10:00:00Z",
  createdAt: "2026-04-20T09:00:00Z",
};

// ─── deriveActions ───────────────────────────────────────────────

describe("deriveActions", () => {
  it("pending (no ctx, fallback to waiting_upload) → canRemind + canWaive + canRegister + canReference", () => {
    const a = deriveActions("pending");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(true);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(true);
    expect(a.canReference).toBe(true);
  });

  it("uploaded_reviewing → canApprove + canReject + canWaive", () => {
    const a = deriveActions("uploaded_reviewing");
    expect(a.canApprove).toBe(true);
    expect(a.canReject).toBe(true);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(false);
    expect(a.canReference).toBe(false);
  });

  it("approved → only canRegister for re-upload", () => {
    const a = deriveActions("approved");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(false);
    expect(a.canRegister).toBe(false);
    expect(a.canReference).toBe(false);
  });

  it("rejected (no ctx, fallback to revision_required) → canRemind + canWaive + canRegister + canReference", () => {
    const a = deriveActions("rejected");
    expect(a.canRemind).toBe(true);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(true);
    expect(a.canReference).toBe(true);
  });

  it("expired → canRegister + canReference, no canWaive", () => {
    const a = deriveActions("expired");
    expect(a.canRegister).toBe(true);
    expect(a.canReference).toBe(true);
    expect(a.canWaive).toBe(false);
    expect(a.canRemind).toBe(false);
  });

  it("waived → all false except potentially canRegister=false", () => {
    const a = deriveActions("waived");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(false);
    expect(a.canRegister).toBe(false);
    expect(a.canReference).toBe(false);
  });

  // ── Bug fix: align canRemind with server `followUp` guard ──
  it("pending + backendStatus=pending + category=standard → canRemind=false (server rejects)", () => {
    const a = deriveActions("pending", {
      backendStatus: "pending",
      category: "standard",
    });
    expect(a.canRemind).toBe(false);
  });

  it("pending + backendStatus=pending + category=questionnaire → canRemind=true (server allows)", () => {
    const a = deriveActions("pending", {
      backendStatus: "pending",
      category: "questionnaire",
    });
    expect(a.canRemind).toBe(true);
  });

  it("pending + backendStatus=waiting_upload → canRemind=true regardless of category", () => {
    expect(
      deriveActions("pending", {
        backendStatus: "waiting_upload",
        category: "standard",
      }).canRemind,
    ).toBe(true);
    expect(
      deriveActions("pending", {
        backendStatus: "waiting_upload",
      }).canRemind,
    ).toBe(true);
  });

  it("rejected + backendStatus=revision_required → canRemind=true", () => {
    const a = deriveActions("rejected", {
      backendStatus: "revision_required",
    });
    expect(a.canRemind).toBe(true);
  });
});

// ─── toCaseDetailItem ────────────────────────────────────────────

describe("toCaseDetailItem", () => {
  it("maps basic fields from DocumentListItem", () => {
    const result = toCaseDetailItem(BASE_LIST_ITEM);
    expect(result.name).toBe("護照写し");
    expect(result.status).toBe("pending");
    expect(result.statusLabelKey).toBe("documents.status.pending");
    expect(result.meta).toBe("2026-05-10 · 経管签新規");
    expect(result.relativePath).toBeNull();
    expect(result.referenceLabelKey).toBeNull();
    expect(result.referenceCount).toBe(1);
  });

  it("defaults versions/reviews/reminders to empty arrays", () => {
    const result = toCaseDetailItem(BASE_LIST_ITEM);
    expect(result.versions).toEqual([]);
    expect(result.reviews).toEqual([]);
    expect(result.reminders).toEqual([]);
  });

  it("injects enrichment data when provided", () => {
    const enrichment: DetailItemEnrichment = {
      versions: [
        {
          version: 1,
          fileName: "a.pdf",
          relativePath: "/a.pdf",
          registeredAt: "2026-04-20",
          storageType: "local_server",
          referenceSource: "本資料項登記",
        },
      ],
      reviews: [
        {
          conclusion: "approved",
          conclusionLabel: "承認",
          reason: null,
          reviewer: "田中",
          time: "2026-04-21",
        },
      ],
      reminders: [
        {
          time: "2026-04-19",
          method: "email",
          target: "client@example.com",
          operator: "佐藤",
        },
      ],
    };
    const result = toCaseDetailItem(BASE_LIST_ITEM, enrichment);
    expect(result.versions).toHaveLength(1);
    expect(result.reviews).toHaveLength(1);
    expect(result.reminders).toHaveLength(1);
  });

  it("populates actions based on status", () => {
    const result = toCaseDetailItem(BASE_LIST_ITEM);
    expect(result.actions?.canRemind).toBe(true);
    expect(result.actions?.canApprove).toBe(false);
  });

  it("threads backendStatus + category from list item, blocks canRemind for pending+standard", () => {
    const result = toCaseDetailItem({
      ...BASE_LIST_ITEM,
      backendStatus: "pending",
      category: "standard",
    });
    expect(result.actions?.canRemind).toBe(false);
    expect(result.backendStatus).toBe("pending");
    expect(result.category).toBe("standard");
  });

  it("allows canRemind when backendStatus=pending + category=questionnaire", () => {
    const result = toCaseDetailItem({
      ...BASE_LIST_ITEM,
      backendStatus: "pending",
      category: "questionnaire",
    });
    expect(result.actions?.canRemind).toBe(true);
  });

  it("allows canRemind when backendStatus=waiting_upload regardless of category", () => {
    const result = toCaseDetailItem({
      ...BASE_LIST_ITEM,
      backendStatus: "waiting_upload",
      category: "standard",
    });
    expect(result.actions?.canRemind).toBe(true);
  });

  it("builds referenceLabel when referenceCount > 1", () => {
    const item = { ...BASE_LIST_ITEM, referenceCount: 3 };
    const result = toCaseDetailItem(item);
    expect(result.referenceLabelKey).toBe("3 件で共有");
  });

  it("handles item without dueDate in meta", () => {
    const item = {
      ...BASE_LIST_ITEM,
      dueDate: null,
      dueDateLabel: "—",
    };
    const result = toCaseDetailItem(item);
    expect(result.meta).toBe("経管签新規");
  });
});

// ─── toCaseDetailItems (batch) ───────────────────────────────────

describe("toCaseDetailItems", () => {
  it("maps an array with optional enrichment map", () => {
    const items: DocumentListItem[] = [
      BASE_LIST_ITEM,
      { ...BASE_LIST_ITEM, id: "doc-2", name: "住民票", status: "approved" },
    ];
    const enrichMap = new Map<string, DetailItemEnrichment>([
      [
        "doc-1",
        {
          versions: [
            {
              version: 1,
              fileName: "p.pdf",
              relativePath: "/p.pdf",
              registeredAt: "2026-04-20",
              storageType: "local_server",
              referenceSource: "本資料項登記",
            },
          ],
        },
      ],
    ]);
    const result = toCaseDetailItems(items, enrichMap);
    expect(result).toHaveLength(2);
    expect(result[0].versions).toHaveLength(1);
    expect(result[1].versions).toHaveLength(0);
  });

  it("works without enrichment map", () => {
    const result = toCaseDetailItems([BASE_LIST_ITEM]);
    expect(result).toHaveLength(1);
    expect(result[0].versions).toEqual([]);
  });
});

// ─── toDocumentListItem (reverse) ────────────────────────────────

describe("toDocumentListItem", () => {
  it("maps case detail item back to list item with context", () => {
    const detailItem = toCaseDetailItem(BASE_LIST_ITEM);
    const ctx: ReverseContext = {
      id: "doc-1",
      caseId: "case-1",
      caseName: "経管签新規",
      dueDate: "2026-05-10",
    };
    const result = toDocumentListItem(detailItem, ctx);
    expect(result.id).toBe("doc-1");
    expect(result.name).toBe("護照写し");
    expect(result.caseId).toBe("case-1");
    expect(result.caseName).toBe("経管签新規");
    expect(result.status).toBe("pending");
    expect(result.dueDate).toBe("2026-05-10");
    expect(result.dueDateLabel).toBe("2026-05-10");
    expect(result.sharedExpiryRisk).toBe(false);
    expect(result.referenceCount).toBe(1);
  });

  it("resolves legacy status keys via LEGACY_STATUS_MAP", () => {
    const detailItem = toCaseDetailItem({
      ...BASE_LIST_ITEM,
      status: "uploaded_reviewing",
    });
    const result = toDocumentListItem(detailItem, {
      id: "x",
      caseId: "c",
      caseName: "n",
    });
    expect(result.status).toBe("uploaded_reviewing");
  });

  it("falls back when context fields are missing", () => {
    const detailItem = toCaseDetailItem(BASE_LIST_ITEM);
    const result = toDocumentListItem(detailItem, {
      id: "doc-1",
      caseId: "case-1",
      caseName: "test",
    });
    expect(result.dueDate).toBeNull();
    expect(result.dueDateLabel).toBe("—");
    expect(result.lastReminderAt).toBeNull();
    expect(result.lastReminderAtLabel).toBe("—");
  });
});

// ─── toFileVersion / toFileVersions ──────────────────────────────

describe("toFileVersion", () => {
  it("maps DocumentFileDto to DocumentFileVersion", () => {
    const v = toFileVersion(BASE_FILE_DTO);
    expect(v.version).toBe(1);
    expect(v.fileName).toBe("passport.pdf");
    expect(v.relativePath).toBe("/cases/case-1/passport.pdf");
    expect(v.registeredAt).toBe("2026-04-20T10:00:00Z");
    expect(v.storageType).toBe("local_server");
    expect(v.referenceSource).toBe("本資料項登記");
    expect(v.expiryDate).toBe("2027-01-01");
  });

  it("uses createdAt when uploadedAt is empty", () => {
    const dto = { ...BASE_FILE_DTO, uploadedAt: "" };
    const v = toFileVersion(dto);
    expect(v.registeredAt).toBe("2026-04-20T09:00:00Z");
  });

  it("sets referenceSource to cross-case hint when no relativePath", () => {
    const dto = { ...BASE_FILE_DTO, relativePath: null };
    const v = toFileVersion(dto);
    expect(v.referenceSource).toBe("引用自他案件");
    expect(v.relativePath).toBe("");
  });
});

describe("toFileVersions", () => {
  it("batch-maps an array of file DTOs", () => {
    const dtos = [
      BASE_FILE_DTO,
      { ...BASE_FILE_DTO, id: "file-2", versionNo: 2 },
    ];
    const result = toFileVersions(dtos);
    expect(result).toHaveLength(2);
    expect(result[0].version).toBe(1);
    expect(result[1].version).toBe(2);
  });

  it("returns empty array for empty input", () => {
    expect(toFileVersions([])).toEqual([]);
  });
});
