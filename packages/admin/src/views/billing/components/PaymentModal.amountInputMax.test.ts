import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import PaymentModal from "./PaymentModal.vue";
import type { BillingPlanNode } from "../types";

function mountThenOpenCase(
  nodes: BillingPlanNode[],
  caseId = "case-amount-max",
) {
  const getBillingPlanNodes = vi.fn().mockResolvedValue(nodes);
  const w = mount(PaymentModal, {
    props: {
      open: true,
      caseId: "",
      getBillingPlanNodes,
      createPayment: vi.fn().mockResolvedValue({ success: true }),
    },
    global: {
      plugins: [i18n],
      stubs: { Teleport: true },
    },
  });
  return { w, getBillingPlanNodes, caseId };
}

describe("PaymentModal — 回款金额 input 的 max 绑定", () => {
  it("选中节点应收 > 0 时，max 等于节点金额", async () => {
    const { w, caseId } = mountThenOpenCase([
      {
        id: "n1",
        name: "case_fee",
        amount: 350_000,
        dueDate: "2026/06/01",
        status: "due",
      },
    ]);
    await w.setProps({ caseId });
    await flushPromises();
    await w.vm.$nextTick();
    const select = w.find("#payment-billingPlanId");
    expect(select.exists()).toBe(false);
    const input = w.find("#payment-amount");
    expect(input.exists()).toBe(true);
    expect(input.attributes("max")).toBe("350000");
  });

  it("节点应收为 0 时绑定宽松 max（避免 Chromium 无障碍 valuemax=0 × min=1 阻碍输入）", async () => {
    const { w, caseId } = mountThenOpenCase([
      {
        id: "zero-fee",
        name: "case_fee",
        amount: 0,
        dueDate: "",
        status: "due",
      },
    ]);
    await w.setProps({ caseId });
    await flushPromises();
    await w.vm.$nextTick();
    const input = w.find("#payment-amount");
    expect(input.attributes("max")).toBe(String(Number.MAX_SAFE_INTEGER));
  });

  it("多节点且尚未选择计划时仍有宽松 max（避免 selectedNode=null 不配 max → valuemax=0）", async () => {
    const nodes = [
      {
        id: "a",
        name: "case_fee",
        amount: 0,
        dueDate: "",
        status: "due",
      },
      {
        id: "b",
        name: "case_fee",
        amount: 100,
        dueDate: "",
        status: "due",
      },
    ];
    const { w, caseId } = mountThenOpenCase(nodes);
    await w.setProps({ caseId });
    await flushPromises();
    await w.vm.$nextTick();
    const input = w.find("#payment-amount");
    expect(input.attributes("max")).toBe(String(Number.MAX_SAFE_INTEGER));
  });
});
