import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { router as appRouter } from "./index";
import { resolveAdminAuthGuard } from "./authGuard";
import {
  navGroups,
  findNavItem,
  getVisibleNavGroups,
} from "../shell/nav-config";
import { adminSessionController } from "../auth/model/adminSession";
import { i18n, setAppLocale } from "../i18n";
import SideNav from "../shell/SideNav.vue";

// ---------------------------------------------------------------------------
// 1. Route definition
// ---------------------------------------------------------------------------

describe("/settings — route definition", () => {
  const settingsRoute = appRouter
    .getRoutes()
    .find((r) => r.path === "/settings");

  it("exists in the router config", () => {
    expect(settingsRoute).toBeDefined();
  });

  it("has requiresAuth: true", () => {
    expect(settingsRoute!.meta.requiresAuth).toBe(true);
  });

  it("has requiresAdmin: true", () => {
    expect(settingsRoute!.meta.requiresAdmin).toBe(true);
  });

  it("has navKey = settings", () => {
    expect(settingsRoute!.meta.navKey).toBe("settings");
  });

  it("has groupKey = system", () => {
    expect(settingsRoute!.meta.groupKey).toBe("system");
  });
});

// ---------------------------------------------------------------------------
// 2. Nav config sync
// ---------------------------------------------------------------------------

describe("/settings — nav config sync", () => {
  const settingsItem = findNavItem("settings");

  it("settings nav item exists", () => {
    expect(settingsItem).toBeDefined();
  });

  it("has adminOnly: true", () => {
    expect(settingsItem!.adminOnly).toBe(true);
  });

  it("label is 系统设置", () => {
    expect(settingsItem!.label).toBe("系统设置");
  });

  it("routes to /settings", () => {
    expect(settingsItem).toBeDefined();
    expect(settingsItem!.to).toBe("/settings");
  });

  it("belongs to system group", () => {
    const systemGroup = navGroups.find((g) => g.key === "system");
    expect(systemGroup).toBeDefined();
    expect(systemGroup!.items.some((i) => i.key === "settings")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. i18n label sync (all 3 locales)
// ---------------------------------------------------------------------------

describe("/settings — i18n label sync", () => {
  it("zh-CN resolves shell.nav.items.settings to 系统设置", () => {
    setAppLocale("zh-CN");
    expect(i18n.global.t("shell.nav.items.settings")).toBe("系统设置");
  });

  it("en-US resolves shell.nav.items.settings to System Settings", () => {
    setAppLocale("en-US");
    expect(i18n.global.t("shell.nav.items.settings")).toBe("System Settings");
  });

  it("ja-JP resolves shell.nav.items.settings to システム設定", () => {
    setAppLocale("ja-JP");
    expect(i18n.global.t("shell.nav.items.settings")).toBe("システム設定");
  });
});

// ---------------------------------------------------------------------------
// 4. Auth guard integration
// ---------------------------------------------------------------------------

describe("/settings — auth guard integration", () => {
  const settingsMeta = { requiresAuth: true, requiresAdmin: true };

  it("unauthenticated user is redirected to login with redirect=/settings", () => {
    const result = resolveAdminAuthGuard(
      { fullPath: "/settings", meta: settingsMeta, query: {} },
      false,
      false,
    );
    expect(result).toEqual({
      name: "login",
      query: { redirect: "/settings" },
    });
  });

  it("authenticated non-admin is redirected to dashboard", () => {
    const result = resolveAdminAuthGuard(
      { fullPath: "/settings", meta: settingsMeta, query: {} },
      true,
      false,
    );
    expect(result).toEqual({ name: "dashboard" });
  });

  it("authenticated admin is allowed through", () => {
    const result = resolveAdminAuthGuard(
      { fullPath: "/settings", meta: settingsMeta, query: {} },
      true,
      true,
    );
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. getVisibleNavGroups — admin vs non-admin
// ---------------------------------------------------------------------------

describe("/settings — nav visibility by role", () => {
  it("admin sees system group with settings item", () => {
    const groups = getVisibleNavGroups(true);
    const systemGroup = groups.find((g) => g.key === "system");
    expect(systemGroup).toBeDefined();
    expect(systemGroup!.items.some((i) => i.key === "settings")).toBe(true);
  });

  it("non-admin does not see settings item", () => {
    const groups = getVisibleNavGroups(false);
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.find((i) => i.key === "settings")).toBeUndefined();
  });

  it("non-admin does not see system group at all", () => {
    const groups = getVisibleNavGroups(false);
    expect(groups.find((g) => g.key === "system")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 6. SideNav component — settings visibility
// ---------------------------------------------------------------------------

const routerLinkStub = {
  props: ["to"],
  template: '<a class="router-link" :href="String(to)"><slot /></a>',
};

const stubs = {
  RouterLink: routerLinkStub,
  NavIcon: { props: ["name"], template: "<span class='icon' />" },
};

async function mountSideNav(isAdmin: boolean) {
  if (isAdmin) {
    adminSessionController.login(
      { email: "admin@test.com", password: "pw" },
      null,
    );
  }

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: { template: "<div />" },
        meta: { navKey: "dashboard" },
      },
      {
        path: "/settings",
        component: { template: "<div />" },
        meta: { navKey: "settings", requiresAdmin: true },
      },
    ],
  });
  await router.push("/");
  await router.isReady();

  return mount(SideNav, {
    global: {
      plugins: [i18n, router],
      stubs,
    },
  });
}

describe("SideNav — /settings visibility", () => {
  beforeEach(() => {
    adminSessionController.reset();
    setAppLocale("zh-CN");
  });

  afterEach(() => {
    adminSessionController.reset();
  });

  it("admin user sees 系统设置 nav item", async () => {
    const w = await mountSideNav(true);
    const itemTexts = w.findAll(".nav-item").map((el) => el.text());
    expect(itemTexts).toContain("系统设置");
  });

  it("non-admin user does not see 系统设置 nav item", async () => {
    const w = await mountSideNav(false);
    const itemTexts = w.findAll(".nav-item").map((el) => el.text());
    expect(itemTexts).not.toContain("系统设置");
  });

  it("non-admin user does not see system group heading", async () => {
    const w = await mountSideNav(false);
    const titles = w.findAll(".nav-group-title").map((el) => el.text());
    expect(titles).not.toContain("系统");
  });

  it("admin user sees system group heading", async () => {
    const w = await mountSideNav(true);
    const titles = w.findAll(".nav-group-title").map((el) => el.text());
    expect(titles).toContain("系统");
  });

  it("settings link points to /settings", async () => {
    const w = await mountSideNav(true);
    const settingsLink = w
      .findAll("a.router-link.nav-item")
      .find((el) => el.text().includes("系统设置"));
    expect(settingsLink).toBeDefined();
    expect(settingsLink!.attributes("href")).toBe("/settings");
  });
});
