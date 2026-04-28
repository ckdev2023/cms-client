import { computed, reactive, ref, type ComputedRef, type Ref } from "vue";
import type {
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
import {
  resolveTemplateLabel,
  APPLICATION_TYPE_LABELS,
  type ApplicationType,
} from "../types-create";
// ─── Source Context → Customer Option Synthesis (p0-fe-010-02) ──
/**
 * 当 `sourceContext.customerId` 存在且客户不在 create customer list 中时，
 * 从 source context 携带的默认值合成一个 `CaseCreateCustomerOption`，
 * 确保 group 继承、标题派生与主申请人预选正常工作。
 *
 * 至少需要 `customerId` 与 `customerName`；缺少 name 则返回 `null`。
 *
 * @param ctx - 来源上下文
 * @returns 合成的客户选项；缺少 name 时返回 `null`
 */
function synthesizeCustomerFromSourceContext(
  ctx: CaseCreateSourceContext,
): CaseCreateCustomerOption | null {
  if (!ctx.customerId || !ctx.customerName) return null;
  return {
    id: ctx.customerId,
    name: ctx.customerName,
    kana: ctx.customerKana ?? "",
    group: ctx.customerGroup ?? "",
    groupLabel: ctx.customerGroupLabel ?? "",
    roleHint: "主申請人",
    summary: "",
    contact: ctx.customerContact ?? "",
    bmvQuestionnaireStatus: ctx.bmvQuestionnaireStatus ?? null,
    bmvQuoteStatus: ctx.bmvQuoteStatus ?? null,
    bmvSignStatus: ctx.bmvSignStatus ?? null,
    bmvIntakeStatus: ctx.bmvIntakeStatus ?? null,
  };
}
import {
  FAMILY_APPLICANT_ROLES,
  FAMILY_SUPPORTER_ROLES,
  mapSelectedRelationsToParties,
} from "./selectedRelationParties";
import type { CaseRepository } from "./CaseRepository";
import { createCaseRepository } from "./CaseRepository";
import { createSubmitFlow } from "./useCreateCaseModelSubmit";
export type { CreateCaseDraftState } from "../types";
export { synthesizeCustomerFromSourceContext };
/** 案件新建 composable 的依赖注入接口。 */
export interface UseCreateCaseModelDeps {
  /** 案件模板列表提供函数 */
  templates: () => readonly CaseTemplateDef[];
  /** 可选顾客列表提供函数 */
  customers: () => readonly CaseCreateCustomerOption[];
  /** 家族场景提供函数 */
  familyScenario: () => FamilyScenario;
  /** 案件担当选项提供函数 */
  ownerOptions: () => readonly CaseOwnerOption[];
  /** 案件分组选项提供函数 */
  groupOptions: () => readonly CaseGroupOption[];
  /** 来源上下文（从 lead / 顾客列表等跳转而来） */
  sourceContext: CaseCreateSourceContext;
  /** 默认分组 */
  defaultGroup: string;
  /** 默认担当 */
  defaultOwner: string;
  /** 案件仓储实例——默认使用 `createCaseRepository()`。 */
  repo?: CaseRepository;
  /** 当前 locale 提供函数——用于解析模板内嵌多语言标签。 */
  locale?: () => string;
}
import {
  buildCaseTitle,
  resolveGroupInheritanceLabel,
  hasAnySourceContext,
  resolveInitialTemplateId,
} from "./useCreateCaseModelActions";
export { buildCaseTitle, resolveGroupInheritanceLabel, hasAnySourceContext };

function initState(deps: UseCreateCaseModelDeps) {
  const templates = computed(() => deps.templates());
  const templatesById = computed(() => {
    const map = new Map<CaseTemplateId, CaseTemplateDef>();
    for (const t of templates.value) map.set(t.id, t);
    return map;
  });
  const sourceCustomer = deps.sourceContext.customerId
    ? (deps.customers().find((c) => c.id === deps.sourceContext.customerId) ??
      synthesizeCustomerFromSourceContext(deps.sourceContext) ??
      null)
    : null;
  const initialTpl = resolveInitialTemplateId(
    deps.sourceContext,
    templatesById.value,
    templates.value[0]?.id ?? "family",
  );
  const initialGroup = sourceCustomer?.group ?? deps.defaultGroup;
  const draft = reactive<CreateCaseDraftState>({
    currentStep: 1,
    templateId: initialTpl,
    applicationType:
      templatesById.value.get(initialTpl)?.applicationTypes[0] ??
      "certification",
    caseTitle: "",
    caseTitleManual: false,
    group: initialGroup,
    inheritedGroup: initialGroup,
    owner: deps.sourceContext.ownerUserId ?? deps.defaultOwner,
    dueDate: "",
    amount: "",
    groupOverrideReason: "",
    autoChecklist: true,
    autoTasks: true,
    familyBulkMode: deps.sourceContext.familyBulkMode,
    familyBulkSeeded: false,
    visaPlan: "",
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
  const loc = () => deps.locale?.() ?? "zh";
  const templateLabel = computed(() =>
    currentTemplate.value
      ? resolveTemplateLabel(currentTemplate.value.label, loc())
      : "",
  );
  const derivedTitle = computed(() =>
    buildCaseTitle(
      primaryCustomer.value?.name ?? "",
      templateLabel.value,
      resolveTemplateLabel(
        APPLICATION_TYPE_LABELS[draft.applicationType as ApplicationType],
        loc(),
      ),
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
  return {
    currentTemplate,
    templateLabel,
    isFamilyTemplate,
    isWorkTemplate,
    isFamilyBulkScenario,
    applicationTypes,
    derivedTitle,
    effectiveTitle,
    isGroupOverridden,
    needsGroupOverrideReason: computed(() => isGroupOverridden.value),
    groupInheritanceLabel: computed(() =>
      resolveGroupInheritanceLabel(deps.groupOptions, draft.inheritedGroup),
    ),
    hasSourceContext: computed(() => hasAnySourceContext(deps.sourceContext)),
  };
}

function createFamilyDerived(
  deps: UseCreateCaseModelDeps,
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
    const pc = primaryCustomer.value;
    if (pc) {
      result.push({
        customerId: pc.id,
        name: pc.name,
        role: pc.roleHint || "扶养者",
        contact: pc.contact,
        note: pc.summary,
        group: pc.group,
        groupLabel: pc.groupLabel,
      });
    }
    for (const p of additionalParties.value) {
      if (FAMILY_SUPPORTER_ROLES.includes(p.role)) result.push(p);
    }
    return result;
  });

  // ─── Family Context Completeness (p0-fe-011-02) ──────────────
  const familyContextComplete = computed(() => {
    if (!isFamilyBulkScenario.value) return true;
    if (!primaryCustomer.value) return false;
    if (familyApplicants.value.length === 0) return false;
    return true;
  });
  const familySourcedFromRelations = computed(
    () =>
      isFamilyBulkScenario.value &&
      (deps.sourceContext.selectedRelations?.length ?? 0) > 0,
  );

  return {
    familyApplicants,
    familySupporters,
    familyContextComplete,
    familySourcedFromRelations,
  };
}

import {
  createPreSignGateComputed,
  type CreatePreSignGateResult,
} from "./useCreateCasePreSignGate";
export type {
  CreatePreSignGateResult,
  CreatePreSignGateBlocker,
  PreSignGateBlockerCode,
} from "./useCreateCasePreSignGate";
export {
  checkCreatePreSignGate,
  PRE_SIGN_GATE_BLOCKER_CODES,
} from "./useCreateCasePreSignGate";

function createValidation(
  draft: CreateCaseDraftState,
  effectiveTitle: ComputedRef<string>,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
  isFamilyBulkScenario: ComputedRef<boolean>,
  familyApplicants: ComputedRef<CreateCaseRelatedParty[]>,
  needsGroupOverrideReason: ComputedRef<boolean>,
  preSignGate: ComputedRef<CreatePreSignGateResult>,
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
    canSubmit: computed(
      () => canProceedStep3.value && preSignGate.value.passed,
    ),
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
    const seededRelations = deps.sourceContext.selectedRelations?.length
      ? mapSelectedRelationsToParties({
          relations: deps.sourceContext.selectedRelations,
          group: draft.group,
          groupLabel,
        })
      : [];
    additionalParties.value = seededRelations.length
      ? seededRelations
      : scenario.defaultDraftParties.map(
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

import { createSetters, createMutators } from "./useCreateCaseModelActions";

// ─── Composable Assembly ────────────────────────────────────────

function wireDerived(
  deps: UseCreateCaseModelDeps,
  s: ReturnType<typeof initState>,
) {
  const {
    draft,
    primaryCustomer,
    additionalParties,
    templatesById,
    templates,
    sourceCustomer,
  } = s;
  const tpl = createTemplateDerived(
    deps,
    draft,
    primaryCustomer,
    templatesById,
    templates,
  );
  const fam = createFamilyDerived(
    deps,
    primaryCustomer,
    additionalParties,
    tpl.isFamilyBulkScenario,
  );
  const preSignGate = createPreSignGateComputed(draft, primaryCustomer);
  const val = createValidation(
    draft,
    tpl.effectiveTitle,
    primaryCustomer,
    tpl.isFamilyBulkScenario,
    fam.familyApplicants,
    tpl.needsGroupOverrideReason,
    preSignGate,
  );
  const grp = createGroupFamilyActions(
    deps,
    draft,
    primaryCustomer,
    additionalParties,
    sourceCustomer,
    tpl.isFamilyBulkScenario,
  );
  return {
    draft,
    primaryCustomer,
    additionalParties,
    templatesById,
    tpl,
    fam,
    val,
    grp,
    preSignGate,
  };
}

function wireModel(
  deps: UseCreateCaseModelDeps,
  s: ReturnType<typeof initState>,
  repo: CaseRepository,
) {
  const d = wireDerived(deps, s);
  const sub = createSubmitFlow({
    repo,
    draft: d.draft,
    effectiveTitle: d.tpl.effectiveTitle,
    primaryCustomer: d.primaryCustomer,
    additionalParties: d.additionalParties,
    canSubmit: d.val.canSubmit,
    isFamilyBulkScenario: d.tpl.isFamilyBulkScenario,
    familyApplicants: d.fam.familyApplicants,
    familySupporters: d.fam.familySupporters,
    templateLabel: d.tpl.templateLabel,
  });
  return {
    ...d.tpl,
    ...d.fam,
    ...d.val,
    ...d.grp,
    preSignGate: d.preSignGate,
    ...createSetters(d.draft),
    ...createMutators(
      d.draft,
      d.primaryCustomer,
      d.additionalParties,
      d.templatesById,
      d.grp,
      d.val.canProceed,
    ),
    ...sub,
  };
}

/**
 * 案件新建 Draft Model。
 *
 * @param deps - 数据源与来源上下文。
 * @returns 草稿状态、派生值与操作集合。
 */
export function useCreateCaseModel(deps: UseCreateCaseModelDeps) {
  const repo = deps.repo ?? createCaseRepository();
  const s = initState(deps);
  const parts = wireModel(deps, s, repo);
  parts.syncInheritedGroup(true);
  if (s.draft.familyBulkMode && parts.isFamilyTemplate.value) {
    parts.seedFamilyBulkParties();
  }
  return {
    draft: s.draft,
    primaryCustomer: s.primaryCustomer,
    additionalParties: s.additionalParties,
    sourceCustomerId: deps.sourceContext.customerId ?? null,
    templateLocked: computed(() => !!deps.sourceContext.templateCode),
    ...parts,
  };
}

/** useCreateCaseModel 返回值类型，用于子组件 props 声明。 */
export type CreateCaseModel = ReturnType<typeof useCreateCaseModel>;
