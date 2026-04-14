import { beforeEach, describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { i18n, setAppLocale } from "../i18n";
import SideNav from "./SideNav.vue";
import { navGroups, brandTitle, brandChip } from "./nav-config";

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
        path: "/billing",
        component: { template: "<div />" },
        meta: { navKey: "billing" },
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
    setAppLocale("zh-CN");
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
});
