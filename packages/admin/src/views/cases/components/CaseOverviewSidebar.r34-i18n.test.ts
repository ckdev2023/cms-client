import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseOverviewSidebar from "./CaseOverviewSidebar.vue";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import { createMockDetail } from "../model/useCaseDetailModel.test-support";
import type { CaseDetail } from "../types-detail";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN },
  "ja-JP": { cases: casesJaJP },
  "en-US": { cases: casesEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function mountSidebar(detail: CaseDetail, locale: Locale = "zh-CN") {
  return mount(CaseOverviewSidebar, {
    props: { detail },
    global: {
      plugins: [makeI18n(locale)],
      stubs: {
        Card: { template: '<section class="stub-card"><slot /></section>' },
        Button: { template: "<button><slot /></button>" },
      },
    },
  });
}

function buildDetailWithBlocking() {
  return createMockDetail({
    risk: {
      blockingCount: "3",
      blockingDetail: "",
      blockingDetailLoc: {
        key: "cases.detail.overview.risk.blockingDetail",
        params: { count: 3 },
      },
      arrearsStatus: "cases.detail.arrearsYes",
      arrearsDetail: "¥50,000",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      lastValidation: "",
      lastValidationLoc: {
        key: "cases.detail.overview.risk.lastValidation.failed",
      },
      reviewStatus: "rejected",
    },
    validationHint: "",
    validationHintLoc: {
      key: "cases.detail.overview.validationHint.blockingWarning",
      params: { b: 3, w: 2 },
    },
  });
}

function buildDetailWithWarningOnly() {
  return createMockDetail({
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      arrearsStatus: "cases.detail.arrearsNo",
      arrearsDetail: "",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      lastValidation: "",
      lastValidationLoc: {
        key: "cases.detail.overview.risk.lastValidation.passed",
      },
      reviewStatus: "approved",
    },
    validationHint: "",
    validationHintLoc: {
      key: "cases.detail.overview.validationHint.warningOnly",
      params: { w: 5 },
    },
  });
}

function buildDetailWithPending() {
  return createMockDetail({
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      arrearsStatus: "cases.detail.arrearsNo",
      arrearsDetail: "",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      lastValidation: "",
      lastValidationLoc: {
        key: "cases.detail.overview.risk.lastValidation.pending",
      },
      reviewStatus: "",
    },
    validationHint: "",
  });
}

describe("CaseOverviewSidebar R34 i18n — zh-CN", () => {
  it("renders blocking detail in Chinese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "zh-CN");
    const html = w.html();
    expect(html).toContain("3 项阻断");
  });

  it("renders lastValidation failed in Chinese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "zh-CN");
    expect(w.html()).toContain("未通过");
  });

  it("renders lastValidation passed in Chinese", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "zh-CN");
    expect(w.html()).toContain("校验通过");
  });

  it("renders lastValidation pending in Chinese", () => {
    const w = mountSidebar(buildDetailWithPending(), "zh-CN");
    expect(w.html()).toContain("待执行");
  });

  it("renders validationHint blockingWarning in Chinese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "zh-CN");
    expect(w.html()).toContain("阻断 3 项");
    expect(w.html()).toContain("警告 2 项");
  });

  it("renders validationHint warningOnly in Chinese", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "zh-CN");
    expect(w.html()).toContain("5 项警告");
  });
});

describe("CaseOverviewSidebar R34 i18n — en-US", () => {
  it("renders blocking detail in English", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "en-US");
    expect(w.html()).toContain("3 blocking item(s)");
  });

  it("renders lastValidation failed in English", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "en-US");
    expect(w.html()).toContain("Failed");
  });

  it("renders lastValidation passed in English", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "en-US");
    expect(w.html()).toContain("Passed");
  });

  it("renders lastValidation pending in English", () => {
    const w = mountSidebar(buildDetailWithPending(), "en-US");
    expect(w.html()).toContain("Pending");
  });

  it("renders validationHint blockingWarning in English", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "en-US");
    expect(w.html()).toContain("3 blocking, 2 warning");
  });

  it("renders validationHint warningOnly in English", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "en-US");
    expect(w.html()).toContain("5 warning");
  });
});

describe("CaseOverviewSidebar R34 i18n — ja-JP", () => {
  it("renders blocking detail in Japanese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "ja-JP");
    expect(w.html()).toContain("3 件のブロッカー");
  });

  it("renders lastValidation failed in Japanese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "ja-JP");
    expect(w.html()).toContain("不合格");
  });

  it("renders lastValidation passed in Japanese", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "ja-JP");
    expect(w.html()).toContain("合格");
  });

  it("renders lastValidation pending in Japanese", () => {
    const w = mountSidebar(buildDetailWithPending(), "ja-JP");
    expect(w.html()).toContain("未実行");
  });

  it("renders validationHint blockingWarning in Japanese", () => {
    const w = mountSidebar(buildDetailWithBlocking(), "ja-JP");
    expect(w.html()).toContain("ブロッカー 3 件");
    expect(w.html()).toContain("警告 2 件");
  });

  it("renders validationHint warningOnly in Japanese", () => {
    const w = mountSidebar(buildDetailWithWarningOnly(), "ja-JP");
    expect(w.html()).toContain("警告 5 件");
  });
});

describe("CaseOverviewSidebar R34 i18n — no hardcoded English remnants", () => {
  const ENGLISH_REMNANTS = [
    /\bblocking issues?\b/i,
    /\bDue:\s/,
    /\d+\s+blocking,\s*\d+\s+warning/,
  ];

  for (const locale of ["zh-CN", "ja-JP"] as const) {
    it(`${locale}: no hardcoded English fragments in rendered HTML`, () => {
      const w = mountSidebar(buildDetailWithBlocking(), locale);
      const html = w.html();
      for (const pattern of ENGLISH_REMNANTS) {
        expect(html).not.toMatch(pattern);
      }
    });
  }
});
