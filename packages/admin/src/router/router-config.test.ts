import { describe, expect, it } from "vitest";
import { router } from "./index";

describe("router config", () => {
  it("registers /settings with requiresAdmin meta", () => {
    const route = router.getRoutes().find((r) => r.path === "/settings");
    expect(route).toBeDefined();
    expect(route!.meta.requiresAuth).toBe(true);
    expect(route!.meta.requiresAdmin).toBe(true);
    expect(route!.meta.navKey).toBe("settings");
    expect(route!.meta.layout).toBe("shell");
  });

  it("registers /settings with name settings", () => {
    const route = router.getRoutes().find((r) => r.path === "/settings");
    expect(route!.name).toBe("settings");
  });

  it("registers /settings in the system group", () => {
    const route = router.getRoutes().find((r) => r.path === "/settings");
    expect(route!.meta.groupKey).toBe("system");
  });

  it("does not mark non-admin routes with requiresAdmin", () => {
    const nonAdminPaths = [
      "/",
      "/customers",
      "/cases",
      "/billing",
      "/documents",
    ];
    for (const path of nonAdminPaths) {
      const route = router.getRoutes().find((r) => r.path === path);
      expect(route?.meta.requiresAdmin).toBeFalsy();
    }
  });
});
