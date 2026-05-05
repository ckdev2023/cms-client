import { describe, it, expect, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("CaseRepository.listDocumentTemplates", () => {
  it("sends GET to /api/document-templates with caseType query param", async () => {
    const request = mockFetch(200, {
      items: [
        {
          id: "tpl-001",
          templateName: "在留資格認定申請書",
          docType: "application_form",
          language: "ja",
          versionNo: 1,
        },
        {
          id: "tpl-002",
          templateName: "理由書",
          docType: "reason_letter",
          language: "ja",
          versionNo: 2,
        },
      ],
    });
    const repo = createCaseRepository({
      request,
      getToken: () => "test-token",
      apiPath: "/api/cases",
    });

    const result = await repo.listDocumentTemplates({
      caseType: "family_stay",
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("tpl-001");
    expect(result[0].name).toBe("在留資格認定申請書");
    expect(result[0].meta).toContain("application_form");
    expect(result[1].id).toBe("tpl-002");
    expect(result[1].meta).toContain("v2");

    expect(request).toHaveBeenCalledTimes(1);
    const [url, opts] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/document-templates?caseType=family_stay");
    expect(opts.method).toBe("GET");
  });

  it("includes language query param when provided", async () => {
    const request = mockFetch(200, { items: [] });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.listDocumentTemplates({
      caseType: "engineer_specialist",
      language: "en",
    });

    const [url] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "/api/document-templates?caseType=engineer_specialist&language=en",
    );
  });

  it("returns empty array when caseType is empty", async () => {
    const request = mockFetch(200, { items: [] });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    const result = await repo.listDocumentTemplates({ caseType: "" });
    expect(result).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it("returns empty array when server returns empty items", async () => {
    const request = mockFetch(200, { items: [] });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    const result = await repo.listDocumentTemplates({
      caseType: "family_stay",
    });
    expect(result).toEqual([]);
  });

  it("includes authorization header", async () => {
    const request = mockFetch(200, { items: [] });
    const repo = createCaseRepository({
      request,
      getToken: () => "my-jwt",
      apiPath: "/api/cases",
    });

    await repo.listDocumentTemplates({ caseType: "family_stay" });

    const headers = (request.mock.calls[0] as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-jwt");
  });

  it("uses custom apiPath to derive document-templates URL", async () => {
    const request = mockFetch(200, { items: [] });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/custom/cases",
    });

    await repo.listDocumentTemplates({ caseType: "family_stay" });

    const [url] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/custom/document-templates?caseType=family_stay");
  });

  it("throws on server error", async () => {
    const request = mockFetch(500, { message: "Internal error" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await expect(
      repo.listDocumentTemplates({ caseType: "family_stay" }),
    ).rejects.toThrow();
  });

  it("filters out malformed items from response", async () => {
    const request = mockFetch(200, {
      items: [
        { id: "tpl-001", templateName: "Valid" },
        { id: "", templateName: "No ID" },
        { templateName: "Missing ID field" },
        { id: "tpl-003" },
        null,
      ],
    });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    const result = await repo.listDocumentTemplates({
      caseType: "family_stay",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tpl-001");
  });
});
