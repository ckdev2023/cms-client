import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n } from "../../i18n";
import LoginView from "./LoginView.vue";

function mountLogin() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: { template: "<div />" } },
      { path: "/login", name: "login", component: LoginView },
    ],
  });
  return mount(LoginView, {
    global: { plugins: [i18n, router] },
  });
}

describe("LoginView — a11y: every input has id and name", () => {
  it("all <input> elements have id and name attributes", () => {
    const w = mountLogin();
    const inputs = w.findAll("input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    for (const input of inputs) {
      expect(input.attributes("id"), `input missing id`).toBeTruthy();
      expect(input.attributes("name"), `input missing name`).toBeTruthy();
    }
  });

  it("each input is associated with a label", () => {
    const w = mountLogin();
    const inputs = w.findAll("input");
    for (const input of inputs) {
      const id = input.attributes("id")!;
      const labelFor = w.find(`label[for="${id}"]`);
      const wrappingLabel = input.element.closest("label");
      expect(
        labelFor.exists() || wrappingLabel !== null,
        `input#${id} has no associated label`,
      ).toBe(true);
    }
  });
});
