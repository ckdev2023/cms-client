import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

  describe("debounceMs", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    // 模拟真实键入行为：仅触发 input 事件（不触发 change）。
    async function typeChar(
      input: ReturnType<ReturnType<typeof mount>["find"]>,
      value: string,
    ) {
      (input.element as HTMLInputElement).value = value;
      await input.trigger("input");
    }

    it("delays update:modelValue when debounceMs > 0", async () => {
      const w = mount(SearchField, {
        props: { modelValue: "", debounceMs: 200 },
      });
      const input = w.find("input");
      await typeChar(input, "a");
      await typeChar(input, "ab");
      await typeChar(input, "abc");
      expect(w.emitted("update:modelValue")).toBeFalsy();
      vi.advanceTimersByTime(199);
      expect(w.emitted("update:modelValue")).toBeFalsy();
      vi.advanceTimersByTime(1);
      const emitted = w.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted!).toHaveLength(1);
      expect(emitted![0]).toEqual(["abc"]);
    });

    it("flushes immediately on change event (Enter / blur)", async () => {
      const w = mount(SearchField, {
        props: { modelValue: "", debounceMs: 500 },
      });
      const input = w.find("input");
      await typeChar(input, "hello");
      expect(w.emitted("update:modelValue")).toBeFalsy();
      await input.trigger("change");
      const emitted = w.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(["hello"]);
    });

    it("cancels pending emit when modelValue prop changes externally", async () => {
      const w = mount(SearchField, {
        props: { modelValue: "", debounceMs: 200 },
      });
      await typeChar(w.find("input"), "draft");
      await w.setProps({ modelValue: "external" });
      vi.advanceTimersByTime(500);
      expect(w.emitted("update:modelValue")).toBeFalsy();
    });

    it("emits synchronously when debounceMs is 0 (default)", async () => {
      const w = mount(SearchField, { props: { modelValue: "" } });
      await typeChar(w.find("input"), "x");
      const emitted = w.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(["x"]);
    });

    it("flushes pending emit on unmount", async () => {
      const w = mount(SearchField, {
        props: { modelValue: "", debounceMs: 500 },
      });
      await typeChar(w.find("input"), "pending");
      expect(w.emitted("update:modelValue")).toBeFalsy();
      w.unmount();
      const emitted = w.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted![0]).toEqual(["pending"]);
    });
  });
});
