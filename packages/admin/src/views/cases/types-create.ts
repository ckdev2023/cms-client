/**
 *
 */
export type CaseTemplateId = "family" | "work";

/**
 *
 */
export type ApplicationType = "认定" | "变更" | "更新";

/**
 *
 */
export interface CaseTemplateRequirementItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  required: boolean;
}

/**
 *
 */
export interface CaseTemplateRequirementSection {
  /**
   *
   */
  title: string;
  /**
   *
   */
  items: CaseTemplateRequirementItem[];
}

/**
 *
 */
export interface CaseTemplateDef {
  /**
   *
   */
  id: CaseTemplateId;
  /**
   *
   */
  label: string;
  /**
   *
   */
  badge: string;
  /**
   *
   */
  applicationTypes: readonly ApplicationType[];
  /**
   *
   */
  subtitle: string;
  /**
   *
   */
  sections: CaseTemplateRequirementSection[];
}

/**
 *
 */
export type CreateCaseStep = 1 | 2 | 3 | 4;

/**
 *
 */
export interface CreateCaseStepDef {
  /**
   *
   */
  step: CreateCaseStep;
  /**
   *
   */
  label: string;
}

/** 新建案件 Draft 状态。 */
export interface CreateCaseDraftState {
  /**
   *
   */
  currentStep: CreateCaseStep;
  /**
   *
   */
  templateId: CaseTemplateId;
  /**
   *
   */
  applicationType: ApplicationType;
  /**
   *
   */
  caseTitle: string;
  /**
   *
   */
  caseTitleManual: boolean;
  /**
   *
   */
  group: string;
  /**
   *
   */
  inheritedGroup: string;
  /**
   *
   */
  owner: string;
  /**
   *
   */
  dueDate: string;
  /**
   *
   */
  amount: string;
  /**
   *
   */
  groupOverrideReason: string;
  /**
   *
   */
  autoChecklist: boolean;
  /**
   *
   */
  autoTasks: boolean;
  /**
   *
   */
  familyBulkMode: boolean;
  /**
   *
   */
  familyBulkSeeded: boolean;
}

/** 来源上下文：从 Lead / Customer 转化进入新建页时携带的参数。 */
export interface CaseCreateSourceContext {
  /**
   *
   */
  sourceLeadId?: string;
  /**
   *
   */
  customerId?: string;
  /**
   *
   */
  familyBulkMode: boolean;
}

/** 新建案件关联人草稿条目（Modal 快速新建或家族批量初始化均使用此结构）。 */
export interface CreateCaseRelatedParty {
  /**
   *
   */
  customerId?: string;
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
  relation?: string;
  /**
   *
   */
  group?: string;
  /**
   *
   */
  groupLabel?: string;
  /**
   *
   */
  contact: string;
  /**
   *
   */
  note: string;
  /**
   *
   */
  reuseDocs?: string[];
  /**
   *
   */
  staleDocWarning?: string;
}
