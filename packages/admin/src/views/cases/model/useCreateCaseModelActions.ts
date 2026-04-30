import { computed, type ComputedRef, type Ref } from "vue";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";
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
 * 拼接模板标签与申请类型标签，处理双重拼接与跨脚本空格问题（BUG-149）。
 *
 * 规则：
 * - 模板标签若已包含申请类型字面（zh-CN "经营管理（认定 4 个月）" + "认定" /
 *   ja "経営管理（更新）" + "更新"），直接返回模板标签，避免重复出现。
 * - 边界字符任一为 ASCII 字母数字时插入空格（en-US "Dependent Visa" +
 *   "Certificate of Eligibility" → 中间补空格），CJK 之间保持紧贴。
 *
 * @param templateLabel - 模板标签（已解析为当前语言）
 * @param applicationTypeLabel - 申请类型标签（已解析为当前语言）
 * @returns 拼接结果
 */
function joinTemplateAndType(
  templateLabel: string,
  applicationTypeLabel: string,
): string {
  const tpl = templateLabel.trim();
  const type = applicationTypeLabel.trim();
  if (!type) return tpl;
  if (!tpl) return type;
  if (tpl.includes(type)) return tpl;
  const isLatinChar = (ch: string): boolean => /[A-Za-z0-9]/.test(ch);
  const needSpace = isLatinChar(tpl[tpl.length - 1]!) || isLatinChar(type[0]!);
  return needSpace ? `${tpl} ${type}` : `${tpl}${type}`;
}

/**
 * 根据主申请人、模板、申请类型自动生成案件标题。
 *
 * 模板标签与申请类型标签的拼接由 `joinTemplateAndType` 处理：
 * - 当模板标签已包含申请类型字面（如 "经营管理（认定 4 个月）"）时不重复追加；
 * - 当任一侧出现 Latin 字符（en-US 链路）时在中间补空格，避免黏连。
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
  const head = joinTemplateAndType(templateLabel, applicationTypeLabel);
  const base = customerName ? `${customerName} ${head}` : head;
  return isFamilyBulk ? `${base}（批量）` : base;
}

/**
 * 解析 group 继承标签。
 *
 * 解析顺序：先在静态 catalog 选项里直查 `value`；未命中时回落到
 * `resolveGroupLabel`，以便覆盖服务端 UUID + 别名表的 BMV 链路场景
 * （BUG-139）。提供 locale 时按 locale 返回本地化标签；缺省时由
 * `resolveGroupLabel` 内部默认 ja-JP，保持历史行为。
 *
 * @param groupOptions - group 选项提供函数（catalog snapshot）
 * @param inheritedGroup - 继承的 group 值（可能是 catalog id 或 DB UUID）
 * @param locale - 当前 locale；未提供时退回 `resolveGroupLabel` 默认值
 * @returns group 标签
 */
export function resolveGroupInheritanceLabel(
  groupOptions: () => readonly CaseGroupOption[],
  inheritedGroup: string,
  locale?: string,
): string {
  if (!inheritedGroup) return inheritedGroup;
  const option = groupOptions().find((group) => group.value === inheritedGroup);
  if (option) return option.label;
  return resolveGroupLabel(inheritedGroup, undefined, locale);
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

/** 建案 wizard 共用的 deps 子集，仅暴露 group 继承标签所需字段。 */
export interface GroupInheritanceLabelDeps {
  /** group 选项提供函数（catalog snapshot）。 */
  groupOptions: () => readonly CaseGroupOption[];
  /** 当前 locale 提供函数；缺省时 `resolveGroupLabel` 默认 ja-JP。 */
  locale?: () => string;
}

/**
 * 工厂方法：基于 deps + draft 生成 `groupInheritanceLabel` 计算属性。
 *
 * 抽出此 helper 是为了让 `createTemplateDerived` 在维持 `max-lines-per-function`
 * 60 行预算的前提下仍能透传 locale 参数（BUG-139）。
 *
 * @param deps - 提供 groupOptions 与 locale 的依赖子集
 * @param draft - 建案草稿状态，读取 `inheritedGroup`
 * @returns 解析后的 group 继承标签计算属性
 */
export function createGroupInheritanceLabel(
  deps: GroupInheritanceLabelDeps,
  draft: CreateCaseDraftState,
): ComputedRef<string> {
  return computed(() =>
    resolveGroupInheritanceLabel(
      deps.groupOptions,
      draft.inheritedGroup,
      deps.locale?.(),
    ),
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
