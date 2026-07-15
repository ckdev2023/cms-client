import { describe, expect, it, vi } from "vitest";
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

describe("CaseRepository.completeTask", () => {
  it("posts to /api/tasks/:id/complete and returns result", async () => {
    const request = createRequestMock((input, init) => {
      expect(String(input)).toBe("/api/tasks/task-001/complete");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeUndefined();
      return jsonResponse({ id: "task-001", status: "completed" });
    });

    const repo = createCaseRepository({ request, getToken: () => "t" });
    const result = await repo.completeTask("task-001");

    expect(result).toEqual(
      expect.objectContaining({ id: "task-001", status: "completed" }),
    );
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("uses custom apiPath to derive tasks URL", async () => {
    const request = createRequestMock((input) => {
      expect(String(input)).toBe("/custom/tasks/task-002/complete");
      return jsonResponse({ id: "task-002" });
    });

    const repo = createCaseRepository({
      request,
      getToken: () => "t",
      apiPath: "/custom/cases",
    });
    const result = await repo.completeTask("task-002");
    expect(result.id).toBe("task-002");
  });

  it("sends auth header when token is available", async () => {
    const request = createRequestMock((_, init) => {
      expect(init?.headers).toEqual(
        expect.objectContaining({ Authorization: "Bearer jwt-xyz" }),
      );
      return jsonResponse({ id: "task-003" });
    });

    const repo = createCaseRepository({ request, getToken: () => "jwt-xyz" });
    await repo.completeTask("task-003");
    expect(request).toHaveBeenCalled();
  });

  it("propagates server error as CaseRepositoryError", async () => {
    const request = createRequestMock(() =>
      jsonResponse({ message: "Task not found" }, { status: 404 }),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.completeTask("nonexistent")).rejects.toMatchObject({
      name: "CaseRepositoryError",
    });
  });

  it("propagates server error with errorCode as CASE_WRITE_ERROR", async () => {
    const request = createRequestMock(() =>
      jsonResponse(
        {
          message: "TASK_ALREADY_COMPLETED: task is already done",
          errorCode: "TASK_ALREADY_COMPLETED",
        },
        { status: 422 },
      ),
    );
    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.completeTask("task-done")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "CASE_WRITE_ERROR",
      serverErrorCode: "TASK_ALREADY_COMPLETED",
    });
  });

  it("throws NETWORK error when fetch fails", async () => {
    const request = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;

    const repo = createCaseRepository({ request, getToken: () => "t" });
    await expect(repo.completeTask("task-net")).rejects.toMatchObject({
      name: "CaseRepositoryError",
      code: "NETWORK",
    });
  });
});
