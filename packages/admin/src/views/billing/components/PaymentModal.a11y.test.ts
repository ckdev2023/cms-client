import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import PaymentModal from "./PaymentModal.vue";

function mountModal() {
  return mount(PaymentModal, {
    props: {
      open: true,
      caseId: "case-1",
      getBillingPlanNodes: vi.fn().mockResolvedValue([]),
      createPayment: vi.fn().mockResolvedValue({ success: true }),
    },
    global: {
      plugins: [i18n],
      stubs: { teleport: true },
    },
  });
}

describe("PaymentModal — a11y: every input/select/textarea has id and name", () => {
  it("all <input> elements have id and name attributes", async () => {
    const w = mountModal();
    await new Promise((r) => setTimeout(r, 10));
    await w.vm.$nextTick();
    const inputs = w.findAll("input");
    for (const input of inputs) {
      expect(input.attributes("id"), `input missing id`).toBeTruthy();
      expect(input.attributes("name"), `input missing name`).toBeTruthy();
    }
  });

  it("all <select> elements have id and name attributes", async () => {
    const w = mountModal();
    await new Promise((r) => setTimeout(r, 10));
    await w.vm.$nextTick();
    const selects = w.findAll("select");
    for (const select of selects) {
      expect(select.attributes("id"), `select missing id`).toBeTruthy();
      expect(select.attributes("name"), `select missing name`).toBeTruthy();
    }
  });

  it("all <textarea> elements have id and name attributes", async () => {
    const w = mountModal();
    await new Promise((r) => setTimeout(r, 10));
    await w.vm.$nextTick();
    const textareas = w.findAll("textarea");
    for (const textarea of textareas) {
      expect(textarea.attributes("id"), `textarea missing id`).toBeTruthy();
      expect(textarea.attributes("name"), `textarea missing name`).toBeTruthy();
    }
  });

  it("labels have for attributes matching input ids", async () => {
    const w = mountModal();
    await new Promise((r) => setTimeout(r, 10));
    await w.vm.$nextTick();
    const labels = w.findAll("label.pm-label");
    for (const label of labels) {
      const forAttr = label.attributes("for");
      expect(forAttr, `label missing for attribute`).toBeTruthy();
      if (forAttr) {
        const target = w.find(`#${forAttr}`);
        expect(
          target.exists(),
          `label[for="${forAttr}"] has no matching element`,
        ).toBe(true);
      }
    }
  });
});
