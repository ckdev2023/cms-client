import { describe, expect, it, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import PaymentModal from "./PaymentModal.vue";
import type { BillingPlanNode } from "../types";

function makeNode(overrides: Partial<BillingPlanNode> = {}): BillingPlanNode {
  return {
    id: "node-1",
    name: "case_fee",
    amount: 100_000,
    dueDate: "2026/05/01",
    status: "due",
    ...overrides,
  };
}

async function mountAndOpen(nodes: BillingPlanNode[]) {
  const wrapper = mount(PaymentModal, {
    props: {
      open: false,
      caseId: "case-1",
      getBillingPlanNodes: vi.fn().mockResolvedValue(nodes),
      createPayment: vi.fn().mockResolvedValue({ ok: true }),
    },
    global: {
      plugins: [i18n],
      stubs: { Teleport: true },
    },
  });
  await wrapper.setProps({ open: true });
  await flushPromises();
  return wrapper;
}

describe("PaymentModal — BUG-204 amount max constraint", () => {
  it("sets max to the selected node amount when a single node auto-selects", async () => {
    const wrapper = await mountAndOpen([makeNode({ amount: 50_000 })]);

    const amountInput = wrapper.find<HTMLInputElement>(
      'input[type="number"].pm-input',
    );
    expect(amountInput.attributes("max")).toBe("50000");
  });

  it("未选计划仍绑定宽松 max（多节点时 selectedNode=null；不配 max 会令 Chromium valuemax=0 × min=1）", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "n1", amount: 30_000 }),
      makeNode({ id: "n2", amount: 70_000 }),
    ]);

    const amountInput = wrapper.find<HTMLInputElement>(
      'input[type="number"].pm-input',
    );
    expect(amountInput.attributes("max")).toBe(String(Number.MAX_SAFE_INTEGER));
  });

  it("updates max when user selects a different node", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "n1", amount: 30_000 }),
      makeNode({ id: "n2", amount: 70_000 }),
    ]);

    const select = wrapper.find("select.pm-input--select");
    await select.setValue("n2");
    await flushPromises();

    const amountInput = wrapper.find<HTMLInputElement>(
      'input[type="number"].pm-input',
    );
    expect(amountInput.attributes("max")).toBe("70000");
  });

  it("renders select options for each unpaid billing node", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "n1", name: "case_fee" }),
      makeNode({ id: "n3", name: "final_payment", amount: 80_000 }),
      makeNode({ id: "n2", name: "interim", status: "paid" }),
    ]);
    const options = wrapper.find("select.pm-input--select").findAll("option");
    expect(options.length).toBe(3);
    expect(options[1]!.attributes("value")).toBe("n1");
    expect(options[2]!.attributes("value")).toBe("n3");
  });

  it("绑宽松 max 当自动选中节点应收为 0（避免 Chromium spinbutton valuemax=0）", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "n0", amount: 0, dueDate: "" }),
    ]);

    const amountInput = wrapper.find<HTMLInputElement>(
      'input[type="number"].pm-input',
    );
    expect(amountInput.attributes("max")).toBe(String(Number.MAX_SAFE_INTEGER));
  });
});
