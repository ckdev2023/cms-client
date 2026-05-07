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
      props: { size: "micro" },
      slots: { default: "S" },
    });
    expect(w.classes()).toContain("ui-chip--micro");
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

  it("supports aria-selected attribute for primary active state", () => {
    const w = mount(Chip, {
      props: { tone: "primary" },
      attrs: { "aria-selected": "true" },
      slots: { default: "Active" },
    });
    expect(w.attributes("aria-selected")).toBe("true");
    expect(w.classes()).toContain("ui-chip--primary");
  });

  it("defaults to solid variant", () => {
    const w = mount(Chip, { slots: { default: "Tag" } });
    expect(w.classes()).toContain("ui-chip--variant-solid");
  });

  it("applies tag variant class when variant=tag", () => {
    const w = mount(Chip, {
      props: { variant: "tag", tone: "primary", dot: true },
      slots: { default: "VIP" },
    });
    expect(w.classes()).toContain("ui-chip--variant-tag");
    expect(w.classes()).toContain("ui-chip--primary");
    expect(w.find(".ui-chip__dot").exists()).toBe(true);
  });
});
