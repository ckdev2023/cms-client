import {
  computed,
  getCurrentScope,
  onScopeDispose,
  reactive,
  ref,
  watch,
} from "vue";
import type { CustomerCreateFormFields } from "../types";
import type { CustomerDuplicateCandidate } from "./CustomerAdapter";
import {
  CustomerRepositoryError,
  type CustomerRepository,
} from "./CustomerRepository";

type CreateFormRepository = Pick<
  CustomerRepository,
  "checkDuplicates" | "createCustomer"
>;

type UseCustomerCreateFormDeps = {
  repository: CreateFormRepository;
  /**
   * 查重 watcher 的防抖间隔（ms）。默认 250ms：
   * 单次表单填写时只会在用户停顿后触发一次 `checkDuplicates`，
   * 而不是每个 keystroke / 字段变更都打一次后端。
   * 测试时可传 0 立即触发。
   */
  duplicateCheckDebounceMs?: number;
};

const DEFAULT_DUPLICATE_CHECK_DEBOUNCE_MS = 250;

/** 新建客户流程可识别的错误码。 */
export type CustomerCreateFormErrorCode =
  | "unauthorized"
  | "validationError"
  | "requestFailed";

const BLANK_FIELDS: CustomerCreateFormFields = {
  customerType: "individual",
  displayName: "",
  group: "",
  legalName: "",
  kana: "",
  gender: "",
  birthDate: "",
  nationality: "",
  phone: "",
  email: "",
  referrer: "",
  location: "",
  sourceType: "",
  visaType: "",
  referrerName: "",
  representativeName: "",
  avatar: "",
  note: "",
};

function mapCreateFormError(error: unknown): CustomerCreateFormErrorCode {
  if (!(error instanceof CustomerRepositoryError)) return "requestFailed";
  if (error.code === "UNAUTHORIZED") return "unauthorized";
  if (error.code === "VALIDATION_ERROR") return "validationError";
  return "requestFailed";
}

function shouldCheckDuplicates(fields: CustomerCreateFormFields): boolean {
  return [fields.legalName, fields.phone, fields.email].some(
    (value) => value.trim() !== "",
  );
}

function cloneFields(
  fields: CustomerCreateFormFields,
): CustomerCreateFormFields {
  return {
    customerType: fields.customerType,
    displayName: fields.displayName,
    group: fields.group,
    legalName: fields.legalName,
    kana: fields.kana,
    gender: fields.gender,
    birthDate: fields.birthDate,
    nationality: fields.nationality,
    phone: fields.phone,
    email: fields.email,
    referrer: fields.referrer,
    location: fields.location,
    sourceType: fields.sourceType,
    visaType: fields.visaType,
    referrerName: fields.referrerName,
    representativeName: fields.representativeName,
    avatar: fields.avatar,
    note: fields.note,
  };
}

function resetDuplicateState(input: {
  dedupeMatches: { value: CustomerDuplicateCandidate[] };
  checkingDuplicates: { value: boolean };
  dedupeErrorCode: { value: CustomerCreateFormErrorCode | null };
  duplicateRequestVersion: { value: number };
}) {
  input.duplicateRequestVersion.value += 1;
  input.dedupeMatches.value = [];
  input.dedupeErrorCode.value = null;
  input.checkingDuplicates.value = false;
}

function createDebouncedTrigger(
  refreshDedupe: () => Promise<void>,
  debounceMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  function cancel() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }
  function trigger() {
    cancel();
    if (debounceMs <= 0) {
      void refreshDedupe();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      void refreshDedupe();
    }, debounceMs);
  }
  return { trigger, cancel };
}

function watchDuplicateFields(
  fields: CustomerCreateFormFields,
  refreshDedupe: () => Promise<void>,
  debounceMs: number,
) {
  const { trigger, cancel } = createDebouncedTrigger(refreshDedupe, debounceMs);
  watch(
    [() => fields.legalName, () => fields.phone, () => fields.email],
    () => {
      trigger();
    },
  );
  if (getCurrentScope()) onScopeDispose(cancel);
  return { cancelPendingDedupe: cancel };
}

function createDuplicateStateApi(input: {
  dedupeMatches: { value: CustomerDuplicateCandidate[] };
  checkingDuplicates: { value: boolean };
  dedupeErrorCode: { value: CustomerCreateFormErrorCode | null };
  refreshDedupe: () => Promise<void>;
  resetDedupeState: () => void;
}) {
  return {
    dedupeMatches: input.dedupeMatches,
    checkingDuplicates: input.checkingDuplicates,
    dedupeErrorCode: input.dedupeErrorCode,
    showDedupe: computed(() => input.dedupeMatches.value.length > 0),
    refreshDedupe: input.refreshDedupe,
    resetDedupeState: input.resetDedupeState,
  };
}

type DuplicateCheckRefs = {
  dedupeMatches: { value: CustomerDuplicateCandidate[] };
  checkingDuplicates: { value: boolean };
  dedupeErrorCode: { value: CustomerCreateFormErrorCode | null };
  duplicateRequestVersion: { value: number };
};

function createRefreshDedupe(
  fields: CustomerCreateFormFields,
  repository: CreateFormRepository,
  refs: DuplicateCheckRefs,
) {
  return async function refreshDedupe(): Promise<void> {
    if (!shouldCheckDuplicates(fields)) {
      resetDuplicateState(refs);
      return;
    }
    const activeRequest = ++refs.duplicateRequestVersion.value;
    refs.checkingDuplicates.value = true;
    refs.dedupeErrorCode.value = null;
    try {
      const nextMatches = await repository.checkDuplicates({
        name: fields.legalName,
        phone: fields.phone,
        email: fields.email,
      });
      if (activeRequest !== refs.duplicateRequestVersion.value) return;
      refs.dedupeMatches.value = nextMatches;
    } catch (error) {
      if (activeRequest !== refs.duplicateRequestVersion.value) return;
      refs.dedupeMatches.value = [];
      refs.dedupeErrorCode.value = mapCreateFormError(error);
    } finally {
      if (activeRequest === refs.duplicateRequestVersion.value)
        refs.checkingDuplicates.value = false;
    }
  };
}

function useDuplicateCheckState(
  fields: CustomerCreateFormFields,
  repository: CreateFormRepository,
  debounceMs: number,
) {
  const refs: DuplicateCheckRefs = {
    dedupeMatches: ref<CustomerDuplicateCandidate[]>([]),
    checkingDuplicates: ref(false),
    dedupeErrorCode: ref<CustomerCreateFormErrorCode | null>(null),
    duplicateRequestVersion: ref(0),
  };
  const refreshDedupe = createRefreshDedupe(fields, repository, refs);
  const { cancelPendingDedupe } = watchDuplicateFields(
    fields,
    refreshDedupe,
    debounceMs,
  );
  function resetDedupeState() {
    cancelPendingDedupe();
    resetDuplicateState(refs);
  }
  return createDuplicateStateApi({
    dedupeMatches: refs.dedupeMatches,
    checkingDuplicates: refs.checkingDuplicates,
    dedupeErrorCode: refs.dedupeErrorCode,
    refreshDedupe,
    resetDedupeState,
  });
}

function useCreateSubmission(
  fields: CustomerCreateFormFields,
  canCreate: Readonly<{ value: boolean }>,
  repository: CreateFormRepository,
) {
  const submitting = ref(false);
  const submitErrorCode = ref<CustomerCreateFormErrorCode | null>(null);

  async function createCustomer(): Promise<{ id: string } | null> {
    if (!canCreate.value || submitting.value) return null;

    submitting.value = true;
    submitErrorCode.value = null;
    try {
      return await repository.createCustomer(cloneFields(fields));
    } catch (error) {
      submitErrorCode.value = mapCreateFormError(error);
      return null;
    } finally {
      submitting.value = false;
    }
  }

  function resetSubmitState() {
    submitErrorCode.value = null;
  }

  return { submitting, submitErrorCode, createCustomer, resetSubmitState };
}

/**
 * 新建客户弹窗表单状态：字段、去重检查与提交流程。
 *
 * @param deps - 新建表单依赖的仓储能力
 * @param deps.repository - 去重检查与创建所需仓储
 * @returns 表单状态与创建操作
 */
export function useCustomerCreateForm(deps: UseCustomerCreateFormDeps) {
  const fields = reactive<CustomerCreateFormFields>({ ...BLANK_FIELDS });
  const canCreate = computed(
    () =>
      fields.legalName.trim() !== "" &&
      fields.group !== "" &&
      (fields.phone.trim() !== "" || fields.email.trim() !== ""),
  );
  const dedupe = useDuplicateCheckState(
    fields,
    deps.repository,
    deps.duplicateCheckDebounceMs ?? DEFAULT_DUPLICATE_CHECK_DEBOUNCE_MS,
  );
  const submission = useCreateSubmission(fields, canCreate, deps.repository);

  function resetForm() {
    Object.assign(fields, { ...BLANK_FIELDS });
    dedupe.resetDedupeState();
    submission.resetSubmitState();
  }

  return {
    fields,
    canCreate,
    dedupeMatches: computed(() => dedupe.dedupeMatches.value),
    showDedupe: dedupe.showDedupe,
    checkingDuplicates: computed(() => dedupe.checkingDuplicates.value),
    dedupeErrorCode: computed(() => dedupe.dedupeErrorCode.value),
    submitting: computed(() => submission.submitting.value),
    submitErrorCode: computed(() => submission.submitErrorCode.value),
    refreshDedupe: dedupe.refreshDedupe,
    createCustomer: submission.createCustomer,
    resetForm,
  };
}
