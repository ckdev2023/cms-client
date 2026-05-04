import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import SearchField from "./SearchField.vue";

describe("SearchField — a11y: input has id and name when provided", () => {
  it("renders id and name on the inner <input> when props are set", () => {
    const w = mount(SearchField, {
      props: { id: "test-search", name: "testSearch" },
    });
    const input = w.find("input");
    expect(input.attributes("id")).toBe("test-search");
    expect(input.attributes("name")).toBe("testSearch");
  });

  it("renders aria-label from label prop", () => {
    const w = mount(SearchField, {
      props: { label: "Search items" },
    });
    const input = w.find("input");
    expect(input.attributes("aria-label")).toBe("Search items");
  });

  it("falls back to placeholder for aria-label", () => {
    const w = mount(SearchField, {
      props: { placeholder: "Type here…" },
    });
    const input = w.find("input");
    expect(input.attributes("aria-label")).toBe("Type here…");
  });

  it("has role=search on the wrapper", () => {
    const w = mount(SearchField);
    expect(w.find("[role='search']").exists()).toBe(true);
  });
});
