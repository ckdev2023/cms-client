/**
 * 经营管理签承接问卷状态。
 */
export type BmvQuestionnaireStatus = "not_started" | "sent" | "returned";

/**
 * 经营管理签报价状态。
 */
export type BmvQuoteStatus = "not_started" | "generated" | "confirmed";

/**
 * 经营管理签签约状态。
 */
export type BmvSignStatus = "not_started" | "pending" | "signed";

/**
 * 经营管理签整体承接状态。
 */
export type BmvIntakeStatus =
  | "not_started"
  | "questionnaire_pending"
  | "quote_pending"
  | "sign_pending"
  | "ready_for_case_creation";

/**
 * 经营管理签承接档案。
 */
export interface CustomerBmvProfile {
  /** */
  questionnaireStatus: BmvQuestionnaireStatus;
  /** */
  quoteStatus: BmvQuoteStatus;
  /** */
  signStatus: BmvSignStatus;
  /** */
  intakeStatus: BmvIntakeStatus;
  /** */
  questionnaireSentAt: string | null;
  /** */
  questionnaireReturnedAt: string | null;
  /** */
  quoteGeneratedAt: string | null;
  /** */
  quoteConfirmedAt: string | null;
  /** */
  signedAt: string | null;
  /** */
  note: string | null;
  /** 来源 Lead ID——Lead 转化时写入，便于追溯与建案入口透传。 */
  sourceLeadId: string | null;
  /** 来源 Lead 的 group_id——建案时继承。 */
  leadGroupId: string | null;
  /** 来源 Lead 的 owner_user_id——建案时继承。 */
  leadOwnerUserId: string | null;
}

/**
 * 报价历史版本（来自 intake_forms[form_kind='bmv_quote']）。
 */
export interface BmvQuoteVersion {
  /**
   *
   */
  id: string;
  /**
   *
   */
  version: number;
  /**
   *
   */
  amount: string;
  /**
   *
   */
  createdAt: string;
  /**
   *
   */
  isCurrent: boolean;
}

/**
 * 问卷回收数据摘要（来自 intake_forms[form_kind='bmv_questionnaire']）。
 */
export interface BmvSurveyDataSummary {
  /**
   *
   */
  completedAt: string | null;
  /**
   *
   */
  fieldCount: number;
  /**
   *
   */
  highlightFields: { label: string; value: string }[];
}

/**
 * 关联 BMV 案件进度摘要。
 */
export interface BmvLinkedCaseSummary {
  /**
   *
   */
  caseId: string;
  /**
   *
   */
  caseName: string;
  /**
   *
   */
  stage: string;
  /**
   *
   */
  postApprovalStage: string | null;
  /**
   *
   */
  coeStatus: string | null;
  /**
   *
   */
  coeIssuedAt: string | null;
  /**
   *
   */
  coeExpiresAt: string | null;
}

/**
 * BMV 相关提醒摘要。
 */
export interface BmvReminderSummary {
  /**
   *
   */
  id: string;
  /**
   *
   */
  type: string;
  /**
   *
   */
  dueAt: string;
  /**
   *
   */
  status: string;
}

/**
 * BMV 聚合数据（对应 GET /admin/customers/:id/bmv 返回）。
 */
export interface CustomerBmvAggregate {
  /**
   *
   */
  profile: CustomerBmvProfile;
  /**
   *
   */
  quoteHistory: BmvQuoteVersion[];
  /**
   *
   */
  surveyDataSummary: BmvSurveyDataSummary | null;
  /**
   *
   */
  linkedCase: BmvLinkedCaseSummary | null;
  /**
   *
   */
  reminders: BmvReminderSummary[];
}

/**
 * 根据三个子步骤推导经营管理签 intakeStatus。
 *
 * @param profile - 经营管理签承接流程当前子步骤状态
 * @param profile.questionnaireStatus - 问卷阶段状态
 * @param profile.quoteStatus - 报价阶段状态
 * @param profile.signStatus - 签约阶段状态
 * @returns 由问卷 → 报价 → 签约门禁推导出的整体 intakeStatus
 */
export function resolveBmvIntakeStatus(profile: {
  questionnaireStatus: BmvQuestionnaireStatus;
  quoteStatus: BmvQuoteStatus;
  signStatus: BmvSignStatus;
}): BmvIntakeStatus {
  if (
    profile.questionnaireStatus === "not_started" &&
    profile.quoteStatus === "not_started" &&
    profile.signStatus === "not_started"
  ) {
    return "not_started";
  }
  if (profile.signStatus === "signed") {
    return "ready_for_case_creation";
  }
  if (profile.questionnaireStatus !== "returned") {
    return "questionnaire_pending";
  }
  if (
    profile.quoteStatus === "generated" ||
    profile.quoteStatus === "confirmed" ||
    profile.signStatus === "pending"
  ) {
    return "sign_pending";
  }
  return "quote_pending";
}
