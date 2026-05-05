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

function buildDetailNoBlockingNoValidationNoDeadline() {
  return createMockDetail({
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      blockingDetailLoc: { key: "cases.detail.overview.risk.noBlocking" },
      arrearsStatus: "cases.detail.arrearsNo",
      arrearsDetail: "",
      deadlineAlert: "",
      deadlineAlertDetail: "",
      deadlineAlertLoc: { key: "cases.detail.overview.risk.noDeadline" },
      lastValidation: "",
      lastValidationLoc: { key: "cases.detail.overview.risk.notValidated" },
      reviewStatus: "",
    },
    deadlineDanger: false,
    validationHint: "",
  });
}

function buildDetailWithDeadlineAndArrears() {
  return createMockDetail({
    risk: {
      blockingCount: "0",
      blockingDetail: "",
      blockingDetailLoc: { key: "cases.detail.overview.risk.noBlocking" },
      arrearsStatus: "cases.detail.arrearsYes",
      arrearsStatusLoc: { key: "cases.detail.arrearsYes" },
      arrearsDetail: "¥50,000",
      arrearsDetailLoc: {
        key: "cases.detail.overview.risk.arrearsAmount",
        params: { amount: "¥50,000" },
      },
      deadlineAlert: "",
      deadlineAlertDetail: "",
      deadlineAlertLoc: {
        key: "cases.detail.overview.risk.deadlineAlert",
        params: { date: "2026/05/10" },
      },
      lastValidation: "",
      lastValidationLoc: {
        key: "cases.detail.overview.risk.lastValidation.passed",
      },
      reviewStatus: "",
    },
    deadlineDanger: true,
    validationHint: "",
  });
}

describe("CaseOverviewSidebar — risk Loc keys translate (zh-CN)", () => {
  it("renders noBlocking when blockingCount is 0", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "zh-CN",
    );
    const html = w.html();
    expect(html).toContain("暂无阻断项");
    expect(html).not.toContain("cases.detail.overview.risk.noBlocking");
  });

  it("renders notValidated when no validation data", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "zh-CN",
    );
    const html = w.html();
    expect(html).toContain("尚未运行校验");
    expect(html).not.toContain("cases.detail.overview.risk.notValidated");
  });

  it("renders noDeadline when no due date", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "zh-CN",
    );
    const html = w.html();
    expect(html).toContain("未设置期限");
    expect(html).not.toContain("cases.detail.overview.risk.noDeadline");
  });

  it("renders deadlineAlert with date when due date present", () => {
    const w = mountSidebar(buildDetailWithDeadlineAndArrears(), "zh-CN");
    const html = w.html();
    expect(html).toContain("2026/05/10 到期");
    expect(html).not.toContain("cases.detail.overview.risk.deadlineAlert");
  });

  it("renders arrearsAmount Loc with amount when present", () => {
    const w = mountSidebar(buildDetailWithDeadlineAndArrears(), "zh-CN");
    const html = w.html();
    expect(html).toContain("未收 ¥50,000");
    expect(html).not.toContain("cases.detail.overview.risk.arrearsAmount");
  });
});

describe("CaseOverviewSidebar — risk Loc keys translate (en-US)", () => {
  it("renders noBlocking / notValidated / noDeadline in English", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "en-US",
    );
    const html = w.html();
    expect(html).toContain("No blocking items");
    expect(html).toContain("Not yet validated");
    expect(html).toContain("No deadline set");
  });

  it("renders Due {date} and Outstanding {amount} in English", () => {
    const w = mountSidebar(buildDetailWithDeadlineAndArrears(), "en-US");
    const html = w.html();
    expect(html).toContain("Due 2026/05/10");
    expect(html).toContain("Outstanding ¥50,000");
  });
});

describe("CaseOverviewSidebar — risk Loc keys translate (ja-JP)", () => {
  it("renders noBlocking / notValidated / noDeadline in Japanese", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "ja-JP",
    );
    const html = w.html();
    expect(html).toContain("ブロッカーなし");
    expect(html).toContain("未検証");
    expect(html).toContain("期限未設定");
  });

  it("renders {date} 期限 and 未収 {amount} in Japanese", () => {
    const w = mountSidebar(buildDetailWithDeadlineAndArrears(), "ja-JP");
    const html = w.html();
    expect(html).toContain("2026/05/10 期限");
    expect(html).toContain("未収 ¥50,000");
  });
});

describe("CaseOverviewSidebar — no raw i18n keys leaked", () => {
  it("does not render any cases.detail.overview.risk.* literal key", () => {
    const w = mountSidebar(
      buildDetailNoBlockingNoValidationNoDeadline(),
      "zh-CN",
    );
    expect(w.html()).not.toMatch(/cases\.detail\.overview\.risk\.[a-zA-Z.]+/);
  });
});
