import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseLogTab from "./CaseLogTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, LogEntry } from "../types-detail";

const MESSAGES = {
  "en-US": {
    cases: {
      detail: {
        log: {
          title: "Activity log",
          categoryLabel: "Category",
          empty: "No log entries",
        },
      },
      constants: {
        logCategories: {
          all: "All",
          operation: "Operation",
          review: "Review",
          status: "Status",
        },
      },
    },
  },
  "ja-JP": {
    cases: {
      detail: {
        log: {
          title: "活動ログ",
          categoryLabel: "カテゴリ",
          empty: "ログなし",
        },
      },
      constants: {
        logCategories: {
          all: "全て",
          operation: "操作",
          review: "審査",
          status: "状態",
        },
      },
    },
  },
  "zh-CN": {
    cases: {
      detail: {
        log: {
          title: "活动日志",
          categoryLabel: "分类",
          empty: "暂无日志",
        },
      },
      constants: {
        logCategories: {
          all: "全部",
          operation: "操作",
          review: "审核",
          status: "状态",
        },
      },
    },
  },
};

function makeI18n(locale: "en-US" | "ja-JP" | "zh-CN") {
  return createI18n({ legacy: false, locale, messages: MESSAGES });
}

function buildEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: "operation",
    avatar: "AB",
    avatarStyle: "background:#000",
    text: "cases.log.timeline.caseCreated",
    category: "cases.log.category.operation",
    categoryChip: "chip-muted",
    objectType: "cases.log.objectType.case",
    time: "2026-04-29T02:32:06.000Z",
    dotColor: "var(--muted)",
    ...overrides,
  };
}

function buildDetail(entries: LogEntry[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, logEntries: entries };
}

function mountTab(
  entries: LogEntry[],
  locale: "en-US" | "ja-JP" | "zh-CN" = "ja-JP",
) {
  return mount(CaseLogTab, {
    props: { detail: buildDetail(entries), readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: { template: "<section><slot /></section>" },
        Chip: { template: "<span><slot /></span>", props: ["tone", "size"] },
      },
    },
  });
}

function readTimeCells(html: string): string[] {
  const matches = html.matchAll(
    /<span[^>]*class="log-tab__entry-time"[^>]*>([\s\S]*?)<\/span>/g,
  );
  return Array.from(matches, (m) => m[1].trim());
}

describe("CaseLogTab BUG-129 regression: formatEntryTime fallback", () => {
  it("ISO timestamp is locale-formatted, no raw ISO tokens", () => {
    const w = mountTab(
      [buildEntry({ time: "2026-04-29T02:32:06.000Z" })],
      "ja-JP",
    );
    const cells = readTimeCells(w.html());
    expect(cells).toHaveLength(1);
    const text = cells[0];
    expect(text).not.toContain("T");
    expect(text).not.toContain("Z");
    expect(text).not.toContain("GMT");
    expect(text).toContain("2026");
  });

  it("Date.toString() leaked string (BUG-087 root cause) is normalized", () => {
    const raw = "Wed Apr 29 2026 19:54:27 GMT+0900 (Japan Standard Time)";
    const w = mountTab([buildEntry({ time: raw })], "ja-JP");
    const text = readTimeCells(w.html())[0];
    expect(text).not.toContain("GMT");
    expect(text).not.toContain("Japan Standard Time");
    expect(text).not.toContain("Wed Apr");
    expect(text).toContain("2026");
  });

  it("falls back to the raw string when value is unparseable", () => {
    const w = mountTab([buildEntry({ time: "not-a-date" })], "ja-JP");
    const text = readTimeCells(w.html())[0];
    expect(text).toBe("not-a-date");
  });

  it("renders empty cell for empty time field", () => {
    const w = mountTab([buildEntry({ time: "" })], "ja-JP");
    const text = readTimeCells(w.html())[0];
    expect(text).toBe("");
  });

  it("formats per locale (zh-CN vs en-US produce different strings)", () => {
    const iso = "2026-04-29T02:32:06.000Z";
    const zh = readTimeCells(
      mountTab([buildEntry({ time: iso })], "zh-CN").html(),
    )[0];
    const en = readTimeCells(
      mountTab([buildEntry({ time: iso })], "en-US").html(),
    )[0];
    expect(zh).toContain("2026");
    expect(en).toContain("2026");
    expect(zh).not.toContain("T");
    expect(en).not.toContain("T");
  });
});
