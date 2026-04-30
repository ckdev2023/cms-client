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

const ITEM_ROW = {
  id: "doc-1",
  caseId: "case-1",
  name: "護照写し",
  status: "uploaded_reviewing",
  ownerSide: "applicant",
  dueAt: "2026-05-10T00:00:00Z",
  lastFollowUpAt: null,
};

function createDefaultRepo(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return createDocumentRepository({
    request: createRequestMock(handler),
    getToken: () => "t-1",
    now: () => NOW,
  });
}

// ─── listDocuments ───────────────────────────────────────────────

describe("DocumentRepository.listDocuments", () => {
  it("calls /api/document-items + /api/cases?view=summary with bearer token", async () => {
    const calls: string[] = [];
    const repository = createDefaultRepo((input, init) => {
      const url = String(input);
      calls.push(url);
      expect(init?.method).toBe("GET");
      expect((init?.headers as Record<string, string>).Authorization).toBe(
        "Bearer t-1",
      );
      if (url.startsWith("/api/document-items")) {
        return jsonResponse({ total: 1, items: [ITEM_ROW] });
      }
      if (url.startsWith("/api/cases")) {
        return jsonResponse({
          total: 1,
          items: [{ id: "case-1", caseName: "经管签新规" }],
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    const result = await repository.listDocuments();
    expect(calls).toHaveLength(2);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "doc-1",
      caseId: "case-1",
      caseName: "经管签新规",
      provider: "main_applicant",
      status: "uploaded_reviewing",
      dueDate: "2026-05-10",
    });
  });

  it("passes caseId, statusIn, ownerSide, page, limit as query params", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.startsWith("/api/document-items")) {
        capturedUrl = url;
        return jsonResponse({ total: 0, items: [] });
      }
      return jsonResponse({ total: 0, items: [] });
    });

    await repository.listDocuments({
      caseId: "case-99",
      statusIn: ["pending", "revision_required"],
      ownerSide: "applicant",
      page: 2,
      limit: 50,
    });

    const params = new URL(capturedUrl, "http://x").searchParams;
    expect(params.get("caseId")).toBe("case-99");
    expect(params.get("statusIn")).toBe("pending,revision_required");
    expect(params.get("ownerSide")).toBe("applicant");
    expect(params.get("page")).toBe("2");
    expect(params.get("limit")).toBe("50");
  });

  it("throws UNAUTHORIZED on 401 from document-items", async () => {
    const repository = createDefaultRepo(
      () => new Response(null, { status: 401 }),
    );
    await expect(repository.listDocuments()).rejects.toMatchObject({
      name: "DocumentRepositoryError",
      code: "UNAUTHORIZED",
      status: 401,
    });
  });

  it("throws BAD_RESPONSE when items array is missing", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({ total: 0 });
      }
      return jsonResponse({ total: 0, items: [] });
    });
    await expect(repository.listDocuments()).rejects.toBeInstanceOf(
      DocumentRepositoryError,
    );
  });

  it("falls back to caseId when /api/cases best-effort lookup fails", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({
          total: 1,
          items: [{ ...ITEM_ROW, caseId: "case-x" }],
        });
      }
      return new Response(null, { status: 500 });
    });
    const result = await repository.listDocuments();
    expect(result.items[0]?.caseName).toBe("case-x");
  });

  it("upgrades approved → expired when dueAt is past", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).startsWith("/api/document-items")) {
        return jsonResponse({
          total: 1,
          items: [
            { ...ITEM_ROW, status: "approved", dueAt: "2026-04-01T00:00:00Z" },
          ],
        });
      }
      return jsonResponse({ items: [] });
    });
    const result = await repository.listDocuments();
    expect(result.items[0]?.status).toBe("expired");
  });
});

// ─── Error model ─────────────────────────────────────────────────

describe("DocumentRepositoryError", () => {
  it("has name, code, status, serverCode on instance", () => {
    const err = new DocumentRepositoryError({
      code: "VALIDATION",
      message: "bad",
      status: 400,
      serverCode: "DOCUMENT_ITEM_TRANSITION_NOT_ALLOWED",
    });
    expect(err.name).toBe("DocumentRepositoryError");
    expect(err.code).toBe("VALIDATION");
    expect(err.status).toBe(400);
    expect(err.serverCode).toBe("DOCUMENT_ITEM_TRANSITION_NOT_ALLOWED");
    expect(err.message).toBe("bad");
    expect(err).toBeInstanceOf(Error);
  });
});
