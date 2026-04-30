import { describe, expect, it } from "vitest";
import { router } from "./index";
import { getVisibleNavGroups } from "../shell/nav-config";

describe("router /tasks — BUG-142 regression", () => {
  it("registers /tasks with shell meta and tasks navKey", () => {
    const route = router.getRoutes().find((r) => r.path === "/tasks");
    expect(route, "missing /tasks route").toBeDefined();
    expect(route!.name).toBe("tasks");
    expect(route!.meta.requiresAuth).toBe(true);
    expect(route!.meta.layout).toBe("shell");
    expect(route!.meta.navKey).toBe("tasks");
    expect(route!.meta.groupKey).toBe("business");
    expect(route!.meta.titleKey).toBe("shell.nav.items.tasks");
  });

  it("/tasks does NOT load SectionPlaceholderView (BUG-086 R4 regression)", async () => {
    const route = router.getRoutes().find((r) => r.path === "/tasks");
    expect(route, "missing /tasks route").toBeDefined();

    const components = route!.components ?? {};
    const loader = components.default;
    expect(typeof loader).toBe("function");

    const loaded = await (loader as () => Promise<unknown>)();
    const moduleRecord = loaded as { default?: { __file?: string } };
    const file = moduleRecord.default?.__file ?? "";

    expect(
      file,
      `/tasks must point to TaskListView.vue, got ${file}`,
    ).toContain("views/tasks/TaskListView.vue");
    expect(file).not.toContain("SectionPlaceholderView");
  });
});

describe("sidebar nav /tasks entry — BUG-157 regression", () => {
  it("business group exposes a tasks NavRouterItem to /tasks (admin)", () => {
    const groups = getVisibleNavGroups(true);
    const business = groups.find((g) => g.key === "business");
    expect(business, "missing business nav group").toBeDefined();

    const tasksItem = business!.items.find((it) => it.key === "tasks");
    expect(tasksItem, "missing tasks nav item in business group").toBeDefined();
    expect(tasksItem!.to).toBe("/tasks");
    expect(tasksItem!.external).not.toBe(true);
  });

  it("business group exposes a tasks NavRouterItem to /tasks (non-admin staff)", () => {
    const groups = getVisibleNavGroups(false);
    const business = groups.find((g) => g.key === "business");
    expect(business, "missing business nav group").toBeDefined();

    const tasksItem = business!.items.find((it) => it.key === "tasks");
    expect(tasksItem, "missing tasks nav item in business group").toBeDefined();
    expect(tasksItem!.to).toBe("/tasks");
  });

  it("orders tasks after cases in the business group (R4 nav order)", () => {
    const groups = getVisibleNavGroups(true);
    const business = groups.find((g) => g.key === "business");
    expect(business, "missing business nav group").toBeDefined();

    const keys = business!.items.map((it) => it.key);
    const casesIdx = keys.indexOf("cases");
    const tasksIdx = keys.indexOf("tasks");
    expect(casesIdx, "missing cases in business group").toBeGreaterThanOrEqual(
      0,
    );
    expect(tasksIdx, "missing tasks in business group").toBeGreaterThanOrEqual(
      0,
    );
    expect(tasksIdx).toBeGreaterThan(casesIdx);
  });
});
