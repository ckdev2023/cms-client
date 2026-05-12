import { computed, ref, watch, type Ref } from "vue";
import type { CustomerDetail, DetailTab } from "../types";
import { DETAIL_TABS } from "../types";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type DetailRepository = Pick<CustomerRepository, "getCustomerDetail">;

type CustomerDetailModelErrorCode =
  | "unauthorized"
  | "notFound"
  | "requestFailed";

type UseCustomerDetailModelInput = {
  customerId: Ref<string>;
  repository: DetailRepository;
  routeTab?: Ref<string | undefined>;
  onTabChange?: (tab: DetailTab) => void;
};

const DEFAULT_CUSTOMER_DETAIL_TAB: DetailTab = "basic";

/**
 * 判断字符串是否为合法的客户详情 tab 值。
 *
 * @param v - 待检查字符串
 * @returns 是否属于 `DETAIL_TABS`
 */
function isValidCustomerDetailTab(v: string): v is DetailTab {
  return (DETAIL_TABS as readonly string[]).includes(v);
}

/**
 * 将任意外部输入解析为合法客户详情 tab，非法值回退到 `DEFAULT_CUSTOMER_DETAIL_TAB`。
 *
 * @param raw - 来自 URL query 或 model 的原始 tab 值
 * @returns 类型安全的 tab 键名
 */
function resolveCustomerDetailTab(raw: string | null | undefined): DetailTab {
  if (typeof raw === "string" && isValidCustomerDetailTab(raw)) return raw;
  return DEFAULT_CUSTOMER_DETAIL_TAB;
}

/**
 * 服务端 GET /customers/:id 在「不存在/无权限视作 null」与非法 UUID 时返回 400（非 404），
 * 此处映射为详情页的「未找到」语义，与 `customers.detail.notFound` 文案一致。
 *
 * @param error - 客户仓储在拉取详情失败时抛出的错误
 * @returns 是否应按「未找到客户」语义处理（展示 `notFound` 状态）
 */
function isMissingOrInvalidCustomerDetailId(
  error: CustomerRepositoryError,
): boolean {
  if (error.code !== "VALIDATION_ERROR" || error.status !== 400) return false;
  const normalized = error.message.trim().toLowerCase();
  return (
    normalized.includes("customer not found") ||
    normalized.includes("invalid id")
  );
}

function mapCustomerDetailError(error: unknown): CustomerDetailModelErrorCode {
  if (error instanceof CustomerRepositoryError) {
    if (error.code === "UNAUTHORIZED") return "unauthorized";
    if (error.status === 404) return "notFound";
    if (isMissingOrInvalidCustomerDetailId(error)) return "notFound";
  }
  return "requestFailed";
}

function useCustomerDetailLoader(input: UseCustomerDetailModelInput) {
  const customer = ref<CustomerDetail | null>(null);
  const loading = ref(false);
  const errorCode = ref<CustomerDetailModelErrorCode | null>(null);
  let requestVersion = 0;

  async function loadCustomer(): Promise<void> {
    const nextCustomerId = input.customerId.value.trim();
    if (!nextCustomerId) {
      customer.value = null;
      errorCode.value = "notFound";
      loading.value = false;
      return;
    }

    const activeRequest = ++requestVersion;
    loading.value = true;
    errorCode.value = null;
    try {
      const detail = await input.repository.getCustomerDetail(nextCustomerId);
      if (activeRequest !== requestVersion) return;
      customer.value = detail;
    } catch (error) {
      if (activeRequest !== requestVersion) return;
      customer.value = null;
      errorCode.value = mapCustomerDetailError(error);
    } finally {
      if (activeRequest === requestVersion) loading.value = false;
    }
  }

  watch(
    input.customerId,
    () => {
      void loadCustomer();
    },
    { immediate: true },
  );

  return { customer, loading, errorCode, retry: loadCustomer };
}

/**
 * 客户详情页整体状态编排，管理当前客户数据与激活 Tab。
 *
 * @param input - 详情页依赖项
 * @param input.customerId - 当前路由中的客户 ID
 * @param input.repository - 客户详情读取仓储
 * @param input.routeTab - URL query 中的 tab 值（响应式，支持浏览器前进/后退同步）
 * @param input.onTabChange - 用户主动切 tab 时的回调（用于同步 URL query）
 * @returns 详情页状态与交互方法
 */
export function useCustomerDetailModel(input: UseCustomerDetailModelInput) {
  const initialTab = resolveCustomerDetailTab(input.routeTab?.value);
  const activeTab = ref<DetailTab>(initialTab);
  const detail = useCustomerDetailLoader(input);
  const notFound = computed(() => detail.errorCode.value === "notFound");
  const avatarInitials = computed(
    () => detail.customer.value?.displayName.slice(0, 1) ?? "?",
  );

  if (input.routeTab) {
    watch(input.routeTab, (raw) => {
      activeTab.value = resolveCustomerDetailTab(raw);
    });
  }

  function switchTab(tab: DetailTab): void {
    activeTab.value = tab;
    input.onTabChange?.(tab);
  }

  return {
    activeTab,
    customer: computed(() => detail.customer.value),
    loading: computed(() => detail.loading.value),
    errorCode: computed(() => detail.errorCode.value),
    notFound,
    avatarInitials,
    switchTab,
    retry: detail.retry,
  };
}

export {
  DEFAULT_CUSTOMER_DETAIL_TAB,
  isValidCustomerDetailTab,
  resolveCustomerDetailTab,
};
