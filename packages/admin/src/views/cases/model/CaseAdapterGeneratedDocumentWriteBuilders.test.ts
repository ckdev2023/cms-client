import { describe, it, expect } from "vitest";
import {
  buildCreateGeneratedDocumentPayload,
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

  it("includes templateId when provided", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      templateId: "tpl-abc",
    });
    expect(payload.templateId).toBe("tpl-abc");
  });

  it("includes null templateId when explicitly set", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      templateId: null,
    });
    expect(payload.templateId).toBeNull();
  });

  it("includes outputFormat when provided", () => {
    const payload = buildCreateGeneratedDocumentPayload({
      ...BASE,
      outputFormat: "docx",
    });
    expect(payload.outputFormat).toBe("docx");
  });

  it("omits outputFormat when not provided", () => {
    const payload = buildCreateGeneratedDocumentPayload(BASE);
    expect(payload).not.toHaveProperty("outputFormat");
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
