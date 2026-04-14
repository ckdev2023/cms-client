import { computed, reactive, ref, type ComputedRef, type Ref } from "vue";
import type {
  ApplicationType,
  CaseCreateCustomerOption,
  CaseCreateSourceContext,
  CaseGroupOption,
  CaseOwnerOption,
  CaseTemplateDef,
  CaseTemplateId,
  CreateCaseDraftState,
  CreateCaseRelatedParty,
  CreateCaseStep,
  FamilyScenario,
} from "../types";

export type { CreateCaseDraftState } from "../types";

// ─── Dependencies ───────────────────────────────────────────────

/**
 *
 */
export interface UseCreateCaseModelDeps {
  /**
   *
   */
  templates: () => readonly CaseTemplateDef[];
  /**
   *
   */
  customers: () => readonly CaseCreateCustomerOption[];
  /**
   *
   */
  familyScenario: () => FamilyScenario;
  /**
   *
   */
  ownerOptions: () => readonly CaseOwnerOption[];
  /**
   *
   */
  groupOptions: () => readonly CaseGroupOption[];
  /**
   *
   */
  sourceContext: CaseCreateSourceContext;
  /**
   *
   */
  defaultGroup: string;
  /**
   *
   */
  defaultOwner: string;
}

// ─── Pure Helpers ───────────────────────────────────────────────

const FAMILY_APPLICANT_ROLES = ["主申请人", "配偶", "子女"];
const FAMILY_SUPPORTER_ROLES = ["扶养者", "保证人"];

/**
 * 根据主申请人、模板、申请类型自动生成案件标题。
 *
 * @param customerName - 主申请人姓名
 * @param templateLabel - 模板中文标签
 * @param applicationType - 申请类型
 * @param isFamilyBulk - 是否批量建案
 * @returns 组合后的标题字符串
 */
export function buildCaseTitle(
  customerName: string,
  templateLabel: string,
  applicationType: ApplicationType,
  isFamilyBulk: boolean,
): string {
  const base = customerName
    ? `${customerName} ${templateLabel}${applicationType}`
    : `${templateLabel}${applicationType}`;
  return isFamilyBulk ? `${base}（批量）` : base;
}

// ─── State Initialization ───────────────────────────────────────

function initState(deps: UseCreateCaseModelDeps) {
  const templates = computed(() => deps.templates());
  const templatesById = computed(() => {
    const map = new Map<CaseTemplateId, CaseTemplateDef>();
    for (const t of templates.value) map.set(t.id, t);
    return map;
  });
  const sourceCustomer = deps.sourceContext.customerId
    ? (deps.customers().find((c) => c.id === deps.sourceContext.customerId) ??
      null)
    : null;
  const initialTpl: CaseTemplateId = deps.sourceContext.familyBulkMode
    ? "family"
    : (templates.value[0]?.id ?? "family");
  const initialGroup = sourceCustomer?.group ?? deps.defaultGroup;

  const draft = reactive<CreateCaseDraftState>({
    currentStep: 1,
    templateId: initialTpl,
    applicationType:
      templatesById.value.get(initialTpl)?.applicationTypes[0] ?? "认定",
    caseTitle: "",
    caseTitleManual: false,
    group: initialGroup,
    inheritedGroup: initialGroup,
    owner: deps.defaultOwner,
    dueDate: "",
    amount: "",
    groupOverrideReason: "",
    autoChecklist: true,
    autoTasks: true,
    familyBulkMode: deps.sourceContext.familyBulkMode,
    familyBulkSeeded: false,
  });

  return {
    templates,
    templatesById,
    sourceCustomer,
    draft,
    primaryCustomer: ref<CaseCreateCustomerOption | null>(sourceCustomer),
    additionalParties: ref<CreateCaseRelatedParty[]>([]),
  };
}

// ─── Template & Title Derived ───────────────────────────────────

function createTemplateDerived(
  deps: UseCreateCaseModelDeps,
  draft: CreateCaseDraftState,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  templatesById: ComputedRef<Map<CaseTemplateId, CaseTemplateDef>>,
  templates: ComputedRef<readonly CaseTemplateDef[]>,
) {
  const currentTemplate = computed(
    () => templatesById.value.get(draft.templateId) ?? templates.value[0],
  );
  const isFamilyTemplate = computed(() => draft.templateId === "family");
  const isWorkTemplate = computed(() => draft.templateId === "work");
  const isFamilyBulkScenario = computed(
    () => draft.familyBulkMode && isFamilyTemplate.value,
  );
  const applicationTypes = computed(
    () => currentTemplate.value?.applicationTypes ?? [],
  );
  const derivedTitle = computed(() =>
    buildCaseTitle(
      primaryCustomer.value?.name ?? "",
      currentTemplate.value?.label ?? "",
      draft.applicationType,
      isFamilyBulkScenario.value,
    ),
  );
  const effectiveTitle = computed(() =>
    draft.caseTitleManual && draft.caseTitle.trim()
      ? draft.caseTitle
      : derivedTitle.value,
  );
  const isGroupOverridden = computed(
    () => draft.group !== draft.inheritedGroup,
  );
  const needsGroupOverrideReason = computed(() => isGroupOverridden.value);
  const groupInheritanceLabel = computed(() => {
    const opt = deps
      .groupOptions()
      .find((g) => g.value === draft.inheritedGroup);
    return opt?.label ?? draft.inheritedGroup;
  });
  const hasSourceContext = computed(
    () => !!(deps.sourceContext.sourceLeadId || deps.sourceContext.customerId),
  );
  return {
    currentTemplate,
    isFamilyTemplate,
    isWorkTemplate,
    isFamilyBulkScenario,
    applicationTypes,
    derivedTitle,
    effectiveTitle,
    isGroupOverridden,
    needsGroupOverrideReason,
    groupInheritanceLabel,
    hasSourceContext,
  };
}

// ─── Family Derived ─────────────────────────────────────────────

function createFamilyDerived(
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  additionalParties: Ref<CreateCaseRelatedParty[]>,
  isFamilyBulkScenario: ComputedRef<boolean>,
) {
  const familyApplicants = computed(() => {
    if (!isFamilyBulkScenario.value) return [];
    return additionalParties.value.filter((p) =>
      FAMILY_APPLICANT_ROLES.includes(p.role),
    );
  });
  const familySupporters = computed(() => {
    if (!isFamilyBulkScenario.value) return [];
    const result: CreateCaseRelatedParty[] = [];
    if (primaryCustomer.value) {
      result.push({
        name: primaryCustomer.value.name,
        role: primaryCustomer.value.roleHint || "扶养者",
        contact: primaryCustomer.value.contact,
        note: primaryCustomer.value.summary,
        group: primaryCustomer.value.group,
        groupLabel: primaryCustomer.value.groupLabel,
      });
    }
    for (const p of additionalParties.value) {
      if (FAMILY_SUPPORTER_ROLES.includes(p.role)) result.push(p);
    }
    return result;
  });
  return { familyApplicants, familySupporters };
}

// ─── Validation ─────────────────────────────────────────────────

function createValidation(
  draft: CreateCaseDraftState,
  effectiveTitle: ComputedRef<string>,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  isFamilyBulkScenario: ComputedRef<boolean>,
  familyApplicants: ComputedRef<CreateCaseRelatedParty[]>,
  needsGroupOverrideReason: ComputedRef<boolean>,
) {
  const canProceedStep1 = computed(
    () =>
      !!draft.templateId &&
      !!draft.applicationType &&
      !!effectiveTitle.value.trim(),
  );
  const canProceedStep2 = computed(() => {
    if (!primaryCustomer.value) return false;
    if (isFamilyBulkScenario.value) return familyApplicants.value.length > 0;
    return true;
  });
  const canProceedStep3 = computed(() => {
    if (!draft.owner || !draft.dueDate || !draft.amount) return false;
    if (needsGroupOverrideReason.value && !draft.groupOverrideReason.trim())
      return false;
    return true;
  });
  function canProceed(step: CreateCaseStep): boolean {
    if (step === 1) return canProceedStep1.value;
    if (step === 2) return canProceedStep2.value;
    if (step === 3) return canProceedStep3.value;
    return true;
  }
  return {
    canProceedStep1,
    canProceedStep2,
    canProceedStep3,
    canProceed,
    canGoNext: computed(() => canProceed(draft.currentStep)),
    canSubmit: computed(() => canProceedStep3.value),
    isLastStep: computed(() => draft.currentStep === 4),
    isFirstStep: computed(() => draft.currentStep === 1),
  };
}

// ─── Group & Family Actions ─────────────────────────────────────

function createGroupFamilyActions(
  deps: UseCreateCaseModelDeps,
  draft: CreateCaseDraftState,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  additionalParties: Ref<CreateCaseRelatedParty[]>,
  sourceCustomer: CaseCreateCustomerOption | null,
  isFamilyBulkScenario: ComputedRef<boolean>,
) {
  function computeInheritedGroup(): string {
    if (primaryCustomer.value?.group) return primaryCustomer.value.group;
    if (sourceCustomer?.group) return sourceCustomer.group;
    return deps.defaultGroup;
  }
  function syncInheritedGroup(force: boolean) {
    const next = computeInheritedGroup();
    if (force || !draft.group || draft.group === draft.inheritedGroup) {
      draft.group = next;
    }
    draft.inheritedGroup = next;
  }
  function seedFamilyBulkParties() {
    if (!isFamilyBulkScenario.value || draft.familyBulkSeeded) return;
    if (additionalParties.value.length > 0) return;
    const scenario = deps.familyScenario();
    const groupLabel =
      deps.groupOptions().find((g) => g.value === draft.group)?.label ??
      draft.group;
    additionalParties.value = scenario.defaultDraftParties.map(
      (dp): CreateCaseRelatedParty => ({
        name: dp.name,
        role: dp.role,
        relation: dp.relation,
        contact: dp.contact,
        note: dp.note,
        reuseDocs: dp.reuseDocs,
        staleDocWarning: dp.staleDocWarning,
        group: draft.group,
        groupLabel,
      }),
    );
    draft.familyBulkSeeded = true;
  }
  return { syncInheritedGroup, seedFamilyBulkParties };
}

// ─── Simple Setters ─────────────────────────────────────────────

function createSetters(draft: CreateCaseDraftState) {
  return {
    setGroup: (v: string) => void (draft.group = v),
    setOwner: (v: string) => void (draft.owner = v),
    setDueDate: (v: string) => void (draft.dueDate = v),
    setAmount: (v: string) => void (draft.amount = v),
    setGroupOverrideReason: (v: string) => void (draft.groupOverrideReason = v),
    setAutoChecklist: (v: boolean) => void (draft.autoChecklist = v),
    setAutoTasks: (v: boolean) => void (draft.autoTasks = v),
  };
}

// ─── Draft Mutators ─────────────────────────────────────────────

function createMutators(
  draft: CreateCaseDraftState,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  additionalParties: Ref<CreateCaseRelatedParty[]>,
  templatesById: ComputedRef<Map<CaseTemplateId, CaseTemplateDef>>,
  groupFamily: ReturnType<typeof createGroupFamilyActions>,
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

// ─── Composable ─────────────────────────────────────────────────

/**
 * 案件新建 Draft Model：来源上下文、stepper、模板切换、group 继承与校验。
 *
 * @param deps - 数据源与来源上下文注入
 * @returns 草稿状态、派生值与操作方法
 */
export function useCreateCaseModel(deps: UseCreateCaseModelDeps) {
  const s = initState(deps);
  const tplDerived = createTemplateDerived(
    deps,
    s.draft,
    s.primaryCustomer,
    s.templatesById,
    s.templates,
  );
  const famDerived = createFamilyDerived(
    s.primaryCustomer,
    s.additionalParties,
    tplDerived.isFamilyBulkScenario,
  );
  const validation = createValidation(
    s.draft,
    tplDerived.effectiveTitle,
    s.primaryCustomer,
    tplDerived.isFamilyBulkScenario,
    famDerived.familyApplicants,
    tplDerived.needsGroupOverrideReason,
  );
  const groupFamily = createGroupFamilyActions(
    deps,
    s.draft,
    s.primaryCustomer,
    s.additionalParties,
    s.sourceCustomer,
    tplDerived.isFamilyBulkScenario,
  );
  const setters = createSetters(s.draft);
  const mutators = createMutators(
    s.draft,
    s.primaryCustomer,
    s.additionalParties,
    s.templatesById,
    groupFamily,
    validation.canProceed,
  );

  groupFamily.syncInheritedGroup(true);
  if (s.draft.familyBulkMode && tplDerived.isFamilyTemplate.value) {
    groupFamily.seedFamilyBulkParties();
  }

  return {
    draft: s.draft,
    primaryCustomer: s.primaryCustomer,
    additionalParties: s.additionalParties,
    ...tplDerived,
    ...famDerived,
    ...validation,
    ...groupFamily,
    ...setters,
    ...mutators,
  };
}

/** useCreateCaseModel 返回值类型，用于子组件 props 声明。 */
export type CreateCaseModel = ReturnType<typeof useCreateCaseModel>;
