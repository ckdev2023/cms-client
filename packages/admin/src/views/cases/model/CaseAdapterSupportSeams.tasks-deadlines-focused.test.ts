// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006d-03 — tasks/deadlines tabs focused tests
//   Locks empty-state degradation, summary display values, done/pending
//   filtering gates, due-color derivation, deadline severity tiers,
//   remaining-text formatting, and tab counter derivation as consumed
//   by CaseTasksTab.vue and useCaseDetailModel.
// Does NOT test: adapter internal helpers (→ CaseAdapterSupportSeams.test),
//   URL builders (→ CaseAdapterSupportSeams.test), seam registry
//   (→ CaseAdapterSupportSeams.test), aggregate-level hints
//   (→ overview-info-focused.test), list mappers, write builders,
//   or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseTaskList,
  adaptCaseDeadlineList,
} from "./CaseAdapterSupportSeams";

// ═══════════════════════════════════════════════════════════════════
//  SHARED FIXTURES
// ═══════════════════════════════════════════════════════════════════

type R = Record<string, unknown>;

const taskDto = (overrides: R = {}): R => ({
  id: "task-f01",
  orgId: "org-001",
  caseId: "case-f01",
  title: "パスポート確認",
  description: null,
  taskType: "document_follow_up",
  assigneeUserId: "user-1",
  priority: "normal",
  dueAt: "2026-06-01T00:00:00.000Z",
  status: "pending",
  sourceType: null,
  sourceId: null,
  completedAt: null,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

function futureDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

function pastDate(daysAgo: number): string {
  return futureDate(-daysAgo);
}

const reminderDto = (overrides: R = {}): R => ({
  id: "rem-f01",
  orgId: "org-001",
  caseId: "case-f01",
  targetType: "case",
  targetId: "case-f01",
  remindAt: futureDate(45),
  recipientType: "user",
  recipientId: "user-1",
  channel: "in_app",
  dedupeKey: null,
  sendStatus: "pending",
  retryCount: 0,
  sentAt: null,
  payloadSnapshot: { title: "申請書提出期限", description: "入管への提出" },
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════
//  TASKS TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("tasks tab empty state (p0-fe-006d-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseTaskList(null)).toBeNull();
    expect(adaptCaseTaskList(undefined)).toBeNull();
  });

  it("non-object/non-array input → adapter returns null", () => {
    expect(adaptCaseTaskList("string")).toBeNull();
    expect(adaptCaseTaskList(42)).toBeNull();
    expect(adaptCaseTaskList(true)).toBeNull();
  });

  it("empty items list → no tasks rendered (empty array)", () => {
    expect(adaptCaseTaskList({ items: [], total: 0 })).toEqual([]);
  });

  it("all items with invalid id or title → empty result", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({ id: "", title: "有効" }),
        taskDto({ id: "task-1", title: "" }),
        taskDto({ id: "", title: "" }),
      ],
    });
    expect(result).toEqual([]);
  });

  it("non-object items in array are silently skipped", () => {
    const result = adaptCaseTaskList({
      items: [null, 42, "invalid", taskDto()],
    });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("task-f01");
  });

  it("raw empty array input → empty result", () => {
    expect(adaptCaseTaskList([])).toEqual([]);
  });
});

// ─── Tasks tab — summary display ─────────────────────────────────

describe("tasks tab summary display (p0-fe-006d-03)", () => {
  it("label comes from title field", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ title: "住民票取得" })],
    })!;
    expect(result[0].label).toBe("住民票取得");
  });

  it("assignee shows first-char uppercase of userId", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeUserId: "tanaka" })],
    })!;
    expect(result[0].assignee).toBe("T");
  });

  it("assignee shows — when assigneeUserId is null", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ assigneeUserId: null })],
    })!;
    expect(result[0].assignee).toBe("—");
  });

  it("due shows formatted date when dueAt is present", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: "2026-06-01T00:00:00.000Z" })],
    })!;
    expect(result[0].due).toBeTruthy();
    expect(result[0].due).not.toBe("");
  });

  it("due shows empty string when dueAt is null", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: null })],
    })!;
    expect(result[0].due).toBe("");
  });

  it("multiple tasks preserve insertion order", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({ id: "t1", title: "タスクA" }),
        taskDto({ id: "t2", title: "タスクB" }),
        taskDto({ id: "t3", title: "タスクC" }),
      ],
    })!;
    expect(result.map((t) => t.label)).toEqual([
      "タスクA",
      "タスクB",
      "タスクC",
    ]);
  });

  it("accepts raw array input (not wrapped in { items })", () => {
    const result = adaptCaseTaskList([taskDto()])!;
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("task-f01");
  });
});

// ─── Tasks tab — done/pending filtering gates ────────────────────

describe("tasks tab done/pending filtering gates (p0-fe-006d-03)", () => {
  it("pending → done=false", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "pending" })],
    })!;
    expect(result[0].done).toBe(false);
    expect(result[0].status).toBe("pending");
  });

  it("in_progress → done=false", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "in_progress" })],
    })!;
    expect(result[0].done).toBe(false);
    expect(result[0].status).toBe("in_progress");
  });

  it("completed → done=true", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "completed" })],
    })!;
    expect(result[0].done).toBe(true);
    expect(result[0].status).toBe("completed");
  });

  it("cancelled → done=true", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "cancelled" })],
    })!;
    expect(result[0].done).toBe(true);
    expect(result[0].status).toBe("cancelled");
  });

  it("unknown status → done=false (safe default)", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "deferred" })],
    })!;
    expect(result[0].done).toBe(false);
  });

  it("mixed list allows consumer to filter pending vs done", () => {
    const result = adaptCaseTaskList({
      items: [
        taskDto({ id: "t1", status: "pending" }),
        taskDto({ id: "t2", status: "completed" }),
        taskDto({ id: "t3", status: "in_progress" }),
        taskDto({ id: "t4", status: "cancelled" }),
      ],
    })!;
    const pending = result.filter((t) => !t.done);
    const done = result.filter((t) => t.done);
    expect(pending).toHaveLength(2);
    expect(done).toHaveLength(2);
    expect(pending.map((t) => t.id)).toEqual(["t1", "t3"]);
    expect(done.map((t) => t.id)).toEqual(["t2", "t4"]);
  });
});

// ─── Tasks tab — priority color mapping ──────────────────────────

describe("tasks tab priority color mapping (p0-fe-006d-03)", () => {
  const priorityColors: [string, string][] = [
    ["urgent", "warning"],
    ["high", "warning"],
    ["normal", "primary"],
    ["low", "success"],
  ];

  for (const [priority, color] of priorityColors) {
    it(`priority "${priority}" → color "${color}"`, () => {
      const result = adaptCaseTaskList({
        items: [taskDto({ priority })],
      })!;
      expect(result[0].color).toBe(color);
    });
  }

  it("unknown priority falls back to primary", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ priority: "critical" })],
    })!;
    expect(result[0].color).toBe("primary");
  });

  it("missing priority defaults to primary", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ priority: "" })],
    })!;
    expect(result[0].color).toBe("primary");
  });
});

// ─── Tasks tab — dueColor derivation ─────────────────────────────

describe("tasks tab dueColor derivation (p0-fe-006d-03)", () => {
  it("done task always muted (even if overdue)", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ status: "completed", dueAt: pastDate(10) })],
    })!;
    expect(result[0].dueColor).toBe("muted");
  });

  it("null dueAt → muted", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: null })],
    })!;
    expect(result[0].dueColor).toBe("muted");
  });

  it("overdue (past date) → danger", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: pastDate(5) })],
    })!;
    expect(result[0].dueColor).toBe("danger");
  });

  it("due within 3 days → warning", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: futureDate(2) })],
    })!;
    expect(result[0].dueColor).toBe("warning");
  });

  it("due more than 3 days away → muted", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: futureDate(30) })],
    })!;
    expect(result[0].dueColor).toBe("muted");
  });

  it("invalid date string → muted", () => {
    const result = adaptCaseTaskList({
      items: [taskDto({ dueAt: "not-a-date" })],
    })!;
    expect(result[0].dueColor).toBe("muted");
  });
});

// ═══════════════════════════════════════════════════════════════════
//  DEADLINES TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("deadlines tab empty state (p0-fe-006d-03)", () => {
  it("null/undefined input → tab shows placeholder (adapter returns null)", () => {
    expect(adaptCaseDeadlineList(null)).toBeNull();
    expect(adaptCaseDeadlineList(undefined)).toBeNull();
  });

  it("non-object/non-array input → adapter returns null", () => {
    expect(adaptCaseDeadlineList("string")).toBeNull();
    expect(adaptCaseDeadlineList(42)).toBeNull();
    expect(adaptCaseDeadlineList(true)).toBeNull();
  });

  it("empty items list → no deadlines rendered (empty array)", () => {
    expect(adaptCaseDeadlineList({ items: [], total: 0 })).toEqual([]);
  });

  it("all items with empty id → empty result", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ id: "" }), reminderDto({ id: "" })],
    });
    expect(result).toEqual([]);
  });

  it("non-object items in array are silently skipped", () => {
    const result = adaptCaseDeadlineList({
      items: [null, 42, "invalid", reminderDto()],
    });
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("rem-f01");
  });

  it("raw empty array input → empty result", () => {
    expect(adaptCaseDeadlineList([])).toEqual([]);
  });
});

// ─── Deadlines tab — summary display (deadline 摘要) ─────────────

describe("deadlines tab summary display (p0-fe-006d-03)", () => {
  it("title from payloadSnapshot.title", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          payloadSnapshot: { title: "在留カード更新期限", description: "" },
        }),
      ],
    })!;
    expect(result[0].title).toBe("在留カード更新期限");
  });

  it("title falls back to targetType label when payload has no title", () => {
    const typeMap: [string, string][] = [
      ["case", "案件期限"],
      ["customer", "顧客関連期限"],
      ["requirement", "資料提出期限"],
      ["deadline", "手続き期限"],
      ["billing_plan", "支払期限"],
    ];
    for (const [targetType, expected] of typeMap) {
      const result = adaptCaseDeadlineList({
        items: [reminderDto({ targetType, payloadSnapshot: null })],
      })!;
      expect(result[0].title).toBe(expected);
    }
  });

  it("title falls back to generic 期限 for unknown targetType", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({ targetType: "unknown_type", payloadSnapshot: null }),
      ],
    })!;
    expect(result[0].title).toBe("期限");
  });

  it("desc includes payloadSnapshot.description", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          payloadSnapshot: { title: "t", description: "東京入管への提出" },
        }),
      ],
    })!;
    expect(result[0].desc).toContain("東京入管への提出");
  });

  it("desc includes sendStatus label", () => {
    const sendStatusMap: [string, string][] = [
      ["pending", "未送信"],
      ["sent", "送信済み"],
      ["failed", "送信失敗"],
      ["canceled", "取消済み"],
    ];
    for (const [sendStatus, expected] of sendStatusMap) {
      const result = adaptCaseDeadlineList({
        items: [reminderDto({ sendStatus })],
      })!;
      expect(result[0].desc).toContain(expected);
    }
  });

  it("desc falls back to targetType when no description and no sendStatus", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          targetType: "requirement",
          sendStatus: "",
          payloadSnapshot: { title: "t", description: "" },
        }),
      ],
    })!;
    expect(result[0].desc).toBe("requirement");
  });

  it("date shows formatted date when remindAt is present", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: "2026-06-01T00:00:00.000Z" })],
    })!;
    expect(result[0].date).toBeTruthy();
    expect(result[0].date).not.toBe("—");
  });

  it("date shows — when remindAt is null", () => {
    const result = adaptCaseDeadlineList({
      items: [reminderDto({ remindAt: null })],
    })!;
    expect(result[0].date).toBe("—");
    expect(result[0].remaining).toBe("—");
    expect(result[0].severity).toBe("muted");
  });

  it("multiple deadlines preserve insertion order", () => {
    const result = adaptCaseDeadlineList({
      items: [
        reminderDto({
          id: "r1",
          payloadSnapshot: { title: "期限A", description: "" },
        }),
        reminderDto({
          id: "r2",
          payloadSnapshot: { title: "期限B", description: "" },
        }),
        reminderDto({
          id: "r3",
          payloadSnapshot: { title: "期限C", description: "" },
        }),
      ],
    })!;
    expect(result.map((d) => d.title)).toEqual(["期限A", "期限B", "期限C"]);
  });

  it("accepts raw array input", () => {
    const result = adaptCaseDeadlineList([reminderDto()])!;
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("rem-f01");
  });
});
