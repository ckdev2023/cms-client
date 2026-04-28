import type { ComputedRef, Ref } from "vue";
import type {
  ApplicationType,
  CaseCreateCustomerOption,
  CaseCreateSourceContext,
  CaseGroupOption,
  CaseTemplateDef,
  CaseTemplateId,
  CreateCaseDraftState,
  CreateCaseRelatedParty,
  CreateCaseStep,
} from "../types";

/** templateCode 到 templateId 的别名映射。 */
const TEMPLATE_CODE_ALIASES: Record<string, CaseTemplateId> = {
  bmv: "biz_mgmt_cert_4m",
};

/**
 * 解析建案初始模板 ID，优先锁定模板 > source 指定 > fallback。
 *
 * @param sourceContext - 来源上下文
 * @param templatesById - 模板索引 map
 * @param fallbackTemplateId - 默认模板 ID
 * @returns 解析后的模板 ID
 */
export function resolveInitialTemplateId(
  sourceContext: CaseCreateSourceContext,
  templatesById: Map<CaseTemplateId, CaseTemplateDef>,
  fallbackTemplateId: CaseTemplateId,
): CaseTemplateId {
  if (sourceContext.familyBulkMode) return "family";
  const code = sourceContext.templateCode;
  if (code) {
    const aliased = TEMPLATE_CODE_ALIASES[code];
    const resolved = aliased ?? code;
    if (resolved && templatesById.has(resolved)) return resolved;
  }
  const sourceTemplateId = sourceContext.templateId;
  if (sourceTemplateId && templatesById.has(sourceTemplateId)) {
    return sourceTemplateId;
  }
  return fallbackTemplateId;
}

// ─── Pure Helpers ───────────────────────────────────────────────

/**
 * 根据主申请人、模板、申请类型自动生成案件标题。
 *
 * @param customerName - 主申请人姓名
 * @param templateLabel - 模板标签（已解析为当前语言）
 * @param applicationTypeLabel - 申请类型标签（已解析为当前语言）
 * @param isFamilyBulk - 是否批量建案
 * @returns 组合后的标题字符串
 */
export function buildCaseTitle(
  customerName: string,
  templateLabel: string,
  applicationTypeLabel: string,
  isFamilyBulk: boolean,
): string {
  const base = customerName
    ? `${customerName} ${templateLabel}${applicationTypeLabel}`
    : `${templateLabel}${applicationTypeLabel}`;
  return isFamilyBulk ? `${base}（批量）` : base;
}

/**
 * 解析 group 继承标签。
 *
 * @param groupOptions - group 选项提供函数
 * @param inheritedGroup - 继承的 group 值
 * @returns group 标签
 */
export function resolveGroupInheritanceLabel(
  groupOptions: () => readonly CaseGroupOption[],
  inheritedGroup: string,
): string {
  const option = groupOptions().find((group) => group.value === inheritedGroup);
  return option?.label ?? inheritedGroup;
}

/**
 * 判断 sourceContext 是否包含任何有效来源信息。
 *
 * @param sourceContext - 来源上下文
 * @returns 是否有来源信息
 */
export function hasAnySourceContext(
  sourceContext: CaseCreateSourceContext,
): boolean {
  return !!(
    sourceContext.sourceLeadId ||
    sourceContext.customerId ||
    sourceContext.relationIds?.length ||
    sourceContext.selectedRelations?.length
  );
}

// ─── Simple Setters ─────────────────────────────────────────────

/**
 * 创建草稿状态简单 setter 集合。
 *
 * @param draft - 草稿状态
 * @returns setter 方法集
 */
export function createSetters(draft: CreateCaseDraftState) {
  return {
    setGroup: (v: string) => void (draft.group = v),
    setOwner: (v: string) => void (draft.owner = v),
    setDueDate: (v: string) => void (draft.dueDate = v),
    setAmount: (v: string) => void (draft.amount = v),
    setGroupOverrideReason: (v: string) => void (draft.groupOverrideReason = v),
    setAutoChecklist: (v: boolean) => void (draft.autoChecklist = v),
    setAutoTasks: (v: boolean) => void (draft.autoTasks = v),
    setVisaPlan: (v: string) => void (draft.visaPlan = v),
  };
}

// ─── Draft Mutators ─────────────────────────────────────────────

/** Group/Family 操作的接口定义。 */
export interface GroupFamilyActions {
  /** 同步继承的 group。 */
  syncInheritedGroup: (force: boolean) => void;
  /** 种子家族批量当事人。 */
  seedFamilyBulkParties: () => void;
}

/**
 * 创建草稿状态变更方法集合。
 *
 * @param draft - 草稿状态
 * @param primaryCustomer - 主申请人 ref
 * @param additionalParties - 关联人列表 ref
 * @param templatesById - 模板索引 map
 * @param groupFamily - group/family 操作
 * @param canProceed - 步骤校验函数
 * @returns 变更方法集
 */
export function createMutators(
  draft: CreateCaseDraftState,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  additionalParties: Ref<CreateCaseRelatedParty[]>,
  templatesById: ComputedRef<Map<CaseTemplateId, CaseTemplateDef>>,
  groupFamily: GroupFamilyActions,
  canProceed: (step: CreateCaseStep) => boolean,
) {
  return {
    selectTemplate(id: CaseTemplateId) {
      draft.templateId = id;
      const tpl = templatesById.value.get(id);
      if (tpl) draft.applicationType = tpl.applicationTypes[0];
      if (!draft.caseTitleManual) draft.caseTitle = "";
      if (id === "family" && draft.familyBulkMode)
        groupFamily.seedFamilyBulkParties();
    },
    setApplicationType(v: ApplicationType) {
      draft.applicationType = v;
      if (!draft.caseTitleManual) draft.caseTitle = "";
    },
    setCaseTitle(v: string) {
      draft.caseTitle = v;
      draft.caseTitleManual = !!v.trim();
    },
    setPrimaryCustomer(customer: CaseCreateCustomerOption | null) {
      primaryCustomer.value = customer;
      groupFamily.syncInheritedGroup(false);
      if (!draft.caseTitleManual) draft.caseTitle = "";
    },
    addRelatedParty(party: CreateCaseRelatedParty) {
      additionalParties.value = [...additionalParties.value, party];
    },
    removeRelatedParty(index: number) {
      additionalParties.value = additionalParties.value.filter(
        (_, i) => i !== index,
      );
    },
    enableFamilyBulkMode() {
      if (draft.familyBulkMode) return;
      draft.familyBulkMode = true;
      draft.familyBulkSeeded = false;
      draft.templateId = "family";
      groupFamily.seedFamilyBulkParties();
    },
    goNext() {
      if (!canProceed(draft.currentStep) || draft.currentStep >= 4) return;
      draft.currentStep = (draft.currentStep + 1) as CreateCaseStep;
    },
    goPrev() {
      if (draft.currentStep > 1)
        draft.currentStep = (draft.currentStep - 1) as CreateCaseStep;
    },
    goToStep(step: CreateCaseStep) {
      if (step <= draft.currentStep) draft.currentStep = step;
    },
  };
}
