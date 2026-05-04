import { describe, expect, it } from "vitest";
import { adaptCaseTaskList } from "./CaseAdapterSupportSeams";

type R = Record<string, unknown>;

const taskDto = (overrides: R = {}): R => ({
  id: "task-c01",
  orgId: "org-001",
  caseId: "case-c01",
  title: "書類確認",
  assigneeUserId: "user-1",
  assigneeName: "佐藤花子",
  priority: "normal",
  dueAt: "2026-06-01T00:00:00.000Z",
  status: "pending",
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

describe("R31-C assigneeAvatar / assigneeFullName split", () => {
  it("assignee is first-char avatar, assigneeFullName is the full name", () => {
    const result = adaptCaseTaskList({ items: [taskDto()] })!;
    expect(result[0].assignee).toBe("佐");
    expect(result[0].assigneeFullName).toBe("佐藤花子");
  });

  it("English name: avatar is uppercase first char, fullName is trimmed", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: "Tanaka Yuki" })],
    })!;
    expect(result[0].assignee).toBe("T");
    expect(result[0].assigneeFullName).toBe("Tanaka Yuki");
  });

  it("no assigneeName → avatar is —, fullName is empty string", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: null, assigneeUserId: null })],
    })!;
    expect(result[0].assignee).toBe("—");
    expect(result[0].assigneeFullName).toBe("");
  });

  it("whitespace-only assigneeName → falls through to —/empty", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: "   ", assigneeUserId: null })],
    })!;
    expect(result[0].assignee).toBe("—");
    expect(result[0].assigneeFullName).toBe("");
  });

  it("assignee_display_name field is used when assigneeName is absent", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({
          assigneeName: null,
          assignee_display_name: "山田太郎",
        }),
      ],
    })!;
    expect(result[0].assignee).toBe("山");
    expect(result[0].assigneeFullName).toBe("山田太郎");
  });

  it("leading/trailing spaces are trimmed from fullName", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeName: "  Alice Johnson  " })],
    })!;
    expect(result[0].assignee).toBe("A");
    expect(result[0].assigneeFullName).toBe("Alice Johnson");
  });
});
