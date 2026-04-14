import { describe, it, expect } from "vitest";
import {
  navGroups,
  brandTitle,
  brandChip,
  isExternalItem,
  allNavItems,
  findNavItem,
  getVisibleNavGroups,
  type NavRouterItem,
  type NavExternalItem,
} from "./nav-config";
import enUS from "../i18n/messages/en-US";
import zhCN from "../i18n/messages/zh-CN";
import jaJP from "../i18n/messages/ja-JP";

describe("nav-config", () => {
  it("exports brand strings", () => {
    expect(brandTitle).toBe("Gyosei OS");
    expect(brandChip).toBe("事務所管理");
  });

  it("has unique group keys", () => {
    const keys = navGroups.map((g) => g.key);
    expect(keys).toEqual([...new Set(keys)]);
  });

  it("has unique item keys across all groups", () => {
    const keys = allNavItems().map((i) => i.key);
    expect(keys).toEqual([...new Set(keys)]);
  });

  it("every router item has a `to` value", () => {
    for (const item of allNavItems()) {
      if (!isExternalItem(item)) {
        expect((item as NavRouterItem).to).toBeTruthy();
      }
    }
  });

  it("every external item has `href` and `external: true`", () => {
    for (const item of allNavItems()) {
      if (isExternalItem(item)) {
        expect((item as NavExternalItem).href).toBeTruthy();
        expect(item.external).toBe(true);
      }
    }
  });

  it("does not include removed navigation items", () => {
    expect(findNavItem("forms")).toBeUndefined();
    expect(findNavItem("reports")).toBeUndefined();
    expect(findNavItem("portal")).toBeUndefined();
  });

  it("isExternalItem returns false for router items", () => {
    const dashboard = findNavItem("dashboard") as NavRouterItem;
    expect(isExternalItem(dashboard)).toBe(false);
  });

  it("findNavItem returns undefined for unknown key", () => {
    expect(findNavItem("nonexistent")).toBeUndefined();
  });

  it("covers all expected navigation sections", () => {
    const groupTitles = navGroups.map((g) => g.title);
    expect(groupTitles).toEqual(["工作台", "业务", "内容", "财务", "系统"]);
  });

  it("getVisibleNavGroups returns all groups for admin users", () => {
    const groups = getVisibleNavGroups(true);
    expect(groups).toEqual(navGroups);
  });

  it("getVisibleNavGroups hides adminOnly items for non-admin users", () => {
    const groups = getVisibleNavGroups(false);
    const allItems = groups.flatMap((g) => g.items);
    expect(allItems.find((i) => i.key === "settings")).toBeUndefined();
  });

  it("getVisibleNavGroups drops empty groups for non-admin users", () => {
    const groups = getVisibleNavGroups(false);
    const groupKeys = groups.map((g) => g.key);
    expect(groupKeys).not.toContain("system");
  });

  it("settings item has correct configuration", () => {
    const settings = findNavItem("settings") as NavRouterItem;
    expect(settings).toBeDefined();
    expect(settings.to).toBe("/settings");
    expect(settings.icon).toBe("settings");
    expect(settings.adminOnly).toBe(true);
  });

  it("every nav item key has a matching i18n entry in all locales", () => {
    const localeItems = [
      enUS.shell.nav.items,
      zhCN.shell.nav.items,
      jaJP.shell.nav.items,
    ];
    for (const item of allNavItems()) {
      for (const locale of localeItems) {
        expect(locale).toHaveProperty(item.key);
      }
    }
  });

  it("settings label is consistent across locales", () => {
    expect(zhCN.shell.nav.items.settings).toBe("系统设置");
    expect(enUS.shell.nav.items.settings).toBe("System Settings");
    expect(jaJP.shell.nav.items.settings).toBe("システム設定");
  });

  it("every nav group key has a matching i18n group entry in all locales", () => {
    const localeGroups = [
      enUS.shell.nav.groups,
      zhCN.shell.nav.groups,
      jaJP.shell.nav.groups,
    ];
    for (const group of navGroups) {
      for (const locale of localeGroups) {
        expect(locale).toHaveProperty(group.key);
      }
    }
  });
});
