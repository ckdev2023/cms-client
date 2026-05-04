import { ref, type Ref } from "vue";
import {
  createValidationRunsRepository,
  type ValidationRunsRepository,
} from "../data/ValidationRunsRepository";
import {
  createSubmissionPackagesRepository,
  type SubmissionPackagesRepository,
} from "../data/SubmissionPackagesRepository";
import {
  createReviewRecordsRepository,
  type ReviewRecordsRepository,
} from "../data/ReviewRecordsRepository";
import { RepositoryError } from "../../../shared/api/repositoryRuntime";
import { resolveWriteErrorI18nKey } from "./CaseWriteErrorMapping";
import type {
  CaseBillingRiskAckInput,
  CaseMutationResult,
} from "./CaseAdapterTypes";
import { createCaseRepository } from "./CaseRepository";

/**
 *
 */
export interface BillingRiskAckRepo {
  /**
   *
   */
  acknowledgeBillingRisk(
    caseId: string,
    input: CaseBillingRiskAckInput,
  ): Promise<CaseMutationResult>;
}

/**
 *
 */
export interface CaseValidationActionsDeps {
  /**
   *
   */
  caseId: Ref<string>;
  /**
   *
   */
  repo?: ValidationRunsRepository;
  /**
   *
   */
  spRepo?: SubmissionPackagesRepository;
  /**
   *
   */
  rrRepo?: ReviewRecordsRepository;
  /**
   *
   */
  riskAckRepo?: BillingRiskAckRepo;
  /**
   *
   */
  onRerunSuccess?: () => void;
  /**
   *
   */
  onCreateSpSuccess?: () => void;
  /**
   *
   */
  onReviewRequestSuccess?: () => void;
  /**
   *
   */
  onRiskAckSuccess?: () => void;
}

/**
 *
 */
export interface CaseValidationActions {
  /**
   *
   */
  rerunLoading: Ref<boolean>;
  /**
   *
   */
  rerunError: Ref<string | null>;
  /**
   *
   */
  rerunValidation: () => Promise<void>;
  /**
   *
   */
  createSpLoading: Ref<boolean>;
  /**
   *
   */
  createSpError: Ref<string | null>;
  /**
   *
   */
  createSpErrorI18nKey: Ref<string | null>;
  /**
   *
   */
  createSubmissionPackage: () => Promise<void>;
  /**
   *
   */
  reviewLoading: Ref<boolean>;
  /**
   *
   */
  reviewError: Ref<string | null>;
  /**
   *
   */
  createReviewRequest: () => Promise<void>;
  /**
   *
   */
  riskAckLoading: Ref<boolean>;
  /**
   *
   */
  riskAckError: Ref<string | null>;
  /**
   *
   */
  riskAckErrorI18nKey: Ref<string | null>;
  /**
   *
   */
  acknowledgeBillingRisk: (payload: {
    /**
     *
     */
    reason: string;
    /**
     *
     */
    person: string;
    /**
     *
     */
    evidence: string;
  }) => Promise<void>;
}

/**
 * 校验与提交操作 composable——编排「重新检查」和「新建提交包」的异步状态。
 *
 * @param deps - 包含 caseId、仓储实例和成功回调的依赖对象
 * @returns loading/error 响应式状态及 action 函数
 */
export function useCaseValidationActions(
  deps: CaseValidationActionsDeps,
): CaseValidationActions {
  const repo = deps.repo ?? createValidationRunsRepository();
  const spRepo = deps.spRepo ?? createSubmissionPackagesRepository();
  const rrRepo = deps.rrRepo ?? createReviewRecordsRepository();
  const rerunLoading = ref(false);
  const rerunError = ref<string | null>(null);
  const createSpLoading = ref(false);
  const createSpError = ref<string | null>(null);
  const createSpErrorI18nKey = ref<string | null>(null);
  const reviewLoading = ref(false);
  const reviewError = ref<string | null>(null);
  const riskAckLoading = ref(false);
  const riskAckError = ref<string | null>(null);
  const riskAckErrorI18nKey = ref<string | null>(null);

  return {
    rerunLoading,
    rerunError,
    rerunValidation: buildRerunAction(repo, deps, rerunLoading, rerunError),
    createSpLoading,
    createSpError,
    createSpErrorI18nKey,
    createSubmissionPackage: buildCreateSpAction(
      spRepo,
      deps,
      createSpLoading,
      createSpError,
      createSpErrorI18nKey,
    ),
    reviewLoading,
    reviewError,
    createReviewRequest: buildReviewRequestAction(
      rrRepo,
      deps,
      reviewLoading,
      reviewError,
    ),
    riskAckLoading,
    riskAckError,
    riskAckErrorI18nKey,
    acknowledgeBillingRisk: buildRiskAckAction(
      deps,
      riskAckLoading,
      riskAckError,
      riskAckErrorI18nKey,
    ),
  };
}

function buildRerunAction(
  repo: ValidationRunsRepository,
  deps: CaseValidationActionsDeps,
  loading: Ref<boolean>,
  error: Ref<string | null>,
): () => Promise<void> {
  return async () => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      await repo.createRun({ caseId: deps.caseId.value });
      deps.onRerunSuccess?.();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  };
}

function buildCreateSpAction(
  spRepo: SubmissionPackagesRepository,
  deps: CaseValidationActionsDeps,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  errorI18nKey: Ref<string | null>,
): () => Promise<void> {
  return async () => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    errorI18nKey.value = null;
    try {
      await spRepo.create({
        caseId: deps.caseId.value,
        submissionKind: "initial",
        items: [{ itemType: "field_snapshot", refId: deps.caseId.value }],
      });
      deps.onCreateSpSuccess?.();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      const serverCode =
        e instanceof RepositoryError ? (e.serverErrorCode ?? null) : null;
      errorI18nKey.value = resolveWriteErrorI18nKey(serverCode ?? undefined);
    } finally {
      loading.value = false;
    }
  };
}

function buildReviewRequestAction(
  rrRepo: ReviewRecordsRepository,
  deps: CaseValidationActionsDeps,
  loading: Ref<boolean>,
  error: Ref<string | null>,
): () => Promise<void> {
  return async () => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    try {
      await rrRepo.createReviewRequest({ caseId: deps.caseId.value });
      deps.onReviewRequestSuccess?.();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
    } finally {
      loading.value = false;
    }
  };
}

function buildRiskAckAction(
  deps: CaseValidationActionsDeps,
  loading: Ref<boolean>,
  error: Ref<string | null>,
  errorI18nKey: Ref<string | null>,
): (payload: {
  reason: string;
  person: string;
  evidence: string;
}) => Promise<void> {
  const riskAckRepo =
    deps.riskAckRepo ?? (createCaseRepository() as BillingRiskAckRepo);

  return async (payload) => {
    if (loading.value) return;
    loading.value = true;
    error.value = null;
    errorI18nKey.value = null;
    try {
      const input: CaseBillingRiskAckInput = {
        reasonCode: "manager_override",
        reasonNote: payload.reason,
        evidenceUrl: payload.evidence,
      };
      await riskAckRepo.acknowledgeBillingRisk(deps.caseId.value, input);
      deps.onRiskAckSuccess?.();
    } catch (e) {
      error.value = e instanceof Error ? e.message : String(e);
      const serverCode =
        e instanceof RepositoryError ? (e.serverErrorCode ?? null) : null;
      errorI18nKey.value = resolveWriteErrorI18nKey(serverCode ?? undefined);
    } finally {
      loading.value = false;
    }
  };
}
