import { describe, expect, it, vi } from "vitest";
import type { ReminderRecord, TaskRecord } from "../types";
import {
  useTaskWorkbenchModel,
  type TaskWorkbenchCompleteEvent,
} from "./useTaskWorkbenchModel";
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
    caseNo: "CASE-202604-0011",
    targetType: "customer",
    targetId: "customer-001",
    remindAt: "2026-04-30T00:00:00.000Z",
    recipientType: "user",
    recipientId: "user-001",
    recipientName: "Local Admin",
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

  it("panelTotal mirrors active-view counts (not raw server total)", async () => {
    const repo = createRepoStub(
      [
        createTask({ id: "today-pending", dueAt: "2026-04-29T10:00:00.000Z" }),
        createTask({
          id: "overdue-pending",
          dueAt: "2026-04-28T10:00:00.000Z",
        }),
        createTask({
          id: "completed",
          status: "completed",
          dueAt: "2026-04-29T09:00:00.000Z",
          completedAt: "2026-04-29T09:30:00.000Z",
        }),
        createTask({
          id: "cancelled",
          status: "cancelled",
          dueAt: "2026-04-29T11:00:00.000Z",
        }),
      ],
      [createReminder()],
    );
    const model = useTaskWorkbenchModel({
      repo,
      now: () => new Date("2026-04-29T00:00:00.000Z"),
    });

    await model.fetchWorkbench();

    expect(model.taskTotal.value).toBe(4);
    expect(model.panelTotal.value).toBe(model.counts.value.pending);
    expect(model.panelTotal.value).toBe(2);

    model.setActiveView("today");
    expect(model.panelTotal.value).toBe(model.counts.value.today);
    expect(model.panelTotal.value).toBe(1);

    model.setActiveView("overdue");
    expect(model.panelTotal.value).toBe(model.counts.value.overdue);
    expect(model.panelTotal.value).toBe(1);

    model.setActiveView("reminders");
    expect(model.panelTotal.value).toBe(model.counts.value.reminders);
    expect(model.panelTotal.value).toBe(1);

    model.setActiveView("pending");
    await model.completeTask("today-pending");

    expect(model.counts.value.pending).toBe(1);
    expect(model.panelTotal.value).toBe(1);
    expect(model.taskTotal.value).toBe(4);
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

  it("notifies success and refreshes lastUpdatedAt after completing a task", async () => {
    const repo = createRepoStub([createTask({ id: "task-321" })]);
    const events: TaskWorkbenchCompleteEvent[] = [];
    let nowCount = 0;
    const model = useTaskWorkbenchModel({
      repo,
      now: () => {
        nowCount += 1;
        return new Date(`2026-04-29T00:00:0${nowCount}.000Z`);
      },
      notifyComplete: (event) => events.push(event),
    });

    await model.fetchWorkbench();
    const fetchedAt = model.lastUpdatedAt.value;
    expect(fetchedAt).not.toBeNull();

    await model.completeTask("task-321");

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("success");
    expect(events[0]?.taskId).toBe("task-321");
    expect(events[0]?.task?.status).toBe("completed");
    expect(model.lastCompletedTask.value?.id).toBe("task-321");
    expect(model.lastUpdatedAt.value).not.toBe(fetchedAt);
  });

  it("notifies error and preserves prior lastUpdatedAt when completion rejects", async () => {
    const repo = createRepoStub([createTask({ id: "task-err" })]);
    (repo.completeTask as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("network down"),
    );
    const events: TaskWorkbenchCompleteEvent[] = [];
    const fixedFetch = new Date("2026-04-29T00:00:00.000Z");
    let calls = 0;
    const model = useTaskWorkbenchModel({
      repo,
      now: () => {
        calls += 1;
        return calls === 1 ? fixedFetch : new Date("2026-04-29T01:00:00.000Z");
      },
      notifyComplete: (event) => events.push(event),
    });

    await model.fetchWorkbench();
    const beforeCompletion = model.lastUpdatedAt.value;

    await model.completeTask("task-err");

    expect(events).toHaveLength(1);
    expect(events[0]?.kind).toBe("error");
    expect(events[0]?.taskId).toBe("task-err");
    expect(model.error.value).toBe("任务完成操作失败，请稍后重试。");
    expect(model.lastUpdatedAt.value).toBe(beforeCompletion);
    expect(model.lastCompletedTask.value).toBeNull();
  });

  it("ignores empty task ids without calling repo or notifier", async () => {
    const repo = createRepoStub();
    const events: TaskWorkbenchCompleteEvent[] = [];
    const model = useTaskWorkbenchModel({
      repo,
      notifyComplete: (event) => events.push(event),
    });

    await model.completeTask("   ");

    expect(repo.completeTask).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });
});
