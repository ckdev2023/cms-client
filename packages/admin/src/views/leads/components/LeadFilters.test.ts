import { describe, expect, it, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import LeadFilters from "./LeadFilters.vue";
import { i18n } from "../../../i18n";

let cleanup: (() => void) | null = null;

afterEach(() => {
  cleanup?.();
  cleanup = null;
});

function mountFilters(tagsFilter: string[] = []) {
  const wrapper = mount(LeadFilters, {
    global: { plugins: [i18n] },
    props: {
      scope: "mine" as const,
      search: "",
      statusFilter: "",
      ownerFilter: "",
      groupFilter: "",
      ownerOptions: [],
      groupOptions: [],
      businessTypeFilter: "",
      tagsFilter,
      dateFrom: "",
      dateTo: "",
      filteredCount: 0,
    },
    attachTo: document.body,
  });
  cleanup = () => wrapper.unmount();
  return wrapper;
}

async function pressEnter(input: HTMLInputElement, value: string) {
  input.value = value;
  input.dispatchEvent(new Event("input"));
  input.dispatchEvent(
    new KeyboardEvent("keydown", {
      key: "Enter",
      bubbles: true,
      cancelable: true,
    }),
  );
  await Promise.resolve();
}

describe("LeadFilters · tag filter dedup", () => {
  it("appends a brand new tag", async () => {
    const wrapper = mountFilters([]);
    const input = wrapper.find<HTMLInputElement>("#lead-filter-tags")
      .element as HTMLInputElement;
    await pressEnter(input, "VIP");
    const events = wrapper.emitted("update:tagsFilter");
    expect(events?.[0]?.[0]).toEqual(["VIP"]);
  });

  it("does NOT append a tag that already exists with the same case", async () => {
    const wrapper = mountFilters(["VIP"]);
    const input = wrapper.find<HTMLInputElement>("#lead-filter-tags")
      .element as HTMLInputElement;
    await pressEnter(input, "VIP");
    expect(wrapper.emitted("update:tagsFilter")).toBeFalsy();
  });

  it("does NOT append a tag whose lowercase form already exists (vip vs VIP)", async () => {
    const wrapper = mountFilters(["VIP"]);
    const input = wrapper.find<HTMLInputElement>("#lead-filter-tags")
      .element as HTMLInputElement;
    await pressEnter(input, "vip");
    expect(wrapper.emitted("update:tagsFilter")).toBeFalsy();
  });

  it("dedupes within a comma-separated batch (case-insensitive)", async () => {
    const wrapper = mountFilters([]);
    const input = wrapper.find<HTMLInputElement>("#lead-filter-tags")
      .element as HTMLInputElement;
    await pressEnter(input, "VIP, vip, 優先, 优先, 優先");
    const events = wrapper.emitted("update:tagsFilter");
    expect(events?.[0]?.[0]).toEqual(["VIP", "優先", "优先"]);
  });

  it("preserves the original casing of the first occurrence (does not lowercase user input)", async () => {
    const wrapper = mountFilters([]);
    const input = wrapper.find<HTMLInputElement>("#lead-filter-tags")
      .element as HTMLInputElement;
    await pressEnter(input, "VIP");
    const events = wrapper.emitted("update:tagsFilter");
    expect(events?.[0]?.[0]).toEqual(["VIP"]);
  });
});
