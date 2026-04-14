import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Button from "./Button.vue";

describe("Button", () => {
  it("renders a native <button> element", () => {
    const w = mount(Button, { slots: { default: "Click" } });
    expect(w.element.tagName).toBe("BUTTON");
  });

  it("applies default variant / tone / size classes", () => {
    const w = mount(Button, { slots: { default: "Click" } });
    expect(w.classes()).toContain("ui-btn");
    expect(w.classes()).toContain("ui-btn--outlined");
    expect(w.classes()).toContain("ui-btn--tone-neutral");
    expect(w.classes()).toContain("ui-btn--md");
  });

  it("applies variant and tone props", () => {
    const w = mount(Button, {
      props: { variant: "filled", tone: "primary" },
      slots: { default: "Save" },
    });
    expect(w.classes()).toContain("ui-btn--filled");
    expect(w.classes()).toContain("ui-btn--tone-primary");
  });

  it("applies size prop", () => {
    const w = mount(Button, {
      props: { size: "lg" },
      slots: { default: "Large" },
    });
    expect(w.classes()).toContain("ui-btn--lg");
  });

  it("applies danger tone", () => {
    const w = mount(Button, {
      props: { variant: "filled", tone: "danger" },
      slots: { default: "Delete" },
    });
    expect(w.classes()).toContain("ui-btn--filled");
    expect(w.classes()).toContain("ui-btn--tone-danger");
  });

  it("adds pill modifier", () => {
    const w = mount(Button, {
      props: { pill: true },
      slots: { default: "Pill" },
    });
    expect(w.classes()).toContain("ui-btn--pill");
  });

  it("adds square modifier for icon buttons", () => {
    const w = mount(Button, {
      props: { square: true },
      slots: { default: "X" },
    });
    expect(w.classes()).toContain("ui-btn--square");
  });

  it("sets disabled attribute when disabled prop is true", () => {
    const w = mount(Button, {
      props: { disabled: true },
      slots: { default: "Off" },
    });
    expect(w.attributes("disabled")).toBeDefined();
  });

  it("sets disabled and aria-busy when loading", () => {
    const w = mount(Button, {
      props: { loading: true },
      slots: { default: "Wait" },
    });
    expect(w.attributes("disabled")).toBeDefined();
    expect(w.attributes("aria-busy")).toBe("true");
    expect(w.classes()).toContain("ui-btn--loading");
  });

  it("shows spinner and hides content when loading", () => {
    const w = mount(Button, {
      props: { loading: true },
      slots: { default: "Go" },
    });
    expect(w.find(".ui-btn__spinner").exists()).toBe(true);
    expect(w.find(".ui-btn__content--hidden").exists()).toBe(true);
  });

  it("does not show spinner or aria-busy when not loading", () => {
    const w = mount(Button, { slots: { default: "Go" } });
    expect(w.find(".ui-btn__spinner").exists()).toBe(false);
    expect(w.attributes("aria-busy")).toBeUndefined();
  });

  it("does not set disabled when neither disabled nor loading", () => {
    const w = mount(Button, { slots: { default: "Active" } });
    expect(w.attributes("disabled")).toBeUndefined();
  });

  it("renders slot content", () => {
    const w = mount(Button, { slots: { default: "Label Text" } });
    expect(w.text()).toBe("Label Text");
  });
});
