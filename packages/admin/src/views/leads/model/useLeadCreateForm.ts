import { reactive, computed } from "vue";
import type { LeadCreateFormFields, LeadSummary } from "../types";
import {
  isValidEmail,
  isValidPhone,
} from "../../../shared/util/contactValidators";

/**
 *
 */
export interface UseLeadCreateFormDeps {
  /**
   *
   */
  existingLeads: () => LeadSummary[];
}

const BLANK_FIELDS: LeadCreateFormFields = {
  name: "",
  phone: "",
  email: "",
  source: "",
  referrer: "",
  businessType: "",
  group: "",
  owner: "",
  nextAction: "",
  nextFollowUp: "",
  language: "",
  note: "",
};

function findDedupeMatches(
  fields: LeadCreateFormFields,
  leads: LeadSummary[],
): LeadSummary[] {
  const phone = fields.phone.trim().replace(/[-\s]/g, "");
  const email = fields.email.trim().toLowerCase();
  if (!phone && !email) return [];
  return leads.filter((l) => {
    if (phone) {
      const existing = l.phone.replace(/[-\s]/g, "");
      if (existing && existing === phone) return true;
    }
    return !!(email && l.email && l.email.toLowerCase() === email);
  });
}

/**
 * 新建线索弹窗表单状态：12 字段、校验、去重。
 *
 * @param deps - 表单依赖（现有线索列表用于去重）
 * @returns 表单字段、校验与去重状态
 */
export function useLeadCreateForm(deps: UseLeadCreateFormDeps) {
  const fields = reactive<LeadCreateFormFields>({ ...BLANK_FIELDS });

  /** 姓名 + (电话 ∨ 邮箱) 为最低创建条件；非空联系方式须通过格式校验。 */
  const canCreate = computed(() => {
    if (fields.name.trim() === "") return false;
    const phone = fields.phone.trim();
    const email = fields.email.trim();
    if (!phone && !email) return false;
    if (phone && !isValidPhone(phone)) return false;
    if (email && !isValidEmail(email)) return false;
    return true;
  });

  const dedupeMatches = computed(() =>
    findDedupeMatches(fields, deps.existingLeads()),
  );

  const showDedupe = computed(() => dedupeMatches.value.length > 0);

  function resetForm() {
    Object.assign(fields, { ...BLANK_FIELDS });
  }

  return { fields, canCreate, dedupeMatches, showDedupe, resetForm };
}
