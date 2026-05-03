import { describe, expect, it } from "vitest";
import { buildOverviewTimelineFromLog } from "./CaseCommsLogsAdapter";
import type { LogEntry } from "../types-detail";

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: "operation",
    avatar: "SY",
    avatarStyle: "background:linear-gradient(135deg,#6366f1,#818cf8)",
    text: "cases.log.timeline.caseUpdated",
    category: "cases.log.category.operation",
    categoryChip: "chip-muted",
    objectType: "cases.log.objectType.case",
    time: "2026-04-01T10:00:00Z",
    dotColor: "var(--muted)",
    ...overrides,
  };
}

describe("buildOverviewTimelineFromLog", () => {
  it("returns empty array when entries is empty", () => {
    expect(buildOverviewTimelineFromLog([])).toEqual([]);
  });

  it("returns entries sorted by time desc, limited to 5 by default", () => {
    const entries: LogEntry[] = Array.from({ length: 16 }, (_, i) => {
      const hour = String(i).padStart(2, "0");
      return makeLogEntry({
        time: `2026-04-01T${hour}:00:00Z`,
        text: `entry-${i}`,
      });
    });

    const result = buildOverviewTimelineFromLog(entries);

    expect(result).toHaveLength(5);
    expect(result[0].text).toBe("entry-15");
    expect(result[1].text).toBe("entry-14");
    expect(result[2].text).toBe("entry-13");
    expect(result[3].text).toBe("entry-12");
    expect(result[4].text).toBe("entry-11");
  });

  it("respects custom limit", () => {
    const entries = [
      makeLogEntry({ time: "2026-04-01T03:00:00Z", text: "a" }),
      makeLogEntry({ time: "2026-04-01T01:00:00Z", text: "b" }),
      makeLogEntry({ time: "2026-04-01T02:00:00Z", text: "c" }),
    ];

    const result = buildOverviewTimelineFromLog(entries, 2);

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("a");
    expect(result[1].text).toBe("c");
  });

  it("returns all entries when fewer than limit", () => {
    const entries = [makeLogEntry({ time: "2026-04-01T01:00:00Z" })];
    const result = buildOverviewTimelineFromLog(entries, 5);
    expect(result).toHaveLength(1);
  });

  it("maps category type to correct color", () => {
    const entries = [
      makeLogEntry({ type: "status", time: "2026-04-01T03:00:00Z" }),
      makeLogEntry({ type: "review", time: "2026-04-01T02:00:00Z" }),
      makeLogEntry({ type: "operation", time: "2026-04-01T01:00:00Z" }),
    ];

    const result = buildOverviewTimelineFromLog(entries);

    expect(result[0].color).toBe("var(--primary)");
    expect(result[1].color).toBe("var(--warning)");
    expect(result[2].color).toBe("var(--muted)");
  });

  it("falls back to muted color for unknown category type", () => {
    const entries = [makeLogEntry({ type: "unknown_type" as never })];
    const result = buildOverviewTimelineFromLog(entries);
    expect(result[0].color).toBe("var(--muted)");
  });

  it("preserves text (i18n key) and uses time as meta", () => {
    const entries = [
      makeLogEntry({
        text: "cases.log.timeline.stageChange",
        time: "2026-04-15T09:30:00Z",
      }),
    ];

    const result = buildOverviewTimelineFromLog(entries);

    expect(result[0].text).toBe("cases.log.timeline.stageChange");
    expect(result[0].meta).toBe("2026-04-15T09:30:00Z");
  });

  it("does not mutate the original array", () => {
    const entries = [
      makeLogEntry({ time: "2026-04-01T02:00:00Z", text: "second" }),
      makeLogEntry({ time: "2026-04-01T01:00:00Z", text: "first" }),
    ];

    buildOverviewTimelineFromLog(entries);

    expect(entries[0].text).toBe("second");
    expect(entries[1].text).toBe("first");
  });

  it("handles 16 mixed-type entries correctly", () => {
    const types = ["operation", "review", "status"] as const;
    const entries: LogEntry[] = Array.from({ length: 16 }, (_, i) =>
      makeLogEntry({
        type: types[i % 3],
        time: `2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        text: `log-${i}`,
      }),
    );

    const result = buildOverviewTimelineFromLog(entries, 5);

    expect(result).toHaveLength(5);
    expect(result.map((r) => r.text)).toEqual([
      "log-15",
      "log-14",
      "log-13",
      "log-12",
      "log-11",
    ]);
    expect(result[0].color).toBe("var(--muted)");
    expect(result[1].color).toBe("var(--primary)");
    expect(result[2].color).toBe("var(--warning)");
    expect(result[3].color).toBe("var(--muted)");
    expect(result[4].color).toBe("var(--primary)");
  });
});
