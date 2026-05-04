import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DateInput from "./DateInput.vue";

describe("DateInput", () => {
  it("renders an input with type=date", () => {
    const w = mount(DateInput);
    const input = w.find("input");
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("date");
  });

  it("defaults max to 9999-12-31", () => {
    const w = mount(DateInput);
    expect(w.find("input").attributes("max")).toBe("9999-12-31");
  });

  it("allows custom max", () => {
    const w = mount(DateInput, { props: { max: "2030-12-31" } });
    expect(w.find("input").attributes("max")).toBe("2030-12-31");
  });

  it("applies min attribute when provided", () => {
    const w = mount(DateInput, { props: { min: "2020-01-01" } });
    expect(w.find("input").attributes("min")).toBe("2020-01-01");
  });

  it("emits update:modelValue on input", async () => {
    const w = mount(DateInput, { props: { modelValue: "" } });
    await w.find("input").setValue("2026-06-15");
    expect(w.emitted("update:modelValue")).toBeTruthy();
    expect(w.emitted("update:modelValue")![0]).toEqual(["2026-06-15"]);
  });

  it("clamps value exceeding max to max on input", async () => {
    const w = mount(DateInput, {
      props: { modelValue: "", max: "9999-12-31" },
    });
    const input = w.find("input");
    await input.setValue("20261-12-31");
    const emitted = w.emitted("update:modelValue")!;
    expect(emitted[emitted.length - 1]).toEqual(["9999-12-31"]);
  });

  it("reflects modelValue prop", () => {
    const w = mount(DateInput, { props: { modelValue: "2026-03-01" } });
    expect((w.find("input").element as HTMLInputElement).value).toBe(
      "2026-03-01",
    );
  });

  it("passes id and name attributes", () => {
    const w = mount(DateInput, {
      props: { id: "my-date", name: "dueAt" },
    });
    const input = w.find("input");
    expect(input.attributes("id")).toBe("my-date");
    expect(input.attributes("name")).toBe("dueAt");
  });

  it("disables the input when disabled prop is true", () => {
    const w = mount(DateInput, { props: { disabled: true } });
    expect(w.find("input").attributes("disabled")).toBeDefined();
  });

  it("passes data-testid", () => {
    const w = mount(DateInput, { props: { dataTestid: "deadline-input" } });
    expect(w.find("input").attributes("data-testid")).toBe("deadline-input");
  });
});
