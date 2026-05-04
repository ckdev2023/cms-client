import { describe, it, expect, vi } from "vitest";
import {
  createValidationRunsRepository,
  ValidationRunsRepositoryError,
} from "./ValidationRunsRepository";

function jsonResponse(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createMockFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Response,
) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(input, init),
  ) as unknown as typeof fetch;
}

describe("ValidationRunsRepository", () => {
  const STUB_TOKEN = "test-token";

  function createRepo(mockFetch: typeof fetch) {
    return createValidationRunsRepository({
      request: mockFetch,
      getToken: () => STUB_TOKEN,
    });
  }

  describe("createRun", () => {
    it("sends POST /api/validation-runs with caseId and returns result", async () => {
      const serverResponse = {
        id: "vr-001",
        caseId: "case-123",
        status: "running",
      };

      const mockFetch = createMockFetch((url, init) => {
        expect(url).toBe("/api/validation-runs");
        expect(init?.method).toBe("POST");
        expect(JSON.parse(init?.body as string)).toEqual({
          caseId: "case-123",
        });
        expect(init?.headers).toHaveProperty(
          "Authorization",
          `Bearer ${STUB_TOKEN}`,
        );
        return jsonResponse(serverResponse);
      });

      const repo = createRepo(mockFetch);
      const result = await repo.createRun({ caseId: "case-123" });

      expect(result).toEqual({
        id: "vr-001",
        caseId: "case-123",
        status: "running",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws on network failure", async () => {
      const mockFetch = vi.fn(async () => {
        throw new Error("Network error");
      }) as unknown as typeof fetch;

      const repo = createRepo(mockFetch);
      await expect(repo.createRun({ caseId: "case-1" })).rejects.toThrow(
        ValidationRunsRepositoryError,
      );
    });

    it("throws on 400 with server error code", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse(
          { errorCode: "CASE_S9_READONLY", message: "Case is readonly" },
          { status: 400 },
        ),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.createRun({ caseId: "case-1" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationRunsRepositoryError);
        const err = e as InstanceType<typeof ValidationRunsRepositoryError>;
        expect(err.serverErrorCode).toBe("CASE_S9_READONLY");
      }
    });

    it("throws on 401 unauthorized", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse({ message: "Unauthorized" }, { status: 401 }),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.createRun({ caseId: "case-1" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationRunsRepositoryError);
        const err = e as InstanceType<typeof ValidationRunsRepositoryError>;
        expect(err.code).toBe("UNAUTHORIZED");
      }
    });

    it("throws on invalid response body", async () => {
      const mockFetch = createMockFetch(() => jsonResponse({ noId: true }));

      const repo = createRepo(mockFetch);
      await expect(repo.createRun({ caseId: "case-1" })).rejects.toThrow(
        "Invalid validation run response",
      );
    });
  });
});
