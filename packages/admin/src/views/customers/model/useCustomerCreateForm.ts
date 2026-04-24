import { computed, reactive, ref, watch } from "vue";
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
};

/** 新建客户流程可识别的错误码。 */
export type CustomerCreateFormErrorCode =
  | "unauthorized"
  | "validationError"
  | "requestFailed";

const BLANK_FIELDS: CustomerCreateFormFields = {
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

function watchDuplicateFields(
  fields: CustomerCreateFormFields,
  refreshDedupe: () => Promise<void>,
) {
  watch(
    [() => fields.legalName, () => fields.phone, () => fields.email],
    () => {
      void refreshDedupe();
    },
  );
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

function useDuplicateCheckState(
  fields: CustomerCreateFormFields,
  repository: CreateFormRepository,
) {
  const dedupeMatches = ref<CustomerDuplicateCandidate[]>([]);
  const checkingDuplicates = ref(false);
  const dedupeErrorCode = ref<CustomerCreateFormErrorCode | null>(null);
  const duplicateRequestVersion = ref(0);

  async function refreshDedupe(): Promise<void> {
    if (!shouldCheckDuplicates(fields)) {
      resetDuplicateState({
        dedupeMatches,
        checkingDuplicates,
        dedupeErrorCode,
        duplicateRequestVersion,
      });
      return;
    }

    const activeRequest = ++duplicateRequestVersion.value;
    checkingDuplicates.value = true;
    dedupeErrorCode.value = null;

    try {
      const nextMatches = await repository.checkDuplicates({
        name: fields.legalName,
        phone: fields.phone,
        email: fields.email,
      });
      if (activeRequest !== duplicateRequestVersion.value) return;
      dedupeMatches.value = nextMatches;
    } catch (error) {
      if (activeRequest !== duplicateRequestVersion.value) return;
      dedupeMatches.value = [];
      dedupeErrorCode.value = mapCreateFormError(error);
    } finally {
      if (activeRequest === duplicateRequestVersion.value)
        checkingDuplicates.value = false;
    }
  }

  function resetDedupeState() {
    resetDuplicateState({
      dedupeMatches,
      checkingDuplicates,
      dedupeErrorCode,
      duplicateRequestVersion,
    });
  }

  watchDuplicateFields(fields, refreshDedupe);
  return createDuplicateStateApi({
    dedupeMatches,
    checkingDuplicates,
    dedupeErrorCode,
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
  const dedupe = useDuplicateCheckState(fields, deps.repository);
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
