import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseValidationSupport from "./CaseValidationSupport.vue";
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

function buildDetailWithReview(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    caseType: "work",
    doubleReview: [
      {
        initials: "TN",
        name: "Tanaka",
        verdict: "OK",
        verdictBadge: "badge-green",
        time: "2026/04/06 16:00",
        comment: "LGTM",
        rejectReason: null,
      },
      {
        initials: "MG",
        name: "Manager",
        verdict: "NG",
        verdictBadge: "badge-red",
        time: "2026/04/06 17:30",
        comment: null,
        rejectReason: "Missing document",
      },
    ],
    riskConfirmationRecord: {
      confirmedBy: "Admin",
      reason: "Client promised payment",
      evidence: "commitment.pdf",
      time: "2026/04/08 09:00",
      amount: "¥120,000",
    },
  };
}

function buildDetailEmpty(): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    caseType: "work",
    doubleReview: [],
    reviewEnabled: false,
    riskConfirmationRecord: null,
  };
}

function mountComponent(locale: Locale, detail: CaseDetail, readonly = false) {
  return mount(CaseValidationSupport, {
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
      },
    },
  });
}

const ZH_LABELS = [
  "双人复核",
  "发起复核",
  "暂无复核记录",
  "驳回原因：",
  "欠款风险确认记录",
  "确认人",
  "原因",
  "凭证",
  "确认时间",
  "涉及金额",
  "当前无欠款风险确认",
  "登记欠款风险确认",
  "下签后处理",
  "当前案件未到该阶段",
];

describe("BUG-168 CaseValidationSupport i18n: no Chinese leakage in en-US / ja-JP", () => {
  it("zh-CN renders expected labels (with review + risk data)", () => {
    const html = mountComponent("zh-CN", buildDetailWithReview()).html();
    expect(html).toContain("双人复核");
    expect(html).toContain("发起复核");
    expect(html).toContain("驳回原因：");
    expect(html).toContain("欠款风险确认记录");
    expect(html).toContain("确认人");
    expect(html).toContain("确认时间");
    expect(html).toContain("涉及金额");
    expect(html).toContain("下签后处理");
  });

  it("zh-CN empty state renders correct labels", () => {
    const html = mountComponent("zh-CN", buildDetailEmpty()).html();
    expect(html).toContain("暂无复核记录");
    expect(html).toContain("当前无欠款风险确认");
    expect(html).toContain("登记欠款风险确认");
  });

  it("en-US renders English copy with review + risk data", () => {
    const html = mountComponent("en-US", buildDetailWithReview()).html();
    expect(html).toContain("Double Review");
    expect(html).toContain("Start Review");
    expect(html).toContain("Rejection reason:");
    expect(html).toContain("Arrears Risk Confirmation Log");
    expect(html).toContain("Confirmed by");
    expect(html).toContain("Reason");
    expect(html).toContain("Evidence");
    expect(html).toContain("Confirmed at");
    expect(html).toContain("Amount involved");
    expect(html).toContain("Post-Approval");
    expect(html).toContain("COE / Overseas stamping / Visa and entry outcomes");
  });

  it("en-US empty state renders correct English labels", () => {
    const html = mountComponent("en-US", buildDetailEmpty()).html();
    expect(html).toContain("No review records yet");
    expect(html).toContain("No arrears risk confirmation");
    expect(html).toContain("Acknowledge billing risk");
  });

  it("en-US contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("en-US", buildDetailWithReview()).html();
    const htmlEmpty = mountComponent("en-US", buildDetailEmpty()).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlEmpty).not.toContain(leak);
    }
  });

  it("ja-JP renders Japanese copy with review + risk data", () => {
    const html = mountComponent("ja-JP", buildDetailWithReview()).html();
    expect(html).toContain("ダブルチェック");
    expect(html).toContain("レビューを開始");
    expect(html).toContain("却下理由：");
    expect(html).toContain("未収リスク確認記録");
    expect(html).toContain("確認者");
    expect(html).toContain("理由");
    expect(html).toContain("証憑");
    expect(html).toContain("確認日時");
    expect(html).toContain("関連金額");
    expect(html).toContain("許可後処理");
    expect(html).toContain("COE / 海外ビザ貼付 / 査証・入国結果");
  });

  it("ja-JP empty state renders correct Japanese labels", () => {
    const html = mountComponent("ja-JP", buildDetailEmpty()).html();
    expect(html).toContain("レビュー記録がありません");
    expect(html).toContain("未収リスク確認がありません");
    expect(html).toContain("料金リスクを登録");
  });

  it("ja-JP contains no Chinese-only labels", () => {
    const htmlFull = mountComponent("ja-JP", buildDetailWithReview()).html();
    const htmlEmpty = mountComponent("ja-JP", buildDetailEmpty()).html();
    for (const leak of ZH_LABELS) {
      expect(htmlFull).not.toContain(leak);
      expect(htmlEmpty).not.toContain(leak);
    }
  });

  it("readonly mode hides startCta and registerRiskAckCta across locales", () => {
    const htmlEn = mountComponent("en-US", buildDetailEmpty(), true).html();
    expect(htmlEn).not.toContain("Start Review");
    expect(htmlEn).not.toContain("Acknowledge billing risk");

    const htmlJa = mountComponent("ja-JP", buildDetailEmpty(), true).html();
    expect(htmlJa).not.toContain("レビューを開始");
    expect(htmlJa).not.toContain("料金リスクを登録");
  });
});
