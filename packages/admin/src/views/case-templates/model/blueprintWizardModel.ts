/**
 * 资料蓝图「向导 ↔ JSON」双向转换、校验与工厂。
 *
 * 字段集合对齐 server `RequirementBlueprintItem`
 * （packages/server/src/modules/core/cases/cases.types-template-blueprints.ts）。
 * countBlueprintItems 在 server 端同时接受 Array 与 { items: [...] } 两种格式，
 * 本模块在序列化时统一输出 **数组**，与种子/模板创建路径一致。
 */

// ── 枚举常量（与 server REQUIREMENT_CATEGORIES / PROVIDED_BY_ROLES 对齐） ──

/** 资料清单类别枚举值。 */
export const REQUIREMENT_CATEGORIES = [
  "standard",
  "questionnaire",
  "company",
  "personal",
] as const;

/** 资料清单类别类型。 */
export type RequirementCategory = (typeof REQUIREMENT_CATEGORIES)[number];

/** 负责方枚举值。 */
export const OWNER_SIDES = ["applicant", "customer", "office"] as const;

/** 负责方类型。 */
export type OwnerSide = (typeof OWNER_SIDES)[number];

/** 提供方角色枚举值。 */
export const PROVIDED_BY_ROLES = [
  "applicant",
  "employer",
  "office",
  "supporter",
] as const;

/** 提供方角色类型。 */
export type ProvidedByRole = (typeof PROVIDED_BY_ROLES)[number];

// ── UI 条目类型 ──

/** 蓝图向导条目 — 用于 UI 双向绑定。 */
export type BlueprintWizardItem = {
  /** 清单项唯一代码。 */
  checklistItemCode: string;
  /** 显示名称。 */
  name: string;
  /** 资料类别。 */
  category: RequirementCategory;
  /** 是否必填。 */
  requiredFlag: boolean;
  /** 负责方。 */
  ownerSide: OwnerSide;
  /** 排序权重。 */
  sortOrder: number;
  /** 说明文字。 */
  description: string;
  /** 提供方角色（空字符串表示未指定）。 */
  providedByRole: ProvidedByRole | "";
};

// ── Parse（JSON → 列表） ──

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function extractArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRecord(raw) && Array.isArray(raw.items)) return raw.items;
  return [];
}

function toCategory(v: unknown): RequirementCategory {
  if (
    typeof v === "string" &&
    (REQUIREMENT_CATEGORIES as readonly string[]).includes(v)
  )
    return v as RequirementCategory;
  return "standard";
}

function toOwnerSide(v: unknown): OwnerSide {
  if (typeof v === "string" && (OWNER_SIDES as readonly string[]).includes(v))
    return v as OwnerSide;
  return "applicant";
}

function toProvidedByRole(v: unknown): ProvidedByRole | "" {
  if (
    typeof v === "string" &&
    (PROVIDED_BY_ROLES as readonly string[]).includes(v)
  )
    return v as ProvidedByRole;
  return "";
}

function adaptOneItem(
  raw: unknown,
  fallbackSort: number,
): BlueprintWizardItem | null {
  if (!isRecord(raw)) return null;
  const code =
    typeof raw.checklistItemCode === "string"
      ? raw.checklistItemCode
      : typeof raw.code === "string"
        ? raw.code
        : typeof raw.itemCode === "string"
          ? raw.itemCode
          : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!code && !name) return null;
  return {
    checklistItemCode: code,
    name,
    category: toCategory(raw.category),
    requiredFlag:
      typeof raw.requiredFlag === "boolean" ? raw.requiredFlag : false,
    ownerSide: toOwnerSide(raw.ownerSide),
    sortOrder: typeof raw.sortOrder === "number" ? raw.sortOrder : fallbackSort,
    description: typeof raw.description === "string" ? raw.description : "",
    providedByRole: toProvidedByRole(raw.providedByRole),
  };
}

/**
 * 将蓝图 JSON（数组或 `{ items: [...] }`）解析为向导条目列表。
 *
 * @param raw - 原始蓝图数据
 * @returns 向导条目数组
 */
export function parseBlueprintToItems(raw: unknown): BlueprintWizardItem[] {
  const arr = extractArray(raw);
  const result: BlueprintWizardItem[] = [];
  for (let i = 0; i < arr.length; i++) {
    const item = adaptOneItem(arr[i], i + 1);
    if (item) result.push(item);
  }
  return result;
}

// ── Serialize（列表 → JSON） ──

/** 序列化后的蓝图条目 — 与 server RequirementBlueprintItem 形状对齐。 */
export type SerializedBlueprintItem = {
  /** 清单项唯一代码。 */
  checklistItemCode: string;
  /** 显示名称。 */
  name: string;
  /** 资料类别。 */
  category: RequirementCategory;
  /** 是否必填。 */
  requiredFlag: boolean;
  /** 负责方。 */
  ownerSide: OwnerSide;
  /** 排序权重。 */
  sortOrder: number;
  /** 说明文字。 */
  description?: string;
  /** 提供方角色。 */
  providedByRole?: ProvidedByRole;
};

function serializeOne(item: BlueprintWizardItem): SerializedBlueprintItem {
  const out: SerializedBlueprintItem = {
    checklistItemCode: item.checklistItemCode,
    name: item.name,
    category: item.category,
    requiredFlag: item.requiredFlag,
    ownerSide: item.ownerSide,
    sortOrder: item.sortOrder,
  };
  if (item.description) out.description = item.description;
  if (item.providedByRole) out.providedByRole = item.providedByRole;
  return out;
}

/**
 * 将向导条目列表序列化为蓝图数组（空列表返回 null）。
 *
 * @param items - 向导条目列表
 * @returns 蓝图数组或 null
 */
export function itemsToBlueprint(
  items: BlueprintWizardItem[],
): SerializedBlueprintItem[] | null {
  if (items.length === 0) return null;
  return items.map(serializeOne);
}

/**
 * 将向导条目列表序列化为格式化 JSON 字符串。
 *
 * @param items - 向导条目列表
 * @returns JSON 字符串（空列表返回空字符串）
 */
export function itemsToBlueprintJson(items: BlueprintWizardItem[]): string {
  const bp = itemsToBlueprint(items);
  return bp ? JSON.stringify(bp, null, 2) : "";
}

// ── Validate ──

/** 单条校验错误。 */
export type ItemValidationError = {
  /** 条目索引。 */
  index: number;
  /** 出错字段名。 */
  field: string;
  /** 错误类型。 */
  message: string;
};

function validateOne(
  item: BlueprintWizardItem,
  index: number,
  codesSoFar: Set<string>,
): ItemValidationError[] {
  const errors: ItemValidationError[] = [];

  if (!item.checklistItemCode.trim()) {
    errors.push({ index, field: "checklistItemCode", message: "required" });
  } else if (codesSoFar.has(item.checklistItemCode)) {
    errors.push({ index, field: "checklistItemCode", message: "duplicate" });
  } else {
    codesSoFar.add(item.checklistItemCode);
  }

  if (!item.name.trim()) {
    errors.push({ index, field: "name", message: "required" });
  }

  if (!(REQUIREMENT_CATEGORIES as readonly string[]).includes(item.category)) {
    errors.push({ index, field: "category", message: "invalid" });
  }

  if (!(OWNER_SIDES as readonly string[]).includes(item.ownerSide)) {
    errors.push({ index, field: "ownerSide", message: "invalid" });
  }

  if (typeof item.sortOrder !== "number" || !Number.isFinite(item.sortOrder)) {
    errors.push({ index, field: "sortOrder", message: "invalid" });
  }

  return errors;
}

/**
 * 校验向导条目列表，返回所有错误。
 *
 * @param items - 向导条目列表
 * @returns 错误数组（空表示无错误）
 */
export function validateBlueprintItems(
  items: BlueprintWizardItem[],
): ItemValidationError[] {
  const codes = new Set<string>();
  return items.flatMap((item, i) => validateOne(item, i, codes));
}

// ── Factory ──

/**
 * 创建一个空蓝图条目。
 *
 * @param sortOrder - 排序值
 * @returns 空条目
 */
export function createEmptyItem(sortOrder: number): BlueprintWizardItem {
  return {
    checklistItemCode: "",
    name: "",
    category: "standard",
    requiredFlag: false,
    ownerSide: "applicant",
    sortOrder,
    description: "",
    providedByRole: "",
  };
}

/**
 * 尝试将 JSON 字符串解析为蓝图条目列表。
 *
 * @param json - JSON 字符串
 * @returns items 或 error（JSON 格式错误时）
 */
export function tryParseJsonToItems(
  json: string,
): { items: BlueprintWizardItem[] } | { error: string } {
  const trimmed = json.trim();
  if (!trimmed) return { items: [] };
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return { items: parseBlueprintToItems(parsed) };
  } catch {
    return { error: "invalid_json" };
  }
}
