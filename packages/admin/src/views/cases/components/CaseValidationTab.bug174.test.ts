import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationTab from "./CaseValidationTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail } from "../types-detail";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildFullDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: {
      lastTime: "2026/04/06 15:30",
      blocking: [
        {
          gate: "A",
          title: "Doc missing",
          fix: "Upload doc",
          assignee: "Suzuki",
          deadline: "2026/04/15",
          actionLabel: "Go",
          actionTab: "documents",
        },
      ],
      warnings: [
        {
          gate: "B",
          title: "Fee outstanding",
          note: "Confirm payment",
        },
      ],
      info: [
        {
          gate: "C",
          title: "Info note",
          note: "Just FYI",
        },
      ],
    },
    submissionPackages: [
      {
        id: "SUB-001",
        status: "submitted",
        locked: true,
        date: "2026/04/06",
        summary: "12 docs",
      },
    ],
    correctionPackage: {
      id: "COR-001",
      status: "processing",
      noticeDate: "2026/04/01",
      relatedSub: "SUB-001",
      corrDeadline: "2026/04/15",
      items: "Source cert mismatch",
      note: "Correction note",
    },
  };
}

function buildEmptyDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: {
      lastTime: "N/A",
      blocking: [],
      warnings: [],
      info: [],
    },
    submissionPackages: [],
    correctionPackage: null,
  };
}

function mountComponent(locale: Locale, detail: CaseDetail, readonly = false) {
  return mount(CaseValidationTab, {
    props: { detail, readonly },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: {
          template:
            "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
        },
        Button: { template: "<button><slot /></button>" },
        Chip: {
          template: "<span class='chip'><slot /></span>",
          props: ["tone", "size"],
        },
        CaseValidationSupport: { template: "<div />" },
      },
    },
  });
}

const ZH_LABELS = [
  "提交前检查",
  "当前卡点",
  "重新检查",
  "必须先处理",
  "修复建议：",
  "责任人：",
  "截止：",
  "建议补强",
  "建议处理",
  "建议：",
  "补充说明",
  "仅提示",
  "校验通过，无阻断项",
  "提交包（历史快照）",
  "新建提交包",
  "已锁定",
  "暂无提交包记录",
  "补正包",
  "补正通知关联",
  "关联原提交包：",
  "补正截止：",
  "补正项：",
];

describe("BUG-174 CaseValidationTab i18n: no Chinese leakage in en-US / ja-JP", () => {
  it("zh-CN renders expected labels (full data)", () => {
    const html = mountComponent("zh-CN", buildFullDetail()).html();
    expect(html).toContain("提交前检查");
    expect(html).toContain("当前卡点");
    expect(html).toContain("重新检查");
    expect(html).toContain("必须先处理");
    expect(html).toContain("修复建议：Upload doc");
    expect(html).toContain("责任人：Suzuki");
    expect(html).toContain("截止：2026/04/15");
    expect(html).toContain("建议补强");
    expect(html).toContain("建议处理");
    expect(html).toContain("建议：Confirm payment");
    expect(html).toContain("补充说明");
    expect(html).toContain("仅提示");
    expect(html).toContain("提交包（历史快照）");
    expect(html).toContain("已锁定");
    expect(html).toContain("补正包");
    expect(html).toContain("补正通知关联");
    expect(html).toContain("关联原提交包：SUB-001");
    expect(html).toContain("补正截止：2026/04/15");
    expect(html).toContain("补正项：Source cert mismatch");
  });

  it("zh-CN empty state renders noBlockers + empty pkg message", () => {
    const html = mountComponent("zh-CN", buildEmptyDetail()).html();
    expect(html).toContain("校验通过，无阻断项");
    expect(html).toContain("暂无提交包记录");
  });

  it("en-US renders English copy (full data)", () => {
    const html = mountComponent("en-US", buildFullDetail()).html();
    expect(html).toContain("Pre-submission check");
    expect(html).toContain("Current blocker");
    expect(html).toContain("Re-check");
    expect(html).toContain("Must be resolved first");
    expect(html).toContain("Fix: Upload doc");
    expect(html).toContain("Owner: Suzuki");
    expect(html).toContain("Due: 2026/04/15");
    expect(html).toContain("Recommended improvements");
    expect(html).toContain("Suggested actions");
    expect(html).toContain("Note: Confirm payment");
    expect(html).toContain("Additional info");
    expect(html).toContain("FYI");
    expect(html).toContain("Submission packages (history)");
    expect(html).toContain("Locked");
    expect(html).toContain("Correction package");
    expect(html).toContain("Correction notice link");
    expect(html).toContain("Linked package: SUB-001");
    expect(html).toContain("Correction due: 2026/04/15");
    expect(html).toContain("Correction items: Source cert mismatch");
  });

  it("en-US empty state renders English labels", () => {
    const html = mountComponent("en-US", buildEmptyDetail()).html();
    expect(html).toContain("Validation passed, no blockers");
    expect(html).toContain("No submission packages yet");
  });

  it("en-US contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("en-US", buildFullDetail()).html();
    const htmlEmpty = mountComponent("en-US", buildEmptyDetail()).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlEmpty).not.toContain(leak);
    }
  });

  it("ja-JP renders Japanese copy (full data)", () => {
    const html = mountComponent("ja-JP", buildFullDetail()).html();
    expect(html).toContain("提出前チェック");
    expect(html).toContain("現在のブロッカー");
    expect(html).toContain("再チェック");
    expect(html).toContain("先に対応必須");
    expect(html).toContain("修正案：Upload doc");
    expect(html).toContain("担当：Suzuki");
    expect(html).toContain("期限：2026/04/15");
    expect(html).toContain("補強推奨");
    expect(html).toContain("対応推奨");
    expect(html).toContain("提案：Confirm payment");
    expect(html).toContain("補足");
    expect(html).toContain("参考のみ");
    expect(html).toContain("提出パッケージ（履歴）");
    expect(html).toContain("ロック済み");
    expect(html).toContain("補正パッケージ");
    expect(html).toContain("補正通知の関連付け");
    expect(html).toContain("関連提出：SUB-001");
    expect(html).toContain("補正期限：2026/04/15");
    expect(html).toContain("補正項目：Source cert mismatch");
  });

  it("ja-JP empty state renders Japanese labels", () => {
    const html = mountComponent("ja-JP", buildEmptyDetail()).html();
    expect(html).toContain("チェック通過、ブロッカーなし");
    expect(html).toContain("提出パッケージなし");
  });

  it("ja-JP contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("ja-JP", buildFullDetail()).html();
    const htmlEmpty = mountComponent("ja-JP", buildEmptyDetail()).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlEmpty).not.toContain(leak);
    }
  });

  it("readonly mode hides recheck and create buttons across locales", () => {
    const htmlEn = mountComponent("en-US", buildEmptyDetail(), true).html();
    expect(htmlEn).not.toContain("Re-check");
    expect(htmlEn).not.toContain("Create package");

    const htmlJa = mountComponent("ja-JP", buildEmptyDetail(), true).html();
    expect(htmlJa).not.toContain("再チェック");
    expect(htmlJa).not.toContain("パッケージ作成");
  });
});
