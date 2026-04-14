import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n, setAppLocale } from "../../../i18n";
import CustomerFilters from "./CustomerFilters.vue";

describe("CustomerFilters", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  function factory(props: Record<string, unknown> = {}) {
    return mount(CustomerFilters, {
      props: {
        scope: "mine",
        search: "",
        groupFilter: "",
        ownerFilter: "",
        activeCasesFilter: "",
        filteredCount: 10,
        ...props,
      },
      global: { plugins: [i18n] },
    });
  }

  function getFilterSelects(w: ReturnType<typeof factory>) {
    return w.findAll(".customer-filters__select");
  }

  async function pickSelectOption(
    w: ReturnType<typeof factory>,
    selectIndex: number,
    value: string,
  ) {
    const selects = getFilterSelects(w);
    const el = selects[selectIndex].element as HTMLSelectElement;
    const opt = Array.from(el.options).find((o) => o.value === value);
    if (opt) opt.selected = true;
    el.value = value;
    el.dispatchEvent(new Event("change"));
    await nextTick();
  }

  it("renders scope segmented control with 3 options", () => {
    const w = factory();
    const buttons = w.findAll("[role=tab]");
    expect(buttons).toHaveLength(3);
  });

  it("renders search field", () => {
    const w = factory();
    expect(w.find("[role=search]").exists()).toBe(true);
  });

  it("renders 3 select filters", () => {
    const w = factory();
    expect(getFilterSelects(w)).toHaveLength(3);
  });

  it("renders reset button", () => {
    const w = factory();
    const btn = w.findAll("button").find((b) => b.text() === "Reset");
    expect(btn).toBeDefined();
  });

  it("emits update:scope when segmented control changes", async () => {
    const w = factory();
    const tabs = w.findAll("[role=tab]");
    await tabs[1].trigger("click");
    expect(w.emitted("update:scope")).toBeTruthy();
    expect(w.emitted("update:scope")![0]).toEqual(["group"]);
  });

  it("emits update:search on input", async () => {
    const w = factory();
    const input = w.find("input[type=search]");
    await input.setValue("test query");
    expect(w.emitted("update:search")).toBeTruthy();
    expect(w.emitted("update:search")![0]).toEqual(["test query"]);
  });

  it("emits update:groupFilter on group select change", async () => {
    const w = factory();
    await pickSelectOption(w, 0, "tokyo-1");
    expect(w.emitted("update:groupFilter")).toBeTruthy();
    expect(w.emitted("update:groupFilter")![0]).toEqual(["tokyo-1"]);
  });

  it("emits update:ownerFilter on owner select change", async () => {
    const w = factory();
    await pickSelectOption(w, 1, "yamada-s");
    expect(w.emitted("update:ownerFilter")).toBeTruthy();
    expect(w.emitted("update:ownerFilter")![0]).toEqual(["yamada-s"]);
  });

  it("emits update:activeCasesFilter on active cases select change", async () => {
    const w = factory();
    await pickSelectOption(w, 2, "yes");
    expect(w.emitted("update:activeCasesFilter")).toBeTruthy();
    expect(w.emitted("update:activeCasesFilter")![0]).toEqual(["yes"]);
  });

  it("emits resetFilters when reset button clicked", async () => {
    const w = factory();
    const btn = w.findAll("button").find((b) => b.text() === "Reset");
    await btn!.trigger("click");
    expect(w.emitted("resetFilters")).toHaveLength(1);
  });

  it("displays filtered count in summary", () => {
    const w = factory({ filteredCount: 42 });
    const summary = w.find(".customer-filters__summary-text");
    expect(summary.text()).toContain("42");
  });
});
