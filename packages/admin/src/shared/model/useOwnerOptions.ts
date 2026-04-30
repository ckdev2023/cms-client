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
 * 当前登录用户在负责人选项中的最小输入；
 * 与 `auth/model/adminSession#AdminUser` 字段子集兼容。
 */
export interface CurrentUserOwnerInput {
  /** 显示名（必填）；为空时视为不可作为 owner 选项。 */
  name: string;
  /** 邮箱；存在时优先作为稳定 id（避免与 catalog slug 冲突）。 */
  email?: string;
  /** 头像缩写；缺省时按名称推导。 */
  initials?: string;
}

const CURRENT_USER_VALUE_PREFIX = "current-user:";
const CURRENT_USER_AVATAR_CLASS = "bg-slate-100 text-slate-700";

function deriveCurrentUserInitials(input: CurrentUserOwnerInput): string {
  const explicit = input.initials?.trim();
  if (explicit) return explicit;
  const trimmed = input.name.trim();
  if (!trimmed) return "";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (
      words
        .map((segment) => segment[0]?.toUpperCase() ?? "")
        .join("")
        .slice(0, 2) || trimmed.slice(0, 2).toUpperCase()
    );
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function buildCurrentUserOwnerValue(input: CurrentUserOwnerInput): string {
  const email = input.email?.trim().toLowerCase();
  if (email) return email;
  return `${CURRENT_USER_VALUE_PREFIX}${input.name.trim()}`;
}

/**
 * 把当前登录用户合并进负责人下拉选项；当用户已在静态 catalog 中（或选项里）时，原样返回。
 *
 * 用于建案向导 Step 3 等场景：catalog 是 fixture 静态数据，不含登录用户（如 `Local Admin`），
 * 否则用户无法把案件分给自己（参见 BUG-150）。
 *
 * @param options - 已有负责人选项（通常来自 `getOwnerOptions(locale)`）。
 * @param currentUser - 当前登录用户（可空；空时直接返回原列表副本）。
 * @returns 合并后的选项列表。当前用户作为首项；与 catalog 重名/重复 value 时不重复插入。
 */
export function withCurrentUserOwnerOption(
  options: readonly OwnerSelectOption[],
  currentUser: CurrentUserOwnerInput | null | undefined,
): OwnerSelectOption[] {
  if (!currentUser) return [...options];
  const trimmedName = currentUser.name?.trim();
  if (!trimmedName) return [...options];
  if (resolveOwnerValue(trimmedName) !== null) return [...options];

  const value = buildCurrentUserOwnerValue(currentUser);
  if (
    options.some(
      (option) => option.value === value || option.label === trimmedName,
    )
  ) {
    return [...options];
  }

  return [
    {
      value,
      label: trimmedName,
      initials: deriveCurrentUserInitials(currentUser),
      avatarClass: CURRENT_USER_AVATAR_CLASS,
    },
    ...options,
  ];
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
