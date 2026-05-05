import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseLogTab from "./CaseLogTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, LogEntry } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

const FULL_MESSAGES = {
  "zh-CN": {
    cases: casesZhCN,
  },
  "ja-JP": {
    cases: casesJaJP,
  },
  "en-US": {
    cases: casesEnUS,
  },
};

function makeI18n(locale: "zh-CN" | "ja-JP" | "en-US") {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: "status",
    avatar: "TY",
    avatarStyle: "background:#000",
    text: "cases.log.timeline.stageChange",
    textParams: { from: "S3", to: "S4" },
    category: "cases.log.category.status",
    categoryChip: "chip-primary",
    objectType: "cases.log.objectType.case",
    time: "2026-04-29T10:00:00Z",
    dotColor: "var(--primary)",
    ...overrides,
  };
}

function buildDetail(entries: LogEntry[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, logEntries: entries };
}

function mountTab(
  entries: LogEntry[],
  locale: "zh-CN" | "ja-JP" | "en-US" = "ja-JP",
) {
  return mount(CaseLogTab, {
    props: { detail: buildDetail(entries), readonly: false },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: { template: "<section><slot /></section>" },
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
      },
    },
  });
}

describe("CaseLogTab i18n: locale switching renders correct text", () => {
  it("stage change renders zh-CN text", () => {
    const w = mountTab([buildEntry()], "zh-CN");
    const html = w.html();
    expect(html).toContain("阶段变更：S3 → S4");
    expect(html).toContain("状态变更");
    expect(html).toContain("案件");
  });

  it("stage change renders ja-JP text", () => {
    const w = mountTab([buildEntry()], "ja-JP");
    const html = w.html();
    expect(html).toContain("段階変更：S3 → S4");
    expect(html).toContain("状態変更");
    expect(html).toContain("案件");
  });

  it("stage change renders en-US text", () => {
    const w = mountTab([buildEntry()], "en-US");
    const html = w.html();
    expect(html).toContain("Stage change: S3 → S4");
    expect(html).toContain("Status change");
    expect(html).toContain("Case");
  });

  it("operation category chip renders per locale", () => {
    const entry = buildEntry({
      type: "operation",
      text: "cases.log.timeline.caseCreated",
      textParams: { suffix: "bmv", colonSuffix: "：bmv" },
      category: "cases.log.category.operation",
      categoryChip: "chip-muted",
      objectType: "cases.log.objectType.communicationLog",
    });
    const zh = mountTab([entry], "zh-CN").html();
    const ja = mountTab([entry], "ja-JP").html();
    const en = mountTab([entry], "en-US").html();

    expect(zh).toContain("操作日志");
    expect(ja).toContain("操作ログ");
    expect(en).toContain("Operation");

    expect(zh).toContain("案件创建：bmv");
    expect(ja).toContain("案件作成：bmv");
    expect(en).toContain("Case created：bmv");
  });

  it("category filter buttons render translated labels", () => {
    const w = mountTab([buildEntry()], "zh-CN");
    const buttons = w.findAll(".log-tab__segment");
    const labels = buttons.map((b) => b.text());
    expect(labels).toContain("全部");
    expect(labels).toContain("操作日志");
    expect(labels).toContain("审核日志");
    expect(labels).toContain("状态变更日志");
  });
});
