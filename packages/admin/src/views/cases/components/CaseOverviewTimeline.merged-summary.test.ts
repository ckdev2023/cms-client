import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n, type I18n } from "vue-i18n";
import CaseOverviewTimeline from "./CaseOverviewTimeline.vue";
import type { TimelineEntry } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "en-US" | "ja-JP";

function makeI18n(locale: Locale): I18n {
  return createI18n({
    legacy: false,
    locale,
    messages: FULL_MESSAGES,
  });
}

function baseMergedEntry(
  overrides: Partial<TimelineEntry> = {},
): TimelineEntry {
  return {
    color: "primary",
    text: "cases.log.timeline.caseUpdated",
    meta: "2026-05-08T10:30:00.000Z",
    track: "other",
    mergedCount: 3,
    mergedEarliestIso: "2026-05-08T08:00:00.000Z",
    mergedLatestIso: "2026-05-08T10:30:00.000Z",
    ...overrides,
  };
}

function singleEntry(): TimelineEntry {
  return {
    color: "primary",
    text: "cases.log.timeline.caseUpdated",
    meta: "2026-05-08T09:00:00.000Z",
    track: "other",
  };
}

function mountTimeline(locale: Locale, timeline: TimelineEntry[]) {
  return mount(CaseOverviewTimeline, {
    props: { timeline },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            '<section><slot /><footer><slot name="footer" /></footer></section>',
          props: ["title", "padding"],
        },
        Chip: {
          template:
            '<span class="chip" :data-testid="$attrs[\'data-testid\']"><slot /></span>',
          props: ["tone", "size"],
        },
      },
    },
  });
}

describe("CaseOverviewTimeline merged-chip rendering", () => {
  describe("mergedCount > 1 renders merged-chip", () => {
    it("zh-CN: contains ×, count, and time range", () => {
      const wrapper = mountTimeline("zh-CN", [baseMergedEntry()]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(true);
      const text = chip.text();
      expect(text).toContain("× 3 次");
      expect(text).toContain(":");
    });

    it("ja-JP: contains ×, count, and time range", () => {
      const wrapper = mountTimeline("ja-JP", [baseMergedEntry()]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(true);
      const text = chip.text();
      expect(text).toContain("× 3 件");
      expect(text).toContain(":");
    });

    it("en-US: contains ×, count, and time range", () => {
      const wrapper = mountTimeline("en-US", [baseMergedEntry()]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(true);
      const text = chip.text();
      expect(text).toContain("× 3 times");
      expect(text).toContain(":");
    });
  });

  describe("mergedCount absent or <= 1 does NOT render merged-chip", () => {
    it("no mergedCount field → no chip", () => {
      const wrapper = mountTimeline("zh-CN", [singleEntry()]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(false);
    });

    it("mergedCount = 1 → no chip", () => {
      const wrapper = mountTimeline("zh-CN", [
        baseMergedEntry({ mergedCount: 1 }),
      ]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(false);
    });

    it("mergedCount = 0 → no chip", () => {
      const wrapper = mountTimeline("zh-CN", [
        baseMergedEntry({ mergedCount: 0 }),
      ]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(false);
    });
  });

  describe("dual-track entries also render merged-chip", () => {
    it("business_phase track with mergedCount renders chip", () => {
      const entry = baseMergedEntry({ track: "business_phase" });
      const wrapper = mountTimeline("zh-CN", [entry]);
      const chip = wrapper.find('[data-testid="merged-chip"]');
      expect(chip.exists()).toBe(true);
    });

    it("stage track with mergedCount renders chip", () => {
      const entry = baseMergedEntry({ track: "stage" });
      const stageEntry2 = baseMergedEntry({
        track: "business_phase",
        mergedCount: undefined,
      });
      const wrapper = mountTimeline("zh-CN", [entry, stageEntry2]);
      const chips = wrapper.findAll('[data-testid="merged-chip"]');
      expect(chips.length).toBe(1);
    });
  });
});
