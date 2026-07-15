import { describe, it, expect, vi } from "vitest";
import {
  createReviewRecordsRepository,
  ReviewRecordsRepositoryError,
} from "./ReviewRecordsRepository";

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

describe("ReviewRecordsRepository", () => {
  const STUB_TOKEN = "test-token";

  function createRepo(mockFetch: typeof fetch) {
    return createReviewRecordsRepository({
      request: mockFetch,
      getToken: () => STUB_TOKEN,
    });
  }

  describe("createReviewRequest", () => {
    it("sends POST /api/review-records with caseId and returns result", async () => {
      const serverResponse = {
        id: "rr-001",
        caseId: "case-123",
        status: "pending",
      };

      const mockFetch = createMockFetch((url, init) => {
        expect(url).toBe("/api/review-records");
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
      const result = await repo.createReviewRequest({ caseId: "case-123" });

      expect(result).toEqual({
        id: "rr-001",
        caseId: "case-123",
        status: "pending",
      });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws on network failure", async () => {
      const mockFetch = vi.fn(async () => {
        throw new Error("Network error");
      }) as unknown as typeof fetch;

      const repo = createRepo(mockFetch);
      await expect(
        repo.createReviewRequest({ caseId: "case-1" }),
      ).rejects.toThrow(ReviewRecordsRepositoryError);
    });

    it("throws on 400 with server error code", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse(
          {
            errorCode: "REVIEW_ALREADY_PENDING",
            message: "Review already pending",
          },
          { status: 400 },
        ),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.createReviewRequest({ caseId: "case-1" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ReviewRecordsRepositoryError);
        const err = e as InstanceType<typeof ReviewRecordsRepositoryError>;
        expect(err.serverErrorCode).toBe("REVIEW_ALREADY_PENDING");
      }
    });

    it("throws on 401 unauthorized", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse({ message: "Unauthorized" }, { status: 401 }),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.createReviewRequest({ caseId: "case-1" });
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(ReviewRecordsRepositoryError);
        const err = e as InstanceType<typeof ReviewRecordsRepositoryError>;
        expect(err.code).toBe("UNAUTHORIZED");
      }
    });

    it("throws on invalid response body", async () => {
      const mockFetch = createMockFetch(() => jsonResponse({ noId: true }));

      const repo = createRepo(mockFetch);
      await expect(
        repo.createReviewRequest({ caseId: "case-1" }),
      ).rejects.toThrow("Invalid review record response");
    });
  });
});
