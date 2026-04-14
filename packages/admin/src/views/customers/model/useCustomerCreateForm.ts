import { reactive, computed } from "vue";
import type { CustomerCreateFormFields, CustomerSummary } from "../types";

/**
 *
 */
export interface UseCustomerCreateFormDeps {
  /**
   *
   */
  existingCustomers: () => CustomerSummary[];
}

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

function findDedupeMatches(
  fields: CustomerCreateFormFields,
  customers: CustomerSummary[],
): CustomerSummary[] {
  const phone = fields.phone.trim().replace(/[-\s]/g, "");
  const email = fields.email.trim().toLowerCase();
  if (!phone && !email) return [];
  return customers.filter((c) => {
    if (phone) {
      const existing = c.phone.replace(/[-\s]/g, "");
      if (existing && existing.includes(phone)) return true;
    }
    return !!(email && c.email && c.email.toLowerCase() === email);
  });
}

/**
 * 新建客户弹窗表单状态：12 字段、校验、去重。
 *
 * @param deps - 表单依赖（现有客户列表用于去重）
 * @returns 表单字段、校验与去重状态
 */
export function useCustomerCreateForm(deps: UseCustomerCreateFormDeps) {
  const fields = reactive<CustomerCreateFormFields>({ ...BLANK_FIELDS });

  /** P0 §4.3: 姓名(法定) + 所属 Group + (電話 ∨ 郵箱) */
  const canCreate = computed(
    () =>
      fields.legalName.trim() !== "" &&
      fields.group !== "" &&
      (fields.phone.trim() !== "" || fields.email.trim() !== ""),
  );

  const dedupeMatches = computed(() =>
    findDedupeMatches(fields, deps.existingCustomers()),
  );

  const showDedupe = computed(() => dedupeMatches.value.length > 0);

  function resetForm() {
    Object.assign(fields, { ...BLANK_FIELDS });
  }

  return { fields, canCreate, dedupeMatches, showDedupe, resetForm };
}
