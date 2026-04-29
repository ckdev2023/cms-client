import { describe, expect, it, vi } from "vitest";
import {
  createDocumentRepository,
  DocumentRepositoryError,
} from "./DocumentRepository";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createRequestMock(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

const NOW = new Date("2026-04-29T10:00:00Z");

describe("DocumentRepository (BUG-079)", () => {
  it("calls /api/document-items + /api/cases?view=summary with bearer token", async () => {
    const calls: string[] = [];
    const request = createRequestMock((input, init) => {
      const url = String(input);
      calls.push(url);
      expect(init?.method).toBe("GET");
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer t-1",
      );
      if (url.startsWith("/api/document-items")) {
        return jsonResponse({
          total: 1,
          items: [
            {
              id: "doc-1",
              caseId: "case-1",
              name: "护照写し",
              status: "uploaded_reviewing",
              ownerSide: "applicant",
              dueAt: "2026-05-10T00:00:00Z",
              lastFollowUpAt: null,
            },
          ],
        });
      }
      if (url.startsWith("/api/cases")) {
        return jsonResponse({
          total: 1,
          items: [{ id: "case-1", caseName: "经管签新规" }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const repository = createDocumentRepository({
      request,
      getToken: () => "t-1",
      now: () => NOW,
    });
    const items = await repository.listDocuments();

    expect(calls).toEqual([
      "/api/document-items?limit=200",
      "/api/cases?view=summary&limit=200",
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "doc-1",
      caseId: "case-1",
      caseName: "经管签新规",
      provider: "main_applicant",
      status: "uploaded_reviewing",
      dueDate: "2026-05-10",
    });
  });

  it("throws UNAUTHORIZED on 401 from document-items", async () => {
    const request = createRequestMock(
      () => new Response(null, { status: 401 }),
    );
    const repository = createDocumentRepository({
      request,
      getToken: () => null,
      now: () => NOW,
    });
    await expect(repository.listDocuments()).rejects.toMatchObject({
      name: "DocumentRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("throws BAD_RESPONSE when items array is missing", async () => {
    const request = createRequestMock((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({ total: 0 });
      }
      return jsonResponse({ total: 0, items: [] });
    });
    const repository = createDocumentRepository({
      request,
      getToken: () => "t",
      now: () => NOW,
    });
    await expect(repository.listDocuments()).rejects.toBeInstanceOf(
      DocumentRepositoryError,
    );
  });

  it("falls back to caseId when /api/cases best-effort lookup fails", async () => {
    const request = createRequestMock((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({
          total: 1,
          items: [
            {
              id: "doc-1",
              caseId: "case-x",
              name: "课税证明",
              status: "pending",
              ownerSide: "applicant",
              dueAt: null,
              lastFollowUpAt: null,
            },
          ],
        });
      }
      return new Response(null, { status: 500 });
    });
    const repository = createDocumentRepository({
      request,
      getToken: () => "t",
      now: () => NOW,
    });
    const items = await repository.listDocuments();
    expect(items[0]?.caseName).toBe("case-x");
  });

  it("upgrades approved → expired when dueAt is past", async () => {
    const request = createRequestMock((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({
          total: 1,
          items: [
            {
              id: "doc-1",
              caseId: "case-1",
              name: "课税证明",
              status: "approved",
              ownerSide: "applicant",
              dueAt: "2026-04-01T00:00:00Z",
              lastFollowUpAt: null,
            },
          ],
        });
      }
      return jsonResponse({ items: [] });
    });
    const repository = createDocumentRepository({
      request,
      getToken: () => "t",
      now: () => NOW,
    });
    const items = await repository.listDocuments();
    expect(items[0]?.status).toBe("expired");
  });
});
