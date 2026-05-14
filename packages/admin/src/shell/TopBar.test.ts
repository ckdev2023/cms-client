import { beforeEach, describe, expect, it } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import {
  ADMIN_SESSION_STORAGE_KEY,
  adminSessionController,
} from "../auth/model/adminSession";
import { i18n, setAppLocale } from "../i18n";
import { getDefaultPermissionsStore } from "../shared/model/PermissionsStore";
import TopBar from "./TopBar.vue";

const stubs = {
  NavIcon: { props: ["name"], template: "<span class='icon' />" },
};

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/login", name: "login", component: { template: "<div />" } },
      { path: "/leads", component: { template: "<div />" } },
      {
        path: "/cases/create",
        name: "case-create",
        component: { template: "<div />" },
      },
    ],
  });
}

describe("TopBar", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    adminSessionController.reset();
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
    getDefaultPermissionsStore()._setForTest(["case.create"]);
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

  it("renders search trigger button with palette aria-controls", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const trigger = w.find(".topbar-search-trigger");
    expect(trigger.exists()).toBe(true);
    expect(trigger.element.tagName).toBe("BUTTON");
    expect(trigger.attributes("aria-controls")).toBe("global-search-palette");
    expect(trigger.attributes("aria-haspopup")).toBe("dialog");
    expect(trigger.attributes("aria-label")).toBeUndefined();
    expect(trigger.find(".topbar-search-placeholder").text()).toBe(
      "搜索：客户 / 案件 / 资料 / 文书...",
    );
  });

  it("renders search area with role=search", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const search = w.find('[role="search"]');
    expect(search.exists()).toBe(true);
  });

  it("renders keyboard shortcut hint in the search trigger", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    const kbd = w.find(".topbar-search-kbd");
    expect(kbd.exists()).toBe(true);
    expect(kbd.text()).toBe("⌘K");
  });

  it("emits openSearchPalette when search trigger is clicked", async () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    await w.find(".topbar-search-trigger").trigger("click");
    expect(w.emitted("openSearchPalette")).toHaveLength(1);
  });

  it("emits openSearchPalette when Enter is pressed on the search trigger", async () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    await w.find(".topbar-search-trigger").trigger("keydown.enter");
    expect(w.emitted("openSearchPalette")).toHaveLength(1);
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
      props: {
        userEmail: "tanaka@example.com",
        userInitials: "TK",
        userName: "Tanaka Ken",
      },
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    expect(w.find(".topbar-avatar").text()).toBe("TK");
    expect(w.find(".topbar-avatar").attributes("aria-label")).toBe(
      "TK Tanaka Ken (tanaka@example.com)",
    );
    expect(w.find(".topbar-avatar").attributes("title")).toBe(
      "TK Tanaka Ken (tanaka@example.com)",
    );
  });

  it("falls back to Local Admin account summary when no props provided", () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });
    expect(w.find(".topbar-avatar").text()).toBe("LA");
    expect(w.find(".topbar-avatar").attributes("aria-label")).toBe(
      "LA Local Admin (admin@local.test)",
    );
  });

  it("toggles the account panel when avatar is clicked", async () => {
    const w = mount(TopBar, {
      global: { plugins: [i18n, makeRouter()], stubs },
    });

    const avatar = w.find(".topbar-avatar");
    expect(avatar.attributes("aria-expanded")).toBe("false");
    expect(w.find(".topbar-account-panel").exists()).toBe(false);

    await avatar.trigger("click");

    expect(avatar.attributes("aria-expanded")).toBe("true");
    expect(w.find(".topbar-account-panel").text()).toContain("Local Admin");
    expect(w.find(".topbar-account-panel").text()).toContain(
      "admin@local.test",
    );
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
    expect(buttons).toHaveLength(3);
    expect(buttons[0]?.text()).toBe("新建咨询");
    expect(buttons[1]?.text()).toBe("新建案件");
    expect(buttons[2]?.text()).toBe("退出登录");
    expect(buttons[0]?.classes()).toContain("topbar-action--pill");
    expect(buttons[0]?.classes()).not.toContain("topbar-action--primary");
    expect(buttons[1]?.classes()).toContain("topbar-action--primary");
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
    expect(w.find(".topbar-search-placeholder").text()).toBe(
      "検索: 顧客 / 案件 / 資料 / 書類...",
    );
    expect(w.findAll(".topbar-action")[0]?.text()).toBe("相談を新規作成");
    expect(w.findAll(".topbar-action")[2]?.text()).toBe("ログアウト");
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

  it("navigates to /cases/create when createCase button is clicked", async () => {
    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(TopBar, {
      global: { plugins: [i18n, router], stubs },
    });
    const createCaseBtn = w.findAll(".topbar-action")[1]!;
    expect((createCaseBtn.element as HTMLButtonElement).disabled).toBe(false);

    await createCaseBtn.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/cases/create");
  });

  it("logs out and routes to /login when logout is clicked", async () => {
    window.localStorage.setItem(
      ADMIN_SESSION_STORAGE_KEY,
      JSON.stringify({
        token: "jwt-token",
        user: {
          id: "u-logout-test",
          name: "Admin",
          email: "admin@example.com",
          role: "manager",
          initials: "AD",
        },
        loggedInAt: 1234,
      }),
    );

    const router = makeRouter();
    await router.push("/");
    await router.isReady();
    const w = mount(TopBar, {
      global: { plugins: [i18n, router], stubs },
    });

    const logoutBtn = w.findAll(".topbar-action")[2]!;
    await logoutBtn.trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.path).toBe("/login");
    expect(router.currentRoute.value.query).toEqual({ reason: "loggedOut" });
    expect(window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY)).toBeNull();
  });
});
