import { describe, it, expect } from "vitest";
import {
  buildCreateTaskPayload,
  buildTasksPostUrl,
} from "./CaseAdapterTaskWriteBuilders";

describe("buildCreateTaskPayload", () => {
  it("builds minimal payload with required fields only", () => {
    const result = buildCreateTaskPayload({
      caseId: "CASE-001",
      title: "Follow up",
      priority: "normal",
    });
    expect(result).toEqual({
      caseId: "CASE-001",
      title: "Follow up",
      priority: "normal",
    });
    expect(result).not.toHaveProperty("description");
    expect(result).not.toHaveProperty("dueAt");
    expect(result).not.toHaveProperty("assigneeUserId");
  });

  it("includes optional fields when provided", () => {
    const result = buildCreateTaskPayload({
      caseId: "CASE-002",
      title: "Review docs",
      priority: "high",
      description: "Check all attachments",
      dueAt: "2026-06-01T00:00:00.000Z",
      assigneeUserId: "user-42",
    });
    expect(result).toEqual({
      caseId: "CASE-002",
      title: "Review docs",
      priority: "high",
      description: "Check all attachments",
      dueAt: "2026-06-01T00:00:00.000Z",
      assigneeUserId: "user-42",
    });
  });

  it("omits empty-string description and assignee", () => {
    const result = buildCreateTaskPayload({
      caseId: "CASE-003",
      title: "Test",
      priority: "low",
      description: "",
      assigneeUserId: "",
    });
    expect(result).not.toHaveProperty("description");
    expect(result).not.toHaveProperty("assigneeUserId");
  });
});

describe("buildTasksPostUrl", () => {
  it("replaces /cases with /tasks", () => {
    expect(buildTasksPostUrl("/api/cases")).toBe("/api/tasks");
  });

  it("handles trailing slash", () => {
    expect(buildTasksPostUrl("/api/cases/")).toBe("/api/tasks");
  });
});
