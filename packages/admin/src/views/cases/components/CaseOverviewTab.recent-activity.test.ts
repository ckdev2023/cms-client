import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildOverviewTimelineFromLog } from "../model/CaseCommsLogsAdapter";
import {
  resolveTimelineText,
  type I18nAccessor,
} from "../model/CaseTimelineTextResolver";
import type { LogEntry, TimelineEntry } from "../types-detail";
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

function i18nAccessor(locale: Locale): I18nAccessor {
  const i18n = makeI18n(locale);
  return {
    t: (key: string, params?: Record<string, unknown>) =>
      i18n.global.t(key, params ?? {}),
    te: (key: string) => i18n.global.te(key),
  };
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

const vueSrc = readFileSync(resolve(__dirname, "CaseOverviewTab.vue"), "utf-8");

describe("R27-K regression: CaseOverviewTab recent-activity timeline", () => {
  describe("empty logEntries → timeline renders empty state", () => {
    it("buildOverviewTimelineFromLog returns [] for empty input", () => {
      expect(buildOverviewTimelineFromLog([])).toEqual([]);
    });

    it("template shows empty message when detail.timeline.length === 0", () => {
      expect(vueSrc).toContain('v-if="detail.timeline.length === 0"');
      expect(vueSrc).toContain("overview-tab__timeline-empty");
    });

    it("empty state uses i18n key cases.detail.overview.timeline.empty", () => {
      expect(vueSrc).toContain("cases.detail.overview.timeline.empty");
    });

    for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
      it(`${locale} has timeline.empty i18n key`, () => {
        const i18n = makeI18n(locale);
        const text = i18n.global.t("cases.detail.overview.timeline.empty");
        expect(text).toBeTruthy();
        expect(text).not.toBe("cases.detail.overview.timeline.empty");
      });
    }
  });

  describe("multiple entries → head 5 limit", () => {
    it("8 entries are trimmed to 5", () => {
      const entries = Array.from({ length: 8 }, (_, i) =>
        makeLogEntry({
          text: `entry-${i}`,
          time: `2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        }),
      );
      const result = buildOverviewTimelineFromLog(entries);
      expect(result).toHaveLength(5);
    });

    it("returned entries are the 5 most recent (desc order)", () => {
      const entries = Array.from({ length: 8 }, (_, i) =>
        makeLogEntry({
          text: `entry-${i}`,
          time: `2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`,
        }),
      );
      const result = buildOverviewTimelineFromLog(entries);
      expect(result.map((r) => r.text)).toEqual([
        "entry-7",
        "entry-6",
        "entry-5",
        "entry-4",
        "entry-3",
      ]);
    });

    it("fewer than 5 entries returns all", () => {
      const entries = [
        makeLogEntry({ time: "2026-04-02T00:00:00Z", text: "b" }),
        makeLogEntry({ time: "2026-04-01T00:00:00Z", text: "a" }),
      ];
      const result = buildOverviewTimelineFromLog(entries);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe("b");
      expect(result[1].text).toBe("a");
    });

    it("exactly 5 entries returns all 5", () => {
      const entries = Array.from({ length: 5 }, (_, i) =>
        makeLogEntry({
          text: `e-${i}`,
          time: `2026-04-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
        }),
      );
      const result = buildOverviewTimelineFromLog(entries);
      expect(result).toHaveLength(5);
    });
  });

  describe("color mapping is correct", () => {
    it("status → var(--primary)", () => {
      const result = buildOverviewTimelineFromLog([
        makeLogEntry({ type: "status", time: "2026-04-01T00:00:00Z" }),
      ]);
      expect(result[0].color).toBe("var(--primary)");
    });

    it("review → var(--warning)", () => {
      const result = buildOverviewTimelineFromLog([
        makeLogEntry({ type: "review", time: "2026-04-01T00:00:00Z" }),
      ]);
      expect(result[0].color).toBe("var(--warning)");
    });

    it("operation → var(--muted)", () => {
      const result = buildOverviewTimelineFromLog([
        makeLogEntry({ type: "operation", time: "2026-04-01T00:00:00Z" }),
      ]);
      expect(result[0].color).toBe("var(--muted)");
    });

    it("unknown type → var(--muted) fallback", () => {
      const result = buildOverviewTimelineFromLog([
        makeLogEntry({
          type: "nonexistent_type" as never,
          time: "2026-04-01T00:00:00Z",
        }),
      ]);
      expect(result[0].color).toBe("var(--muted)");
    });

    it("mixed types in a batch produce correct per-entry colors", () => {
      const entries = [
        makeLogEntry({ type: "status", time: "2026-04-03T00:00:00Z" }),
        makeLogEntry({ type: "review", time: "2026-04-02T00:00:00Z" }),
        makeLogEntry({ type: "operation", time: "2026-04-01T00:00:00Z" }),
      ];
      const result = buildOverviewTimelineFromLog(entries);
      expect(result.map((r) => r.color)).toEqual([
        "var(--primary)",
        "var(--warning)",
        "var(--muted)",
      ]);
    });
  });

  describe("component template wiring", () => {
    it("iterates over detail.timeline with v-for", () => {
      expect(vueSrc).toContain('v-for="(entry, i) in detail.timeline"');
    });

    it("renders timeline dot with timelineColor(entry.color)", () => {
      expect(vueSrc).toContain("timelineColor(entry.color)");
    });

    it("timeline text goes through resolveText (no raw i18n key)", () => {
      expect(vueSrc).toContain("resolveText(entry)");
      expect(vueSrc).not.toContain("{{ entry.text }}");
    });

    it("timeline meta goes through formatEntryTime (no raw ISO)", () => {
      expect(vueSrc).toContain("formatEntryTime(entry.meta, locale)");
      expect(vueSrc).not.toContain("{{ entry.meta }}");
    });

    it("'view all' button emits switchTab('log')", () => {
      expect(vueSrc).toContain(`emit('switchTab', 'log')`);
    });
  });

  describe("timeline i18n keys present in all locales", () => {
    const keys = [
      "cases.detail.overview.timeline.title",
      "cases.detail.overview.timeline.empty",
      "cases.detail.overview.timeline.viewAll",
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

  describe("overview timeline resolves i18n — phaseChange & commLogCreated", () => {
    function buildTimelineEntry(overrides: Partial<LogEntry>): TimelineEntry {
      return buildOverviewTimelineFromLog([makeLogEntry(overrides)])[0];
    }

    describe("phaseChange entry resolves across 3 locales", () => {
      const entry = buildTimelineEntry({
        type: "status",
        text: "cases.log.timeline.phaseChange",
        textParams: {
          fromPhaseKey: "cases.constants.phases.IN_PROGRESS",
          toPhaseKey: "cases.constants.phases.WAITING_PAYMENT",
        },
        time: "2026-05-01T12:00:00Z",
      });

      for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
        it(`${locale}: resolved text does not contain raw i18n key prefix`, () => {
          const resolved = resolveTimelineText(entry, i18nAccessor(locale));
          expect(resolved).not.toContain("cases.log.timeline.");
        });
      }
    });

    describe("commLogCreated entry resolves across 3 locales", () => {
      const entry = buildTimelineEntry({
        type: "operation",
        text: "cases.log.timeline.commLogCreated",
        textParams: {
          suffix: "phone",
          suffixKey: "cases.detail.messages.types.phone",
        },
        time: "2026-05-01T14:00:00Z",
      });

      for (const locale of ["zh-CN", "ja-JP", "en-US"] as const) {
        it(`${locale}: resolved text does not contain raw i18n key prefix`, () => {
          const resolved = resolveTimelineText(entry, i18nAccessor(locale));
          expect(resolved).not.toContain("cases.log.timeline.");
        });
      }
    });

    it("buildOverviewTimelineFromLog passes through textParams", () => {
      const params = {
        fromPhaseKey: "cases.constants.phases.IN_PROGRESS",
        toPhaseKey: "cases.constants.phases.WAITING_PAYMENT",
      };
      const entry = buildTimelineEntry({
        text: "cases.log.timeline.phaseChange",
        textParams: params,
      });
      expect(entry.textParams).toEqual(params);
    });

    it("meta stays as raw ISO (view layer formats it)", () => {
      const entry = buildTimelineEntry({
        time: "2026-05-01T12:00:00Z",
      });
      expect(entry.meta).toBe("2026-05-01T12:00:00Z");
    });
  });
});
