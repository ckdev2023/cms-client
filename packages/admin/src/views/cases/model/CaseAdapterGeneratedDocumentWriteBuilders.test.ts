import { describe, it, expect } from "vitest";
import {
  buildCreateGeneratedDocumentPayload,
  buildGeneratedDocumentDeleteUrl,
  buildGeneratedDocumentsPostUrl,
  type GeneratedDocumentCreateInput,
} from "./CaseAdapterGeneratedDocumentWriteBuilders";

describe("buildCreateGeneratedDocumentPayload", () => {
  const BASE: GeneratedDocumentCreateInput = {
    caseId: "case-001",
    title: "テスト文書",
  };

  it("builds payload with required fields only", () => {
    const payload = buildCreateGeneratedDocumentPayload(BASE);
    expect(payload).toEqual({
      caseId: "case-001",
      title: "テスト文書",
    });
  });

  it("includes fileUrl when provided", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      fileUrl: "https://example.com/doc.pdf",
    });
    expect(payload.fileUrl).toBe("https://example.com/doc.pdf");
  });

  it("omits fileUrl when null", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      fileUrl: null,
    });
    expect(payload).not.toHaveProperty("fileUrl");
  });

  it("omits fileUrl when not provided", () => {
    const payload = buildCreateGeneratedDocumentPayload(BASE);
    expect(payload).not.toHaveProperty("fileUrl");
  });

  it("includes templateId when provided as non-empty string", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      templateId: "tpl-xyz",
    });
    expect(payload.templateId).toBe("tpl-xyz");
  });

  it("omits templateId when null, undefined, or empty", () => {
    expect(
      buildCreateGeneratedDocumentPayload({ ...BASE, templateId: null }),
    ).not.toHaveProperty("templateId");
    expect(buildCreateGeneratedDocumentPayload(BASE)).not.toHaveProperty(
      "templateId",
    );
    expect(
      buildCreateGeneratedDocumentPayload({
        ...BASE,
        templateId: "",
      }),
    ).not.toHaveProperty("templateId");
  });
});

describe("buildGeneratedDocumentsPostUrl", () => {
  it("derives /api/generated-documents from /api/cases", () => {
    expect(buildGeneratedDocumentsPostUrl("/api/cases")).toBe(
      "/api/generated-documents",
    );
  });

  it("handles trailing slash", () => {
    expect(buildGeneratedDocumentsPostUrl("/api/cases/")).toBe(
      "/api/generated-documents",
    );
  });
});

describe("buildGeneratedDocumentDeleteUrl", () => {
  it("derives DELETE URL from /api/cases", () => {
    expect(buildGeneratedDocumentDeleteUrl("/api/cases", "gd-abc")).toBe(
      "/api/generated-documents/gd-abc",
    );
  });

  it("encodes doc id", () => {
    expect(buildGeneratedDocumentDeleteUrl("/api/cases", "a/b")).toBe(
      "/api/generated-documents/a%2Fb",
    );
  });
});
