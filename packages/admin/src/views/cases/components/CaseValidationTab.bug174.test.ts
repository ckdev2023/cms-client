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

function buildPassedNoGateItemsDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: {
      lastTime: "2026/01/02 09:30",
      lastTimeIso: "2026-01-02T00:30:00.000Z",
      blocking: [],
      warnings: [],
      info: [],
    },
    submissionPackages: [],
    correctionPackage: null,
  };
}

/**
 * 尚无校验运行时（与 adaptCaseValidationData 空列表一致）
 *
 * @returns 不含任何校验运行时间戳的案件详情骨架
 */
function buildNeverValidatedDetail(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    validation: {
      lastTime: "",
      lastTimeIso: "",
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
  "尚未运行校验",
  "请点击上方「重新检查」运行门禁校验后查看结果。",
  "提交包（历史快照）",
  "新建提交包",
  "已锁定",
  "暂无提交包记录",
  "补正包",
  "补正通知关联",
  "关联原提交包：",
  "补正截止：",
  "补正项：",
  "系统内部编号",
  "复制完整编号",
];

describe("BUG-174 CaseValidationTab i18n: no Chinese leakage in en-US / ja-JP", () => {
  it("submission package card shows summary as title and id as secondary", () => {
    const wrapper = mountComponent("en-US", buildFullDetail());
    expect(wrapper.find(".vt__pkg-title").text()).toBe("12 docs");
    expect(wrapper.find(".vt__pkg-technical-id").text()).toBe("SUB-001");
  });

  it("submission package UUID shows tail label and copy in zh-CN", () => {
    const detail = buildFullDetail();
    detail.submissionPackages = [
      {
        id: "ed82a8dd-f088-473d-b66b-5db38980d430",
        status: "submitted",
        locked: true,
        date: "2026/04/06",
        summary: "#1 初回提出",
      },
    ];
    const wrapper = mountComponent("zh-CN", detail);
    expect(wrapper.find(".vt__pkg-technical-id").text()).toBe(
      "系统内部编号（尾号 8980d430）",
    );
    expect(wrapper.find(".vt__pkg-copy-tech-id").text()).toBe("复制完整编号");
  });

  it("submission package UUID shows English copy and copy control", () => {
    const detail = buildFullDetail();
    detail.submissionPackages = [
      {
        id: "ed82a8dd-f088-473d-b66b-5db38980d430",
        status: "submitted",
        locked: true,
        date: "2026/04/06",
        summary: "#1 initial",
      },
    ];
    const wrapper = mountComponent("en-US", detail);
    expect(wrapper.find(".vt__pkg-technical-id").text()).toBe(
      "System ID (suffix 8980d430)",
    );
    expect(wrapper.find(".vt__pkg-copy-tech-id").text()).toBe("Copy full ID");
  });

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

  it("zh-CN empty gate lists after a run renders noBlockers + empty pkg message", () => {
    const html = mountComponent("zh-CN", buildPassedNoGateItemsDetail()).html();
    expect(html).toContain("校验通过，无阻断项");
    expect(html).toContain("暂无提交包记录");
  });

  it("zh-CN never-validated renders overview copy + hint", () => {
    const html = mountComponent("zh-CN", buildNeverValidatedDetail()).html();
    expect(html).toContain("尚未运行校验");
    expect(html).toContain("请点击上方「重新检查」运行门禁校验后查看结果。");
    expect(html).not.toContain("校验通过，无阻断项");
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

  it("en-US passed run with empty gate lists renders English labels", () => {
    const html = mountComponent("en-US", buildPassedNoGateItemsDetail()).html();
    expect(html).toContain("Validation passed, no blockers");
    expect(html).toContain("No submission packages yet");
  });

  it("en-US never-validated renders English overview copy + hint", () => {
    const html = mountComponent("en-US", buildNeverValidatedDetail()).html();
    expect(html).toContain("Not yet validated");
    expect(html).toContain(
      "Use “Re-check” above to run the gates and view results.",
    );
    expect(html).not.toContain("Validation passed, no blockers");
  });

  it("en-US contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("en-US", buildFullDetail()).html();
    const htmlPassedEmpty = mountComponent(
      "en-US",
      buildPassedNoGateItemsDetail(),
    ).html();
    const htmlNever = mountComponent(
      "en-US",
      buildNeverValidatedDetail(),
    ).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlPassedEmpty).not.toContain(leak);
      expect(htmlNever).not.toContain(leak);
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

  it("ja-JP passed run with empty gate lists renders Japanese labels", () => {
    const html = mountComponent("ja-JP", buildPassedNoGateItemsDetail()).html();
    expect(html).toContain("チェック通過、ブロッカーなし");
    expect(html).toContain("提出パッケージなし");
  });

  it("ja-JP never-validated renders overview copy + hint", () => {
    const html = mountComponent("ja-JP", buildNeverValidatedDetail()).html();
    expect(html).toContain("未検証");
    expect(html).toContain(
      "上の「再チェック」でゲートを実行すると結果が表示されます。",
    );
    expect(html).not.toContain("チェック通過、ブロッカーなし");
  });

  it("ja-JP contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("ja-JP", buildFullDetail()).html();
    const htmlPassedEmpty = mountComponent(
      "ja-JP",
      buildPassedNoGateItemsDetail(),
    ).html();
    const htmlNever = mountComponent(
      "ja-JP",
      buildNeverValidatedDetail(),
    ).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlPassedEmpty).not.toContain(leak);
      expect(htmlNever).not.toContain(leak);
    }
  });

  it("readonly mode hides recheck and create buttons across locales", () => {
    const htmlEn = mountComponent(
      "en-US",
      buildPassedNoGateItemsDetail(),
      true,
    ).html();
    expect(htmlEn).not.toContain("Re-check");
    expect(htmlEn).not.toContain("Create package");

    const htmlJa = mountComponent(
      "ja-JP",
      buildPassedNoGateItemsDetail(),
      true,
    ).html();
    expect(htmlJa).not.toContain("再チェック");
    expect(htmlJa).not.toContain("パッケージ作成");
  });
});
