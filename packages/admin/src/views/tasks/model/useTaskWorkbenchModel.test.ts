import { describe, expect, it, vi } from "vitest";
import type { ReminderRecord, TaskRecord } from "../types";
import { useTaskWorkbenchModel } from "./useTaskWorkbenchModel";
import type { TaskRepository } from "./TaskRepository";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-001",
    caseId: "case-001",
    title: "催客户补课税证明",
    description: null,
    taskType: "document_follow_up",
    assigneeUserId: "user-001",
    priority: "high",
    dueAt: "2026-04-29T10:00:00.000Z",
    status: "pending",
    sourceType: "reminder",
    sourceId: "rem-001",
    completedAt: null,
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T09:00:00.000Z",
    ...overrides,
  };
}

function createReminder(
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    id: "rem-001",
    caseId: "case-001",
    targetType: "customer",
    targetId: "customer-001",
    remindAt: "2026-04-30T00:00:00.000Z",
    recipientType: "user",
    recipientId: "user-001",
    channel: "in_app",
    dedupeKey: "residence_period:1:180",
    sendStatus: "pending",
    retryCount: 0,
    sentAt: null,
    payloadSnapshot: {
      daysBefore: 180,
      statusOfResidence: "経営・管理",
    },
    createdAt: "2026-04-28T09:00:00.000Z",
    updatedAt: "2026-04-28T09:00:00.000Z",
    ...overrides,
  };
}

function createRepoStub(
  tasks: TaskRecord[] = [createTask()],
  reminders: ReminderRecord[] = [createReminder()],
): TaskRepository {
  return {
    listTasks: vi.fn(async () => ({ items: tasks, total: tasks.length })),
    listReminders: vi.fn(async () => ({
      items: reminders,
      total: reminders.length,
    })),
    completeTask: vi.fn(async (id: string) =>
      createTask({
        id,
        status: "completed",
        completedAt: "2026-04-29T12:00:00.000Z",
      }),
    ),
  };
}

describe("useTaskWorkbenchModel", () => {
  it("loads tasks and reminders together", async () => {
    const repo = createRepoStub();
    const model = useTaskWorkbenchModel({
      repo,
      now: () => new Date("2026-04-29T00:00:00.000Z"),
    });

    await model.fetchWorkbench();

    expect(repo.listTasks).toHaveBeenCalledWith({ limit: 200 });
    expect(repo.listReminders).toHaveBeenCalledWith({ limit: 200 });
    expect(model.counts.value.pending).toBe(1);
    expect(model.counts.value.reminders).toBe(1);
    expect(model.error.value).toBeNull();
  });

  it("derives today and overdue views from active tasks", async () => {
    const repo = createRepoStub([
      createTask({ id: "today", dueAt: "2026-04-29T10:00:00.000Z" }),
      createTask({ id: "overdue", dueAt: "2026-04-28T10:00:00.000Z" }),
      createTask({
        id: "done",
        status: "completed",
        dueAt: "2026-04-29T09:00:00.000Z",
      }),
    ]);
    const model = useTaskWorkbenchModel({
      repo,
      now: () => new Date("2026-04-29T00:00:00.000Z"),
    });

    await model.fetchWorkbench();

    expect(model.counts.value.pending).toBe(2);
    expect(model.counts.value.today).toBe(1);
    expect(model.counts.value.overdue).toBe(1);

    model.setActiveView("today");
    expect(model.currentTasks.value.map((item) => item.id)).toEqual(["today"]);

    model.setActiveView("overdue");
    expect(model.currentTasks.value.map((item) => item.id)).toEqual([
      "overdue",
    ]);
  });

  it("marks a task completed and removes it from open counts", async () => {
    const repo = createRepoStub([createTask({ id: "task-123" })]);
    const model = useTaskWorkbenchModel({
      repo,
      now: () => new Date("2026-04-29T00:00:00.000Z"),
    });

    await model.fetchWorkbench();
    await model.completeTask("task-123");

    expect(repo.completeTask).toHaveBeenCalledWith("task-123");
    expect(model.counts.value.pending).toBe(0);
    expect(model.tasks.value[0]?.status).toBe("completed");
  });

  it("surfaces fetch failures with a stable message", async () => {
    const repo = createRepoStub();
    (repo.listTasks as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );
    const model = useTaskWorkbenchModel({ repo });

    await model.fetchWorkbench();

    expect(model.error.value).toBe("任务与提醒加载失败，请稍后重试。");
    expect(model.loading.value).toBe(false);
  });
});
