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

describe("CaseRepository.deleteDraftGeneratedDocument", () => {
  it("DELETE /api/generated-documents/:id returns result", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/generated-documents/gd-010");
      expect(init?.method).toBe("DELETE");
      expect(init?.body).toBeUndefined();
      return jsonResponse({ id: "gd-010" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.deleteDraftGeneratedDocument("gd-010");

    expect(result).toEqual(expect.objectContaining({ id: "gd-010" }));
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("uses custom apiPath to derive delete URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/custom/generated-documents/gd-011");
      return jsonResponse({ id: "gd-011" });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    const result = await repo.deleteDraftGeneratedDocument("gd-011");
    expect(result.id).toBe("gd-011");
  });

  it("propagates server errorCode when delete rejected", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          message: "GD_DELETE_ONLY_DRAFT: cannot delete",
          errorCode: "GD_DELETE_ONLY_DRAFT",
        },
        { status: 400 },
      ),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(
      repo.deleteDraftGeneratedDocument("gd-x"),
    ).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "CASE_WRITE_ERROR",
      serverErrorCode: "GD_DELETE_ONLY_DRAFT",
    });
  });
});
