import { describe, it, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import AppShell from "./AppShell.vue";

const stubs = {
  SideNav: { template: "<aside class='stub-sidenav' />" },
  TopBar: {
    template:
      "<header class='stub-topbar' @click=\"$emit('toggleMenu')\"><slot name='actions' /></header>",
  },
};

const homeRouteStub = {
  template: "<div class='stub-route-view stub-route-view--home' />",
};
const leadsRouteStub = {
  template: "<div class='stub-route-view stub-route-view--leads' />",
};
const casesRouteStub = {
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
      plugins: [...(options.global?.plugins ?? []), router],
      stubs: {
        ...stubs,
        ...(options.global?.stubs ?? {}),
      },
    },
  });

  return { wrapper, router };
}

describe("AppShell", () => {
  it("renders the app-shell root element", async () => {
    const { wrapper: w } = await mountShell();
    expect(w.find(".app-shell").exists()).toBe(true);
  });

  it("renders the skip link targeting #main-content", async () => {
    const { wrapper: w } = await mountShell();
    const link = w.find(".skip-link");
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("#main-content");
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
      props: ["userInitials"],
      template: "<header>{{ userInitials }}</header>",
    };
    const { wrapper: w } = await mountShell({
      props: { userInitials: "TK" },
      global: { stubs: { ...stubs, TopBar: TopBarSpy } },
    });
    expect(w.find("header").text()).toBe("TK");
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
