import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Chip from "./Chip.vue";

describe("Chip", () => {
  it("renders a span element", () => {
    const w = mount(Chip, { slots: { default: "Tag" } });
    expect(w.element.tagName).toBe("SPAN");
  });

  it("applies default neutral tone and md size", () => {
    const w = mount(Chip, { slots: { default: "Tag" } });
    expect(w.classes()).toContain("ui-chip");
    expect(w.classes()).toContain("ui-chip--neutral");
    expect(w.classes()).toContain("ui-chip--md");
  });

  it("applies tone prop", () => {
    for (const tone of [
      "neutral",
      "primary",
      "success",
      "warning",
      "danger",
    ] as const) {
      const w = mount(Chip, {
        props: { tone },
        slots: { default: tone },
      });
      expect(w.classes()).toContain(`ui-chip--${tone}`);
    }
  });

  it("applies size prop", () => {
    const w = mount(Chip, {
      props: { size: "sm" },
      slots: { default: "S" },
    });
    expect(w.classes()).toContain("ui-chip--sm");
  });

  it("shows dot indicator when dot is true", () => {
    const w = mount(Chip, {
      props: { dot: true },
      slots: { default: "Active" },
    });
    expect(w.classes()).toContain("ui-chip--dot");
    const dot = w.find(".ui-chip__dot");
    expect(dot.exists()).toBe(true);
    expect(dot.attributes("aria-hidden")).toBe("true");
  });

  it("does not show dot by default", () => {
    const w = mount(Chip, { slots: { default: "Tag" } });
    expect(w.find(".ui-chip__dot").exists()).toBe(false);
    expect(w.classes()).not.toContain("ui-chip--dot");
  });

  it("renders slot content", () => {
    const w = mount(Chip, { slots: { default: "Status" } });
    expect(w.text()).toBe("Status");
  });
});
