import { ref, computed, type Ref, type ComputedRef } from "vue";
import type { CustomerDetail, SelectOption } from "../types";
import { OWNER_OPTIONS } from "../fixtures";
import {
  getActiveGroupOptions,
  isGroupDisabled,
  resolveGroupLabel,
} from "../../../shared/model/useGroupOptions";

/**
 * 基础信息 Tab 表单字段快照，与 CustomerDetail 字段对齐但仅包含可编辑部分。
 */
export interface BasicInfoFormSnapshot {
  /**
   *
   */
  displayName: string;
  /**
   *
   */
  legalName: string;
  /**
   *
   */
  furigana: string;
  /**
   *
   */
  nationality: string;
  /**
   *
   */
  gender: string;
  /**
   *
   */
  birthDate: string;
  /**
   *
   */
  phone: string;
  /**
   *
   */
  email: string;
  /**
   *
   */
  group: string;
  /**
   *
   */
  owner: string;
  /**
   *
   */
  referralSource: string;
  /**
   *
   */
  avatar: string;
  /**
   *
   */
  note: string;
}

/**
 * 从 CustomerDetail 提取可编辑字段生成表单快照。
 *
 * @param customer 客户详情数据
 * @returns 仅包含可编辑字段的独立快照对象
 */
export function snapshotFromCustomer(
  customer: CustomerDetail,
): BasicInfoFormSnapshot {
  return {
    displayName: customer.displayName,
    legalName: customer.legalName,
    furigana: customer.furigana,
    nationality: customer.nationality,
    gender: customer.gender,
    birthDate: customer.birthDate,
    phone: customer.phone,
    email: customer.email,
    group: customer.group,
    owner: customer.owner.name,
    referralSource: customer.referralSource,
    avatar: customer.avatar,
    note: customer.note,
  };
}

/**
 * 基础信息 Tab 的编辑状态模型：管理编辑/只读模式、表单快照、保存提示。
 *
 * @param customer 响应式的客户详情（可能为 null）
 * @returns 编辑状态、快照、选项列表与操作方法
 */
export function useCustomerBasicInfoModel(
  customer: ComputedRef<CustomerDetail | null>,
) {
  const isEditing = ref(false);
  const showSavedHint = ref(false);
  const formSnapshot = ref<BasicInfoFormSnapshot | null>(null);

  const currentSnapshot = computed<BasicInfoFormSnapshot | null>(() => {
    const c = customer.value;
    if (!c) return null;
    return snapshotFromCustomer(c);
  });

  const groupOptions = computed<readonly SelectOption[]>(() => {
    const active = getActiveGroupOptions();
    const c = customer.value;
    if (c && isGroupDisabled(c.group)) {
      return [...active, { value: c.group, label: resolveGroupLabel(c.group) }];
    }
    return active;
  });
  const ownerOptions: Ref<readonly SelectOption[]> = ref(OWNER_OPTIONS);

  function startEditing(): void {
    if (!customer.value) return;
    formSnapshot.value = snapshotFromCustomer(customer.value);
    showSavedHint.value = false;
    isEditing.value = true;
  }

  function cancelEditing(): void {
    isEditing.value = false;
    formSnapshot.value = null;
  }

  function save(): void {
    isEditing.value = false;
    showSavedHint.value = true;
    formSnapshot.value = null;
  }

  return {
    isEditing,
    showSavedHint,
    formSnapshot,
    currentSnapshot,
    groupOptions,
    ownerOptions,
    startEditing,
    cancelEditing,
    save,
  };
}
