/**
 * `core/cases` 模块对外公共出口（拆分批次 S1）。
 *
 * 规则：模块外代码（其他 core 子域、portal、scripts）只能从本文件 import
 * cases 能力；直接引用 cases 内部文件属于架构违例，由 dependency-cruiser
 * 规则 `cases-internals-are-module-private` 检查（迁移期 warn，收口批升 error）。
 *
 * 例外：`app.module.ts`（DI 组装根）与测试/test-support 文件可直接引用内部实现。
 *
 * 本文件只做 re-export，不承载任何逻辑；新增对外符号时优先评估
 * 「消费方是否真的需要」，避免把内部实现细节升格为公共契约。
 */

// ── 服务 ──────────────────────────────────────────────────────────
export { CasesService } from "../cases.service";
export { CaseAccessService } from "../access/caseAccess.service";

// ── 模板解析（跨模块注入令牌与最小接口）──────────────────────────
export { TEMPLATES_RESOLVER } from "../cases.service.types-internal";
export type { TemplatesResolver } from "../cases.service.types-internal";

// ── 错误码与核心输入类型（冻结契约：code 值不得变更）────────────
export {
  CASE_WRITE_ERROR_CODES,
  VALIDATION_SUBMISSION_ERROR_CODES,
} from "../cases.types";
export type { CaseCreateInput } from "../cases.types";

// ── 收费读模型类型（billing 模块消费）────────────────────────────
export type {
  BillingListSummaryDto,
  CaseBillingPlanDto,
  CasePaymentRecordDto,
} from "../cases.types-billing";

// ── 文书类型与错误码（generated-documents 模块消费）──────────────
export { GENERATED_DOCUMENT_ERROR_CODES } from "../cases.types-generated-docs";
export type {
  GeneratedDocumentCreateInput,
  GeneratedDocumentDto,
  GeneratedDocumentListInput,
  GeneratedDocumentListResult,
  GeneratedDocumentUpdateInput,
} from "../cases.types-generated-docs";

// ── BMV 模板与建案门禁（customers / leads / portal-intake 消费）──
export {
  BMV_CASE_TYPE,
  BMV_REMINDER_SCHEDULE_BLUEPRINT,
  isBmvCaseTypeCode,
} from "../cases.template-bmv";
export { BMV_REQUIREMENT_BLUEPRINT } from "../bmvTemplateConfig";
export {
  BMV_CASE_CREATION_GATE_CODES,
  checkBmvCaseCreationGate,
} from "../cases.types-bmv-gate";

// ── 案件类型口径与日文标签 ────────────────────────────────────────
export { CANONICAL_CASE_TYPE_OPTIONS } from "../caseTypeCanonical";
export { CASE_TYPE_LABELS_JA, getCaseTypeLabelJa } from "../caseTypeLabels.ja";

// ── 清单 / 模板复用（portal-leads、residence-periods、scripts 消费）─
export { resolveChecklistItems } from "../cases.service.create-flow";
export type { ChecklistItem } from "../cases.service.write-ops";
export {
  findActiveCaseTemplateByCaseType,
  parseRequirementBlueprint,
  resolveCaseTypeCandidates,
} from "../cases.template.repository";
export type {
  ReminderScheduleBlueprintItem,
  RequirementBlueprintItem,
} from "../cases.types-template-blueprints";

// ── 流转闸口（submission-packages 专用窄接口）────────────────────
export { validateTransitionGate } from "../flow/stage/stageTransitionGates";

// ── timeline 辅助（leads 转化建案兜底应收）───────────────────────
export { ensureAtLeastOneBillingRecordForCase } from "../cases.service.timeline";
