import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import SearchField from "./SearchField.vue";

describe("SearchField", () => {
  it("renders with default box variant", () => {
    const w = mount(SearchField);
    expect(w.classes()).toContain("ui-search");
    expect(w.classes()).toContain("ui-search--box");
  });

  it("renders with inline variant", () => {
    const w = mount(SearchField, { props: { variant: "inline" } });
    expect(w.classes()).toContain("ui-search--inline");
  });

  it("uses role=search on root", () => {
    const w = mount(SearchField);
    expect(w.attributes("role")).toBe("search");
  });

  it("renders search icon", () => {
    const w = mount(SearchField);
    expect(w.find(".ui-search__icon").exists()).toBe(true);
  });

  it("applies default placeholder", () => {
    const w = mount(SearchField);
    const input = w.find("input");
    expect(input.attributes("placeholder")).toBe("搜索…");
  });

  it("applies custom placeholder", () => {
    const w = mount(SearchField, {
      props: { placeholder: "搜索案件…" },
    });
    expect(w.find("input").attributes("placeholder")).toBe("搜索案件…");
  });

  it("uses placeholder as default aria-label", () => {
    const w = mount(SearchField, {
      props: { placeholder: "搜索客户" },
    });
    expect(w.find("input").attributes("aria-label")).toBe("搜索客户");
  });

  it("uses label prop over placeholder for aria-label", () => {
    const w = mount(SearchField, {
      props: { placeholder: "搜索", label: "全局搜索" },
    });
    expect(w.find("input").attributes("aria-label")).toBe("全局搜索");
  });

  it("emits update:modelValue on input", async () => {
    const w = mount(SearchField, { props: { modelValue: "" } });
    await w.find("input").setValue("hello");
    expect(w.emitted("update:modelValue")).toBeTruthy();
    expect(w.emitted("update:modelValue")![0]).toEqual(["hello"]);
  });

  it("reflects modelValue prop", () => {
    const w = mount(SearchField, { props: { modelValue: "query" } });
    expect((w.find("input").element as HTMLInputElement).value).toBe("query");
  });

  it("renders trailing slot", () => {
    const w = mount(SearchField, {
      slots: { trailing: "<span class='kbd'>⌘K</span>" },
    });
    expect(w.find(".kbd").exists()).toBe(true);
  });

  it("uses type=search on input", () => {
    const w = mount(SearchField);
    expect(w.find("input").attributes("type")).toBe("search");
  });
});
