import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import { useCaseDetailModel } from "./useCaseDetailModel";
import { buildOverviewTimelineFromLog } from "./CaseCommsLogsAdapter";
import type { CaseRepository } from "./CaseRepository";
import type { CaseDetail } from "../types";
import type { LogEntry } from "../types-detail";
import {
  createMockAggregate,
  createMockDetail,
  flushFetch,
} from "./useCaseDetailModel.test-support";

function makeLogEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: "operation",
    avatar: "SY",
    avatarStyle: "background:#000",
    text: "cases.log.timeline.caseCreated",
    textParams: { suffix: "work" },
    category: "cases.log.category.operation",
    categoryChip: "chip-muted",
    objectType: "cases.log.objectType.case",
    time: "2026-03-15T10:00:00Z",
    dotColor: "var(--muted)",
    ...overrides,
  };
}

function createRepoWithLogs(
  detail: CaseDetail,
  logEntries: LogEntry[],
): CaseRepository {
  const aggregate = createMockAggregate(detail);
  return {
    getDetailAggregate: vi.fn(async () => aggregate),
    getMessages: vi.fn(async () => []),
    getLogEntries: vi.fn(async () => logEntries),
    getDocumentItems: vi.fn(async () => []),
    getGeneratedDocuments: vi.fn(async () => ({
      templates: [],
      generated: [],
    })),
    getValidationData: vi.fn(async () => ({
      lastTime: "",
      blocking: [],
      warnings: [],
      info: [],
    })),
    getBillingData: vi.fn(async () => ({
      total: "—",
      received: "¥0",
      outstanding: "¥0",
      payments: [],
    })),
    getSubmissionPackages: vi.fn(async () => []),
    getDoubleReviewEntries: vi.fn(async () => []),
    getTasks: vi.fn(async () => []),
    getDeadlines: vi.fn(async () => []),
    transitionPhase: vi.fn(async () => ({ id: "case-001" })),
  } as unknown as CaseRepository;
}

describe("buildOverviewTimelineFromLog (pure)", () => {
  it("returns empty array for empty input", () => {
    expect(buildOverviewTimelineFromLog([])).toEqual([]);
  });

  it("maps LogEntry fields to TimelineEntry", () => {
    const entry = makeLogEntry({
      type: "status",
      text: "cases.log.timeline.stageChange",
      time: "2026-04-01T12:00:00Z",
      dotColor: "var(--primary)",
    });
    const result = buildOverviewTimelineFromLog([entry]);
    expect(result).toEqual([
      {
        color: "var(--primary)",
        text: "cases.log.timeline.stageChange",
        textParams: { suffix: "work" },
        meta: "2026-04-01T12:00:00Z",
      },
    ]);
  });

  it("sorts entries by time descending", () => {
    const entries = [
      makeLogEntry({ text: "oldest", time: "2026-01-01T00:00:00Z" }),
      makeLogEntry({ text: "newest", time: "2026-03-01T00:00:00Z" }),
      makeLogEntry({ text: "middle", time: "2026-02-01T00:00:00Z" }),
    ];
    const result = buildOverviewTimelineFromLog(entries);
    expect(result.map((e) => e.text)).toEqual(["newest", "middle", "oldest"]);
  });

  it("limits to 5 entries by default", () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      makeLogEntry({ text: `entry-${i}`, time: `2026-0${i + 1}-01T00:00:00Z` }),
    );
    const result = buildOverviewTimelineFromLog(entries);
    expect(result).toHaveLength(5);
  });

  it("respects custom limit", () => {
    const entries = Array.from({ length: 8 }, (_, i) =>
      makeLogEntry({ text: `entry-${i}`, time: `2026-0${i + 1}-01T00:00:00Z` }),
    );
    const result = buildOverviewTimelineFromLog(entries, 3);
    expect(result).toHaveLength(3);
  });

  it("maps category colors correctly", () => {
    const entries = [
      makeLogEntry({
        type: "status",
        dotColor: "var(--primary)",
        time: "2026-03-03",
      }),
      makeLogEntry({
        type: "review",
        dotColor: "var(--warning)",
        time: "2026-03-02",
      }),
      makeLogEntry({
        type: "operation",
        dotColor: "var(--muted)",
        time: "2026-03-01",
      }),
    ];
    const result = buildOverviewTimelineFromLog(entries);
    expect(result[0].color).toBe("var(--primary)");
    expect(result[1].color).toBe("var(--warning)");
    expect(result[2].color).toBe("var(--muted)");
  });

  it("falls back to var(--muted) for unknown category", () => {
    const entry = makeLogEntry({ type: "unknown_type" as never });
    const result = buildOverviewTimelineFromLog([entry]);
    expect(result[0].color).toBe("var(--muted)");
  });

  it("does not mutate original array", () => {
    const entries = [
      makeLogEntry({ text: "b", time: "2026-01-01" }),
      makeLogEntry({ text: "a", time: "2026-02-01" }),
    ];
    const original = [...entries];
    buildOverviewTimelineFromLog(entries);
    expect(entries[0].text).toBe(original[0].text);
    expect(entries[1].text).toBe(original[1].text);
  });
});

describe("useCaseDetailModel timeline derivation (D2)", () => {
  it("populates detail.timeline from logEntries after fetchTabData", async () => {
    const logs = [
      makeLogEntry({
        type: "status",
        text: "cases.log.timeline.stageChange",
        time: "2026-04-01T12:00:00Z",
        dotColor: "var(--primary)",
      }),
      makeLogEntry({
        type: "operation",
        text: "cases.log.timeline.caseCreated",
        time: "2026-03-15T10:00:00Z",
        dotColor: "var(--muted)",
      }),
    ];
    const detail = createMockDetail();
    const repo = createRepoWithLogs(detail, logs);
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();

    expect(model.detail.value).not.toBeNull();
    const tl = model.detail.value!.timeline;
    expect(tl).toHaveLength(2);
    expect(tl[0]).toEqual({
      color: "var(--primary)",
      text: "cases.log.timeline.stageChange",
      textParams: { suffix: "work" },
      meta: "2026-04-01T12:00:00Z",
    });
    expect(tl[1]).toEqual({
      color: "var(--muted)",
      text: "cases.log.timeline.caseCreated",
      textParams: { suffix: "work" },
      meta: "2026-03-15T10:00:00Z",
    });
  });

  it("timeline is empty when no logEntries are returned", async () => {
    const detail = createMockDetail();
    const repo = createRepoWithLogs(detail, []);
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();

    expect(model.detail.value!.timeline).toEqual([]);
  });

  it("timeline is limited to 5 entries", async () => {
    const logs = Array.from({ length: 8 }, (_, i) =>
      makeLogEntry({
        text: `entry-${i}`,
        time: `2026-0${i + 1}-01T00:00:00Z`,
      }),
    );
    const detail = createMockDetail();
    const repo = createRepoWithLogs(detail, logs);
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();

    expect(model.detail.value!.timeline).toHaveLength(5);
  });

  it("timeline falls back to empty when getLogEntries fails", async () => {
    const detail = createMockDetail();
    const repo = createRepoWithLogs(detail, []);
    (repo.getLogEntries as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    const model = useCaseDetailModel(ref("CASE-001"), { repo });
    await flushFetch();
    await flushFetch();

    expect(model.detail.value!.timeline).toEqual([]);
  });
});
