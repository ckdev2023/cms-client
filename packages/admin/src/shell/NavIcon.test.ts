import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import NavIcon from "./NavIcon.vue";
import type { NavIconName } from "./nav-config";

const allIcons: NavIconName[] = [
  "dashboard",
  "message",
  "users",
  "file-text",
  "clipboard",
  "folder",
  "edit",
  "wallet",
  "bar-chart",
  "settings",
  "search",
  "menu",
  "close",
];

describe("NavIcon", () => {
  it("renders an SVG element", () => {
    const w = mount(NavIcon, { props: { name: "dashboard" } });
    expect(w.element.tagName.toLowerCase()).toBe("svg");
  });

  it("sets aria-hidden on the SVG", () => {
    const w = mount(NavIcon, { props: { name: "dashboard" } });
    expect(w.attributes("aria-hidden")).toBe("true");
  });

  it.each(allIcons)("renders a path for icon '%s'", (name) => {
    const w = mount(NavIcon, { props: { name } });
    expect(w.find("path").exists()).toBe(true);
  });
});
