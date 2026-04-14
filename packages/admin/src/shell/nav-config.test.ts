import { describe, it, expect } from "vitest";
import {
  navGroups,
  brandTitle,
  brandChip,
  isExternalItem,
  allNavItems,
  findNavItem,
  type NavRouterItem,
  type NavExternalItem,
} from "./nav-config";

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
});
