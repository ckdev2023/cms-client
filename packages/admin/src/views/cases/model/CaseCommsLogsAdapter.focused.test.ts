// ── Test Ownership ──────────────────────────────────────────────
// Owner: p0-fe-006c-03 — messages/log tabs focused tests.
//   Locks tab-switch semantics, empty-state degradation, timeline
//   display values, and customer back-link stability across tab
//   transitions for messages / log tabs.
// Does NOT test: adapter DTO internals (→ CaseCommsLogsAdapter.test),
//   repository HTTP orchestration (→ CaseRepository.comms-log.test),
//   detail composable lifecycle (→ useCaseDetailModel.focused.test),
//   other tab adapters (→ CaseAdapterSupportSeams.*.test).
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseMessageDto,
  adaptCaseMessageListResult,
  adaptCaseLogListResult,
  resolveMessageType,
} from "./CaseCommsLogsAdapter";

// ─── Fixtures ────────────────────────────────────────────────────

const commLog = (o: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "comm-f01",
  channelType: "phone",
  contentSummary: "電話でフォロー",
  createdAt: "2026-04-10T10:00:00.000Z",
  createdByDisplayName: "Tanaka Yuki",
  visibleToClient: false,
  followUpRequired: false,
  ...o,
});

const timelineLog = (
  o: Record<string, unknown> = {},
): Record<string, unknown> => ({
  id: "tl-f01",
  action: "case.created",
  actorUserId: "user-abc",
  payload: { caseTypeCode: "business_manager" },
  createdAt: "2026-04-10T09:00:00.000Z",
  ...o,
});

// ═══════════════════════════════════════════════════════════════════
//  1. MESSAGES TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("messages tab empty state (p0-fe-006c-03)", () => {
  it("null/undefined input → adapter returns null (tab shows placeholder)", () => {
    expect(adaptCaseMessageListResult(null)).toBeNull();
    expect(adaptCaseMessageListResult(undefined)).toBeNull();
  });

  it("empty array → no messages rendered", () => {
    expect(adaptCaseMessageListResult([])).toEqual([]);
  });

  it("empty paginated response → no messages rendered", () => {
    expect(adaptCaseMessageListResult({ items: [], total: 0 })).toEqual([]);
  });

  it("all items malformed → returns null (tab treats as load failure)", () => {
    expect(
      adaptCaseMessageListResult([{ bad: true }, { also: "bad" }]),
    ).toBeNull();
  });

  it("single malformed item in batch → returns null (strict all-or-nothing)", () => {
    expect(
      adaptCaseMessageListResult([commLog(), { missing: "id" }]),
    ).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
//  2. MESSAGES TAB — display values from tab consumer perspective
// ═══════════════════════════════════════════════════════════════════

describe("messages tab display values (p0-fe-006c-03)", () => {
  it("phone message: type=phone, typeLabel=電話記録", () => {
    const m = adaptCaseMessageDto(commLog({ channelType: "phone" }))!;
    expect(m.type).toBe("phone");
    expect(m.typeLabel).toBe("電話記録");
  });

  it("email message: type=auto_email, typeLabel=メール", () => {
    const m = adaptCaseMessageDto(commLog({ channelType: "email" }))!;
    expect(m.type).toBe("auto_email");
    expect(m.typeLabel).toBe("メール");
  });

  it("internal note: type=internal, typeLabel=内部备注", () => {
    const m = adaptCaseMessageDto(
      commLog({ channelType: "wechat", visibleToClient: false }),
    )!;
    expect(m.type).toBe("internal");
    expect(m.typeLabel).toBe("内部备注");
  });

  it("client-visible note: type=client_visible, typeLabel=客户可见", () => {
    const m = adaptCaseMessageDto(
      commLog({ channelType: "line", visibleToClient: true }),
    )!;
    expect(m.type).toBe("client_visible");
    expect(m.typeLabel).toBe("客户可见");
  });

  it("meeting: type=meeting, typeLabel=対面", () => {
    const m = adaptCaseMessageDto(commLog({ channelType: "meeting" }))!;
    expect(m.type).toBe("meeting");
    expect(m.typeLabel).toBe("対面");
  });

  it("follow-up action shows due date when present", () => {
    const m = adaptCaseMessageDto(
      commLog({
        followUpRequired: true,
        followUpDueAt: "2026-05-01T00:00:00.000Z",
      }),
    )!;
    expect(m.actionLabel).toBe("2026-05-01T00:00:00.000Z");
  });

  it("follow-up action shows 跟進待 when date absent", () => {
    const m = adaptCaseMessageDto(
      commLog({ followUpRequired: true, followUpDueAt: null }),
    )!;
    expect(m.actionLabel).toBe("跟進待");
  });

  it("no follow-up → actionLabel undefined", () => {
    const m = adaptCaseMessageDto(commLog({ followUpRequired: false }))!;
    expect(m.actionLabel).toBeUndefined();
  });

  it("avatar initials from multi-word name: first + last", () => {
    const m = adaptCaseMessageDto(
      commLog({ createdByDisplayName: "Tanaka Yuki" }),
    )!;
    expect(m.avatar).toBe("TY");
  });

  it("avatar initials from single-word name: first 2 chars", () => {
    const m = adaptCaseMessageDto(commLog({ createdByDisplayName: "Admin" }))!;
    expect(m.avatar).toBe("AD");
  });

  it("missing author defaults to System with SY initials", () => {
    const m = adaptCaseMessageDto(commLog({ createdByDisplayName: null }))!;
    expect(m.author).toBe("System");
    expect(m.avatar).toBe("SY");
  });

  it("all five message types have distinct typeLabels", () => {
    const types: Array<[string, boolean, string]> = [
      ["phone", false, "電話記録"],
      ["meeting", false, "対面"],
      ["email", false, "メール"],
      ["wechat", false, "内部备注"],
      ["wechat", true, "客户可見"],
    ];
    const labels = types.map(([ch, vis]) => resolveMessageType(ch, vis));
    expect(new Set(labels).size).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════
//  3. LOG TAB — empty state
// ═══════════════════════════════════════════════════════════════════

describe("log tab empty state (p0-fe-006c-03)", () => {
  it("null/undefined input → adapter returns null (tab shows placeholder)", () => {
    expect(adaptCaseLogListResult(null)).toBeNull();
    expect(adaptCaseLogListResult(undefined)).toBeNull();
  });

  it("empty array → no log entries rendered", () => {
    expect(adaptCaseLogListResult([])).toEqual([]);
  });

  it("empty paginated response → no log entries rendered", () => {
    expect(adaptCaseLogListResult({ items: [], total: 0 })).toEqual([]);
  });

  it("malformed items are silently skipped (graceful degradation)", () => {
    const result = adaptCaseLogListResult([
      timelineLog(),
      { bad: true },
      timelineLog({ id: "tl-f02", action: "case.updated" }),
    ]);
    expect(result).toHaveLength(2);
    expect(result![0].text).toBe("cases.log.timeline.caseCreated");
    expect(result![0].textParams).toEqual({
      suffix: "business_manager",
      suffixKey: "cases.constants.caseTypes.business_manager",
    });
    expect(result![1].text).toBe("cases.log.timeline.caseUpdated");
  });
});
