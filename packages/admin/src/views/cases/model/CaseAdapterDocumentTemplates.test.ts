// ── Test Ownership ──────────────────────────────────────────────
// Owner: fe-types-adapter — document templates adapter + URL builder
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseFormsData,
  adaptDocumentTemplateList,
  buildCaseDocumentTemplatesUrl,
} from "./CaseAdapterSupportSeams";

const genDoc = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
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
  ...overrides,
});

const tplItem = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "tpl-001",
  orgId: "org-001",
  templateName: "在留資格認定証明書交付申請書",
  caseType: "family_stay",
  docType: "application_form",
  language: "ja",
  versionNo: 1,
  contentBody: "",
  variablesSchema: {},
  activeFlag: true,
  createdBy: "user-1",
  updatedBy: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════
//  FormGenerated — id + backendStatus fields
// ═══════════════════════════════════════════════════════════════════

describe("FormGenerated id + backendStatus", () => {
  it("generated doc includes id from DTO", () => {
    const result = adaptCaseFormsData({ items: [genDoc({ id: "gd-42" })] })!;
    expect(result.generated[0].id).toBe("gd-42");
  });

  it("generated doc with missing id defaults to empty string", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ id: undefined })],
    })!;
    expect(result.generated[0].id).toBe("");
  });

  it("backendStatus maps known statuses verbatim", () => {
    for (const status of ["draft", "final", "exported"] as const) {
      const result = adaptCaseFormsData({
        items: [genDoc({ status })],
      })!;
      expect(result.generated[0].backendStatus).toBe(status);
    }
  });

  it("unknown status backendStatus falls back to draft", () => {
    const result = adaptCaseFormsData({
      items: [genDoc({ status: "unknown" })],
    })!;
    expect(result.generated[0].backendStatus).toBe("draft");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  adaptDocumentTemplateList — empty state
// ═══════════════════════════════════════════════════════════════════

describe("adaptDocumentTemplateList — empty state", () => {
  it("null/undefined → returns null", () => {
    expect(adaptDocumentTemplateList(null)).toBeNull();
    expect(adaptDocumentTemplateList(undefined)).toBeNull();
  });

  it("empty items → empty array", () => {
    expect(adaptDocumentTemplateList({ items: [] })).toEqual([]);
  });

  it("items with missing id or templateName are skipped", () => {
    const result = adaptDocumentTemplateList({
      items: [tplItem({ id: "" }), tplItem({ templateName: "" }), tplItem()],
    })!;
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tpl-001");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  adaptDocumentTemplateList — shape mapping (R40-B structured fields)
// ═══════════════════════════════════════════════════════════════════

describe("adaptDocumentTemplateList — shape mapping", () => {
  it("maps id, templateName → name; populates structured docType/language/versionNo fields", () => {
    const result = adaptDocumentTemplateList({ items: [tplItem()] })!;
    expect(result).toHaveLength(1);
    const t = result[0];
    expect(t.id).toBe("tpl-001");
    expect(t.name).toBe("在留資格認定証明書交付申請書");
    expect(t.docTypeKey).toBe("cases.detail.forms.docType.application_form");
    expect(t.docTypeRaw).toBe("application_form");
    expect(t.language).toBe("ja");
    expect(t.versionNo).toBe(1);
    expect(t.actionLabel).toBe("生成");
  });

  it("meta fallback contains raw parts joined by ' · '", () => {
    const result = adaptDocumentTemplateList({ items: [tplItem()] })!;
    expect(result[0].meta).toBe("application_form · ja · v1");
  });

  it("structured fields are undefined when source values are empty/zero", () => {
    const result = adaptDocumentTemplateList({
      items: [tplItem({ docType: "", language: "", versionNo: 0 })],
    })!;
    const t = result[0];
    expect(t.docTypeKey).toBeUndefined();
    expect(t.docTypeRaw).toBeUndefined();
    expect(t.language).toBeUndefined();
    expect(t.versionNo).toBeUndefined();
    expect(t.meta).toBe("");
  });

  it("accepts raw array input (no wrapper object)", () => {
    const result = adaptDocumentTemplateList([tplItem()])!;
    expect(result).toHaveLength(1);
  });

  it("preserves insertion order", () => {
    const result = adaptDocumentTemplateList({
      items: [
        tplItem({ id: "tpl-a", templateName: "A" }),
        tplItem({ id: "tpl-b", templateName: "B" }),
        tplItem({ id: "tpl-c", templateName: "C" }),
      ],
    })!;
    expect(result.map((t) => t.name)).toEqual(["A", "B", "C"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  adaptDocumentTemplateList — docTypeKey i18n (R40-B lazy translation)
// ═══════════════════════════════════════════════════════════════════

describe("adaptDocumentTemplateList — docTypeKey i18n (R40-B)", () => {
  it("populates docTypeKey for known docType so view layer can call t()", () => {
    const result = adaptDocumentTemplateList({ items: [tplItem()] })!;
    expect(result[0].docTypeKey).toBe(
      "cases.detail.forms.docType.application_form",
    );
  });

  it("docTypeKey is undefined when docType is empty", () => {
    const result = adaptDocumentTemplateList({
      items: [tplItem({ docType: "" })],
    })!;
    expect(result[0].docTypeKey).toBeUndefined();
    expect(result[0].docTypeRaw).toBeUndefined();
  });

  it("docTypeRaw preserves the raw backend value for fallback", () => {
    const result = adaptDocumentTemplateList({
      items: [tplItem({ docType: "unknown_type" })],
    })!;
    expect(result[0].docTypeRaw).toBe("unknown_type");
    expect(result[0].docTypeKey).toBe(
      "cases.detail.forms.docType.unknown_type",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
//  buildCaseDocumentTemplatesUrl
// ═══════════════════════════════════════════════════════════════════

describe("buildCaseDocumentTemplatesUrl", () => {
  it("builds URL with caseType", () => {
    const url = buildCaseDocumentTemplatesUrl("/api/cases", {
      caseType: "family_stay",
    });
    expect(url).toBe("/api/document-templates?caseType=family_stay");
  });

  it("includes language when provided", () => {
    const url = buildCaseDocumentTemplatesUrl("/api/cases", {
      caseType: "engineer_specialist",
      language: "ja",
    });
    expect(url).toContain("caseType=engineer_specialist");
    expect(url).toContain("language=ja");
  });

  it("omits language param when not provided", () => {
    const url = buildCaseDocumentTemplatesUrl("/api/cases", {
      caseType: "family_stay",
    });
    expect(url).not.toContain("language");
  });

  it("encodes special characters in caseType", () => {
    const url = buildCaseDocumentTemplatesUrl("/api/cases", {
      caseType: "type with spaces",
    });
    expect(url).toContain("caseType=type+with+spaces");
  });
});
