function readNonEmpty(bp: Record<string, unknown>, key: string): string | null {
  const v = bp[key];
  if (typeof v !== "string") return null;
  const trimmed = v.trim();
  return trimmed ? trimmed : null;
}

function readPaired(
  bp: Record<string, unknown>,
  primary: string,
  secondary: string,
): string | null {
  const head = bp[primary];
  if (typeof head !== "string") return null;
  const tail = bp[secondary];
  const tailStr = typeof tail === "string" ? tail : "";
  const full = `${head} ${tailStr}`.trim();
  return full ? full : null;
}

/**
 * base_profile から顧客名を抽出する。
 *
 * fallback 順序: name → familyName+givenName → lastName+firstName → fullName →
 *   displayName → name_jp → name_cn → name_en → null
 *
 * `convertCustomer` 等は base_profile.name_jp / name_cn / name_en (CustomerLocalizedNames)
 * のみを書き込み、`name` フィールドは設定しないため、ローカライズ済みフィールドを
 * fallback に含めないと会話詳細・関連エンティティ表示で空ラベルになる。
 *
 * @param baseProfile base_profile JSON
 * @returns 顧客名、取得不可時は null
 */
export function extractCustomerName(baseProfile: unknown): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  return (
    readNonEmpty(bp, "name") ??
    readPaired(bp, "familyName", "givenName") ??
    readPaired(bp, "lastName", "firstName") ??
    readNonEmpty(bp, "fullName") ??
    readNonEmpty(bp, "displayName") ??
    readNonEmpty(bp, "name_jp") ??
    readNonEmpty(bp, "name_cn") ??
    readNonEmpty(bp, "name_en")
  );
}

const LOCALE_TO_NAME_FIELD: Record<string, string> = {
  zh: "name_cn",
  ja: "name_jp",
  en: "name_en",
};

function readExplicitDisplayName(bp: Record<string, unknown>): string | null {
  return (
    readNonEmpty(bp, "displayName") ??
    readNonEmpty(bp, "display_name") ??
    readNonEmpty(bp, "legalName") ??
    readNonEmpty(bp, "legal_name") ??
    readNonEmpty(bp, "name")
  );
}

function readLocaleScopedName(bp: Record<string, unknown>): string | null {
  const locale = readNonEmpty(bp, "name_default_locale");
  if (!locale) return null;
  const field = LOCALE_TO_NAME_FIELD[locale];
  return field ? readNonEmpty(bp, field) : null;
}

function readCanonicalLocalizedName(
  bp: Record<string, unknown>,
): string | null {
  return (
    readNonEmpty(bp, "name_cn") ??
    readNonEmpty(bp, "name_en") ??
    readNonEmpty(bp, "name_jp")
  );
}

/**
 * 客户显示名解析：用户在新建客户/线索转客户对话框选择的「默认语言」
 * （`localizedNames.defaultLocale`，落在 `base_profile.name_default_locale`）
 * 必须被尊重，否则会出现「填中文为默认却展示日文名」的语言漂移。
 *
 * 优先级与 `infra/db/customerNameExpr` / `customers.utils.CUSTOMER_NAME_FIELDS`
 * 对齐，避免跨模块漂移：
 * 1. `displayName` / `display_name` / `legalName` / `legal_name` / `name`
 * 2. `name_default_locale` 指定的语言名（zh→name_cn / ja→name_jp / en→name_en）
 * 3. 兜底顺序 `name_cn → name_en → name_jp`（与 `CUSTOMER_NAME_FIELDS` 一致）
 *
 * 用于 `leads.admin.query.queryCustomerSummary` 等返回给客户端的展示名场景；
 * 不要直接替换 `extractCustomerName`，后者承担会话/关联实体的兜底（已被
 * `customerName.test.ts` 显式锁定 name_jp 优先）。
 *
 * @param baseProfile customer.base_profile JSON
 * @returns 显示名，取得不可时返回 null
 */
export function resolveCustomerDisplayName(
  baseProfile: unknown,
): string | null {
  if (!baseProfile || typeof baseProfile !== "object") return null;
  const bp = baseProfile as Record<string, unknown>;
  return (
    readExplicitDisplayName(bp) ??
    readLocaleScopedName(bp) ??
    readCanonicalLocalizedName(bp)
  );
}
