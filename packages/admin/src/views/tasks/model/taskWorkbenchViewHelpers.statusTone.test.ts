import { describe, expect, it } from "vitest";
import type { TaskRecord } from "../types";
import { isTaskOverdue, taskRowTone } from "./taskWorkbenchViewHelpers";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-tone-001",
    caseId: "case-001",
    title: "状态药丸示例",
    description: null,
    taskType: "general",
    assigneeUserId: "user-001",
    priority: "normal",
    dueAt: "2026-05-02T11:00:00.000Z",
    status: "pending",
    sourceType: null,
    sourceId: null,
    completedAt: null,
    caseNo: "CASE-202604-0011",
    caseName: "示例案件",
    assigneeName: "Local Admin",
    createdAt: "2026-05-01T00:00:00.000Z",
    updatedAt: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("isTaskOverdue", () => {
  const reference = new Date("2026-05-02T12:00:00.000Z");

  it("returns true for pending task whose dueAt is strictly before reference", () => {
    const task = createTask({
      status: "pending",
      dueAt: "2026-05-01T00:00:00.000Z",
    });
    expect(isTaskOverdue(task, reference)).toBe(true);
  });

  it("returns true for in_progress task whose dueAt is before reference", () => {
    const task = createTask({
      status: "in_progress",
      dueAt: "2026-05-02T11:59:59.999Z",
    });
    expect(isTaskOverdue(task, reference)).toBe(true);
  });

  it("returns false when dueAt equals reference (not strictly before)", () => {
    const task = createTask({
      status: "pending",
      dueAt: reference.toISOString(),
    });
    expect(isTaskOverdue(task, reference)).toBe(false);
  });

  it("returns false for completed tasks even if dueAt is in the past", () => {
    const task = createTask({
      status: "completed",
      dueAt: "2026-05-01T00:00:00.000Z",
    });
    expect(isTaskOverdue(task, reference)).toBe(false);
  });

  it("returns false for cancelled tasks", () => {
    const task = createTask({
      status: "cancelled",
      dueAt: "2026-05-01T00:00:00.000Z",
    });
    expect(isTaskOverdue(task, reference)).toBe(false);
  });

  it("returns false when dueAt is null", () => {
    const task = createTask({ status: "pending", dueAt: null });
    expect(isTaskOverdue(task, reference)).toBe(false);
  });

  it("returns false when dueAt is unparseable", () => {
    const task = createTask({ status: "pending", dueAt: "not-a-date" });
    expect(isTaskOverdue(task, reference)).toBe(false);
  });
});

describe("taskRowTone — status-driven (BUG: status pill must not inherit priority color)", () => {
  it("maps completed tasks to success regardless of priority", () => {
    const task = createTask({ status: "completed", priority: "urgent" });
    expect(taskRowTone(task)).toBe("success");
  });

  it("maps cancelled tasks to muted regardless of priority", () => {
    const task = createTask({ status: "cancelled", priority: "urgent" });
    expect(taskRowTone(task)).toBe("muted");
  });

  it("returns danger only when caller flags the task as overdue", () => {
    const task = createTask({ status: "pending", priority: "urgent" });
    expect(taskRowTone(task, true)).toBe("danger");
  });

  it("does NOT color a non-overdue urgent pending task as danger", () => {
    const task = createTask({ status: "pending", priority: "urgent" });
    expect(taskRowTone(task, false)).toBe("neutral");
  });

  it("does NOT color a non-overdue high-priority pending task as warning", () => {
    const task = createTask({ status: "pending", priority: "high" });
    expect(taskRowTone(task, false)).toBe("neutral");
  });

  it("maps in_progress (non-overdue) to info", () => {
    const task = createTask({ status: "in_progress", priority: "high" });
    expect(taskRowTone(task, false)).toBe("info");
  });

  it("maps in_progress + overdue to danger (overdue dominates)", () => {
    const task = createTask({ status: "in_progress", priority: "low" });
    expect(taskRowTone(task, true)).toBe("danger");
  });

  it("maps plain pending to neutral when no overdue flag", () => {
    const task = createTask({ status: "pending", priority: "normal" });
    expect(taskRowTone(task)).toBe("neutral");
  });
});
