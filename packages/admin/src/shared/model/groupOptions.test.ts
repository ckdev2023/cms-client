import { describe, it, expect } from "vitest";
import {
  ALL_GROUP_ENTRIES,
  getActiveGroupOptions,
  isGroupDisabled,
  isGroupDisabledByLabel,
  resolveGroupLabel,
} from "./groupOptions";

describe("groupOptions re-exports", () => {
  it("ALL_GROUP_ENTRIES is available", () => {
    expect(ALL_GROUP_ENTRIES.length).toBeGreaterThanOrEqual(3);
  });

  it("getActiveGroupOptions filters disabled groups", () => {
    const active = getActiveGroupOptions();
    expect(active).toHaveLength(2);
    expect(active.every((o) => o.value !== "osaka")).toBe(true);
  });

  it("isGroupDisabled matches by value or label", () => {
    expect(isGroupDisabled("osaka")).toBe(true);
    expect(isGroupDisabled("tokyo-1")).toBe(false);
  });

  it("isGroupDisabledByLabel matches by label only", () => {
    expect(isGroupDisabledByLabel("大阪組")).toBe(true);
    expect(isGroupDisabledByLabel("東京一組")).toBe(false);
  });

  it("resolveGroupLabel appends suffix for disabled groups", () => {
    expect(resolveGroupLabel("osaka")).toBe("大阪組（已停用）");
    expect(resolveGroupLabel("tokyo-1")).toBe("東京一組");
  });

  it("resolveGroupLabel accepts custom suffix", () => {
    expect(resolveGroupLabel("osaka", " (Disabled)")).toBe("大阪組 (Disabled)");
  });
});
