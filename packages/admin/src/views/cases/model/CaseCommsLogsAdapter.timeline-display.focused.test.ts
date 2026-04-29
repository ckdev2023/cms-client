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
  it("status category: chip-primary, var(--primary) dot, i18n key", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.status_changed",
        payload: { from: "S3", to: "S4" },
      }),
    )!;
    expect(e.type).toBe("status");
    expect(e.category).toBe("cases.log.category.status");
    expect(e.categoryChip).toBe("chip-primary");
    expect(e.dotColor).toBe("var(--primary)");
    expect(e.text).toBe("cases.log.timeline.stageChange");
    expect(e.textParams).toEqual({ from: "S3", to: "S4" });
  });

  it("review category: chip-warning, var(--warning) dot, i18n key", () => {
    const e = adaptCaseLogDto(
      timelineLog({ action: "review_record.approved", payload: {} }),
    )!;
    expect(e.type).toBe("review");
    expect(e.category).toBe("cases.log.category.review");
    expect(e.categoryChip).toBe("chip-warning");
    expect(e.dotColor).toBe("var(--warning)");
  });

  it("operation category: chip-muted, var(--muted) dot, i18n key", () => {
    const e = adaptCaseLogDto(
      timelineLog({ action: "case.created", payload: {} }),
    )!;
    expect(e.type).toBe("operation");
    expect(e.category).toBe("cases.log.category.operation");
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

  it("stage change returns i18n key with from/to params", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.stage_changed",
        payload: { from: "S5", to: "S6" },
      }),
    )!;
    expect(e.text).toBe("cases.log.timeline.stageChange");
    expect(e.textParams).toEqual({ from: "S5", to: "S6" });
  });

  it("billing risk acknowledged returns i18n key with suffix param", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.billing_risk_acknowledged",
        payload: { reasonCode: "deposit_pending" },
      }),
    )!;
    expect(e.text).toBe("cases.log.timeline.billingRiskAck");
    expect(e.textParams).toEqual({ suffix: "deposit_pending" });
  });

  it("group transferred returns i18n key with from/to/reason params", () => {
    const e = adaptCaseLogDto(
      timelineLog({
        action: "case.group_transferred",
        payload: { fromGroupName: "東京", toGroupName: "大阪", reason: "移転" },
      }),
    )!;
    expect(e.text).toBe("cases.log.timeline.groupTransferred");
    expect(e.textParams).toEqual({
      from: "東京",
      to: "大阪",
      reason: "移転",
    });
  });

  it("objectType resolves known prefixes to i18n key paths", () => {
    const knownPrefixes: Record<string, string> = {
      "case.created": "cases.log.objectType.case",
      "communication_log.created": "cases.log.objectType.communicationLog",
      "document_item.uploaded": "cases.log.objectType.documentItem",
      "task.completed": "cases.log.objectType.task",
      "review_record.approved": "cases.log.objectType.reviewRecord",
      "validation_run.created": "cases.log.objectType.validationRun",
      "submission_package.created": "cases.log.objectType.submissionPackage",
      "billing_record.created": "cases.log.objectType.billingRecord",
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
