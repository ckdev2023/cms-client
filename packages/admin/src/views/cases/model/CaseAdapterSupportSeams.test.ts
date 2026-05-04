// ── Test Ownership ──────────────────────────────────────────────
// Owner: implemented adapter seams for support modules.
// Covers: boundary registry contract, documents / forms (p0-fe-006b-01),
//   and tasks (p0-fe-006d-01).
// Does NOT test: list/detail adapters, write builders, repository,
//   or composable logic.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseDocumentGroups,
  adaptCaseFormsData,
  adaptCaseTaskList,
  SUPPORT_SEAM_FUNCTION_NAMES,
  SUPPORT_SEAM_REGISTRY,
} from "./CaseAdapterSupportSeams";

// ─── Boundary contract tests ─────────────────────────────────────

describe("CaseAdapterSupportSeams", () => {
  describe("boundary contract (p0-fe-002e-03)", () => {
    it("SUPPORT_SEAM_REGISTRY is empty (all seams implemented)", () => {
      expect(SUPPORT_SEAM_FUNCTION_NAMES).toHaveLength(0);
      expect(Object.keys(SUPPORT_SEAM_REGISTRY)).toHaveLength(0);
    });

    it("documents and forms are no longer in seam registry (p0-fe-006b-01)", () => {
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty(
        "adaptCaseDocumentGroups",
      );
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty("adaptCaseFormsData");
    });

    it("validation/billing/submissionPkgs/doubleReview are no longer in seam registry (p0-fe-006b-02)", () => {
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty(
        "adaptCaseValidationData",
      );
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty("adaptCaseBillingData");
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty(
        "adaptCaseSubmissionPackages",
      );
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty(
        "adaptCaseDoubleReviewEntries",
      );
    });

    it("tasks is no longer in seam registry (p0-fe-006d-01)", () => {
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty("adaptCaseTaskList");
    });

    it("deadlines is no longer in seam registry (p0-fe-006d-02)", () => {
      expect(SUPPORT_SEAM_REGISTRY).not.toHaveProperty("adaptCaseDeadlineList");
    });
  });
});

// ─── adaptCaseTaskList (p0-fe-006d-01) ────────────────────────────

describe("adaptCaseTaskList", () => {
  const taskDto = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "task-001",
    orgId: "org-001",
    caseId: "case-001",
    title: "パスポート確認",
    description: null,
    taskType: "document_follow_up",
    assigneeUserId: "user-1",
    assigneeName: "佐藤花子",
    priority: "normal",
    dueAt: "2026-06-01T00:00:00.000Z",
    status: "pending",
    sourceType: null,
    sourceId: null,
    completedAt: null,
    createdAt: "2026-04-01T00:00:00.000Z",
    updatedAt: "2026-04-01T00:00:00.000Z",
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseTaskList(null)).toBeNull();
    expect(adaptCaseTaskList(undefined)).toBeNull();
    expect(adaptCaseTaskList("string")).toBeNull();
    expect(adaptCaseTaskList(42)).toBeNull();
  });

  it("returns empty array for { items: [] }", () => {
    expect(adaptCaseTaskList({ items: [], total: 0 })).toEqual([]);
  });

  it("maps task with correct fields", () => {
    const result = adaptCaseTaskList({ items: [taskDto()], total: 1 });
    expect(result).toHaveLength(1);
    const t = result![0];
    expect(t.id).toBe("task-001");
    expect(t.label).toBe("パスポート確認");
    expect(t.done).toBe(false);
    expect(t.status).toBe("pending");
    expect(t.assignee).toBe("佐");
    expect(t.color).toBe("primary");
  });

  it("marks completed tasks as done", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "completed" })],
    });
    expect(result![0].done).toBe(true);
  });

  it("marks cancelled tasks as done", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "cancelled" })],
    });
    expect(result![0].done).toBe(true);
  });

  it("maps in_progress as not done", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "in_progress" })],
    });
    expect(result![0].done).toBe(false);
  });

  it("maps priority to color", () => {
    expect(
      adaptCaseTaskList({ items: [taskDto({ priority: "urgent" })] })![0].color,
    ).toBe("warning");
    expect(
      adaptCaseTaskList({ items: [taskDto({ priority: "high" })] })![0].color,
    ).toBe("warning");
    expect(
      adaptCaseTaskList({ items: [taskDto({ priority: "normal" })] })![0].color,
    ).toBe("primary");
    expect(
      adaptCaseTaskList({ items: [taskDto({ priority: "low" })] })![0].color,
    ).toBe("success");
  });

  it("shows — when assigneeUserId is null and no assigneeName", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeUserId: null, assigneeName: null })],
    });
    expect(result![0].assignee).toBe("—");
  });

  it("uses assigneeName first char when present (R30-F)", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: "Tanaka Yuki" })],
    });
    expect(result![0].assignee).toBe("T");
  });

  it("falls back to — when assigneeName is null even with UUID (R30-F)", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({
          assigneeUserId: "00000000-0000-4000-8000-000000000011",
          assigneeName: null,
        }),
      ],
    });
    expect(result![0].assignee).toBe("—");
  });

  it("falls back to — when assigneeName is whitespace-only (R30-F)", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: "   ", assigneeUserId: "user-1" })],
    });
    expect(result![0].assignee).toBe("—");
  });

  it("formats dueAt as ja-JP date", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: "2026-06-01T00:00:00.000Z" })],
    });
    expect(result![0].due).toBeTruthy();
    expect(result![0].due).not.toBe("");
  });

  it("returns empty string for due when dueAt is null", () => {
    const result = adaptCaseTaskList({ items: [taskDto({ dueAt: null })] });
    expect(result![0].due).toBe("");
  });

  it("derives dueColor muted for done tasks", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({ status: "completed", dueAt: "2020-01-01T00:00:00.000Z" }),
      ],
    });
    expect(result![0].dueColor).toBe("muted");
  });

  it("derives dueColor muted when dueAt is null", () => {
    const result = adaptCaseTaskList({ items: [taskDto({ dueAt: null })] });
    expect(result![0].dueColor).toBe("muted");
  });

  it("skips items with empty id", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ id: "" }), taskDto({ id: "task-002" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("task-002");
  });

  it("skips items with empty title", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ title: "" }), taskDto({ title: "有効" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].label).toBe("有効");
  });

  it("accepts raw array input", () => {
    const result = adaptCaseTaskList([taskDto()]);
    expect(result).toHaveLength(1);
  });
});

// ─── adaptCaseDocumentGroups (p0-fe-006b-01) ─────────────────────

describe("adaptCaseDocumentGroups", () => {
  const item = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "di-001",
    name: "パスポート写し",
    status: "pending",
    ownerSide: "applicant",
    checklistItemCode: "DOC-001",
    dueAt: null,
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseDocumentGroups(null)).toBeNull();
    expect(adaptCaseDocumentGroups(undefined)).toBeNull();
    expect(adaptCaseDocumentGroups("string")).toBeNull();
    expect(adaptCaseDocumentGroups(42)).toBeNull();
  });

  it("returns empty array for { items: [] }", () => {
    expect(adaptCaseDocumentGroups({ items: [], total: 0 })).toEqual([]);
  });

  it("groups items by ownerSide with labels", () => {
    const result = adaptCaseDocumentGroups({
      items: [
        item({ ownerSide: "applicant" }),
        item({ name: "住民票", ownerSide: "office" }),
        item({ name: "在職証明", ownerSide: "applicant" }),
      ],
      total: 3,
    });
    expect(result).toHaveLength(2);
    expect(result![0].group).toBe("申請者提供");
    expect(result![0].items).toHaveLength(2);
    expect(result![0].count).toBe("2 件");
    expect(result![1].group).toBe("事務所準備");
    expect(result![1].items).toHaveLength(1);
    expect(result![1].count).toBe("1 件");
  });

  it("maps status to i18n key", () => {
    const result = adaptCaseDocumentGroups({
      items: [item({ status: "approved" })],
    });
    expect(result![0].items[0].statusLabelKey).toBe(
      "cases.detail.documents.docStatus.approved",
    );
  });

  it("derives actions from status", () => {
    const result = adaptCaseDocumentGroups({
      items: [item({ status: "uploaded_reviewing" })],
    });
    const actions = result![0].items[0].actions!;
    expect(actions.canApprove).toBe(true);
    expect(actions.canReject).toBe(true);
    expect(actions.canRemind).toBe(false);
    expect(actions.canWaive).toBe(false);
  });

  it("builds meta from checklistItemCode and dueAt", () => {
    const result = adaptCaseDocumentGroups({
      items: [
        item({
          checklistItemCode: "DOC-010",
          dueAt: "2026-06-01T00:00:00.000Z",
        }),
      ],
    });
    const meta = result![0].items[0].meta;
    expect(meta).toContain("DOC-010");
    expect(meta).toContain("期限:");
  });

  it("skips items with empty name", () => {
    const result = adaptCaseDocumentGroups({
      items: [item({ name: "" }), item({ name: "有効" })],
    });
    expect(result).toHaveLength(1);
    expect(result![0].items).toHaveLength(1);
    expect(result![0].items[0].name).toBe("有効");
  });

  it("accepts raw array (not wrapped in { items })", () => {
    const result = adaptCaseDocumentGroups([item()]);
    expect(result).toHaveLength(1);
    expect(result![0].items).toHaveLength(1);
  });

  it("defaults ownerSide to applicant when missing", () => {
    const result = adaptCaseDocumentGroups({
      items: [item({ ownerSide: "" })],
    });
    expect(result![0].group).toBe("申請者提供");
  });
});

// ─── adaptCaseFormsData (p0-fe-006b-01) ──────────────────────────

describe("adaptCaseFormsData", () => {
  const genDoc = (
    overrides: Record<string, unknown> = {},
  ): Record<string, unknown> => ({
    id: "gd-001",
    caseId: "case-001",
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
    ...overrides,
  });

  it("returns null for non-object / non-array input", () => {
    expect(adaptCaseFormsData(null)).toBeNull();
    expect(adaptCaseFormsData(undefined)).toBeNull();
    expect(adaptCaseFormsData("string")).toBeNull();
  });

  it("returns empty forms for { items: [] }", () => {
    expect(adaptCaseFormsData({ items: [], total: 0 })).toEqual({
      templates: [],
      generated: [],
    });
  });

  it("maps generated documents with correct fields", () => {
    const result = adaptCaseFormsData({ items: [genDoc()], total: 1 });
    expect(result!.generated).toHaveLength(1);
    const g = result!.generated[0];
    expect(g.name).toBe("在留資格認定証明書");
    expect(g.tone).toBe("muted");
    expect(g.statusLabel).toBe("下書き");
    expect(g.meta).toContain("PDF");
    expect(g.meta).toContain("v1");
    expect(g.meta).toContain("担当太郎");
  });

  it("maps status tones correctly", () => {
    const draft = adaptCaseFormsData({ items: [genDoc({ status: "draft" })] });
    expect(draft!.generated[0].tone).toBe("muted");

    const final = adaptCaseFormsData({ items: [genDoc({ status: "final" })] });
    expect(final!.generated[0].tone).toBe("success");

    const exported = adaptCaseFormsData({
      items: [genDoc({ status: "exported" })],
    });
    expect(exported!.generated[0].tone).toBe("primary");
  });

  it("templates is always empty in P0", () => {
    const result = adaptCaseFormsData({ items: [genDoc()], total: 1 });
    expect(result!.templates).toEqual([]);
  });

  it("skips items with empty title", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ title: "" }), genDoc({ title: "有効書類" })],
    });
    expect(result!.generated).toHaveLength(1);
    expect(result!.generated[0].name).toBe("有効書類");
  });

  it("accepts raw array", () => {
    const result = adaptCaseFormsData([genDoc()]);
    expect(result!.generated).toHaveLength(1);
  });

  it("without locale, meta uses formatDate (date-only ja-JP fallback)", () => {
    const result = adaptCaseFormsData({ items: [genDoc()] });
    const meta = result!.generated[0].meta;
    expect(meta).toContain("2026");
    expect(meta).not.toContain(":");
  });

  it("with locale, meta uses formatDateTime (date+time locale-aware)", () => {
    const result = adaptCaseFormsData(
      { items: [genDoc({ generatedAt: "2026-04-10T14:30:00.000Z" })] },
      "zh-CN",
    );
    const meta = result!.generated[0].meta;
    expect(meta).toContain("2026");
    expect(meta).toMatch(/\d{2}:\d{2}/);
  });

  it("with ja-JP locale, meta includes time component", () => {
    const result = adaptCaseFormsData(
      { items: [genDoc({ generatedAt: "2026-04-10T14:30:00.000Z" })] },
      "ja-JP",
    );
    const meta = result!.generated[0].meta;
    expect(meta).toMatch(/\d{2}:\d{2}/);
  });

  it("with en-US locale, meta includes time component", () => {
    const result = adaptCaseFormsData(
      { items: [genDoc({ generatedAt: "2026-04-10T14:30:00.000Z" })] },
      "en-US",
    );
    const meta = result!.generated[0].meta;
    expect(meta).toContain("2026");
    expect(meta).toMatch(/\d{2}:\d{2}/);
  });

  it("null generatedAt omits date from meta regardless of locale", () => {
    const result = adaptCaseFormsData(
      { items: [genDoc({ generatedAt: null })] },
      "zh-CN",
    );
    expect(result!.generated[0].meta).toBe("PDF · v1 · 担当太郎");
  });
});
