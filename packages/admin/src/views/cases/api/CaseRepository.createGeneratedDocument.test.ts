import { describe, it, expect, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe("CaseRepository.createGeneratedDocument", () => {
  it("sends POST to /api/generated-documents with payload", async () => {
    const request = mockFetch(201, { id: "gd-001" });
    const repo = createCaseRepository({
      request,
      getToken: () => "test-token",
      apiPath: "/api/cases",
    });

    const result = await repo.createGeneratedDocument({
      caseId: "case-123",
      title: "テスト文書",
    });

    expect(result.id).toBe("gd-001");
    expect(request).toHaveBeenCalledTimes(1);

    const [url, opts] = request.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/generated-documents");
    expect(opts.method).toBe("POST");

    const sentBody = JSON.parse(opts.body as string) as Record<string, unknown>;
    expect(sentBody.caseId).toBe("case-123");
    expect(sentBody.title).toBe("テスト文書");
  });

  it("sends fileUrl when provided", async () => {
    const request = mockFetch(201, { id: "gd-002" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.createGeneratedDocument({
      caseId: "case-456",
      title: "文書タイトル",
      fileUrl: "https://example.com/doc.pdf",
    });

    const sentBody = JSON.parse(
      (request.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(sentBody.caseId).toBe("case-456");
    expect(sentBody.title).toBe("文書タイトル");
    expect(sentBody.fileUrl).toBe("https://example.com/doc.pdf");
  });

  it("includes templateId in JSON body when provided", async () => {
    const request = mockFetch(201, { id: "gd-004" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await repo.createGeneratedDocument({
      caseId: "case-789",
      title: "T",
      templateId: "dtpl-001",
    });

    const sentBody = JSON.parse(
      (request.mock.calls[0] as [string, RequestInit])[1].body as string,
    ) as Record<string, unknown>;
    expect(sentBody.templateId).toBe("dtpl-001");
  });

  it("includes authorization header", async () => {
    const request = mockFetch(201, { id: "gd-003" });
    const repo = createCaseRepository({
      request,
      getToken: () => "my-jwt",
      apiPath: "/api/cases",
    });

    await repo.createGeneratedDocument({
      caseId: "c",
      title: "t",
    });

    const headers = (request.mock.calls[0] as [string, RequestInit])[1]
      .headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer my-jwt");
  });

  it("throws on server error", async () => {
    const request = mockFetch(500, { message: "Internal error" });
    const repo = createCaseRepository({
      request,
      getToken: () => "tok",
      apiPath: "/api/cases",
    });

    await expect(
      repo.createGeneratedDocument({
        caseId: "c",
        title: "t",
      }),
    ).rejects.toThrow();
  });
});
