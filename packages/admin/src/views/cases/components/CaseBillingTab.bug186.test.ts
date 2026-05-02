/**
 * BUG-186（P1）：Case Detail Billing tab 在 en-US / zh-CN 下 milestone 列显示
 * 日文硬编码 `案件報酬`、status 列显示日文 `応収`（R18 BUG-181 fix 写入
 * `milestone_name='案件報酬'`/`status='due'` 时缺 i18n 映射）。
 *
 * 修复契约：
 * - server 改写 `milestone_name='case_fee'`（稳定 i18n code）；adapter 层
 *   `adaptCaseBillingData` 同时兼容新 code 与遗留 `案件報酬` 两类输入，
 *   输出 `row.typeI18nKey = 'billing.milestone.case_fee'`。
 * - admin 端 `CaseBillingTab.vue` 通过 `t(row.typeI18nKey)` 做三语渲染，未命中
 *   时 fallback 到 `row.type` 保留向后兼容。
 * - status='due' 通过扩充 `BILLING_STATUSES` / `cases.constants.billingStatuses.due`
 *   字典，从 view 层的 `getBillingStatusI18nKey('due')` 拿到三语标签。
 */

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseBillingTab from "./CaseBillingTab.vue";
import { CASE_DETAIL_SAMPLES } from "../fixtures-detail";
import type { CaseDetail, PaymentRow } from "../types-detail";
import {
  adaptCaseBillingData,
  resolveMilestoneI18nKey,
} from "../model/CaseAdapterValidationBilling";
import casesZhCN from "../../../i18n/messages/cases/zh-CN";
import casesJaJP from "../../../i18n/messages/cases/ja-JP";
import casesEnUS from "../../../i18n/messages/cases/en-US";
import billingZhCN from "../../../i18n/messages/billing/zh-CN";
import billingJaJP from "../../../i18n/messages/billing/ja-JP";
import billingEnUS from "../../../i18n/messages/billing/en-US";

type Locale = "zh-CN" | "ja-JP" | "en-US";

const FULL_MESSAGES = {
  "zh-CN": { cases: casesZhCN, billing: billingZhCN },
  "ja-JP": { cases: casesJaJP, billing: billingJaJP },
  "en-US": { cases: casesEnUS, billing: billingEnUS },
};

function makeI18n(locale: Locale) {
  return createI18n({ legacy: false, locale, messages: FULL_MESSAGES });
}

function buildDetail(payments: PaymentRow[]): CaseDetail {
  return {
    ...CASE_DETAIL_SAMPLES.work,
    billing: {
      total: "¥150,000",
      received: "¥0",
      outstanding: "¥150,000",
      payments,
    },
  };
}

function mountTab(locale: Locale, payments: PaymentRow[]) {
  return mount(CaseBillingTab, {
    props: { detail: buildDetail(payments), readonly: false },
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

describe("BUG-186 adapter — milestone i18n key resolution", () => {
  it("resolveMilestoneI18nKey maps case_fee code → billing.milestone.case_fee", () => {
    expect(resolveMilestoneI18nKey("case_fee")).toBe(
      "billing.milestone.case_fee",
    );
  });

  it("resolveMilestoneI18nKey maps legacy 案件報酬 → billing.milestone.case_fee", () => {
    expect(resolveMilestoneI18nKey("案件報酬")).toBe(
      "billing.milestone.case_fee",
    );
  });

  it("resolveMilestoneI18nKey maps CJK legacy names to stable codes", () => {
    expect(resolveMilestoneI18nKey("着手金")).toBe(
      "billing.milestone.down_payment",
    );
    expect(resolveMilestoneI18nKey("尾款")).toBe(
      "billing.milestone.final_payment",
    );
  });

  it("resolveMilestoneI18nKey returns undefined for unknown milestone", () => {
    expect(resolveMilestoneI18nKey("カスタム費用")).toBeUndefined();
    expect(resolveMilestoneI18nKey("")).toBeUndefined();
  });

  it("adaptCaseBillingData populates typeI18nKey for case_fee plan", () => {
    const result = adaptCaseBillingData({
      plans: [
        {
          id: "bp-001",
          caseId: "c-001",
          milestoneName: "case_fee",
          amountDue: 150000,
          dueDate: "2026-05-01",
          status: "due",
          gateEffectMode: "warn",
        },
      ],
    });
    const row = result!.payments[0];
    expect(row.type).toBe("case_fee");
    expect(row.typeI18nKey).toBe("billing.milestone.case_fee");
    expect(row.status).toBe("due");
  });

  it("adaptCaseBillingData populates typeI18nKey for legacy 案件報酬 plan", () => {
    const result = adaptCaseBillingData({
      plans: [
        {
          id: "bp-001",
          caseId: "c-001",
          milestoneName: "案件報酬",
          amountDue: 150000,
          status: "due",
        },
      ],
    });
    expect(result!.payments[0].typeI18nKey).toBe("billing.milestone.case_fee");
  });

  it("adaptCaseBillingData leaves typeI18nKey undefined for unmapped milestone", () => {
    const result = adaptCaseBillingData({
      plans: [
        {
          id: "bp-001",
          caseId: "c-001",
          milestoneName: "カスタム費用",
          amountDue: 1000,
          status: "due",
        },
      ],
    });
    expect(result!.payments[0].typeI18nKey).toBeUndefined();
  });
});

describe("BUG-186 CaseBillingTab — no Japanese raw leakage under en-US/zh-CN", () => {
  const payments: PaymentRow[] = [
    {
      date: "2026/05/01",
      type: "case_fee",
      typeI18nKey: "billing.milestone.case_fee",
      amount: "¥150,000",
      status: "due",
      statusLabel: "応収",
      kind: "plan",
    },
  ];

  it("en-US renders Case fee + Outstanding (no Japanese raw)", () => {
    const html = mountTab("en-US", payments).html();
    expect(html).toContain("Case fee");
    expect(html).toContain("Outstanding");
    expect(html).not.toContain("案件報酬");
    expect(html).not.toContain("応収");
    expect(html).not.toContain("case_fee");
  });

  it("zh-CN renders 案件报酬 (simplified) + 应收 (no Japanese raw)", () => {
    const html = mountTab("zh-CN", payments).html();
    expect(html).toContain("案件报酬");
    expect(html).toContain("应收");
    expect(html).not.toContain("案件報酬");
    expect(html).not.toContain("応収");
    expect(html).not.toContain("case_fee");
  });

  it("ja-JP renders 案件報酬 + 応収 from i18n catalog (not raw)", () => {
    const html = mountTab("ja-JP", payments).html();
    expect(html).toContain("案件報酬");
    expect(html).toContain("応収");
    expect(html).not.toContain("case_fee");
  });

  it("falls back to row.type when typeI18nKey is unmapped (backward compat)", () => {
    const legacyRow: PaymentRow[] = [
      {
        date: "2026/05/01",
        type: "カスタム費用",
        amount: "¥100",
        status: "due",
        statusLabel: "応収",
        kind: "plan",
      },
    ];
    const html = mountTab("en-US", legacyRow).html();
    expect(html).toContain("カスタム費用");
  });

  it("falls back to row.statusLabel when status is unknown (backward compat)", () => {
    const row: PaymentRow[] = [
      {
        date: "2026/05/01",
        type: "case_fee",
        typeI18nKey: "billing.milestone.case_fee",
        amount: "¥100",
        status: "custom-status",
        statusLabel: "fallback-status",
        kind: "plan",
      },
    ];
    const html = mountTab("en-US", row).html();
    expect(html).toContain("fallback-status");
  });
});
