/**
 *
 */
export type CaseTemplateId =
  | "family"
  | "work"
  | "bmv"
  | "biz_mgmt_cert_4m"
  | "biz_mgmt_cert_1y"
  | "biz_mgmt_renewal"
  | "eng_humanities_intl_cert"
  | "eng_humanities_intl_renewal"
  | "intra_company_transfer"
  | "company_setup";

/** 内嵌多语言标签，避免 i18n 字典爆炸。 */
export type I18nLabel = {
  /**
   *
   */
  zh: string; /**
   *
   */
  en: string; /**
   *
   */
  ja: string;
};

/**
 *
 */
export type ApplicationType = "certification" | "change_of_status" | "renewal";

/** ApplicationType → 三语显示标签，供 model 层标题派生与 Vue 层回显使用。 */
export const APPLICATION_TYPE_LABELS: Record<ApplicationType, I18nLabel> = {
  certification: { zh: "认定", en: "Certificate of Eligibility", ja: "認定" },
  change_of_status: { zh: "变更", en: "Change of Status", ja: "変更" },
  renewal: { zh: "更新", en: "Renewal", ja: "更新" },
};

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
  label: I18nLabel;
  /**
   *
   */
  required: boolean;
  /** 条件场景标记（如"仅配偶""仅子女""仅认定"）。 */
  conditionalTag?: string;
}

/**
 *
 */
export interface CaseTemplateRequirementSection {
  /**
   *
   */
  title: I18nLabel;
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
  label: I18nLabel;
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
  subtitle: I18nLabel | string;
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
  /** 对应的 i18n key：`cases.create.steps.step<N>`。 */
  i18nKey: string;
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
  /** P1: 签证方案（仅 BMV 案件有值）。 */
  visaPlan: string;
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
  relationIds?: string[];
  /**
   *
   */
  selectedRelations?: CaseCreateSelectedRelation[];
  /**
   *
   */
  familyBulkMode: boolean;
  /** 单建案场景显式指定的模板 ID。 */
  templateId?: CaseTemplateId;
  /** BMV 等跨模块入口锁定的模板 code（readonly，不允许员工切换）。 */
  templateCode?: CaseTemplateId;
  /** 来源 Lead 的担当 ID——BMV 转案件时预填 owner。 */
  ownerUserId?: string;

  // ─── Customer Defaults (p0-fe-010-02) ─────────────────────────
  // 从客户详情页携带的客户默认值，用于在客户不在 create customer list 中时
  // 合成 CaseCreateCustomerOption，确保 group 继承、标题派生与主申请人预选。

  /** 客户显示名。 */
  customerName?: string;
  /** 客户假名。 */
  customerKana?: string;
  /** 客户所属分组 ID。 */
  customerGroup?: string;
  /** 客户所属分组标签。 */
  customerGroupLabel?: string;
  /** 客户联系方式。 */
  customerContact?: string;

  // ─── BMV Pre-Sign Gate Defaults (bug-039) ──────────────────────
  // 从客户详情页透传 BMV 四前提状态；当客户不在 create customer list 中时，
  // 由 synthesizeCustomerFromSourceContext 合成到 CaseCreateCustomerOption，
  // 供建案向导 pre-sign gate 使用。

  /** BMV 问卷回收状态。 */
  bmvQuestionnaireStatus?: string;
  /** BMV 报价确认状态。 */
  bmvQuoteStatus?: string;
  /** BMV 签约状态。 */
  bmvSignStatus?: string;
  /** BMV 承接就绪状态。 */
  bmvIntakeStatus?: string;
}

/** 批量建案来源里透传的关联人上下文。 */
export interface CaseCreateSelectedRelation {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
  /**
   *
   */
  relationType: string;
  /**
   * 关联对象类型；缺失时按历史兼容逻辑视为 customer。
   */
  kind?: "customer" | "contact_person";
  /**
   *
   */
  roleTitle?: string;
  /**
   *
   */
  phone?: string;
  /**
   *
   */
  email?: string;
  /**
   *
   */
  tags?: string[];
  /**
   *
   */
  note?: string;
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
  contactPersonId?: string;
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

/**
 * 按 locale 取 I18nLabel 对应语言的文本，fallback 到 zh。
 * 同时兼容 `"zh-CN"` 和 `"zh"` 两种格式。
 *
 * @param label - I18nLabel 对象
 * @param locale - 目标语言代码（默认 "zh"）
 * @returns 解析后的字符串标签
 */
export function resolveTemplateLabel(
  label: I18nLabel | string | undefined,
  locale: string = "zh",
): string {
  if (!label) return "";
  if (typeof label === "string") return label;
  const short = locale.split("-")[0] as keyof I18nLabel;
  return label[short] ?? label.zh;
}
