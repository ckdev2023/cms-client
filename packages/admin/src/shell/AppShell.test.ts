import { beforeEach, describe, it, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../i18n";
import AppShell from "./AppShell.vue";
import {
  initSearchRepository,
  resetSearchRepository,
} from "../shared/model/useSearchRepository";
import { getDefaultPermissionsStore } from "../shared/model/PermissionsStore";

const stubs = {
  SideNav: { template: "<aside class='stub-sidenav' />" },
  TopBar: {
    template:
      "<header class='stub-topbar' @click=\"$emit('toggleMenu')\"><slot name='actions' /></header>",
  },
  GlobalSearchPalette: {
    template: "<div class='stub-search-palette' />",
  },
};

const homeRouteStub = {
  template: "<div class='stub-route-view stub-route-view--home' />",
};
const leadsRouteStub = {
  template: "<div class='stub-route-view stub-route-view--leads' />",
};
let casesMountCount = 0;
const casesRouteStub = {
  setup() {
    casesMountCount++;
  },
  template: "<div class='stub-route-view stub-route-view--cases' />",
};

async function mountShell(options: Parameters<typeof mount>[1] = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: homeRouteStub },
      { path: "/leads", component: leadsRouteStub },
      { path: "/cases", component: casesRouteStub, meta: { navKey: "cases" } },
      {
        path: "/cases/create",
        component: casesRouteStub,
        meta: { navKey: "cases" },
      },
      {
        path: "/cases/:id",
        component: casesRouteStub,
        meta: { navKey: "cases" },
      },
    ],
  });

  await router.push("/");
  await router.isReady();

  const wrapper = mount(AppShell, {
    ...options,
    attachTo: options.attachTo ?? document.body,
    global: {
      ...(options.global ?? {}),
      plugins: [...(options.global?.plugins ?? []), i18n, router],
      stubs: {
        ...stubs,
        ...(options.global?.stubs ?? {}),
      },
    },
  });

  return { wrapper, router };
}

describe("AppShell", () => {
  beforeEach(() => {
    setAppLocale("zh-CN");
    casesMountCount = 0;
    resetSearchRepository();
    initSearchRepository({
      getToken: () => "test-token",
      request: vi.fn(),
    });
    getDefaultPermissionsStore()._setForTest(["case.create"]);
  });

  it("renders the app-shell root element", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find(".app-shell").exists()).toBe(true);
  });

  it("renders the skip link targeting #main-content", async () => {
    const { wrapper: w } = await mountShell();
    const link = w.find(".skip-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("#main-content");
    expect(link.text()).toBe("跳到内容");
  });

  it("localizes the skip link in ja-JP", async () => {
    setAppLocale("ja-JP");
    const { wrapper: w } = await mountShell();
    expect(w.find(".skip-link").text()).toBe("コンテンツへスキップ");
  });

  it("adds a visible modifier when the skip link receives focus", async () => {
    const { wrapper: w } = await mountShell();
    const link = w.find(".skip-link");

    expect(link.classes()).not.toContain("skip-link--visible");

    await link.trigger("focus");
    expect(link.classes()).toContain("skip-link--visible");

    await link.trigger("blur");
    expect(link.classes()).not.toContain("skip-link--visible");
  });

  it("renders TopBar component", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find(".stub-topbar").exists()).toBe(true);
  });

  it("renders SideNav component", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find(".stub-sidenav").exists()).toBe(true);
  });

  it("renders main content area with correct id and tabindex", async () => {
    const { wrapper: w } = await mountShell();
    const main = w.find("main#main-content");
    expect(main.exists()).toBe(true);
    expect(main.attributes("tabindex")).toBe("-1");
    expect(main.classes()).toContain("content");
  });

  it("renders the current route component inside main content area", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find("main .stub-route-view--home").exists()).toBe(true);
  });

  it("passes userInitials prop to TopBar", async () => {
    const TopBarSpy = {
      props: ["userEmail", "userInitials", "userName"],
      template:
        "<header>{{ userName }}|{{ userEmail }}|{{ userInitials }}</header>",
    };
    const { wrapper: w } = await mountShell({
      props: {
        userEmail: "tanaka@example.com",
        userInitials: "TK",
        userName: "Tanaka Ken",
      },
      global: { stubs: { ...stubs, TopBar: TopBarSpy } },
    });
    expect(w.find("header").text()).toBe("Tanaka Ken|tanaka@example.com|TK");
  });

  it("forwards topbar-actions slot to TopBar", async () => {
    const TopBarWithSlot = {
      template: '<header><slot name="actions" /></header>',
    };
    const { wrapper: w } = await mountShell({
      global: { stubs: { ...stubs, TopBar: TopBarWithSlot } },
      slots: { "topbar-actions": "<button class='act'>Go</button>" },
    });
    expect(w.find("header .act").exists()).toBe(true);
  });

  it("opens the mobile nav when TopBar emits toggleMenu", async () => {
    const { wrapper: w } = await mountShell();
    await w.find(".stub-topbar").trigger("click");
    expect(w.find(".mobile-nav").exists()).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("closes the mobile nav when backdrop is clicked", async () => {
    const { wrapper: w } = await mountShell();
    await w.find(".stub-topbar").trigger("click");
    await w.find(".mobile-nav-backdrop").trigger("click");
    expect(w.find(".mobile-nav").exists()).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  it("updates the rendered route view when navigation changes", async () => {
    const { wrapper: w, router } = await mountShell();
    await router.push("/leads");
    await flushPromises();

    expect(w.find("main .stub-route-view--home").exists()).toBe(false);
    expect(w.find("main .stub-route-view--leads").exists()).toBe(true);
  });

  it("moves focus to the main region after navigation", async () => {
    const { wrapper: w, router } = await mountShell();
    await router.push("/leads");
    await flushPromises();

    expect(document.activeElement).toBe(w.find("main#main-content").element);
  });

  it("renders the cases route view when navigating to /cases", async () => {
    const { wrapper: w, router } = await mountShell();
    await router.push("/cases");
    await flushPromises();

    expect(w.find("main .stub-route-view--home").exists()).toBe(false);
    expect(w.find("main .stub-route-view--cases").exists()).toBe(true);
  });

  it("does not remount the view when only query changes", async () => {
    const { router } = await mountShell();
    await router.push("/cases/case-123");
    await flushPromises();

    expect(casesMountCount).toBe(1);

    await router.push("/cases/case-123?tab=billing");
    await flushPromises();
    await router.push("/cases/case-123?tab=documents");
    await flushPromises();
    await router.push("/cases/case-123?tab=log");
    await flushPromises();
    await router.push("/cases/case-123?tab=tasks");
    await flushPromises();

    expect(casesMountCount).toBe(1);
  });

  it("remounts the view when path params change", async () => {
    const { wrapper: w, router } = await mountShell();
    await router.push("/cases/case-aaa");
    await flushPromises();
    expect(w.find("main .stub-route-view--cases").exists()).toBe(true);

    await router.push("/cases/case-bbb");
    await flushPromises();
    expect(w.find("main .stub-route-view--cases").exists()).toBe(true);
  });

  it("remounts the view when navigating from one route to another", async () => {
    const { wrapper: w, router } = await mountShell();
    await router.push("/cases");
    await flushPromises();
    expect(w.find("main .stub-route-view--cases").exists()).toBe(true);

    await router.push("/leads");
    await flushPromises();
    expect(w.find("main .stub-route-view--leads").exists()).toBe(true);
    expect(w.find("main .stub-route-view--cases").exists()).toBe(false);
  });

  it("renders GlobalSearchPalette component", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find(".stub-search-palette").exists()).toBe(true);
  });

  it("intercepts Cmd+K keydown to open the search palette", async () => {
    await mountShell();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("intercepts Ctrl+K keydown to open the search palette", async () => {
    await mountShell();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      cancelable: true,
    });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("ignores Cmd+K during IME composing", async () => {
    await mountShell();
    const event = new KeyboardEvent("keydown", {
      key: "k",
      metaKey: true,
      cancelable: true,
    });
    Object.defineProperty(event, "isComposing", { value: true });
    document.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("scrolls back to the top after navigation", async () => {
    const userAgentDescriptor = Object.getOwnPropertyDescriptor(
      window.navigator,
      "userAgent",
    );
    Object.defineProperty(window.navigator, "userAgent", {
      configurable: true,
      value: "vitest-browser",
    });
    const scrollToSpy = vi.mocked(window.scrollTo);
    try {
      scrollToSpy.mockClear();
      const { router } = await mountShell();

      await router.push("/leads");
      await flushPromises();

      expect(scrollToSpy).toHaveBeenCalledWith({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    } finally {
      if (userAgentDescriptor) {
        Object.defineProperty(
          window.navigator,
          "userAgent",
          userAgentDescriptor,
        );
      }
    }
  });
});
