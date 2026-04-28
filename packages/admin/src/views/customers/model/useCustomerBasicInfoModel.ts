import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { CustomerDetail, SelectOption } from "../types";
import {
  getActiveGroupOptions,
  isGroupDisabled,
  resolveGroupLabel,
  resolveGroupValue,
} from "../../../shared/model/useGroupOptions";
import {
  getOwnerOptions,
  resolveOwnerLabel,
  resolveOwnerValue,
} from "../../../shared/model/useOwnerOptions";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

/**
 * 基础信息编辑可识别的错误码。
 */
export type CustomerBasicInfoModelErrorCode =
  | "unauthorized"
  | "validationError"
  | "requestFailed";

function mapBasicInfoError(error: unknown): CustomerBasicInfoModelErrorCode {
  if (!(error instanceof CustomerRepositoryError)) {
    return "requestFailed";
  }

  if (error.code === "UNAUTHORIZED") return "unauthorized";
  if (error.code === "VALIDATION_ERROR") return "validationError";
  return "requestFailed";
}

type UseCustomerBasicInfoModelInput = {
  customer: ComputedRef<CustomerDetail | null>;
  repository: Pick<CustomerRepository, "updateCustomerBasicInfo">;
  refreshCustomer?: () => Promise<void>;
  locale?: Readonly<Ref<string>>;
  disabledSuffix?: Readonly<Ref<string>>;
};

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
  location: string;
  /**
   *
   */
  sourceType: string;
  /**
   * BMV 客户取 `bmvProfile.visaPlan`，非 BMV 客户取 `baseProfile.visaType`。
   */
  visaType: string;
  /**
   *
   */
  referrerName: string;
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
 * @param locale - 可选语言标识；用于把 group 显示值转换为当前界面语言
 * @param disabledSuffix - disabled group 的显示后缀；用于只读态与编辑态保持一致
 * @returns 仅包含可编辑字段的独立快照对象
 */
export function snapshotFromCustomer(
  customer: CustomerDetail,
  locale?: string,
  disabledSuffix = "（已停用）",
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
    group: resolveGroupLabel(customer.group, disabledSuffix, locale),
    owner: resolveOwnerLabel(customer.owner.name, locale),
    referralSource: customer.referralSource,
    location: customer.location,
    sourceType: customer.sourceType,
    visaType: customer.visaType,
    referrerName: customer.referrerName,
    avatar: customer.avatar,
    note: customer.note,
  };
}

function useCommittedSnapshot(
  customer: ComputedRef<CustomerDetail | null>,
  locale?: Readonly<Ref<string>>,
  disabledSuffix?: Readonly<Ref<string>>,
) {
  const committedSnapshot = ref<BasicInfoFormSnapshot | null>(null);
  const localeValue = computed(() => locale?.value);
  const disabledSuffixValue = computed(
    () => disabledSuffix?.value ?? "（已停用）",
  );

  watch(
    [customer, localeValue, disabledSuffixValue],
    ([nextCustomer, nextLocale, nextDisabledSuffix]) => {
      committedSnapshot.value = nextCustomer
        ? snapshotFromCustomer(nextCustomer, nextLocale, nextDisabledSuffix)
        : null;
    },
    { immediate: true },
  );

  return {
    committedSnapshot,
    currentSnapshot: computed(() => committedSnapshot.value),
  };
}

function useBasicInfoOptions(
  currentSnapshot: Readonly<Ref<BasicInfoFormSnapshot | null>>,
  locale?: Readonly<Ref<string>>,
  disabledSuffix?: Readonly<Ref<string>>,
) {
  const groupOptions = computed<readonly SelectOption[]>(() => {
    const active = getActiveGroupOptions(locale?.value);
    const currentGroup = currentSnapshot.value?.group ?? "";
    const currentGroupValue = resolveGroupValue(currentGroup);
    if (currentGroupValue && isGroupDisabled(currentGroupValue)) {
      return [
        ...active,
        {
          value: currentGroupValue,
          label: resolveGroupLabel(
            currentGroupValue,
            disabledSuffix?.value ?? "（已停用）",
            locale?.value,
          ),
        },
      ];
    }
    return active;
  });

  return {
    groupOptions,
    ownerOptions: computed<readonly SelectOption[]>(() =>
      getOwnerOptions(locale?.value).map(({ value, label }) => ({
        value,
        label,
      })),
    ),
  };
}

function createBasicInfoPayload(snapshot: BasicInfoFormSnapshot) {
  return {
    displayName: snapshot.displayName,
    legalName: snapshot.legalName,
    furigana: snapshot.furigana,
    nationality: snapshot.nationality,
    gender: snapshot.gender,
    birthDate: snapshot.birthDate,
    phone: snapshot.phone,
    email: snapshot.email,
    group: resolveGroupValue(snapshot.group) ?? snapshot.group,
    ownerId: resolveOwnerValue(snapshot.owner) ?? undefined,
    referralSource: snapshot.referralSource,
    location: snapshot.location,
    sourceType: snapshot.sourceType,
    visaType: snapshot.visaType,
    referrerName: snapshot.referrerName,
    avatar: snapshot.avatar,
    note: snapshot.note,
  };
}

async function refreshCustomerSafely(
  refreshCustomer?: () => Promise<void>,
): Promise<void> {
  if (!refreshCustomer) return;
  await refreshCustomer().catch(() => undefined);
}

function useBasicInfoActions(
  input: UseCustomerBasicInfoModelInput,
  state: {
    isEditing: Ref<boolean>;
    showSavedHint: Ref<boolean>;
    formSnapshot: Ref<BasicInfoFormSnapshot | null>;
    committedSnapshot: Ref<BasicInfoFormSnapshot | null>;
    saving: Ref<boolean>;
    errorCode: Ref<CustomerBasicInfoModelErrorCode | null>;
    currentSnapshot: Readonly<Ref<BasicInfoFormSnapshot | null>>;
  },
) {
  function startEditing(): void {
    if (!state.currentSnapshot.value) return;
    state.formSnapshot.value = { ...state.currentSnapshot.value };
    state.showSavedHint.value = false;
    state.errorCode.value = null;
    state.isEditing.value = true;
  }

  function cancelEditing(): void {
    state.isEditing.value = false;
    state.formSnapshot.value = null;
    state.errorCode.value = null;
  }

  async function save(): Promise<boolean> {
    const snapshot = state.formSnapshot.value;
    const customer = input.customer.value;
    if (!snapshot || !customer || state.saving.value) return false;

    state.saving.value = true;
    state.errorCode.value = null;

    try {
      await input.repository.updateCustomerBasicInfo(
        customer.id,
        createBasicInfoPayload(snapshot),
      );
      state.committedSnapshot.value = { ...snapshot };
      state.isEditing.value = false;
      state.showSavedHint.value = true;
      state.formSnapshot.value = null;
      await refreshCustomerSafely(input.refreshCustomer);
      return true;
    } catch (error) {
      state.errorCode.value = mapBasicInfoError(error);
      return false;
    } finally {
      state.saving.value = false;
    }
  }

  return { startEditing, cancelEditing, save };
}

/**
 * 基础信息 Tab 的编辑状态模型：管理编辑/只读模式、表单快照、保存提示。
 *
 * @param input - Hook 依赖集合
 * @param input.customer - 响应式的客户详情（可能为 `null`）
 * @param input.repository - 更新基础信息所需仓储
 * @param input.refreshCustomer - 保存成功后的可选刷新函数
 * @returns 编辑状态、快照、选项列表与操作方法
 */
export function useCustomerBasicInfoModel(
  input: UseCustomerBasicInfoModelInput,
) {
  const isEditing = ref(false);
  const showSavedHint = ref(false);
  const formSnapshot = ref<BasicInfoFormSnapshot | null>(null);
  const saving = ref(false);
  const errorCode = ref<CustomerBasicInfoModelErrorCode | null>(null);
  const { committedSnapshot, currentSnapshot } = useCommittedSnapshot(
    input.customer,
    input.locale,
    input.disabledSuffix,
  );
  const { groupOptions, ownerOptions } = useBasicInfoOptions(
    currentSnapshot,
    input.locale,
    input.disabledSuffix,
  );
  const { startEditing, cancelEditing, save } = useBasicInfoActions(input, {
    isEditing,
    showSavedHint,
    formSnapshot,
    committedSnapshot,
    saving,
    errorCode,
    currentSnapshot,
  });

  return {
    isEditing,
    showSavedHint,
    formSnapshot,
    currentSnapshot,
    groupOptions,
    ownerOptions,
    saving: computed(() => saving.value),
    errorCode: computed(() => errorCode.value),
    startEditing,
    cancelEditing,
    save,
  };
}
