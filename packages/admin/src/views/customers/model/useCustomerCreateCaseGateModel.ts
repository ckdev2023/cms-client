import { computed, type Ref } from "vue";
import type { CustomerDetail } from "../types";

type LabelKey = `customers.detail.actions.createCaseGate.${string}`;

/**
 * 建案入口按钮的统一展示态。
 */
export interface CustomerCreateCaseActionViewModel {
  /**
   * 是否禁用当前入口。
   */
  disabled: boolean;
}

/**
 * 客户详情页建案门禁展示态。
 */
export interface CustomerCreateCaseGateViewModel {
  /**
   * 单建案入口。
   */
  single: CustomerCreateCaseActionViewModel;
  /**
   * 批量建案入口。
   */
  batch: CustomerCreateCaseActionViewModel;
  /**
   * 阻断提示文案 key；null 表示无需提示。
   */
  blockedReasonKey: LabelKey | null;
}

type UseCustomerCreateCaseGateModelInput = {
  customer: Ref<CustomerDetail | null>;
  /**
   * 当前租户是否启用 BMV feature flag；`undefined` 表示尚未解析完成（loading）。
   */
  bmvEnabled: Ref<boolean | undefined>;
};

/**
 * 判断客户是否需要走 BMV 前置流程。
 * 仅「经管签」或「问卷已开始」的客户才受 BMV 门禁约束；
 * 其余签证类型直接放行。
 * @param customer - 客户详情
 * @returns 是否需要 BMV 门禁
 */
export function customerRequiresBmv(customer: CustomerDetail): boolean {
  if (
    customer.visaType === "business_manager" ||
    customer.visaType === "business_manager_visa"
  )
    return true;
  const profile = customer.bmvProfile;
  if (!profile) return false;
  return profile.questionnaireStatus !== "not_started";
}

function resolveBlockedReasonKey(
  customer: CustomerDetail | null,
  bmvEnabled: boolean | undefined,
): LabelKey | null {
  if (!customer) return null;
  if (!customerRequiresBmv(customer)) return null;
  // BMV 必要 + flag 关闭：替换误导性的 needsSign 文案，给出真实根因。
  // flag loading（undefined）保持现状，避免登场态闪烁。
  if (bmvEnabled === false) {
    return "customers.detail.actions.createCaseGate.featureDisabled";
  }
  const profile = customer.bmvProfile;
  if (!profile) return null;
  if (profile.signStatus !== "signed") {
    return "customers.detail.actions.createCaseGate.needsSign";
  }
  if (profile.intakeStatus !== "ready_for_case_creation") {
    return "customers.detail.actions.createCaseGate.intakeNotReady";
  }
  return null;
}

/**
 * 根据客户详情与 flag 状态生成建案门禁视图模型，统一复用单建案与批量建案入口。
 * @param customer - 当前客户详情；为空时返回默认禁用态。
 * @param bmvEnabled - 当前租户 BMV feature flag 启用状态；`undefined` 表示加载中。
 * @returns 头部与批量建案入口共享的门禁展示态。
 */
export function buildCustomerCreateCaseGateViewModel(
  customer: CustomerDetail | null,
  bmvEnabled: boolean | undefined,
): CustomerCreateCaseGateViewModel {
  if (!customer) {
    return {
      single: { disabled: true },
      batch: { disabled: true },
      blockedReasonKey: null,
    };
  }

  const blockedReasonKey = resolveBlockedReasonKey(customer, bmvEnabled);
  const disabled = blockedReasonKey !== null;

  return {
    single: { disabled },
    batch: { disabled },
    blockedReasonKey,
  };
}

/**
 * 为客户详情页提供响应式建案门禁状态。
 * @param input - 响应式输入，包含当前客户详情引用与 BMV flag 状态。
 * @returns 建案门禁的响应式视图模型与可建案标记。
 */
export function useCustomerCreateCaseGateModel(
  input: UseCustomerCreateCaseGateModelInput,
) {
  const createCaseGate = computed(() =>
    buildCustomerCreateCaseGateViewModel(
      input.customer.value,
      input.bmvEnabled.value,
    ),
  );
  const canCreateCase = computed(
    () =>
      !createCaseGate.value.single.disabled &&
      !createCaseGate.value.batch.disabled,
  );

  return { createCaseGate, canCreateCase };
}
