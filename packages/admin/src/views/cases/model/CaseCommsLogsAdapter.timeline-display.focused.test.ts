import { describe, expect, it } from "vitest";
import {
  adaptCaseLogDto,
  adaptCaseLogListResult,
  resolveLogCategory,
} from "./CaseCommsLogsAdapter";

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

describe("log tab timeline display (p0-fe-006c-03)", () => {
  it("status category: chip-primary, var(--primary) dot, 状態変更 label", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.status_changed",
        payload: { from: "S3", to: "S4" },
      }),
    )!;
    expect(e.type).toBe("status");
    expect(e.category).toBe("状態変更");
    expect(e.categoryChip).toBe("chip-primary");
    expect(e.dotColor).toBe("var(--primary)");
    expect(e.text).toBe("段階変更：S3 → S4");
  });

  it("review category: chip-warning, var(--warning) dot, 審核日志 label", () => {
    const e = adaptCaseLogDto(
      timelineLog({ action: "review_record.approved", payload: {} }),
    )!;
    expect(e.type).toBe("review");
    expect(e.category).toBe("審核日志");
    expect(e.categoryChip).toBe("chip-warning");
    expect(e.dotColor).toBe("var(--warning)");
  });

  it("operation category: chip-muted, var(--muted) dot, 操作日志 label", () => {
    const e = adaptCaseLogDto(
      timelineLog({ action: "case.created", payload: {} }),
    )!;
    expect(e.type).toBe("operation");
    expect(e.category).toBe("操作日志");
    expect(e.categoryChip).toBe("chip-muted");
    expect(e.dotColor).toBe("var(--muted)");
  });

  it("all three categories produce distinct chip + dot values", () => {
    const actions = [
      "case.status_changed",
      "review_record.created",
      "case.created",
    ];
    const entries = actions.map(
      (a) => adaptCaseLogDto(timelineLog({ action: a, payload: {} }))!,
    );
    const chips = entries.map((e) => e.categoryChip);
    const dots = entries.map((e) => e.dotColor);
    expect(new Set(chips).size).toBe(3);
    expect(new Set(dots).size).toBe(3);
  });

  it("stage change shows from → to message", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.stage_changed",
        payload: { from: "S5", to: "S6" },
      }),
    )!;
    expect(e.text).toBe("段階変更：S5 → S6");
  });

  it("billing risk acknowledged shows reason code", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.billing_risk_acknowledged",
        payload: { reasonCode: "deposit_pending" },
      }),
    )!;
    expect(e.text).toBe("未収金リスク確認：deposit_pending");
  });

  it("group transferred shows from → to with reason", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.group_transferred",
        payload: { fromGroupName: "東京", toGroupName: "大阪", reason: "移転" },
      }),
    )!;
    expect(e.text).toBe("案件転組；東京 → 大阪；理由：移転");
  });

  it("objectType resolves known prefixes to Japanese labels", () => {
    const knownPrefixes: Record<string, string> = {
      "case.created": "案件",
      "communication_log.created": "沟通記録",
      "document_item.uploaded": "資料",
      "task.completed": "任務",
      "review_record.approved": "復核",
      "validation_run.created": "校験",
      "submission_package.created": "提出包",
      "billing_record.created": "収費",
    };
    for (const [action, expected] of Object.entries(knownPrefixes)) {
      const e = adaptCaseLogDto(timelineLog({ action, payload: {} }))!;
      expect(e.objectType).toBe(expected);
    }
  });

  it("unknown action prefix falls back to raw prefix", () => {
    const e = adaptCaseLogDto(
      timelineLog({ action: "custom_entity.action", payload: {} }),
    )!;
    expect(e.objectType).toBe("custom_entity");
  });

  it("timeline entries preserve chronological order", () => {
    const result = adaptCaseLogListResult([
      timelineLog({ id: "tl-1", createdAt: "2026-04-10T09:00:00.000Z" }),
      timelineLog({
        id: "tl-2",
        createdAt: "2026-04-10T10:00:00.000Z",
        action: "case.updated",
      }),
      timelineLog({
        id: "tl-3",
        createdAt: "2026-04-10T11:00:00.000Z",
        action: "case.status_changed",
        payload: { from: "S1", to: "S2" },
      }),
    ])!;
    expect(result).toHaveLength(3);
    expect(result[0].time).toBe("2026-04-10T09:00:00.000Z");
    expect(result[1].time).toBe("2026-04-10T10:00:00.000Z");
    expect(result[2].time).toBe("2026-04-10T11:00:00.000Z");
  });

  it("resolveLogCategory exhaustive: all status actions → status", () => {
    const statusActions = [
      "case.status_changed",
      "case.stage_changed",
      "case.billing_risk_acknowledged",
      "case.post_approval_stage_changed",
    ];
    for (const a of statusActions) {
      expect(resolveLogCategory(a)).toBe("status");
    }
  });

  it("resolveLogCategory exhaustive: all review actions → review", () => {
    const reviewActions = [
      "review_record.created",
      "review_record.approved",
      "review_record.rejected",
      "validation_run.created",
      "validation_run.passed",
      "validation_run.failed",
    ];
    for (const a of reviewActions) {
      expect(resolveLogCategory(a)).toBe("review");
    }
  });
});
