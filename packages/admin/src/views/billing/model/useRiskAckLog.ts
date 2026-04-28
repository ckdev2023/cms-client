import { ref, type Ref } from "vue";
import type { BillingRiskAckInput } from "./BillingAdapterUrls";
import type {
  BillingRiskAckStatus,
  BillingMutationResult,
} from "./BillingAdapters";

/**
 *
 */
export interface RiskAckDataSource {
  /**
   *
   */
  acknowledgeBillingRisk(
    caseId: string,
    input: BillingRiskAckInput,
  ): Promise<BillingMutationResult>;
  /**
   *
   */
  getCaseBillingRiskAck(caseId: string): Promise<BillingRiskAckStatus | null>;
}

/**
 *
 */
export interface UseRiskAckLogDeps {
  /**
   *
   */
  dataSource: RiskAckDataSource;
}

async function doAcknowledge(
  ds: RiskAckDataSource,
  caseId: string,
  input: BillingRiskAckInput,
  submittingRef: Ref<boolean>,
  errorRef: Ref<string | null>,
): Promise<BillingMutationResult | null> {
  submittingRef.value = true;
  errorRef.value = null;
  try {
    return await ds.acknowledgeBillingRisk(caseId, input);
  } catch (e) {
    errorRef.value = e instanceof Error ? e.message : String(e);
    return null;
  } finally {
    submittingRef.value = false;
  }
}

async function doGetAck(
  ds: RiskAckDataSource,
  caseId: string,
  ackRef: Ref<BillingRiskAckStatus | null>,
): Promise<BillingRiskAckStatus | null> {
  try {
    const status = await ds.getCaseBillingRiskAck(caseId);
    ackRef.value = status;
    return status;
  } catch {
    return null;
  }
}

/**
 * 欠款风险确认 composable（案件级一次确认语义）。
 *
 * @param deps - 数据源依赖
 * @returns modal 状态、acknowledge / query 方法
 */
export function useRiskAckLog(deps: UseRiskAckLogDeps) {
  const modalOpen = ref(false);
  const targetCaseId = ref<string | null>(null);
  const submitting = ref(false);
  const error = ref<string | null>(null);
  const ackStatus = ref<BillingRiskAckStatus | null>(null);

  return {
    modalOpen,
    targetCaseId,
    submitting,
    error,
    ackStatus,
    openModal(caseId: string) {
      targetCaseId.value = caseId;
      error.value = null;
      modalOpen.value = true;
    },
    closeModal() {
      modalOpen.value = false;
      targetCaseId.value = null;
      error.value = null;
    },
    acknowledge: (caseId: string, input: BillingRiskAckInput) =>
      doAcknowledge(deps.dataSource, caseId, input, submitting, error),
    getCaseBillingRiskAck: (caseId: string) =>
      doGetAck(deps.dataSource, caseId, ackStatus),
  };
}
