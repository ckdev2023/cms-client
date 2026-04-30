import { afterEach, describe, it, expect } from "vitest";
import {
  clearGroupAliases,
  getActiveGroupOptions,
  getAllGroupOptions,
  isGroupDisabled,
  isGroupDisabledByLabel,
  registerGroupAliases,
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

  it("hides raw UUID when no alias is registered (BUG-136 short-term)", () => {
    expect(resolveGroupLabel("ef21fdd2-1ffc-4a27-8b47-a640d6bd021c")).toBe("—");
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

describe("registerGroupAliases (BUG-136)", () => {
  const FAKE_UUID = "ef21fdd2-1ffc-4a27-8b47-a640d6bd021c";
  const OTHER_UUID = "11111111-2222-3333-4444-555555555555";

  afterEach(() => {
    clearGroupAliases();
  });

  it("translates UUID via alias to localized catalog label", () => {
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "zh-CN")).toBe(
      "东京一组",
    );
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "ja-JP")).toBe(
      "東京一組",
    );
    expect(resolveGroupLabel(FAKE_UUID, " (Disabled)", "en-US")).toBe(
      "Tokyo Team 1",
    );
  });

  it("appends disabled suffix when alias points to disabled catalog entry", () => {
    registerGroupAliases([{ id: OTHER_UUID, name: "osaka" }]);
    expect(resolveGroupLabel(OTHER_UUID, "（已停用）", "zh-CN")).toBe(
      "大阪组（已停用）",
    );
  });

  it("falls back to alias name when name is outside catalog", () => {
    registerGroupAliases([{ id: FAKE_UUID, name: "MyCustomGroup" }]);
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "zh-CN")).toBe(
      "MyCustomGroup",
    );
  });

  it("makes resolveGroupValue return canonical id via alias", () => {
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
    expect(resolveGroupValue(FAKE_UUID)).toBe("tokyo-1");
  });

  it("makes isGroupDisabled honor alias resolution", () => {
    registerGroupAliases([{ id: OTHER_UUID, name: "osaka" }]);
    expect(isGroupDisabled(OTHER_UUID)).toBe(true);
    expect(isGroupDisabledByLabel(OTHER_UUID)).toBe(true);
  });

  it("never returns the raw UUID input from resolveGroupLabel", () => {
    expect(resolveGroupLabel(FAKE_UUID)).not.toBe(FAKE_UUID);
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "zh-CN")).not.toBe(
      FAKE_UUID,
    );
  });

  it("ignores empty id or name entries", () => {
    registerGroupAliases([
      { id: "", name: "tokyo-1" },
      { id: FAKE_UUID, name: "" },
    ]);
    expect(resolveGroupLabel(FAKE_UUID)).toBe("—");
  });

  it("clearGroupAliases resets all registered aliases", () => {
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "zh-CN")).toBe(
      "东京一组",
    );
    clearGroupAliases();
    expect(resolveGroupLabel(FAKE_UUID)).toBe("—");
  });

  it("later registration overwrites previous alias for same id", () => {
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-1" }]);
    registerGroupAliases([{ id: FAKE_UUID, name: "tokyo-2" }]);
    expect(resolveGroupLabel(FAKE_UUID, "（已停用）", "zh-CN")).toBe(
      "东京二组",
    );
  });
});
