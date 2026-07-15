import { describe, it, expect, vi } from "vitest";
import { createCaseRepository } from "./CaseRepository";

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

describe("CaseRepository.finalizeGeneratedDocument", () => {
  it("posts to /api/generated-documents/:id/finalize and returns result", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/generated-documents/gd-001/finalize");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeUndefined();
      return jsonResponse({ id: "gd-001", status: "final" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.finalizeGeneratedDocument("gd-001");

    expect(result).toEqual(
      expect.objectContaining({ id: "gd-001", status: "final" }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("uses custom apiPath to derive finalize URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/custom/generated-documents/gd-002/finalize");
      return jsonResponse({ id: "gd-002" });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    const result = await repo.finalizeGeneratedDocument("gd-002");
    expect(result.id).toBe("gd-002");
  });

  it("sends auth header when token is available", async () => {
    const request = createRequestMock((_, init) => {
      expect(init?.headers).toEqual(
        expect.objectContaining({ Authorization: "Bearer jwt-xyz" }),
      );
      return jsonResponse({ id: "gd-003" });
    });

    const repo = createCaseRepository({ request, getToken: () => "jwt-xyz" });
    await repo.finalizeGeneratedDocument("gd-003");
    expect(request).toHaveBeenCalled();
  });

  it("propagates server error as CaseRepositoryError", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Document not found" }, { status: 404 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(
      repo.finalizeGeneratedDocument("nonexistent"),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
    });
  });

  it("propagates server errorCode as CASE_WRITE_ERROR", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          message: "GD_INVALID_TRANSITION: cannot finalize exported document",
          errorCode: "GD_INVALID_TRANSITION",
        },
        { status: 422 },
      ),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(
      repo.finalizeGeneratedDocument("gd-exported"),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "CASE_WRITE_ERROR",
      serverErrorCode: "GD_INVALID_TRANSITION",
    });
  });

  it("throws NETWORK error when fetch fails", async () => {
    const request = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(
      repo.finalizeGeneratedDocument("gd-net"),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "NETWORK",
    });
  });
});
