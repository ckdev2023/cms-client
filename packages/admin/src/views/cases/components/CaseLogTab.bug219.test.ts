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
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

type Locale = "zh-CN" | "ja-JP" | "en-US";

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildEntry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    type: "operation",
    avatar: "TY",
    avatarStyle: "background:#000",
    text: "cases.log.timeline.caseCreated",
    textParams: {
      suffix: "biz_mgmt_cert_4m",
      suffixKey: "cases.constants.caseTypes.biz_mgmt_cert_4m",
    },
    category: "cases.log.category.operation",
    categoryChip: "chip-muted",
    objectType: "cases.log.objectType.case",
    time: "2026-04-29T10:00:00Z",
    dotColor: "var(--muted)",
    ...overrides,
  };
}

function buildDetail(entries: LogEntry[]): CaseDetail {
  return { ...CASE_DETAIL_SAMPLES.work, logEntries: entries };
}

function mountTab(entries: LogEntry[], locale: Locale = "ja-JP") {
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

function getEntryTexts(html: string): string[] {
  const matches = html.matchAll(
    /<p[^>]*class="log-tab__entry-text"[^>]*>([\s\S]*?)<\/p>/g,
  );
  return Array.from(matches, (m) => m[1].trim());
}

describe("CaseLogTab BUG-219: unhandled actions must not display raw action strings", () => {
  const KNOWN_ACTIONS: {
    action: string;
    zhContains: string;
    jaContains: string;
    enContains: string;
  }[] = [
    {
      action: "case_party.created",
      zhContains: "添加关联人",
      jaContains: "関連人追加",
      enContains: "Related party added",
    },
    {
      action: "task.created",
      zhContains: "任务创建",
      jaContains: "タスク作成",
      enContains: "Task created",
    },
    {
      action: "document_item.created",
      zhContains: "资料项添加",
      jaContains: "資料項目追加",
      enContains: "Document item added",
    },
    {
      action: "review_record.approved",
      zhContains: "复核通过",
      jaContains: "復核承認",
      enContains: "Review approved",
    },
    {
      action: "validation_run.failed",
      zhContains: "提交前检查未通过",
      jaContains: "検証不合格",
      enContains: "Validation failed",
    },
    {
      action: "billing_record.created",
      zhContains: "收费记录添加",
      jaContains: "請求記録追加",
      enContains: "Billing record added",
    },
  ];

  for (const { action, zhContains, jaContains, enContains } of KNOWN_ACTIONS) {
    it(`${action} renders translated text in zh-CN`, () => {
      const entry = buildEntry({
        text: `cases.log.timeline.${action
          .replace(".", "_")
          .replace(/^(\w+)_(\w+)$/, (_, obj, act) => {
            return (
              obj.replace(/_(\w)/g, (_2: string, c: string) =>
                c.toUpperCase(),
              ) +
              act.charAt(0).toUpperCase() +
              act.slice(1)
            );
          })}`,
        textParams: { suffix: "test" },
      });
      const w = mountTab([entry], "zh-CN");
      expect(w.html()).toContain(zhContains);
    });

    it(`${action} renders translated text in ja-JP`, () => {
      const entry = buildEntry({
        text: `cases.log.timeline.${action
          .replace(".", "_")
          .replace(/^(\w+)_(\w+)$/, (_, obj, act) => {
            return (
              obj.replace(/_(\w)/g, (_2: string, c: string) =>
                c.toUpperCase(),
              ) +
              act.charAt(0).toUpperCase() +
              act.slice(1)
            );
          })}`,
        textParams: { suffix: "test" },
      });
      const w = mountTab([entry], "ja-JP");
      expect(w.html()).toContain(jaContains);
    });

    it(`${action} renders translated text in en-US`, () => {
      const entry = buildEntry({
        text: `cases.log.timeline.${action
          .replace(".", "_")
          .replace(/^(\w+)_(\w+)$/, (_, obj, act) => {
            return (
              obj.replace(/_(\w)/g, (_2: string, c: string) =>
                c.toUpperCase(),
              ) +
              act.charAt(0).toUpperCase() +
              act.slice(1)
            );
          })}`,
        textParams: { suffix: "test" },
      });
      const w = mountTab([entry], "en-US");
      expect(w.html()).toContain(enContains);
    });
  }

  it("unregistered action falls back gracefully (not raw action string)", () => {
    const entry = buildEntry({
      text: "cases.log.timeline.someUnknown_action",
      textParams: { fallback: "some_unknown.action" },
    });
    const w = mountTab([entry], "zh-CN");
    const texts = getEntryTexts(w.html());
    expect(texts).toHaveLength(1);
    expect(texts[0]).toBe("some_unknown.action");
  });
});

describe("CaseLogTab BUG-220: case.created must translate caseTypeCode enum", () => {
  it("zh-CN translates biz_mgmt_cert_4m to 经营管理（认定4个月）", () => {
    const w = mountTab([buildEntry()], "zh-CN");
    const texts = getEntryTexts(w.html());
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("经营管理（认定4个月）");
    expect(texts[0]).not.toContain("biz_mgmt_cert_4m");
  });

  it("ja-JP translates biz_mgmt_cert_4m to 経営管理（認定4ヶ月）", () => {
    const w = mountTab([buildEntry()], "ja-JP");
    const texts = getEntryTexts(w.html());
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("経営管理（認定4ヶ月）");
    expect(texts[0]).not.toContain("biz_mgmt_cert_4m");
  });

  it("en-US translates biz_mgmt_cert_4m to BMV (CoE 4-month)", () => {
    const w = mountTab([buildEntry()], "en-US");
    const texts = getEntryTexts(w.html());
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("BMV (CoE 4-month)");
    expect(texts[0]).not.toContain("biz_mgmt_cert_4m");
  });

  it("unknown caseTypeCode falls back to raw value", () => {
    const entry = buildEntry({
      textParams: {
        suffix: "unknown_type_xyz",
        suffixKey: "cases.constants.caseTypes.unknown_type_xyz",
      },
    });
    const w = mountTab([entry], "zh-CN");
    const texts = getEntryTexts(w.html());
    expect(texts).toHaveLength(1);
    expect(texts[0]).toContain("unknown_type_xyz");
  });
});
