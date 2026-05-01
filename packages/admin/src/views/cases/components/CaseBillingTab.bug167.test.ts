import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseBillingTab from "./CaseBillingTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, PaymentRow } from "../types-detail";
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

function buildDetail(payments: PaymentRow[]): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    billing: {
      total: "¥480,000",
      received: "¥240,000",
      outstanding: "¥240,000",
      payments,
    },
  };
}

const PAYMENTS: PaymentRow[] = [
  {
    date: "2026/04/01",
    type: "着手金",
    amount: "¥240,000",
    status: "paid",
    statusLabel: "fallback-paid",
  },
  {
    date: "2026/06/30",
    type: "成功酬金（尾款）",
    amount: "¥240,000",
    status: "unpaid",
    statusLabel: "fallback-unpaid",
  },
];

function mountTab(locale: Locale, readonly = false) {
  return mount(CaseBillingTab, {
    props: { detail: buildDetail(PAYMENTS), readonly },
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

describe("BUG-167 CaseBillingTab i18n: no Chinese leakage in en-US / ja-JP", () => {
  it("zh-CN renders expected zh labels", () => {
    const html = mountTab("zh-CN").html();
    expect(html).toContain("收费");
    expect(html).toContain("总费用");
    expect(html).toContain("已收金额");
    expect(html).toContain("未收金额");
    expect(html).toContain("日期");
    expect(html).toContain("类型");
    expect(html).toContain("金额");
    expect(html).toContain("状态");
    expect(html).toContain("操作");
    expect(html).toContain("发票信息");
    expect(html).toContain("当前原型暂不展示发票详情。");
    expect(html).toContain("登记回款");
    expect(html).toContain("查看收据");
    expect(html).toContain("已结清");
    expect(html).toContain("应收");
  });

  it("en-US renders English copy and drops zh-CN literal labels", () => {
    const html = mountTab("en-US").html();
    expect(html).toContain("Billing");
    expect(html).toContain("Total fees");
    expect(html).toContain("Collected");
    expect(html).toContain("Outstanding");
    expect(html).toContain("Date");
    expect(html).toContain("Type");
    expect(html).toContain("Amount");
    expect(html).toContain("Status");
    expect(html).toContain("Actions");
    expect(html).toContain("Invoice");
    expect(html).toContain(
      "Invoice details are not shown in the current prototype.",
    );
    expect(html).toContain("Record payment");
    expect(html).toContain("View receipt");
    expect(html).toContain("Paid");
    expect(html).toContain("Unpaid");
    const ZH_LEAKS = [
      "总费用",
      "已收金额",
      "未收金额",
      "日期",
      "类型",
      "金额",
      "状态",
      "操作",
      "发票信息",
      "当前原型暂不展示发票详情。",
      "登记回款",
      "查看收据",
      "已结清",
      "应收",
    ];
    for (const leak of ZH_LEAKS) {
      expect(html).not.toContain(leak);
    }
  });

  it("ja-JP renders Japanese copy and contains no Chinese-only labels", () => {
    const html = mountTab("ja-JP").html();
    expect(html).toContain("請求");
    expect(html).toContain("総費用");
    expect(html).toContain("入金済み");
    expect(html).toContain("未収");
    expect(html).toContain("日付");
    expect(html).toContain("種別");
    expect(html).toContain("金額");
    expect(html).toContain("ステータス");
    expect(html).toContain("操作");
    expect(html).toContain("請求書情報");
    expect(html).toContain(
      "現在のプロトタイプでは請求書詳細を表示していません。",
    );
    expect(html).toContain("入金登録");
    expect(html).toContain("領収書を見る");
    expect(html).not.toContain("总费用");
    expect(html).not.toContain("已收金额");
    expect(html).not.toContain("未收金额");
    expect(html).not.toContain("发票信息");
    expect(html).not.toContain("当前原型暂不展示发票详情。");
    expect(html).not.toContain("登记回款");
    expect(html).not.toContain("查看收据");
  });

  it("readonly mode hides record-payment CTA across locales", () => {
    const html = mountTab("en-US", true).html();
    expect(html).not.toContain("Record payment");
    expect(html).toContain("View receipt");
  });

  it("paymentLabel falls back to row.statusLabel when status key is unknown", () => {
    const detail = buildDetail([
      {
        date: "2026/05/15",
        type: "调整",
        amount: "¥0",
        status: "custom-unknown",
        statusLabel: "fallback-custom",
      },
    ]);
    const w = mount(CaseBillingTab, {
      props: { detail, readonly: false },
      global: {
        plugins: [makeI18n("en-US")],
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
    expect(w.html()).toContain("fallback-custom");
  });
});
