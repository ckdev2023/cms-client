import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import CaseBillingTab from "./components/CaseBillingTab.vue";
import CaseFinalPaymentCoeGate from "./components/CaseFinalPaymentCoeGate.vue";
import CaseTasksTab from "./components/CaseTasksTab.vue";
import { CASE_DETAIL_SAMPLES } from "./fixtures-detail";
import type {
  CaseDetail,
  FinalPaymentGateInfo,
  PaymentRow,
} from "./types-detail";
import casesZhCN from "../../i18n/messages/cases/zh-CN";

const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  messages: { "zh-CN": { cases: casesZhCN } },
});

const CARD_STUB = {
  template:
    "<section><header><slot name='header' /></header><slot /><footer><slot name='footer' /></footer></section>",
};
const BUTTON_STUB = {
  template: "<button @click='$emit(\"click\")'><slot /></button>",
  emits: ["click"],
};
const CHIP_STUB = {
  template: "<span class='chip'><slot /></span>",
  props: ["tone", "size"],
};

const PAID_ROW: PaymentRow = {
  date: "2026/04/01",
  type: "着手金",
  amount: "¥240,000",
  status: "paid",
  statusLabel: "已结清",
};

const UNPAID_ROW: PaymentRow = {
  date: "2026/06/30",
  type: "尾款",
  amount: "¥240,000",
  status: "unpaid",
  statusLabel: "待收",
};

function buildDetail(
  payments: PaymentRow[] = [PAID_ROW, UNPAID_ROW],
): CaseDetail {
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

function mountBillingTab(readonly = false) {
  return mount(CaseBillingTab, {
    props: { detail: buildDetail(), readonly },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB, Button: BUTTON_STUB, Chip: CHIP_STUB },
    },
  });
}

function mountTasksTab(readonly = false) {
  return mount(CaseTasksTab, {
    props: { detail: buildDetail(), readonly },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB },
    },
  });
}

describe("BUG-196 CaseBillingTab emits", () => {
  it("header 'record payment' button emits open-collection (no row)", async () => {
    const w = mountBillingTab(false);
    const headerBtn = w.find("header button");
    expect(headerBtn.exists()).toBe(true);
    await headerBtn.trigger("click");
    expect(w.emitted("open-collection")).toBeTruthy();
    expect(w.emitted("open-collection")![0]).toEqual([]);
  });

  it("row 'view receipt' button emits view-receipt with row", async () => {
    const w = mountBillingTab(false);
    const receiptBtn = w
      .findAll(".billing-tab__link")
      .find((el) => el.text().includes("查看收据"));
    expect(receiptBtn).toBeTruthy();
    await receiptBtn!.trigger("click");
    expect(w.emitted("view-receipt")).toBeTruthy();
    expect(w.emitted("view-receipt")![0]).toEqual([PAID_ROW]);
  });

  it("row 'record payment' button emits open-collection with row", async () => {
    const w = mountBillingTab(false);
    const payBtn = w
      .findAll(".billing-tab__link")
      .find((el) => el.text().includes("登记回款"));
    expect(payBtn).toBeTruthy();
    await payBtn!.trigger("click");
    expect(w.emitted("open-collection")).toBeTruthy();
    expect(w.emitted("open-collection")![0]).toEqual([UNPAID_ROW]);
  });

  it("readonly mode hides record-payment buttons, no open-collection emits", () => {
    const w = mountBillingTab(true);
    expect(w.find("header button").exists()).toBe(false);
    const inlinePayBtns = w
      .findAll(".billing-tab__link")
      .filter((el) => el.text().includes("登记回款"));
    expect(inlinePayBtns.length).toBe(0);
  });
});

const OUTSTANDING_GATE: FinalPaymentGateInfo = {
  paymentCleared: false,
  finalPaymentMilestoneMatched: true,
  outstandingLabel: "¥240,000",
  canAdvanceToCoe: false,
  blockers: [{ code: "final_payment_outstanding", label: "" }],
};

function mountFinalPaymentGate(readonly = false) {
  return mount(CaseFinalPaymentCoeGate, {
    props: { gate: OUTSTANDING_GATE, readonly },
    global: {
      plugins: [i18n],
      stubs: { Card: CARD_STUB, Button: BUTTON_STUB },
    },
  });
}

describe("CaseFinalPaymentCoeGate — open-collection deep-link parity", () => {
  it("record-payment CTA emits open-collection (no args) for /billing navigation", async () => {
    const w = mountFinalPaymentGate(false);
    const btn = w.find('[data-testid="final-payment-open-collection"]');
    expect(btn.exists()).toBe(true);
    await btn.trigger("click");
    expect(w.emitted("open-collection")).toBeTruthy();
    expect(w.emitted("open-collection")![0]).toEqual([]);
  });

  it("hides record-payment CTA when readonly", () => {
    const w = mountFinalPaymentGate(true);
    expect(
      w.find('[data-testid="final-payment-open-collection"]').exists(),
    ).toBe(false);
  });
});

describe("BUG-196 CaseTasksTab emits", () => {
  it("header 'add task' button emits open-create-task", async () => {
    const w = mountTasksTab(false);
    const addBtn = w.find(".tasks-tab__add-link");
    expect(addBtn.exists()).toBe(true);
    await addBtn.trigger("click");
    expect(w.emitted("open-create-task")).toBeTruthy();
    expect(w.emitted("open-create-task")!.length).toBe(1);
  });

  it("footer inline 'add task' button emits open-create-task", async () => {
    const w = mountTasksTab(false);
    const inlineBtn = w.find(".tasks-tab__add-inline");
    expect(inlineBtn.exists()).toBe(true);
    await inlineBtn.trigger("click");
    expect(w.emitted("open-create-task")).toBeTruthy();
    expect(w.emitted("open-create-task")!.length).toBe(1);
  });

  it("readonly mode hides both add buttons", () => {
    const w = mountTasksTab(true);
    expect(w.find(".tasks-tab__add-link").exists()).toBe(false);
    expect(w.find(".tasks-tab__add-inline").exists()).toBe(false);
  });
});
