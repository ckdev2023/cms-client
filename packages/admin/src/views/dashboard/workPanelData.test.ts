import { describe, expect, it } from "vitest";
import { panels } from "./workPanelData";

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
