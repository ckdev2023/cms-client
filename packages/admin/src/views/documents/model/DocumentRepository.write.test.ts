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

// ─── transition ──────────────────────────────────────────────────

describe("DocumentRepository.transition", () => {
  it("POSTs toStatus to /api/document-items/:id/transition", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      const url = String(input);
      if (url.includes("/transition")) {
        capturedUrl = url;
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return jsonResponse({ ...ITEM_ROW, status: "waiting_upload" });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.transition("doc-1", {
      toStatus: "waiting_upload",
    });
    expect(capturedUrl).toBe("/api/document-items/doc-1/transition");
    expect(JSON.parse(capturedBody)).toEqual({ toStatus: "waiting_upload" });
    expect(result.status).toBe("waiting_upload");
  });

  it("throws VALIDATION on 400", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/transition")) {
        return jsonResponse(
          { message: "DOCUMENT_ITEM_TRANSITION_NOT_ALLOWED" },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.transition("doc-1", { toStatus: "approved" }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      serverCode: "DOCUMENT_ITEM_TRANSITION_NOT_ALLOWED",
    });
  });

  it("throws NETWORK on fetch failure", async () => {
    const request = vi.fn(async () => {
      throw new TypeError("Network error");
    }) as unknown as typeof fetch;
    const repository = createDocumentRepository({
      request,
      getToken: () => "t",
      now: () => NOW,
    });
    await expect(
      repository.transition("doc-1", { toStatus: "approved" }),
    ).rejects.toMatchObject({ code: "NETWORK" });
  });
});

// ─── followUp ────────────────────────────────────────────────────

describe("DocumentRepository.followUp", () => {
  it("POSTs to /api/document-items/:id/follow-up", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.includes("/follow-up")) {
        capturedUrl = url;
        return jsonResponse({
          ...ITEM_ROW,
          lastFollowUpAt: "2026-04-29T10:00:00Z",
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.followUp("doc-1");
    expect(capturedUrl).toBe("/api/document-items/doc-1/follow-up");
    expect(result.lastFollowUpAt).toBe("2026-04-29T10:00:00Z");
  });

  it("preserves server's human-readable message on 400 (NestJS-shaped error body)", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/follow-up")) {
        return jsonResponse(
          {
            message:
              "Cannot follow up on a document item with status 'pending'",
            error: "Bad Request",
            statusCode: 400,
          },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(repository.followUp("doc-1")).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining(
        "Cannot follow up on a document item with status 'pending'",
      ),
    });
  });

  it("falls back to generic message when server provides no message", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/follow-up")) {
        return jsonResponse({}, { status: 400 });
      }
      return jsonResponse({ items: [] });
    });
    await expect(repository.followUp("doc-1")).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining("validation error"),
    });
  });

  it("joins NestJS validation pipe message arrays", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/follow-up")) {
        return jsonResponse(
          {
            message: ["field1 is required", "field2 must be a string"],
            error: "Bad Request",
            statusCode: 400,
          },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(repository.followUp("doc-1")).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringContaining("field1 is required"),
    });
  });
});

// ─── waive ───────────────────────────────────────────────────────

describe("DocumentRepository.waive", () => {
  it("POSTs reasonCode + note to /api/document-items/:id/waive", async () => {
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      if (String(input).includes("/waive")) {
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return jsonResponse({
          ...ITEM_ROW,
          status: "waived",
          waiveReasonCodeLatest: "visa_type_exempt",
          waiveReasonLatest: null,
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.waive("doc-1", {
      reasonCode: "visa_type_exempt",
    });
    expect(JSON.parse(capturedBody)).toEqual({
      reasonCode: "visa_type_exempt",
      note: null,
    });
    expect(result.status).toBe("waived");
    expect(result.waiveReasonCodeLatest).toBe("visa_type_exempt");
  });

  it("passes note when reasonCode=other", async () => {
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      if (String(input).includes("/waive")) {
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return jsonResponse({ ...ITEM_ROW, status: "waived" });
      }
      return jsonResponse({ items: [] });
    });

    await repository.waive("doc-1", {
      reasonCode: "other",
      note: "客户口头确认",
    });
    expect(JSON.parse(capturedBody)).toEqual({
      reasonCode: "other",
      note: "客户口头确认",
    });
  });

  it("throws S9_READONLY when case is archived", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/waive")) {
        return jsonResponse(
          { message: "DOCUMENT_ITEM_CASE_S9_READONLY: archived" },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.waive("doc-1", { reasonCode: "visa_type_exempt" }),
    ).rejects.toMatchObject({
      code: "S9_READONLY",
      serverCode: "DOCUMENT_ITEM_CASE_S9_READONLY",
    });
  });
});

// ─── uploadLocalArchive ──────────────────────────────────────────

describe("DocumentRepository.uploadLocalArchive", () => {
  it("POSTs to /api/document-files/upload with local_server + relativePath", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      const url = String(input);
      if (url.includes("/document-files/upload")) {
        capturedUrl = url;
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return jsonResponse({
          id: "file-1",
          requirementId: "doc-1",
          fileName: "passport.pdf",
          fileUrl: null,
          relativePath: "cases/001/passport.pdf",
          fileKey: "cases/001/passport.pdf",
          versionNo: 1,
          storageType: "local_server",
          reviewStatus: "pending",
          uploadedAt: "2026-04-29T10:00:00Z",
          createdAt: "2026-04-29T10:00:00Z",
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.uploadLocalArchive({
      requirementId: "doc-1",
      fileName: "passport.pdf",
      relativePath: "cases/001/passport.pdf",
      expiryDate: "2027-04-01",
    });
    expect(capturedUrl).toBe("/api/document-files/upload");
    expect(JSON.parse(capturedBody)).toEqual({
      requirementId: "doc-1",
      fileName: "passport.pdf",
      relativePath: "cases/001/passport.pdf",
      storageType: "local_server",
      expiryDate: "2027-04-01",
    });
    expect(result.id).toBe("file-1");
    expect(result.versionNo).toBe(1);
    expect(result.fileKey).toBe("cases/001/passport.pdf");
  });

  it("sends expiryDate as null when omitted", async () => {
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      if (String(input).includes("/document-files/upload")) {
        capturedBody = typeof init?.body === "string" ? init.body : "";
        return jsonResponse({
          id: "file-1",
          requirementId: "doc-1",
          fileName: "test.pdf",
          versionNo: 1,
          storageType: "local_server",
        });
      }
      return jsonResponse({ items: [] });
    });

    await repository.uploadLocalArchive({
      requirementId: "doc-1",
      fileName: "test.pdf",
      relativePath: "docs/test.pdf",
    });
    expect(JSON.parse(capturedBody).expiryDate).toBeNull();
  });
});

// ─── listFiles ───────────────────────────────────────────────────

describe("DocumentRepository.listFiles", () => {
  it("GETs /api/document-files with requirementId query param", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.startsWith("/api/document-files")) {
        capturedUrl = url;
        return jsonResponse({
          items: [
            {
              id: "file-1",
              requirementId: "doc-1",
              fileName: "passport.pdf",
              versionNo: 1,
              storageType: "local_server",
              reviewStatus: "approved",
              uploadedAt: "2026-04-29T10:00:00Z",
              createdAt: "2026-04-29T10:00:00Z",
            },
          ],
          total: 1,
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.listFiles("doc-1", { page: 1, limit: 10 });
    const params = new URL(capturedUrl, "http://x").searchParams;
    expect(params.get("requirementId")).toBe("doc-1");
    expect(params.get("page")).toBe("1");
    expect(params.get("limit")).toBe("10");
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0]?.fileName).toBe("passport.pdf");
  });

  it("handles missing items gracefully", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).startsWith("/api/document-files")) {
        return jsonResponse({ total: 0 });
      }
      return jsonResponse({ items: [] });
    });
    const result = await repository.listFiles("doc-1");
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });
});

// ─── getCompletionRate ───────────────────────────────────────────

describe("DocumentRepository.getCompletionRate", () => {
  it("GETs /api/document-items/completion-rate?caseId=... and excludes waived from active total", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.includes("/completion-rate")) {
        capturedUrl = url;
        return jsonResponse({
          caseId: "case-1",
          total: 10,
          completed: 7,
          approved: 5,
          waived: 2,
          completionRate: 70,
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.getCompletionRate("case-1");
    expect(capturedUrl).toContain("caseId=case-1");
    expect(result).toEqual({
      collected: 5,
      total: 8,
      percent: 63,
      label: "5/8",
    });
  });

  it("treats all-waived case as 0/0 with 0% (no NaN%)", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/completion-rate")) {
        return jsonResponse({
          caseId: "case-1",
          total: 4,
          completed: 4,
          approved: 0,
          waived: 4,
          completionRate: 100,
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.getCompletionRate("case-1");
    expect(result).toEqual({
      collected: 0,
      total: 0,
      percent: 0,
      label: "0/0",
    });
  });

  it("computes percent from completed/total when approved/waived fields missing (legacy fallback)", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/completion-rate")) {
        return jsonResponse({ caseId: "case-1", total: 4, completed: 3 });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.getCompletionRate("case-1");
    expect(result.percent).toBe(75);
    expect(result.label).toBe("3/4");
  });
});

// createItem tests live in DocumentRepository.createItem.test.ts
