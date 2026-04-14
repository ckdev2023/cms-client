import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import Card from "./Card.vue";

describe("Card", () => {
  it("renders with default classes", () => {
    const w = mount(Card, { slots: { default: "Content" } });
    expect(w.classes()).toContain("ui-card");
    expect(w.classes()).toContain("ui-card--pad-md");
    expect(w.classes()).toContain("ui-card--bordered");
  });

  it("renders body slot content", () => {
    const w = mount(Card, { slots: { default: "Body text" } });
    expect(w.find(".ui-card__body").text()).toBe("Body text");
  });

  it("renders title in header", () => {
    const w = mount(Card, {
      props: { title: "Section" },
      slots: { default: "Body" },
    });
    expect(w.find(".ui-card__header").exists()).toBe(true);
    expect(w.find(".ui-card__title").text()).toBe("Section");
  });

  it("does not render header when no title or header slot", () => {
    const w = mount(Card, { slots: { default: "Body only" } });
    expect(w.find(".ui-card__header").exists()).toBe(false);
  });

  it("renders header slot instead of title prop", () => {
    const w = mount(Card, {
      props: { title: "Ignored" },
      slots: {
        header: "<span class='custom-h'>Custom</span>",
        default: "Body",
      },
    });
    const header = w.find(".ui-card__header");
    expect(header.exists()).toBe(true);
    expect(header.find(".custom-h").exists()).toBe(true);
    expect(header.find(".ui-card__title").exists()).toBe(false);
  });

  it("renders extra slot alongside title", () => {
    const w = mount(Card, {
      props: { title: "Title" },
      slots: { extra: "<button>Action</button>", default: "Body" },
    });
    expect(w.find(".ui-card__extra").exists()).toBe(true);
    expect(w.find(".ui-card__extra").text()).toBe("Action");
  });

  it("does not render extra area without extra slot", () => {
    const w = mount(Card, {
      props: { title: "Title" },
      slots: { default: "Body" },
    });
    expect(w.find(".ui-card__extra").exists()).toBe(false);
  });

  it("renders footer slot", () => {
    const w = mount(Card, {
      slots: { default: "Body", footer: "<span>Footer</span>" },
    });
    expect(w.find(".ui-card__footer").exists()).toBe(true);
    expect(w.find(".ui-card__footer").text()).toBe("Footer");
  });

  it("does not render footer when slot is absent", () => {
    const w = mount(Card, { slots: { default: "Body" } });
    expect(w.find(".ui-card__footer").exists()).toBe(false);
  });

  it("applies padding variants", () => {
    for (const p of ["none", "sm", "md", "lg"] as const) {
      const w = mount(Card, {
        props: { padding: p },
        slots: { default: "X" },
      });
      expect(w.classes()).toContain(`ui-card--pad-${p}`);
    }
  });

  it("omits bordered class when false", () => {
    const w = mount(Card, {
      props: { bordered: false },
      slots: { default: "X" },
    });
    expect(w.classes()).not.toContain("ui-card--bordered");
  });

  it("adds hoverable class when true", () => {
    const w = mount(Card, {
      props: { hoverable: true },
      slots: { default: "X" },
    });
    expect(w.classes()).toContain("ui-card--hoverable");
  });

  it("does not add hoverable class by default", () => {
    const w = mount(Card, { slots: { default: "X" } });
    expect(w.classes()).not.toContain("ui-card--hoverable");
  });
});
