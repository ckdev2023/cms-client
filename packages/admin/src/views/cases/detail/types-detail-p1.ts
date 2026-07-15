/**
 * P1（经营管理签 / BMV）详情类型 —— B5 的暂存处，非最终归宿。
 *
 * 自 `types-detail.ts` 拆出（B3）。按方案书 B5「等活跃 P1 批次退出前，bmv 相关
 * 文件只挂垫片不移动」，这批类型暂不迁入 `bmv/`；单独成文件而非塞进
 * `types-detail-core.ts`，是为了 B5 迁移时能整文件移动、不必再从骨架里挑拣。
 */

// ─── P1 Survey / Quote / Pre-Sign Gate ───────────────────────────
// 问卷回收、报价确认与签约前建案门禁。
// 来源：CaseDetailAggregateDto.counts（questionnaireItemsTotal/Done）
//       + billing（quotePrice）+ case record（visaPlan, signedAt）。
// P0 案件此字段为 null。

/** 问卷/报价完成度状态键。 */
export type SurveyQuoteStatusKey = "not_started" | "in_progress" | "completed";

/**
 * 问卷或报价的完成状态摘要。
 */
export interface SurveyQuoteStatus {
  /** 状态键。 */
  statusKey: SurveyQuoteStatusKey;
  /** 展示标签（已翻译）。 */
  statusLabel: string;
  /** 语义色调（用于 badge 展示）。 */
  tone: "muted" | "warning" | "success";
  /** 进度文案（如 "1/3" 或 "已确认"）。 */
  progressLabel: string;
}

/**
 * 签约前门禁状态 — 问卷回收与报价确认前不得签约建案成功。
 */
export interface PreSignGateInfo {
  /** 门禁是否通过（问卷已完成 + 报价已确认）。 */
  passed: boolean;
  /** 阻断原因列表（门禁未通过时展示）。 */
  blockers: PreSignBlocker[];
}

/**
 * 签约前门禁的单个阻断项。
 */
export interface PreSignBlocker {
  /** 阻断代码（`survey_incomplete` / `quote_unconfirmed`）。 */
  code: string;
  /** 阻断原因展示标签。 */
  label: string;
}

// ─── P1 BMV Workflow Step Summary ─────────────────────────────────
// 经营管理签业务子步骤摘要 — 与 S1-S9 管理层阶段并行显示。
// 来源：CaseDetailAggregateDto.case.currentWorkflowStepCode
//       + BMV_WORKFLOW_STEPS_BLUEPRINT 蓝图。
// P0 案件此字段为 null（无 workflow step）。

/**
 * 经营管理签当前业务子步骤摘要。
 */
export interface WorkflowStepSummary {
  /** 步骤代码（如 `"WAITING_MATERIAL"`）。 */
  stepCode: string;
  /** 步骤展示标签（如 `"等待资料"`）。 */
  stepLabel: string;
  /** 所属管理层阶段（如 `"S2"`）。 */
  parentStage: string;
  /** 管理层阶段展示标签（如 `"资料收集中"`）。 */
  parentStageLabel: string;
  /** 蓝图排序号。 */
  sortOrder: number;
  /** 是否为失败终态步骤（`VISA_REJECTED`）。 */
  isFailureStep: boolean;
  /**
   * 失败结案（`CLOSED_FAILED`）后服务端仍返回认定后「可推进」子步骤代码；
   * 业务子步骤区不再将该步标为「进行中」，并调整组样式与汇总文案。
   */
  workflowStepInactiveAtTerminalFailure?: boolean;
}
