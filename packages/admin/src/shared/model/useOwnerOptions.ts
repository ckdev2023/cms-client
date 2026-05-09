import { resolveUserLabel } from "./useOrgUserOptions";

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

/** 来自 `/api/users` 的最小输入。 */
interface ApiOwnerInput {
  /** 用户主键 UUID。 */
  id: string;
  /** 显示名。 */
  displayName: string;
}

const API_OWNER_AVATAR_PALETTE = [
  "bg-sky-100 text-sky-700",
  "bg-emerald-100 text-emerald-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-slate-100 text-slate-700",
] as const;

function hashStringToIndex(value: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

/**
 * 从姓名中提取首字母缩写（最多两字符）。
 *
 * @param name - 完整姓名
 * @returns 最多两字符的首字母缩写
 */
export function deriveInitialsFromName(name: string): string {
  const trimmed = name.trim();
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

/**
 * 把 `/api/users` 注册的 `{ id, displayName }` 适配为
 * `OwnerSelectOption`（含 initials / avatarClass）。
 *
 * R2-A-1: 负责人下拉的 `value` 必须使用真实 UUID，否则 server 端
 * UUID 列 cast 失败（500）。avatarClass 由 id 哈希派生，保证同一
 * 用户色块稳定一致。
 *
 * @param input - 后端返回的最小用户对象
 * @returns 含 initials / avatarClass 的负责人选项
 */
export function toApiOwnerOption(input: ApiOwnerInput): OwnerSelectOption {
  const trimmedName = input.displayName?.trim() ?? "";
  const fallbackName = trimmedName || input.id;
  const avatarClass =
    API_OWNER_AVATAR_PALETTE[
      hashStringToIndex(input.id, API_OWNER_AVATAR_PALETTE.length)
    ] ?? API_OWNER_AVATAR_PALETTE[0];
  return {
    value: input.id,
    label: fallbackName,
    initials: deriveInitialsFromName(trimmedName),
    avatarClass: avatarClass ?? "bg-slate-100 text-slate-700",
  };
}

/**
 * 当前登录用户的最小输入，用于构建 owner 选项兜底。
 */
export interface SessionOwnerInput {
  /** 用户主键 UUID。 */
  id: string;
  /** 显示名（非空才会取用）。 */
  name: string;
  /** 可选头像缩写，缺省时按显示名派生。 */
  initials?: string;
}

/**
 * 构建当前登录用户的 `OwnerSelectOption`（含 UUID + 头像缩写）。
 *
 * 用于 BUG-150 兜底：当 `/api/users` 尚未注册（首屏 / 测试），
 * 至少让登录管理员能把案件分给自己；调用方需自行去重。
 *
 * @param user - 来自 `useAdminSession.currentUser` 的最小输入
 * @returns 含 UUID value 与 initials 的 owner option
 */
export function buildSessionOwnerOption(
  user: SessionOwnerInput,
): OwnerSelectOption {
  const trimmedName = user.name.trim();
  return {
    value: user.id,
    label: trimmedName || user.id,
    initials:
      (user.initials ?? "").trim() || deriveInitialsFromName(trimmedName),
    avatarClass: "bg-slate-100 text-slate-700",
  };
}

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UNKNOWN_OWNER_AVATAR_CLASS = "bg-slate-100 text-slate-700";
const UNKNOWN_OWNER_INITIALS = "—";

function looksLikeUuid(value: string): boolean {
  return UUID_PATTERN.test(value.trim());
}

function isNilUuid(value: string): boolean {
  return value.trim().toLowerCase() === NIL_UUID;
}

/**
 * H-9: 负责人展示文案的回落标签。
 *
 * 调用方（页面/组件）传入已 i18n 化的占位符，避免在 `shared/model`
 * 直接依赖 `vue-i18n`。
 */
export interface OwnerDisplayFallbacks {
  /** 空值 / nil UUID 时显示。 */
  unassigned: string;
  /** UUID 形态但既不在 catalog 又不在 `/api/users` 别名表时显示。 */
  unknown: string;
}

/**
 * 优先级解析负责人展示文案：
 *
 * 1. 空 / nil UUID → `fallbacks.unassigned`
 * 2. 静态 fixture catalog 命中（短码 / 任一本地化标签）→ catalog 标签
 * 3. 运行期 `/api/users` 别名表命中 → 后端 displayName
 * 4. UUID 形态但无任何匹配 → `fallbacks.unknown`
 * 5. 其它（已是字面量标签）→ 原样返回
 *
 * H-9: 修复列表/详情 owner 字段直接渲染原始 UUID 或 `?` 的体验问题。
 *
 * @param idOrLabel - 负责人 UUID / 短码 / 字面量标签
 * @param fallbacks - 占位符（已经过 i18n）
 * @param locale - 用于 catalog 本地化的 locale
 * @returns 用户可读的负责人展示文案
 */
export function resolveOwnerDisplayLabel(
  idOrLabel: string | null | undefined,
  fallbacks: OwnerDisplayFallbacks,
  locale?: string,
): string {
  const trimmed = (idOrLabel ?? "").trim();
  if (!trimmed) return fallbacks.unassigned;
  if (isNilUuid(trimmed)) return fallbacks.unassigned;

  const catalog = resolveOwnerOption(trimmed, locale);
  if (catalog) return catalog.label;

  const alias = resolveUserLabel(trimmed);
  if (alias && alias !== "—" && alias !== trimmed) return alias;

  if (looksLikeUuid(trimmed)) return fallbacks.unknown;

  return trimmed;
}

/**
 * 与 `resolveOwnerDisplayLabel` 相同的优先级链，但同时返回头像
 * `initials` 与 `avatarClass`，供列表 / 头部 chip 直接渲染。
 *
 * H-9: 列表行 `LeadTableRow` 与详情头部 `LeadDetailHeader` 共用同一
 * 解析链，避免渲染层各自拼装时漏掉某一档回退。
 *
 * @param idOrLabel - 负责人 UUID / 短码 / 字面量标签
 * @param locale - 用于 catalog 本地化的 locale
 * @param fallbacks - 占位符（已经过 i18n）
 * @returns 含 label / initials / avatarClass 的负责人展示选项
 */
export function resolveOwnerDisplayOption(
  idOrLabel: string | null | undefined,
  locale: string | undefined,
  fallbacks: OwnerDisplayFallbacks,
): OwnerSelectOption {
  const trimmed = (idOrLabel ?? "").trim();

  if (!trimmed || isNilUuid(trimmed)) {
    return {
      value: trimmed,
      label: fallbacks.unassigned,
      initials: UNKNOWN_OWNER_INITIALS,
      avatarClass: UNKNOWN_OWNER_AVATAR_CLASS,
    };
  }

  const catalog = resolveOwnerOption(trimmed, locale);
  if (catalog) return catalog;

  const alias = resolveUserLabel(trimmed);
  if (alias && alias !== "—" && alias !== trimmed) {
    return toApiOwnerOption({ id: trimmed, displayName: alias });
  }

  if (looksLikeUuid(trimmed)) {
    return {
      value: trimmed,
      label: fallbacks.unknown,
      initials: UNKNOWN_OWNER_INITIALS,
      avatarClass: UNKNOWN_OWNER_AVATAR_CLASS,
    };
  }

  return {
    value: trimmed,
    label: trimmed,
    initials: deriveInitialsFromName(trimmed),
    avatarClass: UNKNOWN_OWNER_AVATAR_CLASS,
  };
}
