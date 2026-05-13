/* eslint-disable max-lines */
// Owner: p0-fe-006b-03 — documents/forms/submission/review tabs focused tests
import { describe, expect, it } from "vitest";
import {
  adaptCaseDocumentGroups,
  adaptCaseFormsData,
  adaptCaseSubmissionPackages,
  adaptCaseDoubleReviewEntries,
} from "./CaseAdapterSupportSeams";

const docItem = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "di-f01",
  name: "パスポート写し",
  status: "pending",
  ownerSide: "applicant",
  checklistItemCode: "DOC-001",
  dueAt: null,
  ...o,
});

const genDoc = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "gd-f01",
  caseId: "case-f01",
  templateId: null,
  title: "在留資格認定証明書",
  versionNo: 1,
  outputFormat: "pdf",
  fileUrl: null,
  status: "draft",
  generatedBy: "user-1",
  generatedByDisplayName: "担当太郎",
  approvedBy: null,
  approvedByDisplayName: null,
  generatedAt: "2026-04-10T00:00:00.000Z",
  approvedAt: null,
  ...o,
});

describe("documents tab empty state (p0-fe-006b-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseDocumentGroups(null)).toBeNull();
    expect(adaptCaseDocumentGroups(undefined)).toBeNull();
  });

  it("empty items list → no groups rendered (empty array)", () => {
    const result = adaptCaseDocumentGroups({ items: [], total: 0 });
    expect(result).toEqual([]);
  });

  it("all items with invalid name → empty groups (nothing to render)", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ name: "" }), docItem({ name: "" })],
    });
    expect(result).toEqual([]);
  });

  it("non-object items in array are silently skipped", () => {
    const result = adaptCaseDocumentGroups({
      items: [null, 42, "invalid", docItem()],
    });
    expect(result).toHaveLength(1);
    expect(result![0].items).toHaveLength(1);
  });
});

describe("documents tab summary display (p0-fe-006b-03)", () => {
  it("group label uses Japanese provider name", () => {
    const result = adaptCaseDocumentGroups({
      items: [
        docItem({ ownerSide: "applicant" }),
        docItem({ ownerSide: "customer", name: "住民票" }),
        docItem({ ownerSide: "office", name: "申請書" }),
      ],
    })!;
    const groups = result.map((g) => g.group);
    expect(groups).toContain("申請者提供");
    expect(groups).toContain("顧客提供");
    expect(groups).toContain("事務所準備");
  });

  it("group count shows item count with 件 suffix", () => {
    const result = adaptCaseDocumentGroups({
      items: [
        docItem({ ownerSide: "applicant" }),
        docItem({ ownerSide: "applicant", name: "住民票" }),
        docItem({ ownerSide: "applicant", name: "写真" }),
      ],
    })!;
    expect(result).toHaveLength(1);
    expect(result[0].count).toBe("3 件");
  });

  it("statusLabelKey maps all known statuses to i18n keys", () => {
    const statusMap: Record<string, string> = {
      pending: "cases.detail.documents.docStatus.pending",
      waiting_upload: "cases.detail.documents.docStatus.waitingUpload",
      uploaded_reviewing: "cases.detail.documents.docStatus.uploadedReviewing",
      approved: "cases.detail.documents.docStatus.approved",
      revision_required: "cases.detail.documents.docStatus.revisionRequired",
      waived: "cases.detail.documents.docStatus.waived",
      expired: "cases.detail.documents.docStatus.expired",
    };
    for (const [status, label] of Object.entries(statusMap)) {
      const result = adaptCaseDocumentGroups({
        items: [docItem({ status })],
      })!;
      expect(result[0].items[0].statusLabelKey).toBe(label);
    }
  });

  it("unknown status falls back to unknown i18n key", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ status: "custom_status" })],
    })!;
    expect(result[0].items[0].statusLabelKey).toBe(
      "cases.detail.documents.docStatus.unknown",
    );
  });

  it("meta does not expose checklistItemCode (internal slug)", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ checklistItemCode: "REQ-A3" })],
    })!;
    expect(result[0].items[0].meta).not.toContain("REQ-A3");
    expect(result[0].items[0].meta).toBe("");
  });

  it("meta includes 期限 when dueAt is set", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ dueAt: "2026-06-15T00:00:00.000Z" })],
    })!;
    expect(result[0].items[0].meta).toContain("期限:");
  });

  it("meta is empty when both checklistItemCode and dueAt are missing", () => {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ checklistItemCode: "", dueAt: null })],
    })!;
    expect(result[0].items[0].meta).toBe("");
  });
});

describe("documents tab action button gates (p0-fe-006b-03)", () => {
  function actionsForStatus(
    status: string,
    extra: Record<string, unknown> = {},
  ) {
    const result = adaptCaseDocumentGroups({
      items: [docItem({ status, ...extra })],
    })!;
    return result[0].items[0].actions!;
  }

  // pending+standard / pending+questionnaire follow-up gate scenarios:
  // see CaseAdapterSupportSeams.followup-guard.test.ts

  it("waiting_upload: canRemind + canWaive + canRegister, no approve/reject", () => {
    const a = actionsForStatus("waiting_upload");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(true);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(true);
  });

  it("uploaded_reviewing: canApprove + canReject only, no canWaive (backend rejects)", () => {
    const a = actionsForStatus("uploaded_reviewing");
    expect(a.canApprove).toBe(true);
    expect(a.canReject).toBe(true);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(false);
    expect(a.canRegister).toBe(false);
  });

  it("approved: canWaive only (backend allows waive from approved)", () => {
    const a = actionsForStatus("approved");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(false);
  });

  it("waived/unknown: all gates closed", () => {
    for (const status of ["waived", "unknown_status"]) {
      const a = actionsForStatus(status);
      expect(a.canApprove).toBe(false);
      expect(a.canReject).toBe(false);
      expect(a.canRemind).toBe(false);
      expect(a.canWaive).toBe(false);
      expect(a.canRegister).toBe(false);
    }
  });

  it("expired: canWaive only (backend allows waive from expired)", () => {
    const a = actionsForStatus("expired");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(false);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(false);
  });

  it("revision_required: canRemind + canRegister + canWaive (backend allows waive from revision_required)", () => {
    const a = actionsForStatus("revision_required");
    expect(a.canApprove).toBe(false);
    expect(a.canReject).toBe(false);
    expect(a.canRemind).toBe(true);
    expect(a.canWaive).toBe(true);
    expect(a.canRegister).toBe(true);
  });
});

describe("forms tab empty state (p0-fe-006b-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseFormsData(null)).toBeNull();
    expect(adaptCaseFormsData(undefined)).toBeNull();
  });

  it("empty items → templates and generated both empty", () => {
    const result = adaptCaseFormsData({ items: [], total: 0 })!;
    expect(result.templates).toEqual([]);
    expect(result.generated).toEqual([]);
  });

  it("all items with blank title → generated empty", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ title: "" }), genDoc({ title: "" })],
    })!;
    expect(result.generated).toEqual([]);
  });
});

// ─── Forms tab — summary display ────────────────────────────────

describe("forms tab summary display (p0-fe-006b-03)", () => {
  it("generated doc meta includes format/version/author/date", () => {
    const result = adaptCaseFormsData({ items: [genDoc()] })!;
    const g = result.generated[0];
    expect(g.meta).toContain("PDF");
    expect(g.meta).toContain("v1");
    expect(g.meta).toContain("担当太郎");
    expect(g.meta).toContain("2026");
  });

  it("meta omits missing optional parts", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          outputFormat: "",
          versionNo: 0,
          generatedByDisplayName: null,
          generatedAt: null,
        }),
      ],
    })!;
    expect(result.generated[0].meta).toBe("");
  });

  it("tone maps draft → muted, final → success, exported → primary", () => {
    const toneMap: Record<string, string> = {
      draft: "muted",
      final: "success",
      exported: "primary",
    };
    for (const [status, tone] of Object.entries(toneMap)) {
      const result = adaptCaseFormsData({ items: [genDoc({ status })] })!;
      expect(result.generated[0].tone).toBe(tone);
    }
  });

  it("unknown status tone falls back to muted", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ status: "unknown" })],
    })!;
    expect(result.generated[0].tone).toBe("muted");
  });

  it("backendStatus maps known statuses correctly", () => {
    const statusMap: Record<string, string> = {
      draft: "draft",
      final: "final",
      exported: "exported",
    };
    for (const [status, expected] of Object.entries(statusMap)) {
      const result = adaptCaseFormsData({ items: [genDoc({ status })] })!;
      expect(result.generated[0].backendStatus).toBe(expected);
    }
  });

  it("P0 constraint: templates always empty regardless of input", () => {
    const result = adaptCaseFormsData({
      items: [genDoc(), genDoc({ title: "別紙" })],
    })!;
    expect(result.templates).toEqual([]);
    expect(result.generated).toHaveLength(2);
  });

  it("multiple generated docs preserve insertion order", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({ title: "書類A" }),
        genDoc({ title: "書類B" }),
        genDoc({ title: "書類C" }),
      ],
    })!;
    expect(result.generated.map((g) => g.name)).toEqual([
      "書類A",
      "書類B",
      "書類C",
    ]);
  });

  it("fileUrl exposed as-is; null preserved", () => {
    const real = adaptCaseFormsData({
      items: [genDoc({ fileUrl: "https://cdn.example.com/doc.pdf" })],
    })!;
    expect(real.generated[0].fileUrl).toBe("https://cdn.example.com/doc.pdf");

    const nil = adaptCaseFormsData({ items: [genDoc({ fileUrl: null })] })!;
    expect(nil.generated[0].fileUrl).toBeNull();
  });

  it("placeholder:// URL → fileUrlIsPlaceholder=true", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ fileUrl: "placeholder://gen-doc-001/output.pdf" })],
    })!;
    expect(result.generated[0].fileUrlIsPlaceholder).toBe(true);
    expect(result.generated[0].fileUrl).toBe(
      "placeholder://gen-doc-001/output.pdf",
    );
  });

  it("real URL → fileUrlIsPlaceholder=false", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ fileUrl: "https://cdn.example.com/doc.pdf" })],
    })!;
    expect(result.generated[0].fileUrlIsPlaceholder).toBe(false);
  });

  it("null fileUrl → fileUrlIsPlaceholder=false", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ fileUrl: null })],
    })!;
    expect(result.generated[0].fileUrlIsPlaceholder).toBe(false);
  });

  it("status='exported' + 真实 fileUrl → downloadUrl 指向 server 流式接口", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          id: "gd-down-01",
          status: "exported",
          fileUrl: "generated-documents/org-1/gd-down-01/v1.docx",
        }),
      ],
    })!;
    expect(result.generated[0].downloadUrl).toBe(
      "/api/generated-documents/gd-down-01/file",
    );
  });

  it("status='draft' 即使有 fileUrl 也不暴露 downloadUrl", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "draft",
          fileUrl: "generated-documents/org-1/gd-f01/v1.docx",
        }),
      ],
    })!;
    expect(result.generated[0].downloadUrl).toBeNull();
  });

  it("placeholder:// fileUrl 时 downloadUrl=null（避免 410 死链）", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "exported",
          fileUrl: "placeholder://gd-f01.pdf",
        }),
      ],
    })!;
    expect(result.generated[0].downloadUrl).toBeNull();
    expect(result.generated[0].fileUrlIsPlaceholder).toBe(true);
  });

  it("null fileUrl → downloadUrl=null", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ status: "exported", fileUrl: null })],
    })!;
    expect(result.generated[0].downloadUrl).toBeNull();
  });

  it("status='final' + http(s) fileUrl → resourceOpenUrl 为外链", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "final",
          fileUrl: "https://drive.google.com/doc-1",
        }),
      ],
    })!;
    expect(result.generated[0].resourceOpenUrl).toBe(
      "https://drive.google.com/doc-1",
    );
    expect(result.generated[0].downloadUrl).toBeNull();
  });

  it("status='exported' + http(s) fileUrl → resourceOpenUrl 为外链, downloadUrl=null", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "exported",
          fileUrl: "https://example.com/doc.pdf",
        }),
      ],
    })!;
    expect(result.generated[0].resourceOpenUrl).toBe(
      "https://example.com/doc.pdf",
    );
    expect(result.generated[0].downloadUrl).toBeNull();
  });

  it("status='draft' + http(s) fileUrl → resourceOpenUrl=null（草稿不暴露外链）", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "draft",
          fileUrl: "https://example.com/doc.pdf",
        }),
      ],
    })!;
    expect(result.generated[0].resourceOpenUrl).toBeNull();
  });

  it("status='exported' + storage key fileUrl → downloadUrl 指向流式接口, resourceOpenUrl=null", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          id: "gd-legacy-01",
          status: "exported",
          fileUrl: "generated-documents/org-1/gd-legacy-01/v1.docx",
        }),
      ],
    })!;
    expect(result.generated[0].downloadUrl).toBe(
      "/api/generated-documents/gd-legacy-01/file",
    );
    expect(result.generated[0].resourceOpenUrl).toBeNull();
  });

  it("approvedBy/approvedAt exposed and formatted; null preserved", () => {
    const result = adaptCaseFormsData({
      items: [
        genDoc({
          status: "final",
          approvedByDisplayName: "鈴木花子",
          approvedAt: "2026-04-15T14:30:00.000Z",
        }),
      ],
    })!;
    expect(result.generated[0].approvedBy).toBe("鈴木花子");
    expect(result.generated[0].approvedAt).toContain("2026");

    const nilResult = adaptCaseFormsData({ items: [genDoc()] })!;
    expect(nilResult.generated[0].approvedBy).toBeNull();
    expect(nilResult.generated[0].approvedAt).toBeNull();
  });
});

const spItem = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "sp-f01",
  orgId: "org-001",
  caseId: "case-f01",
  submissionNo: 1,
  submissionKind: "initial",
  submittedAt: "2026-04-15T00:00:00.000Z",
  validationRunId: "vr-f01",
  reviewRecordId: null,
  authorityName: "東京入管",
  acceptanceNo: "ACC-2026-001",
  createdBy: "user-1",
  createdAt: "2026-04-15T00:00:00.000Z",
  ...o,
});

const rrItem = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "rr-f01",
  orgId: "org-001",
  caseId: "case-f01",
  validationRunId: "vr-f01",
  decision: "approved",
  comment: "問題ありません",
  reviewerUserId: "user-2",
  reviewerDisplayName: "鈴木 花子",
  reviewedAt: "2026-04-20T14:00:00.000Z",
  createdAt: "2026-04-20T14:00:00.000Z",
  updatedAt: "2026-04-20T14:00:00.000Z",
  ...o,
});

describe("submission packages empty state (p0-fe-006b-03)", () => {
  it("null/undefined → adapter returns null", () => {
    expect(adaptCaseSubmissionPackages(null)).toBeNull();
    expect(adaptCaseSubmissionPackages(undefined)).toBeNull();
  });

  it("empty items → no packages rendered", () => {
    expect(adaptCaseSubmissionPackages({ items: [] })).toEqual([]);
  });
});

describe("submission packages summary display (p0-fe-006b-03)", () => {
  it("package with acceptanceNo shows 受理済み, without shows 提出済み", () => {
    const accepted = adaptCaseSubmissionPackages({
      items: [spItem({ acceptanceNo: "ACC-001" })],
    })!;
    expect(accepted[0].status).toBe("受理済み");

    const submitted = adaptCaseSubmissionPackages({
      items: [spItem({ acceptanceNo: null })],
    })!;
    expect(submitted[0].status).toBe("提出済み");
  });

  it("summary contains submission number, kind label, authority", () => {
    const result = adaptCaseSubmissionPackages({ items: [spItem()] })!;
    expect(result[0].summary).toContain("#1");
    expect(result[0].summary).toContain("初回提出");
    expect(result[0].summary).toContain("東京入管");
  });

  it("supplement kind shows 補正提出 label", () => {
    const result = adaptCaseSubmissionPackages({
      items: [spItem({ submissionKind: "supplement" })],
    })!;
    expect(result[0].summary).toContain("補正提出");
  });

  it("all packages are locked (immutable after submission)", () => {
    const result = adaptCaseSubmissionPackages({
      items: [spItem(), spItem({ id: "sp-f02", submissionNo: 2 })],
    })!;
    expect(result.every((p) => p.locked)).toBe(true);
  });
});

describe("double review empty state (p0-fe-006b-03)", () => {
  it("null/undefined → adapter returns null", () => {
    expect(adaptCaseDoubleReviewEntries(null)).toBeNull();
    expect(adaptCaseDoubleReviewEntries(undefined)).toBeNull();
  });

  it("empty items → no review entries rendered", () => {
    expect(adaptCaseDoubleReviewEntries({ items: [] })).toEqual([]);
  });
});

describe("double review verdict gates (p0-fe-006b-03)", () => {
  it("approved → verdict 承認, badge green, comment visible", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ decision: "approved", comment: "OK" })],
    })!;
    expect(result[0].verdict).toBe("承認");
    expect(result[0].verdictBadge).toBe("badge-green");
    expect(result[0].comment).toBe("OK");
    expect(result[0].rejectReason).toBeNull();
  });

  it("rejected → verdict 却下, badge red, rejectReason visible", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ decision: "rejected", comment: "不備あり" })],
    })!;
    expect(result[0].verdict).toBe("却下");
    expect(result[0].verdictBadge).toBe("badge-red");
    expect(result[0].comment).toBeNull();
    expect(result[0].rejectReason).toBe("不備あり");
  });

  it("unknown decision → raw string verdict, badge gray", () => {
    const result = adaptCaseDoubleReviewEntries({
      items: [rrItem({ decision: "pending_review" })],
    })!;
    expect(result[0].verdict).toBe("pending_review");
    expect(result[0].verdictBadge).toBe("badge-gray");
  });

  it("initials derived from Japanese name; falls back to userId", () => {
    const named = adaptCaseDoubleReviewEntries({
      items: [rrItem({ reviewerDisplayName: "山田 太郎" })],
    })!;
    expect(named[0].initials).toBe("山太");

    const noName = adaptCaseDoubleReviewEntries({
      items: [rrItem({ reviewerDisplayName: null, reviewerUserId: "user-2" })],
    })!;
    expect(noName[0].name).toBe("user-2");

    const neither = adaptCaseDoubleReviewEntries({
      items: [rrItem({ reviewerDisplayName: null, reviewerUserId: null })],
    })!;
    expect(neither[0].name).toBe("不明");
  });
});
