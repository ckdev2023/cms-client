import { describe, expect, it } from "vitest";
import { createTaskWorkbenchToastNotifier } from "./useTaskWorkbenchToast";
import type { TaskWorkbenchCompleteEvent } from "./useTaskWorkbenchModel";
import type { TaskRecord } from "../types";

interface CapturedToast {
  title: string;
  description?: string;
  tone?: "success" | "info" | "warning" | "error";
}

function createToastSink() {
  const items: CapturedToast[] = [];
  return {
    items,
    add(input: CapturedToast): string {
      items.push(input);
      return `toast-${items.length}`;
    },
  };
}

function makeT() {
  return (key: string, named?: Record<string, string | number>): string => {
    if (key === "tasks.workbench.toast.completedTitle") return "Task completed";
    if (key === "tasks.workbench.toast.completedDescription") {
      return `'${String(named?.title)}' closed.`;
    }
    if (key === "tasks.workbench.toast.completedFallbackTitle") return "Task";
    if (key === "tasks.workbench.toast.failedTitle")
      return "Could not complete task";
    if (key === "tasks.workbench.toast.failedDescription")
      return "Please retry.";
    return key;
  };
}

function makeTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    caseId: null,
    title: "MCP-E2E: pending+today",
    description: null,
    taskType: "general",
    assigneeUserId: null,
    priority: "high",
    dueAt: "2026-05-02T11:00:00.000Z",
    status: "completed",
    sourceType: null,
    sourceId: null,
    completedAt: "2026-05-02T11:30:00.000Z",
    caseNo: null,
    caseName: null,
    assigneeName: null,
    createdAt: "2026-05-02T08:00:00.000Z",
    updatedAt: "2026-05-02T11:30:00.000Z",
    ...overrides,
  };
}

describe("createTaskWorkbenchToastNotifier", () => {
  it("dispatches a success toast carrying the completed task title", () => {
    const sink = createToastSink();
    const notifier = createTaskWorkbenchToastNotifier(sink, makeT());

    const event: TaskWorkbenchCompleteEvent = {
      kind: "success",
      taskId: "task-1",
      task: makeTask(),
    };
    notifier(event);

    expect(sink.items).toEqual([
      {
        title: "Task completed",
        description: "'MCP-E2E: pending+today' closed.",
        tone: "success",
      },
    ]);
  });

  it("falls back to a generic title when the completed task has no title", () => {
    const sink = createToastSink();
    const notifier = createTaskWorkbenchToastNotifier(sink, makeT());

    notifier({
      kind: "success",
      taskId: "task-2",
      task: makeTask({ title: "   " }),
    });

    expect(sink.items[0]?.description).toBe("'Task' closed.");
  });

  it("dispatches an error toast on failure with no task payload", () => {
    const sink = createToastSink();
    const notifier = createTaskWorkbenchToastNotifier(sink, makeT());

    notifier({ kind: "error", taskId: "task-3" });

    expect(sink.items).toEqual([
      {
        title: "Could not complete task",
        description: "Please retry.",
        tone: "error",
      },
    ]);
  });
});
