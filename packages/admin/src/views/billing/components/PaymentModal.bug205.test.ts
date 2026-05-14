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

function readNodeOptionTexts(wrapper: ReturnType<typeof mount>): string[] {
  const select = wrapper.find("select.pm-input--select");
  return select
    .findAll("option")
    .slice(1)
    .map((o) => o.text().replace(/\s+/g, " ").trim());
}

describe("PaymentModal — BUG-205 empty dueDate trailing ()", () => {
  it("shows (dueDate) when dueDate is present", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "a", dueDate: "2026/05/01" }),
      makeNode({ id: "b", dueDate: "2026/05/02", amount: 50_000 }),
    ]);

    const texts = readNodeOptionTexts(wrapper);
    expect(texts[0]).toContain("(2026/05/01)");
    expect(texts[1]).toContain("(2026/05/02)");
  });

  it("does not render trailing () when dueDate is empty string", async () => {
    const wrapper = await mountAndOpen([
      makeNode({ id: "n1", dueDate: "2026/06/01" }),
      makeNode({ id: "n2", dueDate: "" }),
    ]);

    const texts = readNodeOptionTexts(wrapper);
    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain("(2026/06/01)");
    expect(texts[1]).not.toMatch(/\(\s*\)/);
    expect(texts[1]).not.toContain("()");
  });
});
