import { describe, expect, it, vi } from "vitest";
import { createTaskRepository } from "./TaskRepository";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CREATED_TASK = {
  id: "task-new-001",
  caseId: "case-123",
  title: "提出資料確認",
  description: "確認必要書類",
  taskType: "manual",
  assigneeUserId: "user-001",
  priority: "high",
  dueAt: "2026-05-10T00:00:00.000Z",
  status: "pending",
  sourceType: null,
  sourceId: null,
  completedAt: null,
  caseNo: "CASE-202604-0018",
  caseName: "田中太郎",
  assigneeName: "佐藤花子",
  createdAt: "2026-05-03T00:00:00.000Z",
  updatedAt: "2026-05-03T00:00:00.000Z",
};

describe("TaskRepository.createTask (BUG-217)", () => {
  it("sends POST /api/tasks with correct payload", async () => {
    const request = vi.fn(async () =>
      jsonResponse(CREATED_TASK),
    ) as unknown as typeof fetch;

    const repo = createTaskRepository({ request, getToken: () => "jwt-abc" });
    const result = await repo.createTask({
      caseId: "case-123",
      title: "提出資料確認",
      description: "確認必要書類",
      taskType: "manual",
      assigneeUserId: "user-001",
      priority: "high",
      dueAt: "2026-05-10T00:00:00.000Z",
    });

    expect(result.id).toBe("task-new-001");
    expect(result.title).toBe("提出資料確認");
    expect(result.status).toBe("pending");
    expect(result.caseId).toBe("case-123");

    const [url, init] = vi.mocked(request).mock.calls[0]!;
    expect(String(url)).toBe("/api/tasks");
    expect(init?.method).toBe("POST");
    expect((init?.headers as Record<string, string>).Authorization).toBe(
      "Bearer jwt-abc",
    );

    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body.title).toBe("提出資料確認");
    expect(body.caseId).toBe("case-123");
    expect(body.priority).toBe("high");
    expect(body.taskType).toBe("manual");
    expect(body.dueAt).toBe("2026-05-10T00:00:00.000Z");
    expect(body.description).toBe("確認必要書類");
    expect(body.assigneeUserId).toBe("user-001");
  });

  it("omits optional fields when not provided", async () => {
    const request = vi.fn(async () =>
      jsonResponse({
        ...CREATED_TASK,
        description: null,
        assigneeUserId: null,
        dueAt: null,
      }),
    ) as unknown as typeof fetch;

    const repo = createTaskRepository({ request, getToken: () => "t" });
    await repo.createTask({ title: "最小タスク" });

    const body = JSON.parse(
      vi.mocked(request).mock.calls[0]![1]?.body as string,
    ) as Record<string, unknown>;
    expect(body.title).toBe("最小タスク");
    expect(body).not.toHaveProperty("caseId");
    expect(body).not.toHaveProperty("description");
    expect(body).not.toHaveProperty("assigneeUserId");
    expect(body).not.toHaveProperty("dueAt");
  });

  it("throws VALIDATION_ERROR for blank title", async () => {
    const request = vi.fn() as unknown as typeof fetch;
    const repo = createTaskRepository({ request, getToken: () => "t" });

    await expect(repo.createTask({ title: "   " })).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      message: "Task title is required",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("propagates server error as TaskRepositoryError", async () => {
    const request = vi.fn(async () =>
      jsonResponse({ message: "title is required" }, 400),
    ) as unknown as typeof fetch;

    const repo = createTaskRepository({ request, getToken: () => "t" });
    await expect(repo.createTask({ title: "test" })).rejects.toMatchObject({
      name: "TaskRepositoryError",
    });
  });

  it("includes caseId in payload when provided", async () => {
    const request = vi.fn(async () =>
      jsonResponse(CREATED_TASK),
    ) as unknown as typeof fetch;

    const repo = createTaskRepository({ request, getToken: () => "t" });
    await repo.createTask({ caseId: "case-xyz", title: "test task" });

    const body = JSON.parse(
      vi.mocked(request).mock.calls[0]![1]?.body as string,
    ) as Record<string, unknown>;
    expect(body.caseId).toBe("case-xyz");
  });
});
