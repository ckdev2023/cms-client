import { describe, it, expect } from "vitest";
import {
  parseBlueprintToItems,
  itemsToBlueprint,
  itemsToBlueprintJson,
  validateBlueprintItems,
  createEmptyItem,
  tryParseJsonToItems,
  type BlueprintWizardItem,
} from "./blueprintWizardModel";

// ── helpers ──

function makeItem(
  overrides: Partial<BlueprintWizardItem> = {},
): BlueprintWizardItem {
  return {
    checklistItemCode: "item-1",
    name: "Test item",
    category: "standard",
    requiredFlag: false,
    ownerSide: "applicant",
    sortOrder: 1,
    description: "",
    providedByRole: "",
    ...overrides,
  };
}

// ── parseBlueprintToItems ──

describe("parseBlueprintToItems", () => {
  it("parses array format", () => {
    const input = [
      {
        checklistItemCode: "passport",
        name: "Passport",
        category: "personal",
        requiredFlag: true,
        ownerSide: "applicant",
        sortOrder: 1,
      },
    ];
    const items = parseBlueprintToItems(input);
    expect(items).toHaveLength(1);
    expect(items[0].checklistItemCode).toBe("passport");
    expect(items[0].name).toBe("Passport");
    expect(items[0].category).toBe("personal");
    expect(items[0].requiredFlag).toBe(true);
  });

  it("parses { items: [...] } format", () => {
    const input = {
      items: [
        {
          checklistItemCode: "passport",
          name: "Passport",
          category: "personal",
          requiredFlag: true,
          ownerSide: "applicant",
          sortOrder: 1,
        },
      ],
    };
    const items = parseBlueprintToItems(input);
    expect(items).toHaveLength(1);
    expect(items[0].checklistItemCode).toBe("passport");
  });

  it("returns empty array for null/undefined", () => {
    expect(parseBlueprintToItems(null)).toEqual([]);
    expect(parseBlueprintToItems(undefined)).toEqual([]);
  });

  it("returns empty array for non-object", () => {
    expect(parseBlueprintToItems("string")).toEqual([]);
    expect(parseBlueprintToItems(42)).toEqual([]);
  });

  it("falls back to 'standard' for unknown category", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "x", name: "X", category: "unknown" },
    ]);
    expect(items[0].category).toBe("standard");
  });

  it("falls back to 'applicant' for unknown ownerSide", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "x", name: "X", ownerSide: "unknown" },
    ]);
    expect(items[0].ownerSide).toBe("applicant");
  });

  it("fills providedByRole as empty string when absent", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "x", name: "X" },
    ]);
    expect(items[0].providedByRole).toBe("");
  });

  it("accepts 'code' as alias for checklistItemCode", () => {
    const items = parseBlueprintToItems([{ code: "alt-code", name: "Alt" }]);
    expect(items[0].checklistItemCode).toBe("alt-code");
  });

  it("accepts 'itemCode' as alias for checklistItemCode", () => {
    const items = parseBlueprintToItems([
      { itemCode: "item-code", name: "Item" },
    ]);
    expect(items[0].checklistItemCode).toBe("item-code");
  });

  it("skips entries with no code and no name", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "ok", name: "OK" },
      {},
      { random: true },
    ]);
    expect(items).toHaveLength(1);
  });

  it("assigns fallback sortOrder when missing", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "a", name: "A" },
      { checklistItemCode: "b", name: "B" },
    ]);
    expect(items[0].sortOrder).toBe(1);
    expect(items[1].sortOrder).toBe(2);
  });

  it("preserves description", () => {
    const items = parseBlueprintToItems([
      { checklistItemCode: "x", name: "X", description: "some desc" },
    ]);
    expect(items[0].description).toBe("some desc");
  });

  it("parses BMV-style seed data", () => {
    const seed = [
      {
        checklistItemCode: "bmv-questionnaire",
        name: "经营管理签信息采集表",
        category: "questionnaire",
        requiredFlag: true,
        ownerSide: "customer",
        sortOrder: 1,
        description: "《2025M_C经管签信息表》— 问卷回收后方可确认报价",
      },
      {
        checklistItemCode: "bmv-passport-copy",
        name: "护照复印件",
        category: "personal",
        requiredFlag: true,
        ownerSide: "applicant",
        sortOrder: 2,
      },
    ];
    const items = parseBlueprintToItems(seed);
    expect(items).toHaveLength(2);
    expect(items[0].checklistItemCode).toBe("bmv-questionnaire");
    expect(items[0].category).toBe("questionnaire");
    expect(items[0].description).toBe(
      "《2025M_C经管签信息表》— 问卷回收后方可确认报价",
    );
    expect(items[1].description).toBe("");
  });
});

// ── itemsToBlueprint ──

describe("itemsToBlueprint", () => {
  it("returns null for empty array", () => {
    expect(itemsToBlueprint([])).toBeNull();
  });

  it("serializes items with all fields", () => {
    const items = [
      makeItem({
        description: "desc",
        providedByRole: "office",
      }),
    ];
    const bp = itemsToBlueprint(items)!;
    expect(bp).toHaveLength(1);
    expect(bp[0].checklistItemCode).toBe("item-1");
    expect(bp[0].description).toBe("desc");
    expect(bp[0].providedByRole).toBe("office");
  });

  it("omits description and providedByRole when empty", () => {
    const items = [makeItem()];
    const bp = itemsToBlueprint(items)!;
    expect(bp[0]).not.toHaveProperty("description");
    expect(bp[0]).not.toHaveProperty("providedByRole");
  });
});

// ── itemsToBlueprintJson ──

describe("itemsToBlueprintJson", () => {
  it("returns empty string for empty items", () => {
    expect(itemsToBlueprintJson([])).toBe("");
  });

  it("returns valid JSON for non-empty items", () => {
    const json = itemsToBlueprintJson([makeItem()]);
    expect(() => JSON.parse(json)).not.toThrow();
  });
});

// ── roundtrip ──

describe("roundtrip", () => {
  it("parse → serialize → parse yields equivalent items", () => {
    const original = [
      {
        checklistItemCode: "passport",
        name: "Passport",
        category: "personal",
        requiredFlag: true,
        ownerSide: "applicant",
        sortOrder: 1,
        description: "main doc",
        providedByRole: "applicant",
      },
      {
        checklistItemCode: "tax",
        name: "Tax cert",
        category: "company",
        requiredFlag: false,
        ownerSide: "customer",
        sortOrder: 2,
      },
    ];
    const items = parseBlueprintToItems(original);
    const serialized = itemsToBlueprint(items)!;
    const reparsed = parseBlueprintToItems(serialized);
    expect(reparsed).toHaveLength(2);
    expect(reparsed[0].checklistItemCode).toBe("passport");
    expect(reparsed[0].description).toBe("main doc");
    expect(reparsed[0].providedByRole).toBe("applicant");
    expect(reparsed[1].checklistItemCode).toBe("tax");
    expect(reparsed[1].description).toBe("");
    expect(reparsed[1].providedByRole).toBe("");
  });

  it("parse → JSON → parse yields equivalent items", () => {
    const original = [
      {
        checklistItemCode: "a",
        name: "A",
        category: "standard",
        requiredFlag: true,
        ownerSide: "office",
        sortOrder: 1,
      },
    ];
    const items = parseBlueprintToItems(original);
    const json = itemsToBlueprintJson(items);
    const result = tryParseJsonToItems(json);
    expect("items" in result && result.items).toHaveLength(1);
    if ("items" in result) {
      expect(result.items[0].checklistItemCode).toBe("a");
    }
  });
});

// ── validateBlueprintItems ──

describe("validateBlueprintItems", () => {
  it("returns no errors for valid items", () => {
    const errors = validateBlueprintItems([
      makeItem({ checklistItemCode: "a" }),
      makeItem({ checklistItemCode: "b", sortOrder: 2 }),
    ]);
    expect(errors).toHaveLength(0);
  });

  it("reports empty checklistItemCode", () => {
    const errors = validateBlueprintItems([
      makeItem({ checklistItemCode: "" }),
    ]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("checklistItemCode");
    expect(errors[0].message).toBe("required");
  });

  it("reports empty name", () => {
    const errors = validateBlueprintItems([makeItem({ name: "" })]);
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe("name");
    expect(errors[0].message).toBe("required");
  });

  it("reports duplicate checklistItemCode", () => {
    const errors = validateBlueprintItems([
      makeItem({ checklistItemCode: "dup" }),
      makeItem({ checklistItemCode: "dup", sortOrder: 2 }),
    ]);
    const dupErrors = errors.filter((e) => e.message === "duplicate");
    expect(dupErrors).toHaveLength(1);
    expect(dupErrors[0].index).toBe(1);
  });

  it("reports invalid sortOrder", () => {
    const errors = validateBlueprintItems([makeItem({ sortOrder: NaN })]);
    expect(errors.some((e) => e.field === "sortOrder")).toBe(true);
  });
});

// ── createEmptyItem ──

describe("createEmptyItem", () => {
  it("creates item with given sortOrder", () => {
    const item = createEmptyItem(5);
    expect(item.sortOrder).toBe(5);
    expect(item.checklistItemCode).toBe("");
    expect(item.name).toBe("");
    expect(item.category).toBe("standard");
    expect(item.requiredFlag).toBe(false);
    expect(item.ownerSide).toBe("applicant");
    expect(item.description).toBe("");
    expect(item.providedByRole).toBe("");
  });
});

// ── tryParseJsonToItems ──

describe("tryParseJsonToItems", () => {
  it("returns empty items for empty string", () => {
    const result = tryParseJsonToItems("");
    expect("items" in result && result.items).toEqual([]);
  });

  it("returns error for invalid JSON", () => {
    const result = tryParseJsonToItems("{bad");
    expect("error" in result).toBe(true);
  });

  it("parses valid JSON array", () => {
    const result = tryParseJsonToItems(
      '[{"checklistItemCode":"x","name":"X"}]',
    );
    expect("items" in result && result.items).toHaveLength(1);
  });

  it("parses valid JSON object with items", () => {
    const result = tryParseJsonToItems(
      '{"items":[{"checklistItemCode":"x","name":"X"}]}',
    );
    expect("items" in result && result.items).toHaveLength(1);
  });
});
