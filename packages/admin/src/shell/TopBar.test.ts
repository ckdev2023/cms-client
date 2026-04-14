import { beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../i18n";
import TopBar from "./TopBar.vue";

const stubs = {
  NavIcon: { props: ["name"], template: "<span class='icon' />" },
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/leads", component: { template: "<div />" } },
    ],
  });
}

describe("TopBar", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
  });

  it("renders a header with role=banner", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const header = w.find("header");
    expect(header.exists()).toBe(true);
    expect(header.attributes("role")).toBe("banner");
    expect(header.classes()).toContain("topbar");
  });

  it("renders search input with aria-label", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const input = w.find('input[type="search"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes("aria-label")).toBeTruthy();
    expect(input.attributes("name")).toBe("globalSearch");
    expect(input.attributes("id")).toBe("topbar-global-search");
  });

  it("renders search area with role=search", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const search = w.find('[role="search"]');
    expect(search.exists()).toBe(true);
  });

  it("renders keyboard shortcut indicator", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const kbd = w.find(".topbar-search-kbd");
    expect(kbd.exists()).toBe(true);
    expect(kbd.text()).toContain("⌘K");
  });

  it("renders mobile menu trigger", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const button = w.find(".topbar-menu-btn");
    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-label")).toBe("打开导航");
  });

  it("renders user avatar with provided initials", () => {
    const w = mount(TopBar, {
      props: { userInitials: "TK" },
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    expect(w.find(".topbar-avatar").text()).toBe("TK");
    expect(w.find(".topbar-avatar").attributes("aria-label")).toBe("TK");
  });

  it("falls back to 'U' when no initials provided", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    expect(w.find(".topbar-avatar").text()).toBe("U");
  });

  it("renders actions slot content", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
      slots: { actions: "<button class='custom-action'>Notify</button>" },
    });
    expect(w.find(".topbar-actions .custom-action").exists()).toBe(true);
  });

  it("renders default action buttons when no slot is provided", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const buttons = w.findAll(".topbar-action");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.text()).toBe("新建咨询");
    expect(buttons[1]?.text()).toBe("新建案件");
  });

  it("renders locale selector when no actions slot is provided", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const select = w.find(".topbar-locale-select");
    expect(select.exists()).toBe(true);
    expect(select.attributes("name")).toBe("locale");
    expect(select.attributes("id")).toBe("topbar-locale-select");
    expect((select.element as HTMLSelectElement).value).toBe("zh-CN");
    expect(select.findAll("option")).toHaveLength(3);
  });

  it("switches labels when locale changes to Japanese", async () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const select = w.find(".topbar-locale-select");

    await select.setValue("ja-JP");

    expect((select.element as HTMLSelectElement).value).toBe("ja-JP");
    expect(w.find(".topbar-menu-btn").attributes("aria-label")).toBe(
      "ナビゲーションを開く",
    );
    expect(w.findAll(".topbar-action")[0]?.text()).toBe("相談を新規作成");
  });

  it("emits toggleMenu when the menu trigger is clicked", async () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    await w.find(".topbar-menu-btn").trigger("click");
    expect(w.emitted("toggleMenu")).toHaveLength(1);
  });

  it("navigates to /leads?action=new when createLead button is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(TopBar, {
      global: { plugins: [i18n, router], stubs },
    });
    const createLeadBtn = w.findAll(".topbar-action")[0]!;
    await createLeadBtn.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/leads");
    expect(router.currentRoute.value.query).toEqual({ action: "new" });
  });

  it("renders createCase button as disabled until the flow is wired", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const createCaseBtn = w.findAll(".topbar-action")[1]!;
    expect((createCaseBtn.element as HTMLButtonElement).disabled).toBe(true);
    expect(createCaseBtn.attributes("aria-disabled")).toBe("true");
  });
});
