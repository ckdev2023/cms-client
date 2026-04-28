import { ref, type Ref } from "vue";
import { getAdminAccessToken } from "../../../auth/model/adminSession";
import type { CaseCreateCustomerOption } from "../types";

/**
 * 客户下拉数据的响应式状态。
 */
export interface CustomerDropdownState {
  /**
   *
   */
  customers: Ref<readonly CaseCreateCustomerOption[]>;
  /**
   *
   */
  loading: Ref<boolean>;
  /**
   *
   */
  error: Ref<string | null>;
  /**
   *
   */
  loaded: Ref<boolean>;
}

/**
 * 客户下拉数据的操作集合。
 */
export interface CustomerDropdownActions {
  /**
   *
   */
  fetch: () => Promise<void>;
}

/**
 * 客户下拉数据组合类型。
 */
export type CustomerDropdownData = CustomerDropdownState &
  CustomerDropdownActions;

/**
 * 客户下拉数据 composable 的依赖注入。
 */
export interface UseCustomerDropdownDeps {
  /**
   *
   */
  request?: typeof fetch;
  /**
   *
   */
  getToken?: () => string | null;
  /**
   *
   */
  apiPath?: string;
}

interface RawCustomerItem {
  id?: string;
  displayName?: string;
  legalName?: string;
  furigana?: string;
  phone?: string;
  email?: string;
  group?: string;
  owner?: { name?: string };
  bmvProfile?: {
    questionnaireStatus?: string | null;
    quoteStatus?: string | null;
    signStatus?: string | null;
    intakeStatus?: string | null;
  } | null;
}

function readStringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function resolveName(r: RawCustomerItem): string | null {
  const display = readStringField(r.displayName);
  if (display) return display;
  const legal = readStringField(r.legalName);
  return legal || null;
}

function resolveContact(r: RawCustomerItem): string {
  return [readStringField(r.email), readStringField(r.phone)]
    .filter(Boolean)
    .join(" / ");
}

function resolveBmvField(
  profile: RawCustomerItem["bmvProfile"],
  key: "questionnaireStatus" | "quoteStatus" | "signStatus" | "intakeStatus",
): string | null {
  return profile?.[key] ?? null;
}

/**
 * 将服务端客户 DTO 适配为建案下拉选项。
 *
 * @param raw - 单条客户原始数据
 * @returns 适配后的下拉选项；数据不足时返回 `null`
 */
function adaptItem(raw: unknown): CaseCreateCustomerOption | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawCustomerItem;
  if (!r.id || typeof r.id !== "string") return null;

  const name = resolveName(r);
  if (!name) return null;

  const group = readStringField(r.group);
  return {
    id: r.id,
    name,
    kana: readStringField(r.furigana),
    group,
    groupLabel: group,
    roleHint: "主申請人",
    summary: "",
    contact: resolveContact(r),
    bmvQuestionnaireStatus: resolveBmvField(
      r.bmvProfile,
      "questionnaireStatus",
    ),
    bmvQuoteStatus: resolveBmvField(r.bmvProfile, "quoteStatus"),
    bmvSignStatus: resolveBmvField(r.bmvProfile, "signStatus"),
    bmvIntakeStatus: resolveBmvField(r.bmvProfile, "intakeStatus"),
  };
}

/**
 * 将客户列表接口响应体适配为下拉选项数组。
 *
 * @param body - 列表接口响应体
 * @returns 适配后的选项数组；格式不符时返回 `null`
 */
function adaptList(body: unknown): CaseCreateCustomerOption[] | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (!Array.isArray(record.items)) return null;

  const results: CaseCreateCustomerOption[] = [];
  for (const item of record.items) {
    const adapted = adaptItem(item);
    if (adapted) results.push(adapted);
  }
  return results;
}

/**
 * 从 `/api/customers?scope=mine` 拉取客户列表，管理 loading / error / empty 状态。
 *
 * @param deps - 可选的 fetch、token 和 apiPath 注入
 * @returns 客户下拉的响应式状态与重试操作
 */
export function useCustomerDropdownData(
  deps: UseCustomerDropdownDeps = {},
): CustomerDropdownData {
  const request =
    deps.request ??
    ((...args: Parameters<typeof fetch>) => globalThis.fetch(...args));
  const getToken = deps.getToken ?? getAdminAccessToken;
  const apiPath = deps.apiPath ?? "/api/customers";

  const customers = ref<readonly CaseCreateCustomerOption[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const loaded = ref(false);

  async function doFetch(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const token = getToken();
      const headers: Record<string, string> = {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await request(`${apiPath}?scope=mine`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const body: unknown = await response.json();
      const adapted = adaptList(body);
      if (!adapted) {
        throw new Error("Invalid response format");
      }
      customers.value = adapted;
      loaded.value = true;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : "Unknown error";
      customers.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { customers, loading, error, loaded, fetch: doFetch };
}

export {
  adaptItem as adaptCustomerDropdownItem,
  adaptList as adaptCustomerDropdownList,
};
