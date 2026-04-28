type OwnerLocale = "zh-CN" | "en-US" | "ja-JP";

interface OwnerCatalogEntry {
  value: string;
  labels: Record<OwnerLocale, string>;
  initials: string;
  avatarClass: string;
}

/**
 *
 */
export interface OwnerSelectOption {
  /**
   *
   */
  value: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  initials: string;
  /**
   *
   */
  avatarClass: string;
}

const OWNER_CATALOG: readonly OwnerCatalogEntry[] = [
  {
    value: "suzuki",
    labels: { "zh-CN": "铃木", "en-US": "Suzuki", "ja-JP": "鈴木" },
    initials: "S",
    avatarClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "tanaka",
    labels: { "zh-CN": "田中", "en-US": "Tanaka", "ja-JP": "田中" },
    initials: "T",
    avatarClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "li",
    labels: { "zh-CN": "李", "en-US": "Li", "ja-JP": "李" },
    initials: "L",
    avatarClass: "bg-violet-100 text-violet-700",
  },
  {
    value: "sato",
    labels: { "zh-CN": "佐藤", "en-US": "Sato", "ja-JP": "佐藤" },
    initials: "Sa",
    avatarClass: "bg-amber-100 text-amber-700",
  },
  {
    value: "yamada-s",
    labels: {
      "zh-CN": "山田翔太",
      "en-US": "Shota Yamada",
      "ja-JP": "山田翔太",
    },
    initials: "YS",
    avatarClass: "bg-sky-100 text-sky-700",
  },
  {
    value: "takahashi-k",
    labels: {
      "zh-CN": "高桥健太",
      "en-US": "Kenta Takahashi",
      "ja-JP": "高橋健太",
    },
    initials: "TK",
    avatarClass: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "suzuki-a",
    labels: {
      "zh-CN": "铃木明里",
      "en-US": "Akari Suzuki",
      "ja-JP": "鈴木あかり",
    },
    initials: "SA",
    avatarClass: "bg-amber-100 text-amber-700",
  },
] as const;

function normalizeOwnerLocale(locale?: string): OwnerLocale {
  const normalized = locale?.trim().toLowerCase();
  if (normalized?.startsWith("zh")) return "zh-CN";
  if (normalized?.startsWith("en")) return "en-US";
  if (normalized?.startsWith("ja")) return "ja-JP";
  return "ja-JP";
}

function toOwnerOption(
  owner: OwnerCatalogEntry,
  locale?: string,
): OwnerSelectOption {
  return {
    value: owner.value,
    label: owner.labels[normalizeOwnerLocale(locale)],
    initials: owner.initials,
    avatarClass: owner.avatarClass,
  };
}

function matchesOwner(owner: OwnerCatalogEntry, idOrLabel: string): boolean {
  const normalized = idOrLabel.trim();
  return (
    owner.value === normalized ||
    Object.values(owner.labels).some((label) => label === normalized)
  );
}

/**
 * 返回用于下拉选择与摘要展示的本地化负责人选项列表。
 *
 * @param locale - 可选的当前语言代码。
 * @returns 包含稳定 id 与本地化标签的负责人选项列表。
 */
export function getOwnerOptions(locale?: string): OwnerSelectOption[] {
  return OWNER_CATALOG.map((owner) => toOwnerOption(owner, locale));
}

/**
 * 根据稳定 id 或任一本地化标签解析负责人选项。
 *
 * @param idOrLabel - 负责人稳定 id 或任一本地化标签。
 * @param locale - 可选的当前语言代码。
 * @returns 匹配到时返回本地化负责人选项，否则返回 `null`。
 */
export function resolveOwnerOption(
  idOrLabel: string,
  locale?: string,
): OwnerSelectOption | null {
  const found = OWNER_CATALOG.find((owner) => matchesOwner(owner, idOrLabel));
  return found ? toOwnerOption(found, locale) : null;
}

/**
 * 根据稳定 id 或本地化标签解析当前语言下的负责人名称。
 *
 * @param idOrLabel - 负责人稳定 id 或任一本地化标签。
 * @param locale - 可选的当前语言代码。
 * @returns 匹配到时返回本地化名称，否则返回原始输入值。
 */
export function resolveOwnerLabel(idOrLabel: string, locale?: string): string {
  return resolveOwnerOption(idOrLabel, locale)?.label ?? idOrLabel;
}

/**
 * 根据稳定 id 或本地化标签反解负责人稳定 id。
 *
 * @param idOrLabel - 负责人稳定 id 或任一本地化标签。
 * @returns 匹配到时返回负责人稳定 id，否则返回 `null`。
 */
export function resolveOwnerValue(idOrLabel: string): string | null {
  return (
    OWNER_CATALOG.find((owner) => matchesOwner(owner, idOrLabel))?.value ?? null
  );
}
