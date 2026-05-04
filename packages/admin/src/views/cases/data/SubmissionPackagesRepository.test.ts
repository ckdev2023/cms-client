import { describe, it, expect, vi } from "vitest";
import {
  createSubmissionPackagesRepository,
  SubmissionPackagesRepositoryError,
} from "./SubmissionPackagesRepository";

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

describe("SubmissionPackagesRepository", () => {
  const STUB_TOKEN = "test-token";

  function createRepo(mockFetch: typeof fetch) {
    return createSubmissionPackagesRepository({
      request: mockFetch,
      getToken: () => STUB_TOKEN,
    });
  }

  describe("create", () => {
    const validInput = {
      caseId: "case-123",
      submissionKind: "initial" as const,
      items: [{ itemType: "field_snapshot", refId: "case-123" }],
    };

    it("sends POST /api/submission-packages with correct payload", async () => {
      const serverResponse = { id: "sp-001", caseId: "case-123" };

      const mockFetch = createMockFetch((url, init) => {
        expect(url).toBe("/api/submission-packages");
        expect(init?.method).toBe("POST");
        const body = JSON.parse(init?.body as string);
        expect(body.caseId).toBe("case-123");
        expect(body.submissionKind).toBe("initial");
        expect(body.items).toHaveLength(1);
        expect(init?.headers).toHaveProperty(
          "Authorization",
          `Bearer ${STUB_TOKEN}`,
        );
        return jsonResponse(serverResponse);
      });

      const repo = createRepo(mockFetch);
      const result = await repo.create(validInput);

      expect(result).toEqual({ id: "sp-001", caseId: "case-123" });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("throws on network failure", async () => {
      const mockFetch = vi.fn(async () => {
        throw new Error("Network error");
      }) as unknown as typeof fetch;

      const repo = createRepo(mockFetch);
      await expect(repo.create(validInput)).rejects.toThrow(
        SubmissionPackagesRepositoryError,
      );
    });

    it("throws with SP error code on 400", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse(
          {
            errorCode: "SP_CASE_STAGE_INVALID",
            message: "SP_CASE_STAGE_INVALID: Stage does not allow submission",
          },
          { status: 400 },
        ),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.create(validInput);
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SubmissionPackagesRepositoryError);
        const err = e as InstanceType<typeof SubmissionPackagesRepositoryError>;
        expect(err.serverErrorCode).toBe("SP_CASE_STAGE_INVALID");
      }
    });

    it("throws with gate error code on 400", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse(
          {
            errorCode: "CASE_GATE_VALIDATION_RUN_MISSING",
            message: "No validation run",
          },
          { status: 400 },
        ),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.create(validInput);
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SubmissionPackagesRepositoryError);
        const err = e as InstanceType<typeof SubmissionPackagesRepositoryError>;
        expect(err.serverErrorCode).toBe("CASE_GATE_VALIDATION_RUN_MISSING");
      }
    });

    it("throws on 401 unauthorized", async () => {
      const mockFetch = createMockFetch(() =>
        jsonResponse({ message: "Unauthorized" }, { status: 401 }),
      );

      const repo = createRepo(mockFetch);
      try {
        await repo.create(validInput);
        expect.fail("should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(SubmissionPackagesRepositoryError);
        const err = e as InstanceType<typeof SubmissionPackagesRepositoryError>;
        expect(err.code).toBe("UNAUTHORIZED");
      }
    });

    it("throws on invalid response body", async () => {
      const mockFetch = createMockFetch(() => jsonResponse({ noId: true }));

      const repo = createRepo(mockFetch);
      await expect(repo.create(validInput)).rejects.toThrow(
        "Invalid create submission package response",
      );
    });

    it("defaults submissionKind to 'initial' when not specified", async () => {
      const mockFetch = createMockFetch((_url, init) => {
        const body = JSON.parse(init?.body as string);
        expect(body.submissionKind).toBe("initial");
        return jsonResponse({ id: "sp-002", caseId: "case-1" });
      });

      const repo = createRepo(mockFetch);
      await repo.create({
        caseId: "case-1",
        items: [{ itemType: "field_snapshot", refId: "case-1" }],
      });
    });
  });
});
