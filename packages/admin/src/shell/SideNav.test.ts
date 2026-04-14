import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../i18n";
import { adminSessionController } from "../auth/model/adminSession";
import SideNav from "./SideNav.vue";
import {
  navGroups,
  brandTitle,
  brandChip,
  getVisibleNavGroups,
} from "./nav-config";

const routerLinkStub = {
  props: ["to"],
  template: '<a class="router-link" :href="String(to)"><slot /></a>',
};

const stubs = {
  RouterLink: routerLinkStub,
  NavIcon: { props: ["name"], template: "<span class='icon' />" },
};

async function makeRouter(initialPath = "/") {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: { template: "<div />" },
        meta: { navKey: "dashboard" },
      },
      {
        path: "/customers",
        component: { template: "<div />" },
        meta: { navKey: "customers" },
      },
      {
        path: "/customers/:id",
        component: { template: "<div />" },
        meta: { navKey: "customers" },
      },
      {
        path: "/cases",
        component: { template: "<div />" },
        meta: { navKey: "cases" },
      },
      {
        path: "/cases/create",
        component: { template: "<div />" },
        meta: { navKey: "cases" },
      },
      {
        path: "/cases/:id",
        component: { template: "<div />" },
        meta: { navKey: "cases" },
      },
      {
        path: "/billing",
        component: { template: "<div />" },
        meta: { navKey: "billing" },
      },
      {
        path: "/settings",
        component: { template: "<div />" },
        meta: { navKey: "settings" },
      },
    ],
  });
  await router.push(initialPath);
  await router.isReady();
  return router;
}

async function mountWithRouter(
  initialPath = "/",
  options: Parameters<typeof mount>[1] = {},
) {
  const router = await makeRouter(initialPath);
  return mount(SideNav, {
    ...options,
    global: {
      ...(options.global ?? {}),
      plugins: [...(options.global?.plugins ?? []), i18n, router],
      stubs: {
        ...stubs,
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}

describe("SideNav", () => {
  beforeEach(() => {
    adminSessionController.reset();
    adminSessionController.login(
      { email: "admin@test.com", password: "pw" },
      null,
    );
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    adminSessionController.reset();
  });

  it("renders an aside with aria-label", async () => {
    const w = await mountWithRouter();
    const aside = w.find("aside");
    expect(aside.exists()).toBe(true);
    expect(aside.attributes("aria-label")).toBeTruthy();
  });

  it("renders the brand title", async () => {
    const w = await mountWithRouter();
    expect(w.find(".sidenav-brand-title").text()).toBe(brandTitle);
  });

  it("renders the brand chip", async () => {
    const w = await mountWithRouter();
    expect(w.find(".sidenav-chip").text()).toBe(brandChip);
  });

  it("renders brand title as a RouterLink to /", async () => {
    const w = await mountWithRouter();
    const brand = w.find(".sidenav-brand-title");
    expect(brand.attributes("href")).toBe("/");
  });

  it("renders a nav element with aria-label", async () => {
    const w = await mountWithRouter();
    const nav = w.find("nav");
    expect(nav.exists()).toBe(true);
    expect(nav.attributes("aria-label")).toBeTruthy();
  });

  it("renders all nav group headings", async () => {
    const w = await mountWithRouter();
    const titles = w.findAll(".nav-group-title").map((el) => el.text());
    expect(titles).toEqual(navGroups.map((g) => g.title));
  });

  it("renders nav items for each group", async () => {
    const w = await mountWithRouter();
    const items = w.findAll(".nav-item");
    const totalItems = navGroups.reduce((n, g) => n + g.items.length, 0);
    expect(items).toHaveLength(totalItems);
  });

  it("does not render external nav items after portal removal", async () => {
    const w = await mountWithRouter();
    const externalLinks = w.findAll('a.nav-item[target="_blank"]');
    expect(externalLinks).toHaveLength(0);
  });

  it("renders internal items as RouterLink", async () => {
    const w = await mountWithRouter();
    const routerLinks = w.findAll("a.router-link.nav-item");
    expect(routerLinks.length).toBeGreaterThan(0);
  });

  it("renders NavIcon for items with an icon", async () => {
    const w = await mountWithRouter();
    const icons = w.findAll(".icon");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("renders close button in mobile variant", async () => {
    const w = await mountWithRouter("/", {
      props: { variant: "mobile" },
    });
    expect(w.find(".sidenav-close-btn").exists()).toBe(true);
  });

  it("emits navigate when an internal nav item is clicked", async () => {
    const w = await mountWithRouter();
    await w.find("a.router-link.nav-item").trigger("click");
    expect(w.emitted("navigate")).toHaveLength(1);
  });

  it("emits close when mobile close button is clicked", async () => {
    const w = await mountWithRouter("/", {
      props: { variant: "mobile" },
    });
    await w.find(".sidenav-close-btn").trigger("click");
    expect(w.emitted("close")).toHaveLength(1);
  });

  it("marks the current nav item as active from route meta", async () => {
    const w = await mountWithRouter("/billing", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("收费与财务");
  });

  it("keeps parent nav item active for detail routes", async () => {
    const w = await mountWithRouter("/customers/cust-001", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("客户");
  });

  it("updates the active nav item after route navigation", async () => {
    const router = await makeRouter("/customers/cust-001");
    const w = mount(SideNav, {
      global: {
        plugins: [i18n, router],
        stubs,
      },
    });

    expect(w.find('a.nav-item--active[aria-current="page"]').text()).toContain(
      "客户",
    );

    await router.push("/billing");
    await router.isReady();

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("收费与财务");
  });

  it("marks cases nav item as active on /cases", async () => {
    const w = await mountWithRouter("/cases", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("案件");
  });

  it("keeps cases nav item active on /cases/create", async () => {
    const w = await mountWithRouter("/cases/create", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("案件");
  });

  it("keeps cases nav item active on /cases/:id detail", async () => {
    const w = await mountWithRouter("/cases/case-001", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("案件");
  });

  it("navigates from cases to billing and updates active state", async () => {
    const router = await makeRouter("/cases");
    const w = mount(SideNav, {
      global: {
        plugins: [i18n, router],
        stubs,
      },
    });

    expect(w.find('a.nav-item--active[aria-current="page"]').text()).toContain(
      "案件",
    );

    await router.push("/billing");
    await router.isReady();

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("收费与财务");
  });

  it("shows settings nav item with correct label for admin users", async () => {
    const w = await mountWithRouter();
    const items = w.findAll(".nav-item");
    const settingsItem = items.find((el) => el.text().includes("系统设置"));
    expect(settingsItem?.exists()).toBe(true);
  });

  it("marks settings nav item as active on /settings", async () => {
    const w = await mountWithRouter("/settings", {
      global: {
        stubs: { NavIcon: stubs.NavIcon },
      },
    });

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("系统设置");
  });

  it("navigates from settings to dashboard and updates active state", async () => {
    const router = await makeRouter("/settings");
    const w = mount(SideNav, {
      global: {
        plugins: [i18n, router],
        stubs,
      },
    });

    expect(w.find('a.nav-item--active[aria-current="page"]').text()).toContain(
      "系统设置",
    );

    await router.push("/");
    await router.isReady();

    const activeItem = w.find('a.nav-item--active[aria-current="page"]');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain("仪表盘");
  });

  it("hides adminOnly nav items for non-admin users", async () => {
    adminSessionController.reset();
    const w = await mountWithRouter();
    const items = w.findAll(".nav-item");
    const nonAdminGroups = getVisibleNavGroups(false);
    const expectedCount = nonAdminGroups.reduce(
      (n, g) => n + g.items.length,
      0,
    );
    expect(items).toHaveLength(expectedCount);

    const itemTexts = items.map((el) => el.text());
    expect(itemTexts).not.toContain("系统设置");
  });

  it("hides the system group heading for non-admin users", async () => {
    adminSessionController.reset();
    const w = await mountWithRouter();
    const titles = w.findAll(".nav-group-title").map((el) => el.text());
    expect(titles).not.toContain("系统");
  });
});
