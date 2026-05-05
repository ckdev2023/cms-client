import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildOverviewTimelineFromLog,
  adaptCaseLogDto,
  resolveTimelineTrack,
} from "../model/CaseCommsLogsAdapter";
import type { LogEntry } from "../types-detail";
import { createI18n } from "vue-i18n";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

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

const vueSrc = readFileSync(
  resolve(__dirname, "CaseOverviewTimeline.vue"),
  "utf-8",
);

describe("R35-F: timeline dual-track swimlane + synthesized chip", () => {
  describe("resolveTimelineTrack", () => {
    it("case.phase_transitioned → business_phase", () => {
      expect(resolveTimelineTrack("case.phase_transitioned")).toBe(
        "business_phase",
      );
    });

    it("case.transitioned → stage", () => {
      expect(resolveTimelineTrack("case.transitioned")).toBe("stage");
    });

    it("case.status_changed → stage", () => {
      expect(resolveTimelineTrack("case.status_changed")).toBe("stage");
    });

    it("case.stage_changed → stage", () => {
      expect(resolveTimelineTrack("case.stage_changed")).toBe("stage");
    });

    it("case.created → other", () => {
      expect(resolveTimelineTrack("case.created")).toBe("other");
    });

    it("document_item.created → other", () => {
      expect(resolveTimelineTrack("document_item.created")).toBe("other");
    });
  });

  describe("adaptCaseLogDto — synthesized passthrough", () => {
    it("extracts synthesized=data_repair from payload", () => {
      const entry = adaptCaseLogDto({
        id: "tl-001",
        action: "case.transitioned",
        created_at: "2026-04-01T10:00:00Z",
        payload: {
          from: "S1",
          to: "S3",
          businessPhase: "MATERIAL_PREPARING",
          synthesized: "data_repair",
        },
      });
      expect(entry).not.toBeNull();
      expect(entry!.synthesized).toBe("data_repair");
      expect(entry!.track).toBe("stage");
    });

    it("omits synthesized when payload has none", () => {
      const entry = adaptCaseLogDto({
        id: "tl-002",
        action: "case.transitioned",
        created_at: "2026-04-01T10:00:00Z",
        payload: {
          from: "S3",
          to: "S4",
          businessPhase: "REVIEWING",
        },
      });
      expect(entry).not.toBeNull();
      expect(entry!.synthesized).toBeUndefined();
    });

    it("phase_transitioned gets track=business_phase", () => {
      const entry = adaptCaseLogDto({
        id: "tl-003",
        action: "case.phase_transitioned",
        created_at: "2026-04-01T10:00:00Z",
        payload: { from: "CONSULTING", to: "CONTRACTED" },
      });
      expect(entry).not.toBeNull();
      expect(entry!.track).toBe("business_phase");
    });

    it("case.created gets track=other", () => {
      const entry = adaptCaseLogDto({
        id: "tl-004",
        action: "case.created",
        created_at: "2026-04-01T10:00:00Z",
        payload: { caseTypeCode: "biz_mgmt" },
      });
      expect(entry).not.toBeNull();
      expect(entry!.track).toBe("other");
    });
  });

  describe("buildOverviewTimelineFromLog — synthesized + track passthrough", () => {
    it("passes synthesized to TimelineEntry", () => {
      const entries = [
        makeLogEntry({
          type: "status",
          synthesized: "data_repair",
          track: "stage",
          time: "2026-04-01T10:00:00Z",
        }),
      ];
      const result = buildOverviewTimelineFromLog(entries);
      expect(result[0].synthesized).toBe("data_repair");
    });

    it("omits synthesized when source has none", () => {
      const entries = [
        makeLogEntry({
          type: "status",
          track: "stage",
          time: "2026-04-01T10:00:00Z",
        }),
      ];
      const result = buildOverviewTimelineFromLog(entries);
      expect(result[0].synthesized).toBeUndefined();
    });

    it("passes track to TimelineEntry", () => {
      const entries = [
        makeLogEntry({
          type: "status",
          track: "business_phase",
          time: "2026-04-01T10:00:00Z",
        }),
      ];
      const result = buildOverviewTimelineFromLog(entries);
      expect(result[0].track).toBe("business_phase");
    });
  });

  describe("template: dual-track rendering", () => {
    it("has dual-track container with data-testid", () => {
      expect(vueSrc).toContain('data-testid="timeline-dual-track"');
    });

    it("has business-phase track lane", () => {
      expect(vueSrc).toContain('data-testid="timeline-track-business-phase"');
    });

    it("has stage track lane", () => {
      expect(vueSrc).toContain('data-testid="timeline-track-stage"');
    });

    it("renders synthesized chip with data-testid", () => {
      expect(vueSrc).toContain('data-testid="synthesized-chip"');
    });

    it("uses synthesizedHint i18n key", () => {
      expect(vueSrc).toContain("cases.log.timeline.synthesizedHint");
    });

    it("uses trackBusinessPhase i18n key", () => {
      expect(vueSrc).toContain("cases.log.timeline.trackBusinessPhase");
    });

    it("uses trackStage i18n key", () => {
      expect(vueSrc).toContain("cases.log.timeline.trackStage");
    });
  });

  describe("i18n keys: synthesizedHint + track labels", () => {
    const keys = [
      "cases.log.timeline.synthesizedHint",
      "cases.log.timeline.trackBusinessPhase",
      "cases.log.timeline.trackStage",
    ] as const;

    for (const key of keys) {
      for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
        it(`${locale} has ${key}`, () => {
          const i18n = makeI18n(locale);
          const text = i18n.global.t(key);
          expect(text).toBeTruthy();
          expect(text).not.toBe(key);
        });
      }
    }
  });
});
