import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { i18n, setAppLocale } from "../../../i18n";
import CustomerBulkActionBar from "./CustomerBulkActionBar.vue";

describe("CustomerBulkActionBar", () => {
  beforeEach(() => {
    setAppLocale("en-US");
  });

  function factory(props: Record<string, unknown> = {}) {
    return mount(CustomerBulkActionBar, {
      props: { selectedCount: 3, ...props },
      global: { plugins: [i18n] },
    });
  }

  function getSelects(w: ReturnType<typeof factory>) {
    return w.findAll(".customer-bulk-bar__select");
  }

  async function pickOption(
    w: ReturnType<typeof factory>,
    selectIndex: number,
    value: string,
  ) {
    const selects = getSelects(w);
    const el = selects[selectIndex].element as HTMLSelectElement;
    const opt = Array.from(el.options).find((o) => o.value === value);
    if (opt) opt.selected = true;
    el.value = value;
    el.dispatchEvent(new Event("change"));
    await nextTick();
  }

  it("is visible when selectedCount > 0", () => {
    const w = factory({ selectedCount: 2 });
    expect(w.find(".customer-bulk-bar").isVisible()).toBe(true);
  });

  it("is hidden when selectedCount is 0", () => {
    const w = factory({ selectedCount: 0 });
    expect(w.find(".customer-bulk-bar").isVisible()).toBe(false);
  });

  it("shows selected count text", () => {
    const w = factory({ selectedCount: 5 });
    expect(w.find(".customer-bulk-bar__left").text()).toContain("5");
  });

  it("emits clear when clear button clicked", async () => {
    const w = factory();
    await w.find(".customer-bulk-bar__clear").trigger("click");
    expect(w.emitted("clear")).toHaveLength(1);
  });

  it("apply owner button is disabled when no owner selected", () => {
    const w = factory();
    const applies = w.findAll(".customer-bulk-bar__apply");
    expect((applies[0].element as HTMLButtonElement).disabled).toBe(true);
  });

  it("emits assignOwner with selected value on apply", async () => {
    const w = factory();
    await pickOption(w, 0, "yamada-s");
    const applies = w.findAll(".customer-bulk-bar__apply");
    await applies[0].trigger("click");
    expect(w.emitted("assignOwner")).toBeTruthy();
    expect(w.emitted("assignOwner")![0]).toEqual(["yamada-s"]);
  });

  it("resets owner select after apply", async () => {
    const w = factory();
    await pickOption(w, 0, "yamada-s");
    const applies = w.findAll(".customer-bulk-bar__apply");
    await applies[0].trigger("click");
    await nextTick();
    const el = getSelects(w)[0].element as HTMLSelectElement;
    expect(el.value).toBe("");
  });

  it("apply group button is disabled when no group selected", () => {
    const w = factory();
    const applies = w.findAll(".customer-bulk-bar__apply");
    expect((applies[1].element as HTMLButtonElement).disabled).toBe(true);
  });

  it("emits changeGroup with selected value on apply", async () => {
    const w = factory();
    await pickOption(w, 1, "tokyo-1");
    const applies = w.findAll(".customer-bulk-bar__apply");
    await applies[1].trigger("click");
    expect(w.emitted("changeGroup")).toBeTruthy();
    expect(w.emitted("changeGroup")![0]).toEqual(["tokyo-1"]);
  });

  it("does not emit assignOwner when select is empty", async () => {
    const w = factory();
    const applies = w.findAll(".customer-bulk-bar__apply");
    await applies[0].trigger("click");
    expect(w.emitted("assignOwner")).toBeUndefined();
  });

  it("does not emit changeGroup when select is empty", async () => {
    const w = factory();
    const applies = w.findAll(".customer-bulk-bar__apply");
    await applies[1].trigger("click");
    expect(w.emitted("changeGroup")).toBeUndefined();
  });
});
