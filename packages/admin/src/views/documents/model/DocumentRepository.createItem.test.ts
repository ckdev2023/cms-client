import { describe, expect, it, vi } from "vitest";
import { createDocumentRepository } from "./DocumentRepository";

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
  waiveReasonCodeLatest: null,
  waiveReasonLatest: null,
  waivedAtLatest: null,
  waivedByUserIdLatest: null,
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

describe("DocumentRepository.createItem", () => {
  it("POSTs to /api/document-items with create body", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      const url = String(input);
      if (url === "/api/document-items" && init?.method === "POST") {
        capturedUrl = url;
        capturedBody = typeof init.body === "string" ? init.body : "";
        return jsonResponse({
          ...ITEM_ROW,
          id: "doc-new",
          name: "新規資料",
          status: "pending",
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.createItem({
      caseId: "case-1",
      checklistItemCode: "manual:abc",
      name: "新規資料",
      ownerSide: "applicant",
      category: "standard",
    });
    expect(capturedUrl).toBe("/api/document-items");
    expect(JSON.parse(capturedBody)).toMatchObject({
      caseId: "case-1",
      checklistItemCode: "manual:abc",
      name: "新規資料",
      ownerSide: "applicant",
      category: "standard",
    });
    expect(result.id).toBe("doc-new");
    expect(result.status).toBe("pending");
  });

  it("throws UNAUTHORIZED on 403", async () => {
    const repository = createDefaultRepo((input, init) => {
      if (String(input) === "/api/document-items" && init?.method === "POST") {
        return jsonResponse({ message: "Forbidden" }, { status: 403 });
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.createItem({
        caseId: "case-1",
        checklistItemCode: "x",
        name: "test",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws CONFLICT on 409", async () => {
    const repository = createDefaultRepo((input, init) => {
      if (String(input) === "/api/document-items" && init?.method === "POST") {
        return jsonResponse({ message: "conflict" }, { status: 409 });
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.createItem({
        caseId: "case-1",
        checklistItemCode: "x",
        name: "test",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
