import { describe, expect, it } from "vitest";
import { panels, workListData, type PanelListKey } from "./workPanelData";

describe("panels", () => {
  it("defines exactly four panels", () => {
    expect(panels).toHaveLength(4);
  });

  it("uses unique listKeys", () => {
    const keys = panels.map((p) => p.listKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("marks only the first panel as featured", () => {
    expect(panels[0]?.featured).toBe(true);
    expect(panels.filter((p) => p.featured)).toHaveLength(1);
  });

  it("provides an id for every panel", () => {
    for (const panel of panels) {
      expect(panel.id).toBeTruthy();
    }
  });
});

describe("workListData", () => {
  const scopes = ["mine", "group", "all"] as const;

  it("provides data for all three scopes", () => {
    for (const scope of scopes) {
      expect(workListData[scope]).toBeDefined();
    }
  });

  it("provides entries matching every panel listKey for the 'mine' scope", () => {
    for (const panel of panels) {
      const items = workListData.mine[panel.listKey];
      expect(Array.isArray(items)).toBe(true);
      expect(items!.length).toBeGreaterThan(0);
    }
  });

  it("includes daysLeft on deadline items", () => {
    for (const scope of scopes) {
      const deadlines = workListData[scope].deadlines ?? [];
      for (const item of deadlines) {
        expect(typeof item.daysLeft).toBe("number");
      }
    }
  });

  it("every work item has required translation metadata", () => {
    for (const scope of scopes) {
      const scopeData = workListData[scope];
      for (const key of Object.keys(scopeData) as PanelListKey[]) {
        for (const item of scopeData[key]!) {
          expect(item.id).toBeTruthy();
          expect(Array.isArray(item.metaKeys)).toBe(true);
          expect(item.metaKeys.length).toBeGreaterThan(0);
          expect(item.status).toBeTruthy();
        }
      }
    }
  });
});
