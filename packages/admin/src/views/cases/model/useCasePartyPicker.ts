import { computed, reactive, ref, type ComputedRef, type Ref } from "vue";
import type { CaseCreateCustomerOption } from "../types";
import { CASE_GROUP_OPTIONS } from "../constants";

// ─── Types ──────────────────────────────────────────────────

/**
 *
 */
export type PartyPickerMode = "primary" | "related";

/**
 *
 */
export interface QuickCreateCustomerForm {
  /**
   *
   */
  name: string;
  /**
   *
   */
  role: string;
  /**
   *
   */
  groupId: string;
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
  note: string;
}

/**
 *
 */
export interface DuplicateConfirmation {
  /**
   *
   */
  hits: CaseCreateCustomerOption[];
  /**
   *
   */
  reason: string;
  /**
   *
   */
  confirmedAt: string;
}

/**
 *
 */
export interface PartyPickerResult {
  /**
   *
   */
  mode: PartyPickerMode;
  /**
   *
   */
  customer: CaseCreateCustomerOption;
  /**
   *
   */
  isNewlyCreated: boolean;
  /**
   *
   */
  duplicateConfirmation: DuplicateConfirmation | null;
}

// ─── Dependencies ───────────────────────────────────────────

/**
 *
 */
export interface UseCasePartyPickerDeps {
  /**
   *
   */
  existingCustomers: () => readonly CaseCreateCustomerOption[];
  /**
   *
   */
  generateId?: () => string;
  /**
   *
   */
  now?: () => string;
}

// ─── Internal state shape ───────────────────────────────────

interface PickerState {
  isOpen: Ref<boolean>;
  mode: Ref<PartyPickerMode>;
  form: QuickCreateCustomerForm;
  duplicateHits: Ref<CaseCreateCustomerOption[]>;
  showDuplicateConfirmation: Ref<boolean>;
  confirmReason: Ref<string>;
  lastResult: Ref<PartyPickerResult | null>;
}

// ─── Pure helpers ───────────────────────────────────────────

const EMPTY_FORM: QuickCreateCustomerForm = {
  name: "",
  role: "",
  groupId: "",
  phone: "",
  email: "",
  note: "",
};

/**
 * 在已有客户联系方式中检测重复。
 *
 * @param customers - 已有客户列表
 * @param phone - 输入的电话
 * @param email - 输入的邮箱
 * @returns 命中的客户列表
 */
export function detectDuplicates(
  customers: readonly CaseCreateCustomerOption[],
  phone: string,
  email: string,
): CaseCreateCustomerOption[] {
  if (!phone && !email) return [];
  const hits: CaseCreateCustomerOption[] = [];
  for (const c of customers) {
    const contact = c.contact.toLowerCase();
    if (phone && contact.includes(phone.toLowerCase())) {
      hits.push(c);
    } else if (email && contact.includes(email.toLowerCase())) {
      hits.push(c);
    }
  }
  return hits;
}

// ─── Computed ───────────────────────────────────────────────

function createPickerComputed(
  form: QuickCreateCustomerForm,
  showDuplicateConfirmation: Ref<boolean>,
  confirmReason: Ref<string>,
) {
  const formErrors = computed(() => {
    const errors: Partial<Record<keyof QuickCreateCustomerForm, string>> = {};
    if (!form.name.trim()) errors.name = "姓名为必填项";
    if (!form.role.trim()) errors.role = "角色为必填项";
    if (!form.groupId) errors.groupId = "所属 Group 为必填项";
    if (!form.phone.trim() && !form.email.trim()) {
      errors.phone = "电话与邮箱至少填写一项";
      errors.email = "电话与邮箱至少填写一项";
    }
    return errors;
  });

  const isFormValid = computed(
    () => Object.keys(formErrors.value).length === 0,
  );

  const canSave = computed(() => {
    if (!isFormValid.value) return false;
    if (showDuplicateConfirmation.value && !confirmReason.value.trim()) {
      return false;
    }
    return true;
  });

  return { formErrors, isFormValid, canSave };
}

// ─── Form actions ───────────────────────────────────────────

function createFormActions(s: PickerState) {
  function open(pickerMode: PartyPickerMode) {
    s.mode.value = pickerMode;
    Object.assign(s.form, { ...EMPTY_FORM });
    s.duplicateHits.value = [];
    s.showDuplicateConfirmation.value = false;
    s.confirmReason.value = "";
    s.lastResult.value = null;
    s.isOpen.value = true;
  }

  function close() {
    s.isOpen.value = false;
  }

  function setField<K extends keyof QuickCreateCustomerForm>(
    field: K,
    value: QuickCreateCustomerForm[K],
  ) {
    s.form[field] = value;
    if (field === "phone" || field === "email") {
      s.showDuplicateConfirmation.value = false;
      s.duplicateHits.value = [];
      s.confirmReason.value = "";
    }
  }

  function setConfirmReason(reason: string) {
    s.confirmReason.value = reason;
  }

  return { open, close, setField, setConfirmReason };
}

// ─── Customer builder ───────────────────────────────────────

function buildCustomerFromForm(
  form: QuickCreateCustomerForm,
  getId: () => string,
): CaseCreateCustomerOption {
  const groupOption = CASE_GROUP_OPTIONS.find((g) => g.value === form.groupId);
  return {
    id: getId(),
    name: form.name.trim(),
    kana: "",
    group: form.groupId,
    groupLabel: groupOption?.label ?? form.groupId,
    roleHint: form.role.trim(),
    summary: form.note.trim(),
    contact: [form.phone.trim(), form.email.trim()].filter(Boolean).join(" / "),
  };
}

function closeWithResult(s: PickerState, result: PartyPickerResult) {
  s.lastResult.value = result;
  s.isOpen.value = false;
}

// ─── Save actions ───────────────────────────────────────────

function createSaveActions(
  deps: UseCasePartyPickerDeps,
  s: PickerState,
  isFormValid: ComputedRef<boolean>,
  getId: () => string,
  getNow: () => string,
) {
  function attemptSave(): PartyPickerResult | null {
    if (!isFormValid.value) return null;

    if (!s.showDuplicateConfirmation.value) {
      const hits = detectDuplicates(
        deps.existingCustomers(),
        s.form.phone.trim(),
        s.form.email.trim(),
      );
      if (hits.length > 0) {
        s.duplicateHits.value = hits;
        s.showDuplicateConfirmation.value = true;
        return null;
      }
    }

    if (s.showDuplicateConfirmation.value && !s.confirmReason.value.trim()) {
      return null;
    }

    const result: PartyPickerResult = {
      mode: s.mode.value,
      customer: buildCustomerFromForm(s.form, getId),
      isNewlyCreated: true,
      duplicateConfirmation: s.showDuplicateConfirmation.value
        ? {
            hits: [...s.duplicateHits.value],
            reason: s.confirmReason.value.trim(),
            confirmedAt: getNow(),
          }
        : null,
    };
    closeWithResult(s, result);
    return result;
  }

  function selectExisting(
    customer: CaseCreateCustomerOption,
  ): PartyPickerResult {
    const result: PartyPickerResult = {
      mode: s.mode.value,
      customer,
      isNewlyCreated: false,
      duplicateConfirmation: null,
    };
    closeWithResult(s, result);
    return result;
  }

  return { attemptSave, selectExisting };
}

// ─── Composable ─────────────────────────────────────────────

/**
 * 案件新建时的当事人选择 / 快速新建客户弹窗。
 *
 * @param deps - 外部依赖注入
 * @returns 弹窗状态、校验、操作方法
 */
export function useCasePartyPicker(deps: UseCasePartyPickerDeps) {
  const getId = deps.generateId ?? (() => `new-${Date.now()}`);
  const getNow = deps.now ?? (() => new Date().toISOString());

  const state: PickerState = {
    isOpen: ref(false),
    mode: ref<PartyPickerMode>("primary"),
    form: reactive<QuickCreateCustomerForm>({ ...EMPTY_FORM }),
    duplicateHits: ref<CaseCreateCustomerOption[]>([]),
    showDuplicateConfirmation: ref(false),
    confirmReason: ref(""),
    lastResult: ref<PartyPickerResult | null>(null),
  };

  const pickerComputed = createPickerComputed(
    state.form,
    state.showDuplicateConfirmation,
    state.confirmReason,
  );
  const formActions = createFormActions(state);
  const saveActions = createSaveActions(
    deps,
    state,
    pickerComputed.isFormValid,
    getId,
    getNow,
  );

  return {
    ...state,
    ...pickerComputed,
    ...formActions,
    ...saveActions,
  };
}
