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

function createDefaultRepo(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return createDocumentRepository({
    request: createRequestMock(handler),
    getToken: () => "t-1",
    now: () => NOW,
  });
}

// ─── listReferenceCandidates ─────────────────────────────────────

describe("DocumentRepository.listReferenceCandidates", () => {
  it("GETs /api/document-requirement-file-refs?requirementId=...&candidates=true", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.includes("/document-requirement-file-refs")) {
        capturedUrl = url;
        return jsonResponse([
          {
            fileId: "fv-1",
            requirementId: "req-src",
            fileName: "passport.pdf",
            versionNo: 2,
            uploadedAt: "2026-04-01T00:00:00Z",
            expiryDate: "2027-04-01",
            sourceCaseId: "case-2",
            sourceRequirementName: "パスポート写し",
            reviewStatus: "approved",
          },
        ]);
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.listReferenceCandidates("doc-1");
    const params = new URL(capturedUrl, "http://x").searchParams;
    expect(params.get("requirementId")).toBe("doc-1");
    expect(params.get("candidates")).toBe("true");
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      fileId: "fv-1",
      sourceCaseId: "case-2",
      sourceRequirementName: "パスポート写し",
      versionNo: 2,
      expiryDate: "2027-04-01",
    });
  });

  it("passes limit when provided", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (url.includes("/document-requirement-file-refs")) {
        capturedUrl = url;
        return jsonResponse([]);
      }
      return jsonResponse({ items: [] });
    });

    await repository.listReferenceCandidates("doc-1", { limit: 50 });
    const params = new URL(capturedUrl, "http://x").searchParams;
    expect(params.get("limit")).toBe("50");
  });

  it("returns empty array when API returns non-array", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/document-requirement-file-refs")) {
        return jsonResponse({ items: [] });
      }
      return jsonResponse({ items: [] });
    });
    const result = await repository.listReferenceCandidates("doc-1");
    expect(result).toEqual([]);
  });

  it("throws UNAUTHORIZED on 401", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/document-requirement-file-refs")) {
        return jsonResponse({ message: "Unauthorized" }, { status: 401 });
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.listReferenceCandidates("doc-1"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── linkRef ─────────────────────────────────────────────────────

describe("DocumentRepository.linkRef", () => {
  it("POSTs to /api/document-requirement-file-refs with requirementId + fileVersionId", async () => {
    let capturedUrl = "";
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      const url = String(input);
      if (
        url === "/api/document-requirement-file-refs" &&
        init?.method === "POST"
      ) {
        capturedUrl = url;
        capturedBody = typeof init.body === "string" ? init.body : "";
        return jsonResponse({
          id: "ref-1",
          requirementId: "doc-1",
          fileVersionId: "fv-1",
          refMode: "cross_case_link",
          createdAt: "2026-04-30T10:00:00Z",
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.linkRef({
      requirementId: "doc-1",
      fileVersionId: "fv-1",
    });
    expect(capturedUrl).toBe("/api/document-requirement-file-refs");
    expect(JSON.parse(capturedBody)).toEqual({
      requirementId: "doc-1",
      fileVersionId: "fv-1",
    });
    expect(result.id).toBe("ref-1");
    expect(result.refMode).toBe("cross_case_link");
  });

  it("includes linkedFromRequirementId when provided", async () => {
    let capturedBody = "";
    const repository = createDefaultRepo((input, init) => {
      if (
        String(input) === "/api/document-requirement-file-refs" &&
        init?.method === "POST"
      ) {
        capturedBody = typeof init.body === "string" ? init.body : "";
        return jsonResponse({
          id: "ref-2",
          requirementId: "doc-1",
          fileVersionId: "fv-1",
          refMode: "cross_case_link",
          createdAt: "2026-04-30T10:00:00Z",
        });
      }
      return jsonResponse({ items: [] });
    });

    await repository.linkRef({
      requirementId: "doc-1",
      fileVersionId: "fv-1",
      linkedFromRequirementId: "req-src",
    });
    expect(JSON.parse(capturedBody)).toMatchObject({
      linkedFromRequirementId: "req-src",
    });
  });

  it("throws S9_READONLY when case is archived", async () => {
    const repository = createDefaultRepo((input, init) => {
      if (
        String(input) === "/api/document-requirement-file-refs" &&
        init?.method === "POST"
      ) {
        return jsonResponse(
          { message: "DOCUMENT_ITEM_CASE_S9_READONLY: archived" },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.linkRef({ requirementId: "doc-1", fileVersionId: "fv-1" }),
    ).rejects.toMatchObject({ code: "S9_READONLY" });
  });

  it("throws VALIDATION on 400", async () => {
    const repository = createDefaultRepo((input, init) => {
      if (
        String(input) === "/api/document-requirement-file-refs" &&
        init?.method === "POST"
      ) {
        return jsonResponse(
          { message: "Invalid fileVersionId" },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.linkRef({ requirementId: "doc-1", fileVersionId: "bad" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

// ─── getSharedExpiryRisk ────────────────────────────────────────

describe("DocumentRepository.getSharedExpiryRisk", () => {
  it("GETs /api/document-assets/:id/shared-expiry-risk and maps result", async () => {
    let capturedUrl = "";
    const repository = createDefaultRepo((input) => {
      const url = String(input);
      if (
        url.includes("/document-assets/") &&
        url.includes("/shared-expiry-risk")
      ) {
        capturedUrl = url;
        return jsonResponse({
          assetId: "asset-1",
          latestVersionExpiryDate: "2026-03-31",
          riskStatus: "expired",
          daysUntilExpiry: -30,
          suggestions: ["refresh_version", "waive"],
          affectedCases: [
            {
              caseId: "case-1",
              caseNo: "A2026-001",
              caseName: "経営管理ビザ新規",
              caseStatus: "open",
              requirementId: "req-1",
              requirementName: "課税証明書",
              requirementStatus: "expired",
            },
          ],
        });
      }
      return jsonResponse({ items: [] });
    });

    const result = await repository.getSharedExpiryRisk("asset-1");
    expect(capturedUrl).toBe("/api/document-assets/asset-1/shared-expiry-risk");
    expect(result.versionInfo).toContain("2026-03-31");
    expect(result.versionInfo).toContain("过期");
    expect(result.affectedCases).toHaveLength(1);
    expect(result.affectedCases[0]).toMatchObject({
      caseId: "case-1",
      caseName: "経営管理ビザ新規",
      docName: "課税証明書",
    });
    expect(result.suggestedAction).toContain("新版本");
  });

  it("throws UNAUTHORIZED on 401", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/document-assets/")) {
        return jsonResponse({ message: "Unauthorized" }, { status: 401 });
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.getSharedExpiryRisk("asset-1"),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws BAD_RESPONSE on 400 (asset not found)", async () => {
    const repository = createDefaultRepo((input) => {
      if (String(input).includes("/document-assets/")) {
        return jsonResponse(
          { message: "Document asset not found" },
          { status: 400 },
        );
      }
      return jsonResponse({ items: [] });
    });
    await expect(
      repository.getSharedExpiryRisk("nonexistent"),
    ).rejects.toMatchObject({ code: "VALIDATION" });
  });
});
