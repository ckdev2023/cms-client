import type { CaseStageId } from "./types";

/**
 *
 */
export interface BmvWorkflowStepDef {
  /**
   *
   */
  code: string;
  /**
   *
   */
  label: string;
  /**
   *
   */
  i18nKey: string;
  /**
   *
   */
  parentStage: CaseStageId;
  /**
   *
   */
  sortOrder: number;
  /**
   *
   */
  isFailureStep?: boolean;
}

export const BMV_WORKFLOW_STEPS: readonly BmvWorkflowStepDef[] = [
  {
    code: "WAITING_MATERIAL",
    label: "等待资料",
    i18nKey: "cases.constants.bmvSteps.WAITING_MATERIAL",
    parentStage: "S2",
    sortOrder: 1,
  },
  {
    code: "MATERIAL_PREPARING",
    label: "资料准备中",
    i18nKey: "cases.constants.bmvSteps.MATERIAL_PREPARING",
    parentStage: "S3",
    sortOrder: 2,
  },
  {
    code: "REVIEWING",
    label: "内部审核",
    i18nKey: "cases.constants.bmvSteps.REVIEWING",
    parentStage: "S4",
    sortOrder: 3,
  },
  {
    code: "APPLYING",
    label: "申请提交",
    i18nKey: "cases.constants.bmvSteps.APPLYING",
    parentStage: "S5",
    sortOrder: 4,
  },
  {
    code: "UNDER_REVIEW",
    label: "审查中",
    i18nKey: "cases.constants.bmvSteps.UNDER_REVIEW",
    parentStage: "S5",
    sortOrder: 5,
  },
  {
    code: "NEED_SUPPLEMENT",
    label: "需要补正",
    i18nKey: "cases.constants.bmvSteps.NEED_SUPPLEMENT",
    parentStage: "S5",
    sortOrder: 6,
  },
  {
    code: "SUPPLEMENT_PROCESSING",
    label: "补正处理中",
    i18nKey: "cases.constants.bmvSteps.SUPPLEMENT_PROCESSING",
    parentStage: "S5",
    sortOrder: 7,
  },
  {
    code: "APPROVED",
    label: "已下签",
    i18nKey: "cases.constants.bmvSteps.APPROVED",
    parentStage: "S6",
    sortOrder: 8,
  },
  {
    code: "WAITING_PAYMENT",
    label: "等待尾款",
    i18nKey: "cases.constants.bmvSteps.WAITING_PAYMENT",
    parentStage: "S7",
    sortOrder: 9,
  },
  {
    code: "COE_SENT",
    label: "COE已发送",
    i18nKey: "cases.constants.bmvSteps.COE_SENT",
    parentStage: "S7",
    sortOrder: 10,
  },
  {
    code: "VISA_APPLYING",
    label: "海外返签申请中",
    i18nKey: "cases.constants.bmvSteps.VISA_APPLYING",
    parentStage: "S7",
    sortOrder: 11,
  },
  {
    code: "ENTRY_SUCCESS",
    label: "入境成功",
    i18nKey: "cases.constants.bmvSteps.ENTRY_SUCCESS",
    parentStage: "S8",
    sortOrder: 12,
  },
  {
    code: "VISA_REJECTED",
    label: "签证拒否",
    i18nKey: "cases.constants.bmvSteps.VISA_REJECTED",
    parentStage: "S9",
    sortOrder: 13,
    isFailureStep: true,
  },
  {
    code: "RESIDENCE_PERIOD_RECORDED",
    label: "在留期间已录入",
    i18nKey: "cases.constants.bmvSteps.RESIDENCE_PERIOD_RECORDED",
    parentStage: "S8",
    sortOrder: 14,
  },
  {
    code: "RENEWAL_REMINDER_SCHEDULED",
    label: "续签提醒已设置",
    i18nKey: "cases.constants.bmvSteps.RENEWAL_REMINDER_SCHEDULED",
    parentStage: "S8",
    sortOrder: 15,
  },
] as const;

export const BMV_WORKFLOW_STEP_MAP = new Map(
  BMV_WORKFLOW_STEPS.map((s) => [s.code, s]),
);

/**
 *
 */
export interface BmvStageGroup {
  /**
   *
   */
  stage: CaseStageId;
  /**
   *
   */
  stageI18nKey: string;
  /**
   *
   */
  steps: BmvWorkflowStepDef[];
}

/**
 * 按父阶段分组返回 BMV 业务子步骤列表，保持蓝图顺序。
 *
 * @returns 按阶段分组的步骤数组
 */
export function getBmvStageGroups(): BmvStageGroup[] {
  const groupMap = new Map<CaseStageId, BmvWorkflowStepDef[]>();
  const stageOrder: CaseStageId[] = [];
  for (const step of BMV_WORKFLOW_STEPS) {
    if (!groupMap.has(step.parentStage)) {
      groupMap.set(step.parentStage, []);
      stageOrder.push(step.parentStage);
    }
    groupMap.get(step.parentStage)!.push(step);
  }
  return stageOrder.map((stage) => ({
    stage,
    stageI18nKey: `cases.constants.stages.${stage}`,
    steps: groupMap.get(stage)!,
  }));
}

/**
 * 根据步骤代码获取 i18n key。
 *
 * @param stepCode - BMV 步骤代码
 * @returns i18n key；未匹配时返回 `""`
 */
export function getBmvStepI18nKey(stepCode: string): string {
  return BMV_WORKFLOW_STEP_MAP.get(stepCode)?.i18nKey ?? "";
}

/**
 * 根据步骤代码获取 fallback 标签。
 *
 * @param stepCode - BMV 步骤代码
 * @returns fallback 标签；未匹配时返回原始值
 */
export function getBmvStepLabel(stepCode: string): string {
  return BMV_WORKFLOW_STEP_MAP.get(stepCode)?.label ?? stepCode;
}
