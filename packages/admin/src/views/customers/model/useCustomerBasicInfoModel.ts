import { computed, ref, watch, type ComputedRef, type Ref } from "vue";
import type { CustomerDetail, SelectOption } from "../types";
import { OWNER_OPTIONS } from "../fixtures";
import {
  getActiveGroupOptions,
  isGroupDisabled,
  resolveGroupLabel,
} from "../../../shared/model/useGroupOptions";
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

function resolveOwnerIdByLabel(
  ownerLabel: string,
  ownerOptions: readonly SelectOption[],
): string | undefined {
  const matched = ownerOptions.find(
    (option) => option.label === ownerLabel.trim(),
  );
  return matched?.value;
}

type UseCustomerBasicInfoModelInput = {
  customer: ComputedRef<CustomerDetail | null>;
  repository: Pick<CustomerRepository, "updateCustomerBasicInfo">;
  refreshCustomer?: () => Promise<void>;
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

function useCommittedSnapshot(customer: ComputedRef<CustomerDetail | null>) {
  const committedSnapshot = ref<BasicInfoFormSnapshot | null>(null);

  watch(
    customer,
    (nextCustomer) => {
      committedSnapshot.value = nextCustomer
        ? snapshotFromCustomer(nextCustomer)
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
) {
  const groupOptions = computed<readonly SelectOption[]>(() => {
    const active = getActiveGroupOptions();
    const currentGroup = currentSnapshot.value?.group ?? "";
    if (currentGroup && isGroupDisabled(currentGroup)) {
      return [
        ...active,
        { value: currentGroup, label: resolveGroupLabel(currentGroup) },
      ];
    }
    return active;
  });

  return {
    groupOptions,
    ownerOptions: ref<readonly SelectOption[]>(OWNER_OPTIONS),
  };
}

function createBasicInfoPayload(
  snapshot: BasicInfoFormSnapshot,
  ownerOptions: readonly SelectOption[],
) {
  return {
    displayName: snapshot.displayName,
    legalName: snapshot.legalName,
    furigana: snapshot.furigana,
    nationality: snapshot.nationality,
    gender: snapshot.gender,
    birthDate: snapshot.birthDate,
    phone: snapshot.phone,
    email: snapshot.email,
    group: snapshot.group,
    ownerId: resolveOwnerIdByLabel(snapshot.owner, ownerOptions),
    referralSource: snapshot.referralSource,
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
  ownerOptions: Readonly<Ref<readonly SelectOption[]>>,
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
        createBasicInfoPayload(snapshot, ownerOptions.value),
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
  );
  const { groupOptions, ownerOptions } = useBasicInfoOptions(currentSnapshot);
  const { startEditing, cancelEditing, save } = useBasicInfoActions(
    input,
    {
      isEditing,
      showSavedHint,
      formSnapshot,
      committedSnapshot,
      saving,
      errorCode,
      currentSnapshot,
    },
    ownerOptions,
  );

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
