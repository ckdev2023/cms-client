import { describe, it, expect } from "vitest";
import {
  getActiveGroupOptions,
  getAllGroupOptions,
  isGroupDisabled,
  isGroupDisabledByLabel,
  resolveGroupLabel,
  resolveGroupValue,
} from "./useGroupOptions";

describe("getActiveGroupOptions", () => {
  it("returns only active groups", () => {
    const options = getActiveGroupOptions();
    expect(options.every((o) => o.value !== "osaka")).toBe(true);
    expect(options).toHaveLength(2);
    expect(options.map((o) => o.value)).toEqual(["tokyo-1", "tokyo-2"]);
  });

  it("returns plain SelectOption without status field", () => {
    const options = getActiveGroupOptions();
    for (const o of options) {
      expect(o).toHaveProperty("value");
      expect(o).toHaveProperty("label");
      expect(o).not.toHaveProperty("status");
    }
  });

  it("returns zh-CN labels when locale is zh-CN", () => {
    expect(getActiveGroupOptions("zh-CN")).toEqual([
      { value: "tokyo-1", label: "东京一组" },
      { value: "tokyo-2", label: "东京二组" },
    ]);
  });
});

describe("getAllGroupOptions", () => {
  it("returns all groups including disabled", () => {
    const all = getAllGroupOptions();
    expect(all.length).toBeGreaterThanOrEqual(3);
    expect(all.some((g) => g.status === "disabled")).toBe(true);
  });
});

describe("isGroupDisabled", () => {
  it("returns true for disabled group by ID", () => {
    expect(isGroupDisabled("osaka")).toBe(true);
  });

  it("returns true for disabled group by label", () => {
    expect(isGroupDisabled("大阪組")).toBe(true);
  });

  it("returns false for active group", () => {
    expect(isGroupDisabled("tokyo-1")).toBe(false);
    expect(isGroupDisabled("東京一組")).toBe(false);
  });

  it("returns false for unknown group", () => {
    expect(isGroupDisabled("nonexistent")).toBe(false);
  });
});

describe("isGroupDisabledByLabel", () => {
  it("returns true for disabled group by label", () => {
    expect(isGroupDisabledByLabel("大阪組")).toBe(true);
  });

  it("returns false for active group by label", () => {
    expect(isGroupDisabledByLabel("東京一組")).toBe(false);
  });

  it("returns false for unknown label", () => {
    expect(isGroupDisabledByLabel("nonexistent")).toBe(false);
  });
});

describe("resolveGroupLabel", () => {
  it("returns label for active group by ID", () => {
    expect(resolveGroupLabel("tokyo-1")).toBe("東京一組");
  });

  it("returns label unchanged for active group by label", () => {
    expect(resolveGroupLabel("東京二組")).toBe("東京二組");
  });

  it("appends disabled suffix for disabled group by ID", () => {
    expect(resolveGroupLabel("osaka")).toBe("大阪組（已停用）");
  });

  it("appends disabled suffix for disabled group by label", () => {
    expect(resolveGroupLabel("大阪組")).toBe("大阪組（已停用）");
  });

  it("returns input unchanged for unknown group", () => {
    expect(resolveGroupLabel("unknown")).toBe("unknown");
  });

  it("accepts custom disabled suffix for i18n", () => {
    expect(resolveGroupLabel("osaka", " (Disabled)")).toBe("大阪組 (Disabled)");
    expect(resolveGroupLabel("osaka", "（停止）")).toBe("大阪組（停止）");
  });

  it("does not append suffix to active groups regardless of custom suffix", () => {
    expect(resolveGroupLabel("tokyo-1", " (Disabled)")).toBe("東京一組");
  });

  it("localizes known labels across locales", () => {
    expect(resolveGroupLabel("東京一組", "（已停用）", "zh-CN")).toBe(
      "东京一组",
    );
    expect(resolveGroupLabel("东京二组", " (Disabled)", "en-US")).toBe(
      "Tokyo Team 2",
    );
  });
});

describe("resolveGroupValue", () => {
  it("normalizes localized labels back to stable ids", () => {
    expect(resolveGroupValue("東京一組")).toBe("tokyo-1");
    expect(resolveGroupValue("东京一组")).toBe("tokyo-1");
    expect(resolveGroupValue("Tokyo Team 1")).toBe("tokyo-1");
    expect(resolveGroupValue("大阪組（已停用）")).toBe("osaka");
  });

  it("returns null for unknown labels", () => {
    expect(resolveGroupValue("unknown-group")).toBeNull();
  });
});
