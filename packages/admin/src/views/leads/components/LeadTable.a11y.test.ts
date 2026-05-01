import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { i18n } from "../../../i18n";
import { getLeadSamples } from "../fixtures";
import LeadTable from "./LeadTable.vue";

describe("LeadTable — a11y checkbox hit area", () => {
  it("wraps header select-all checkbox in ui-checkbox-hit label", () => {
    const wrapper = mount(LeadTable, {
      props: { leads: getLeadSamples("ja-JP") },
      global: { plugins: [i18n] },
    });

    const headerCheckbox = wrapper.find("thead input[type='checkbox']");
    expect(headerCheckbox.exists()).toBe(true);

    const parentLabel = headerCheckbox.element.closest("label");
    expect(parentLabel).not.toBeNull();
    expect(parentLabel!.classList.contains("ui-checkbox-hit")).toBe(true);
  });

  it("wraps each row checkbox in ui-checkbox-hit label", () => {
    const samples = getLeadSamples("ja-JP");
    const wrapper = mount(LeadTable, {
      props: { leads: samples },
      global: { plugins: [i18n] },
    });

    const rowCheckboxes = wrapper.findAll("tbody input[type='checkbox']");
    expect(rowCheckboxes.length).toBeGreaterThanOrEqual(samples.length);

    for (const cb of rowCheckboxes) {
      const parentLabel = cb.element.closest("label");
      expect(parentLabel).not.toBeNull();
      expect(parentLabel!.classList.contains("ui-checkbox-hit")).toBe(true);
    }
  });
});
