import { describe, expect, it, vi } from "vitest";
import { createTaskRepository } from "./TaskRepository";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function createRequestStub(body: unknown) {
  return vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
}

describe("createTaskRepository", () => {
  it("lists tasks via /api/tasks and adapts list payload", async () => {
    const request = createRequestStub({
      items: [
        {
          id: "task-001",
          title: "催客户补件",
          status: "pending",
          priority: "high",
          taskType: "document_follow_up",
          caseId: "case-001",
          createdAt: "2026-04-28T09:00:00.000Z",
          updatedAt: "2026-04-28T09:00:00.000Z",
        },
      ],
      total: 1,
    });

    const repo = createTaskRepository({ request, getToken: () => "token-1" });
    const result = await repo.listTasks({ status: "pending", limit: 20 });

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      id: "task-001",
      title: "催客户补件",
      status: "pending",
      caseId: "case-001",
    });

    const [url, init] = vi.mocked(request).mock.calls[0]!;
    expect(String(url)).toContain("/api/tasks");
    expect(String(url)).toContain("status=pending");
    expect(init?.method).toBe("GET");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-1",
    );
  });

  it("lists reminders via /api/reminders", async () => {
    const request = createRequestStub({
      items: [
        {
          id: "rem-001",
          remindAt: "2026-05-01T00:00:00.000Z",
          sendStatus: "pending",
          targetType: "customer",
          targetId: "customer-001",
          payloadSnapshot: { daysBefore: 90 },
          createdAt: "2026-04-28T09:00:00.000Z",
          updatedAt: "2026-04-28T09:00:00.000Z",
        },
      ],
      total: 1,
    });

    const repo = createTaskRepository({ request, getToken: () => "token-2" });
    const result = await repo.listReminders({
      sendStatus: "pending",
      limit: 10,
    });

    expect(result.total).toBe(1);
    expect(result.items[0]?.payloadSnapshot).toEqual({ daysBefore: 90 });

    const [url, init] = vi.mocked(request).mock.calls[0]!;
    expect(String(url)).toContain("/api/reminders");
    expect(String(url)).toContain("sendStatus=pending");
    expect(init?.method).toBe("GET");
  });

  it("completes a task via POST /api/tasks/:id/complete", async () => {
    const request = createRequestStub({
      id: "task-123",
      title: "催客户补件",
      status: "completed",
      priority: "normal",
      taskType: "general",
      createdAt: "2026-04-28T09:00:00.000Z",
      updatedAt: "2026-04-29T09:00:00.000Z",
    });

    const repo = createTaskRepository({ request, getToken: () => "token-3" });
    const result = await repo.completeTask("task-123");

    expect(result.status).toBe("completed");

    const [url, init] = vi.mocked(request).mock.calls[0]!;
    expect(String(url)).toContain("/api/tasks/task-123/complete");
    expect(init?.method).toBe("POST");
  });
});
