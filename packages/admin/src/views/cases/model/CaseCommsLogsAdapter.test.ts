// ── Test Ownership ──────────────────────────────────────────────
// Owner: communication logs + timeline DTO mapping (messages,
//   log entries, channel/category resolution).
// Does NOT test: case detail aggregate, list adapters, write
//   builders, or repository orchestration.
// ────────────────────────────────────────────────────────────────

import { describe, expect, it } from "vitest";
import {
  adaptCaseMessageDto,
  adaptCaseMessageListResult,
  adaptCaseLogDto,
  adaptCaseLogListResult,
  resolveMessageType,
  resolveLogCategory,
} from "./CaseCommsLogsAdapter";

// ────────────────────────────────────────────────────────────────
// resolveMessageType
// ────────────────────────────────────────────────────────────────

describe("resolveMessageType", () => {
  it("maps phone channel to phone", () => {
    expect(resolveMessageType("phone", false)).toBe("phone");
    expect(resolveMessageType("phone", true)).toBe("phone");
  });

  it("maps meeting channel to meeting", () => {
    expect(resolveMessageType("meeting", true)).toBe("meeting");
  });

  it("maps email channel to auto_email", () => {
    expect(resolveMessageType("email", false)).toBe("auto_email");
  });

  it("maps wechat with visibleToClient=true to client_visible", () => {
    expect(resolveMessageType("wechat", true)).toBe("client_visible");
  });

  it("maps wechat with visibleToClient=false to internal", () => {
    expect(resolveMessageType("wechat", false)).toBe("internal");
  });

  it("maps line with visibleToClient=true to client_visible", () => {
    expect(resolveMessageType("line", true)).toBe("client_visible");
  });

  it("maps other with visibleToClient=false to internal", () => {
    expect(resolveMessageType("other", false)).toBe("internal");
  });

  it("defaults to internal when channelType is null", () => {
    expect(resolveMessageType(null, false)).toBe("internal");
  });

  it("is case-insensitive", () => {
    expect(resolveMessageType("PHONE", true)).toBe("phone");
    expect(resolveMessageType("Email", false)).toBe("auto_email");
  });
});

// ────────────────────────────────────────────────────────────────
// adaptCaseMessageDto
// ────────────────────────────────────────────────────────────────

describe("adaptCaseMessageDto", () => {
  const baseCommLog = {
    id: "comm-1",
    caseId: "case-1",
    customerId: null,
    channelType: "phone",
    direction: "inbound",
    subject: "Follow up call",
    contentSummary: "Discussed document requirements",
    fullContent: "Full transcript here",
    visibleToClient: false,
    createdBy: "Tanaka Yuki",
    followUpRequired: false,
    followUpDueAt: null,
    createdAt: "2026-03-15T10:00:00.000Z",
  };

  it("adapts a valid communication log to MessageItem", () => {
    const result = adaptCaseMessageDto(baseCommLog);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("comm-1");
    expect(result!.type).toBe("phone");
    expect(result!.typeLabel).toBe("電話記録");
    expect(result!.author).toBe("Tanaka Yuki");
    expect(result!.body).toBe("Discussed document requirements");
    expect(result!.time).toBe("2026-03-15T10:00:00.000Z");
    expect(result!.actionLabel).toBeUndefined();
  });

  it("derives avatar initials from author name", () => {
    const result = adaptCaseMessageDto(baseCommLog);
    expect(result!.avatar).toBe("TY");
  });

  it("maps internal note (wechat + not visible)", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      channelType: "wechat",
      visibleToClient: false,
    });
    expect(result!.type).toBe("internal");
    expect(result!.typeLabel).toBe("内部备注");
  });

  it("maps client-visible note (wechat + visible)", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      channelType: "wechat",
      visibleToClient: true,
    });
    expect(result!.type).toBe("client_visible");
    expect(result!.typeLabel).toBe("客户可见");
  });

  it("maps email to auto_email", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      channelType: "email",
    });
    expect(result!.type).toBe("auto_email");
    expect(result!.typeLabel).toBe("メール");
  });

  it("includes actionLabel when followUpRequired is true", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      followUpRequired: true,
      followUpDueAt: "2026-04-01T00:00:00.000Z",
    });
    expect(result!.actionLabel).toBe("2026-04-01T00:00:00.000Z");
  });

  it("uses fallback actionLabel when followUp date is null", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      followUpRequired: true,
      followUpDueAt: null,
    });
    expect(result!.actionLabel).toBe("跟進待");
  });

  it("falls back to subject when contentSummary is empty", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      contentSummary: null,
      subject: "Important call",
    });
    expect(result!.body).toBe("Important call");
  });

  it("falls back to fullContent when both summary and subject are empty", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      contentSummary: null,
      subject: null,
      fullContent: "Detailed content",
    });
    expect(result!.body).toBe("Detailed content");
  });

  it("handles snake_case field names", () => {
    const snakeCase = {
      id: "comm-2",
      channel_type: "meeting",
      content_summary: "Meeting notes",
      created_at: "2026-03-16T10:00:00.000Z",
      created_by: "Admin",
      visible_to_client: true,
      follow_up_required: false,
    };
    const result = adaptCaseMessageDto(snakeCase);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("meeting");
    expect(result!.body).toBe("Meeting notes");
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseMessageDto(null)).toBeNull();
    expect(adaptCaseMessageDto("string")).toBeNull();
    expect(adaptCaseMessageDto(42)).toBeNull();
  });

  it("returns null when id is missing", () => {
    expect(adaptCaseMessageDto({ ...baseCommLog, id: undefined })).toBeNull();
  });

  it("returns null when createdAt is missing", () => {
    expect(
      adaptCaseMessageDto({ ...baseCommLog, createdAt: undefined }),
    ).toBeNull();
  });

  it("defaults author to System when createdBy is missing", () => {
    const result = adaptCaseMessageDto({
      ...baseCommLog,
      createdBy: null,
    });
    expect(result!.author).toBe("System");
  });
});

// ────────────────────────────────────────────────────────────────
// adaptCaseMessageListResult
// ────────────────────────────────────────────────────────────────

describe("adaptCaseMessageListResult", () => {
  const validComm = {
    id: "comm-1",
    channelType: "phone",
    contentSummary: "Test",
    createdAt: "2026-03-15T10:00:00.000Z",
    createdBy: "User",
    visibleToClient: false,
    followUpRequired: false,
  };

  it("adapts an array of communication logs", () => {
    const result = adaptCaseMessageListResult([validComm]);
    expect(result).toHaveLength(1);
    expect(result![0].id).toBe("comm-1");
  });

  it("adapts a paginated response with items field", () => {
    const result = adaptCaseMessageListResult({
      items: [validComm],
      total: 1,
    });
    expect(result).toHaveLength(1);
  });

  it("returns null if any item fails to adapt", () => {
    const result = adaptCaseMessageListResult([validComm, { bad: true }]);
    expect(result).toBeNull();
  });

  it("returns null for non-array/non-object input", () => {
    expect(adaptCaseMessageListResult("bad")).toBeNull();
    expect(adaptCaseMessageListResult(42)).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(adaptCaseMessageListResult([])).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────
// resolveLogCategory
// ────────────────────────────────────────────────────────────────

describe("resolveLogCategory", () => {
  it("maps case.status_changed to status", () => {
    expect(resolveLogCategory("case.status_changed")).toBe("status");
  });

  it("maps case.stage_changed to status", () => {
    expect(resolveLogCategory("case.stage_changed")).toBe("status");
  });

  it("maps case.billing_risk_acknowledged to status", () => {
    expect(resolveLogCategory("case.billing_risk_acknowledged")).toBe("status");
  });

  it("maps case.post_approval_stage_changed to status", () => {
    expect(resolveLogCategory("case.post_approval_stage_changed")).toBe(
      "status",
    );
  });

  it("maps review_record.created to review", () => {
    expect(resolveLogCategory("review_record.created")).toBe("review");
  });

  it("maps validation_run.passed to review", () => {
    expect(resolveLogCategory("validation_run.passed")).toBe("review");
  });

  it("maps case.created to operation", () => {
    expect(resolveLogCategory("case.created")).toBe("operation");
  });

  it("maps communication_log.created to operation", () => {
    expect(resolveLogCategory("communication_log.created")).toBe("operation");
  });

  it("maps unknown actions to operation", () => {
    expect(resolveLogCategory("some.unknown")).toBe("operation");
  });
});

// ────────────────────────────────────────────────────────────────
// adaptCaseLogDto
// ────────────────────────────────────────────────────────────────

describe("adaptCaseLogDto", () => {
  const baseTimelineLog = {
    id: "tl-1",
    entityType: "case",
    entityId: "case-1",
    action: "case.created",
    actorUserId: "user-abc",
    actorDisplayName: "Tanaka Yuki",
    payload: { caseTypeCode: "business_manager" },
    createdAt: "2026-03-15T09:00:00.000Z",
  };

  it("adapts a valid case.created timeline entry", () => {
    const result = adaptCaseLogDto(baseTimelineLog);
    expect(result).not.toBeNull();
    expect(result!.type).toBe("operation");
    expect(result!.text).toBe("案件作成：business_manager");
    expect(result!.category).toBe("操作日志");
    expect(result!.categoryChip).toBe("chip-muted");
    expect(result!.objectType).toBe("案件");
    expect(result!.time).toBe("2026-03-15T09:00:00.000Z");
    expect(result!.avatar).toBe("TY");
    expect(result!.dotColor).toBe("var(--muted)");
  });
  it("adapts case.status_changed", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "case.status_changed",
      payload: { from: "S3", to: "S4" },
    });
    expect(result!.type).toBe("status");
    expect(result!.text).toBe("段階変更：S3 → S4");
    expect(result!.category).toBe("状態変更");
    expect(result!.categoryChip).toBe("chip-primary");
    expect(result!.dotColor).toBe("var(--primary)");
  });
  it("adapts case.billing_risk_acknowledged", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "case.billing_risk_acknowledged",
      payload: { reasonCode: "deposit_pending" },
    });
    expect(result!.type).toBe("status");
    expect(result!.text).toBe("未収金リスク確認：deposit_pending");
  });
  it("adapts case.post_approval_stage_changed", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "case.post_approval_stage_changed",
      payload: { stage: "coe_sent" },
    });
    expect(result!.type).toBe("status");
    expect(result!.text).toBe("許可後段階変更：coe_sent");
  });

  it("adapts case.cross_group_created", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "case.cross_group_created",
      payload: { reason: "Client relocated" },
    });
    expect(result!.text).toBe("越境建案：Client relocated");
  });

  it("adapts case.group_transferred", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "case.group_transferred",
      payload: {
        fromGroupName: "Tokyo",
        toGroupName: "Osaka",
        reason: "Transfer",
      },
    });
    expect(result!.text).toBe("案件転組；Tokyo → Osaka；理由：Transfer");
  });

  it("adapts communication_log.created in case timeline", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "communication_log.created",
      payload: { channelType: "phone" },
    });
    expect(result!.type).toBe("operation");
    expect(result!.text).toBe("沟通記録追加：phone");
    expect(result!.objectType).toBe("沟通記録");
  });

  it("adapts communication_log.updated", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "communication_log.updated",
      payload: {},
    });
    expect(result!.text).toBe("沟通記録更新");
  });

  it("adapts review_record.created as review category", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "review_record.created",
      payload: {},
    });
    expect(result!.type).toBe("review");
    expect(result!.category).toBe("審核日志");
    expect(result!.categoryChip).toBe("chip-warning");
  });

  it("falls back to action string for unknown actions", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      action: "some.custom_action",
      payload: {},
    });
    expect(result!.text).toBe("some.custom_action");
    expect(result!.objectType).toBe("some");
  });

  it("handles snake_case field names", () => {
    const result = adaptCaseLogDto({
      id: "tl-2",
      entity_type: "case",
      entity_id: "case-1",
      action: "case.updated",
      actor_user_id: "user-xyz",
      actor_display_name: "Yamada Hanako",
      payload: {},
      created_at: "2026-03-15T10:00:00.000Z",
    });
    expect(result).not.toBeNull();
    expect(result!.text).toBe("案件情報更新");
    expect(result!.avatar).toBe("YH");
  });

  it("defaults actor to System when actorUserId is null", () => {
    const result = adaptCaseLogDto({
      ...baseTimelineLog,
      actorDisplayName: null,
      actorUserId: null,
    });
    expect(result!.avatar).toBe("SY");
  });

  it("returns null for non-object input", () => {
    expect(adaptCaseLogDto(null)).toBeNull();
    expect(adaptCaseLogDto("bad")).toBeNull();
  });

  it("returns null when id is missing", () => {
    expect(adaptCaseLogDto({ ...baseTimelineLog, id: undefined })).toBeNull();
  });

  it("returns null when action is missing", () => {
    expect(
      adaptCaseLogDto({ ...baseTimelineLog, action: undefined }),
    ).toBeNull();
  });

  it("returns null when createdAt is missing", () => {
    expect(
      adaptCaseLogDto({ ...baseTimelineLog, createdAt: undefined }),
    ).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────────
// adaptCaseLogListResult
// ────────────────────────────────────────────────────────────────

describe("adaptCaseLogListResult", () => {
  const validLog = {
    id: "tl-1",
    action: "case.created",
    actorUserId: "user-1",
    payload: {},
    createdAt: "2026-03-15T09:00:00.000Z",
  };

  it("adapts an array of timeline logs", () => {
    const result = adaptCaseLogListResult([validLog]);
    expect(result).toHaveLength(1);
  });

  it("adapts a response with items field", () => {
    const result = adaptCaseLogListResult({ items: [validLog] });
    expect(result).toHaveLength(1);
  });

  it("skips malformed items and returns valid ones", () => {
    const result = adaptCaseLogListResult([validLog, { bad: true }]);
    expect(result).toHaveLength(1);
    expect(result![0].text).toBe("案件作成");
  });

  it("returns null for non-array/non-object input", () => {
    expect(adaptCaseLogListResult("bad")).toBeNull();
  });

  it("returns empty array for empty input", () => {
    expect(adaptCaseLogListResult([])).toEqual([]);
  });
});
