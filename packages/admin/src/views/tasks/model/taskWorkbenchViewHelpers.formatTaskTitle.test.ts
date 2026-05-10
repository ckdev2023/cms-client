import { describe, expect, it, vi } from "vitest";
import type { TaskRecord } from "../types";
import { formatTaskWorkbenchTitle } from "./taskWorkbenchViewHelpers";

function baseTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "t-1",
    caseId: "c-1",
    title: "サーバー生タイトル",
    description: null,
    taskType: "general",
    assigneeUserId: null,
    priority: "normal",
    dueAt: null,
    status: "pending",
    sourceType: null,
    sourceId: null,
    completedAt: null,
    caseNo: null,
    caseName: null,
    assigneeName: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("formatTaskWorkbenchTitle", () => {
  it("uses titleI18nKey when present", () => {
    const t = vi.fn((k: string) =>
      k === "cases.detail.tasks.initial.clientContact" ? "ZH" : k,
    );
    const label = formatTaskWorkbenchTitle(
      baseTask({
        titleI18nKey: "cases.detail.tasks.initial.clientContact",
      }),
      t,
    );
    expect(label).toBe("ZH");
    expect(t).toHaveBeenCalledWith("cases.detail.tasks.initial.clientContact");
  });

  it("falls back to raw title when no titleI18nKey", () => {
    const t = vi.fn();
    expect(formatTaskWorkbenchTitle(baseTask({ title: "保持" }), t)).toBe(
      "保持",
    );
    expect(t).not.toHaveBeenCalled();
  });
});
