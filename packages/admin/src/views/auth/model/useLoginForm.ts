import { computed, reactive, ref } from "vue";
import { resolveAdminRedirectTarget } from "../../../auth/model/redirect";

/**
 *
 */
export interface LoginFormFields {
  /**
   *
   */
  email: string;
  /**
   *
   */
  password: string;
}

const BLANK_FIELDS: LoginFormFields = {
  email: "",
  password: "",
};

/**
 * 管理登录表单字段、提交校验和错误态。
 *
 * @returns 登录表单状态与操作方法
 */
export function useLoginForm() {
  const fields = reactive<LoginFormFields>({ ...BLANK_FIELDS });
  const submitError = ref("");
  const isSubmitting = ref(false);

  const canSubmit = computed(
    () =>
      !isSubmitting.value &&
      fields.email.trim() !== "" &&
      fields.password.trim() !== "",
  );

  function clearSubmitError(): void {
    submitError.value = "";
  }

  function setSubmitError(message: string): void {
    submitError.value = message;
  }

  function startSubmitting(): void {
    isSubmitting.value = true;
  }

  function finishSubmitting(): void {
    isSubmitting.value = false;
  }

  function resetForm(): void {
    Object.assign(fields, { ...BLANK_FIELDS });
    finishSubmitting();
    clearSubmitError();
  }

  function resolveRedirectTarget(raw: unknown): string {
    return resolveAdminRedirectTarget(raw);
  }

  return {
    fields,
    canSubmit,
    isSubmitting,
    submitError,
    clearSubmitError,
    setSubmitError,
    startSubmitting,
    finishSubmitting,
    resetForm,
    resolveRedirectTarget,
  };
}
