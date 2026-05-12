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

describe("PaymentModal — caseId/open watch ordering", () => {
  it("loads nodes when caseId arrives after open", async () => {
    const getBillingPlanNodes = vi
      .fn()
      .mockResolvedValue([makeNode({ id: "late" })]);

    const wrapper = mount(PaymentModal, {
      props: {
        open: true,
        caseId: "",
        getBillingPlanNodes,
        createPayment: vi.fn().mockResolvedValue({ ok: true }),
      },
      global: {
        plugins: [i18n],
        stubs: { Teleport: true },
      },
    });

    expect(getBillingPlanNodes).not.toHaveBeenCalled();

    await wrapper.setProps({ caseId: "case-99" });
    await flushPromises();

    expect(getBillingPlanNodes).toHaveBeenCalledTimes(1);
    expect(getBillingPlanNodes).toHaveBeenCalledWith("case-99");

    const select = wrapper.find("select.pm-input--select");
    expect(select.findAll("option").length).toBeGreaterThan(1);
  });
});
