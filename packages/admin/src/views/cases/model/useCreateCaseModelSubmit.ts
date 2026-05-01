import { ref, type ComputedRef, type Ref } from "vue";
import type {
  CaseCreateCustomerOption,
  CreateCaseDraftState,
  CreateCaseRelatedParty,
} from "../types";
import type { CaseRepository } from "./CaseRepository";
import { CaseRepositoryError } from "./CaseRepositorySupport";
import type { CaseMutationResult } from "./CaseAdapterTypes";
import {
  buildCreateCaseInputFromDraft,
  buildPrimaryCasePartyInput,
  buildRelatedCasePartyInput,
  type CreateCaseDraftSnapshot,
} from "./CaseAdapterWriteBuilders";
import { defaultQuickCreateCustomer } from "./quickCreateCustomer";
/**
 * 草稿状態から提出用のプレーンなスナップショットを生成する。
 *
 * @param draft - 作成中の案件草稿状態
 * @param effectiveTitle - 自動/手動合成後の案件タイトル
 * @param primaryCustomer - 主申請者
 * @returns API 送信用スナップショット
 */
function collectDraftSnapshot(
  draft: CreateCaseDraftState,
  effectiveTitle: ComputedRef<string>,
  primaryCustomer: Ref<CaseCreateCustomerOption | null>,
): CreateCaseDraftSnapshot {
  return {
    customerId: primaryCustomer.value?.id ?? "",
    templateId: draft.templateId,
    applicationType: draft.applicationType,
    effectiveTitle: effectiveTitle.value,
    group: draft.group,
    inheritedGroup: draft.inheritedGroup,
    groupOverrideReason: draft.groupOverrideReason,
    owner: draft.owner,
    dueDate: draft.dueDate,
    amount: draft.amount,
    visaPlan: draft.visaPlan,
  };
}

/** `normalizeSubmitError` が返す構造化エラー情報。 */
export interface SubmitErrorInfo {
  /**
   *
   */
  message: string;
  /**
   *
   */
  code?: string;
  /**
   *
   */
  detail?: string;
}

/**
 * 提出エラーを構造化情報に正規化する。
 *
 * @param e - 任意错误对象
 * @returns 归一化后的结构化错误信息
 */
export function normalizeSubmitError(e: unknown): SubmitErrorInfo {
  if (e instanceof CaseRepositoryError) {
    const message = e.serverErrorCode
      ? `${e.serverErrorCode}: ${e.message}`
      : e.message;
    return {
      message,
      code: e.serverErrorCode ?? undefined,
      detail: e.detail ?? undefined,
    };
  }
  if (e instanceof Error) return { message: e.message };
  return { message: String(e) };
}

async function resolveBulkApplicantCustomer(
  applicant: CreateCaseRelatedParty,
): Promise<CreateCaseRelatedParty> {
  const existingCustomerId = applicant.customerId?.trim();
  if (existingCustomerId) {
    return existingCustomerId === applicant.customerId
      ? applicant
      : { ...applicant, customerId: existingCustomerId };
  }
  const created = await defaultQuickCreateCustomer(applicant);
  return { ...applicant, customerId: created.id };
}
// ─── Post-Create Party Submission (p0-fe-008-01) ────────────────
// 对接边界：
//   - 单案件模式：createCase → createCaseParty × N（主申请人 + 关联人）
//   - 家族批量模式：每个家庭成员独立建案，每案各自提交关联人
//   - 关联人提交失败不影响案件创建结果（fire-and-forget，仅 warn）
//   - 服务端 POST /case-parties 要求 caseId 指向已存在的非 S9 案件

async function submitPartiesAfterCreate(
  repo: CaseRepository,
  caseId: string,
  primaryCustomerId: string,
  additionalParties: readonly CreateCaseRelatedParty[],
): Promise<string[]> {
  const warnings: string[] = [];

  if (primaryCustomerId) {
    try {
      await repo.createCaseParty(
        buildPrimaryCasePartyInput(caseId, primaryCustomerId),
      );
    } catch (e) {
      warnings.push(
        `Primary party submit failed: ${normalizeSubmitError(e).message}`,
      );
    }
  }

  for (const party of additionalParties) {
    try {
      await repo.createCaseParty(buildRelatedCasePartyInput(caseId, party));
    } catch (e) {
      warnings.push(
        `Party "${party.name}" submit failed: ${normalizeSubmitError(e).message}`,
      );
    }
  }

  return warnings;
}

/** 家族批量建案的单案结果。 */
export interface FamilyBulkCaseResult {
  /**
   *
   */
  applicantName: string;
  /**
   *
   */
  caseResult: CaseMutationResult | null;
  /**
   *
   */
  error?: string;
  /**
   *
   */
  partyWarnings: string[];
}

function buildApplicantSnapshot(
  base: CreateCaseDraftSnapshot,
  applicant: CreateCaseRelatedParty,
  templateLabel: string,
): CreateCaseDraftSnapshot {
  const title = applicant.name
    ? `${applicant.name} ${templateLabel}${base.applicationType}`
    : `${templateLabel}${base.applicationType}`;
  return {
    ...base,
    customerId: applicant.customerId ?? "",
    effectiveTitle: title,
  };
}

async function submitBulkApplicantParty(
  repo: CaseRepository,
  caseId: string,
  applicant: CreateCaseRelatedParty,
): Promise<string[]> {
  if (!applicant.customerId) return [];
  try {
    await repo.createCaseParty(
      buildPrimaryCasePartyInput(caseId, applicant.customerId),
    );
    return [];
  } catch (e) {
    return [
      `[${applicant.name}] Primary party failed: ${normalizeSubmitError(e).message}`,
    ];
  }
}

async function submitBulkSupporters(
  repo: CaseRepository,
  caseId: string,
  applicantName: string,
  supporters: readonly CreateCaseRelatedParty[],
  primaryCustomerId: string,
): Promise<string[]> {
  const warnings: string[] = [];
  for (const supporter of supporters) {
    try {
      await repo.createCaseParty(buildRelatedCasePartyInput(caseId, supporter));
    } catch (e) {
      warnings.push(
        `[${applicantName}] Supporter "${supporter.name}" failed: ${normalizeSubmitError(e).message}`,
      );
    }
  }
  const alreadyIncluded = supporters.some(
    (s) => s.customerId === primaryCustomerId,
  );
  if (primaryCustomerId && !alreadyIncluded) {
    try {
      await repo.createCaseParty(
        buildRelatedCasePartyInput(caseId, {
          customerId: primaryCustomerId,
          role: "扶養者",
        }),
      );
    } catch (e) {
      warnings.push(
        `[${applicantName}] Primary-as-supporter failed: ${normalizeSubmitError(e).message}`,
      );
    }
  }
  return warnings;
}

async function submitOneBulkCase(
  repo: CaseRepository,
  baseSnapshot: CreateCaseDraftSnapshot,
  templateLabel: string,
  primaryCustomerId: string,
  applicant: CreateCaseRelatedParty,
  supporters: readonly CreateCaseRelatedParty[],
): Promise<FamilyBulkCaseResult> {
  const entry: FamilyBulkCaseResult = {
    applicantName: applicant.name,
    caseResult: null,
    partyWarnings: [],
  };
  try {
    const resolvedApplicant = await resolveBulkApplicantCustomer(applicant);
    const snapshot = buildApplicantSnapshot(
      baseSnapshot,
      resolvedApplicant,
      templateLabel,
    );
    const result = await repo.createCase(
      buildCreateCaseInputFromDraft(snapshot),
    );
    entry.caseResult = result;
    const pw = await submitBulkApplicantParty(
      repo,
      result.id,
      resolvedApplicant,
    );
    const sw = await submitBulkSupporters(
      repo,
      result.id,
      applicant.name,
      supporters,
      primaryCustomerId,
    );
    entry.partyWarnings = [...pw, ...sw];
  } catch (e) {
    entry.error = normalizeSubmitError(e).message;
  }
  return entry;
}

async function submitFamilyBulkCases(
  repo: CaseRepository,
  baseSnapshot: CreateCaseDraftSnapshot,
  templateLabel: string,
  primaryCustomerId: string,
  applicants: readonly CreateCaseRelatedParty[],
  supporters: readonly CreateCaseRelatedParty[],
): Promise<{
  firstResult: CaseMutationResult | null;
  bulkResults: FamilyBulkCaseResult[];
  allWarnings: string[];
}> {
  const bulkResults: FamilyBulkCaseResult[] = [];
  const allWarnings: string[] = [];
  let firstResult: CaseMutationResult | null = null;

  for (const applicant of applicants) {
    const entry = await submitOneBulkCase(
      repo,
      baseSnapshot,
      templateLabel,
      primaryCustomerId,
      applicant,
      supporters,
    );
    if (entry.caseResult && !firstResult) firstResult = entry.caseResult;
    if (entry.error)
      allWarnings.push(`Case for "${applicant.name}" failed: ${entry.error}`);
    allWarnings.push(...entry.partyWarnings);
    bulkResults.push(entry);
  }

  return { firstResult, bulkResults, allWarnings };
}

// ─── Submit Flow ────────────────────────────────────────────────

/** 提交流依赖注入接口。 */
export interface SubmitFlowInput {
  /** 案件仓储实例。 */
  repo: CaseRepository;
  /** 作成中の案件草稿状态。 */
  draft: CreateCaseDraftState;
  /** 合成後案件タイトル。 */
  effectiveTitle: ComputedRef<string>;
  /** 主申請者。 */
  primaryCustomer: Ref<CaseCreateCustomerOption | null>;
  /** 关联人列表。 */
  additionalParties: Ref<readonly CreateCaseRelatedParty[]>;
  /** 提出可否フラグ。 */
  canSubmit: ComputedRef<boolean>;
  /** 是否家族批量场景。 */
  isFamilyBulkScenario: ComputedRef<boolean>;
  /** 家族批量的申请人列表（配偶/子女）。 */
  familyApplicants: ComputedRef<readonly CreateCaseRelatedParty[]>;
  /** 家族批量的扶養者/保证人列表（含 primaryCustomer）。 */
  familySupporters: ComputedRef<readonly CreateCaseRelatedParty[]>;
  /** 当前模板显示标签。 */
  templateLabel: ComputedRef<string>;
}

async function executeSingleSubmit(
  input: SubmitFlowInput,
  state: {
    submitResult: Ref<CaseMutationResult | null>;
    partyWarnings: Ref<string[]>;
  },
): Promise<CaseMutationResult> {
  const snapshot = collectDraftSnapshot(
    input.draft,
    input.effectiveTitle,
    input.primaryCustomer,
  );
  const result = await input.repo.createCase(
    buildCreateCaseInputFromDraft(snapshot),
  );
  state.submitResult.value = result;

  const warnings = await submitPartiesAfterCreate(
    input.repo,
    result.id,
    snapshot.customerId,
    input.additionalParties.value,
  );
  if (warnings.length > 0) state.partyWarnings.value = warnings;
  return result;
}

async function executeBulkSubmit(
  input: SubmitFlowInput,
  state: {
    submitResult: Ref<CaseMutationResult | null>;
    partyWarnings: Ref<string[]>;
    bulkResults: Ref<FamilyBulkCaseResult[]>;
  },
): Promise<CaseMutationResult> {
  const baseSnapshot = collectDraftSnapshot(
    input.draft,
    input.effectiveTitle,
    input.primaryCustomer,
  );
  const outcome = await submitFamilyBulkCases(
    input.repo,
    baseSnapshot,
    input.templateLabel.value,
    baseSnapshot.customerId,
    input.familyApplicants.value,
    input.familySupporters.value,
  );
  state.bulkResults.value = outcome.bulkResults;
  if (outcome.allWarnings.length > 0)
    state.partyWarnings.value = outcome.allWarnings;
  if (outcome.firstResult) {
    state.submitResult.value = outcome.firstResult;
    return outcome.firstResult;
  }
  throw new Error("All family bulk cases failed to create");
}

/**
 * 创建提交流（loading / error / result 管理 + `CaseRepository.createCase`
 * + post-create 关联人提交）。
 *
 * 支持两种模式：
 * - 单案件模式：createCase → createCaseParty × N
 * - 家族批量模式：对每个 familyApplicant 独立建案，
 *   每案提交 applicant party + supporters
 *
 * @param input - 提交流所需的依赖注入
 * @returns 提交状态 refs 与 submit 方法
 */
export function createSubmitFlow(input: SubmitFlowInput) {
  const submitting = ref(false);
  const submitError = ref<SubmitErrorInfo | null>(null);
  const submitResult = ref<CaseMutationResult | null>(null);
  const partyWarnings = ref<string[]>([]);
  const bulkResults = ref<FamilyBulkCaseResult[]>([]);
  const state = { submitResult, partyWarnings, bulkResults };

  async function submit(): Promise<CaseMutationResult | null> {
    if (!input.canSubmit.value || submitting.value) return null;
    submitting.value = true;
    submitError.value = null;
    submitResult.value = null;
    partyWarnings.value = [];
    bulkResults.value = [];
    try {
      if (input.isFamilyBulkScenario.value) {
        return await executeBulkSubmit(input, state);
      }
      return await executeSingleSubmit(input, state);
    } catch (e) {
      submitError.value = normalizeSubmitError(e);
      return null;
    } finally {
      submitting.value = false;
    }
  }

  return {
    submitting,
    submitError,
    submitResult,
    partyWarnings,
    bulkResults,
    submit,
  };
}
