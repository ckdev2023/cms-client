import { ref, computed, type Ref } from "vue";
import type {
  WaivedReasonCode,
  ReferenceCandidate,
  SharedExpiryRiskData,
} from "../types";
import type {
  DocumentRepository,
  ReferenceCandidateDto,
} from "./DocumentRepositoryTypes";

/**
 *
 */
export interface ReviewTargetItem {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
}

/**
 *
 */
export interface DocumentReviewDeps {
  /**
   *
   */
  repository?: Pick<
    DocumentRepository,
    | "transition"
    | "waive"
    | "followUp"
    | "listReferenceCandidates"
    | "linkRef"
    | "listFiles"
    | "getSharedExpiryRisk"
  >;
  /**
   *
   */
  onApproveSuccess?: (item: ReviewTargetItem) => void;
  /**
   *
   */
  onRejectSuccess?: (item: ReviewTargetItem) => void;
  /**
   *
   */
  onRemindSuccess?: (item: ReviewTargetItem) => void;
  /**
   *
   */
  onReferenceSuccess?: (item: ReviewTargetItem) => void;
  /**
   *
   */
  onError?: (error: unknown) => void;
}

function setupApprove() {
  const approveTarget = ref<ReviewTargetItem | null>(null);
  const approveOpen = computed(() => approveTarget.value !== null);

  function openApprove(item: ReviewTargetItem) {
    approveTarget.value = item;
  }

  function closeApprove() {
    approveTarget.value = null;
  }

  return { approveTarget, approveOpen, openApprove, closeApprove };
}

function setupReject() {
  const rejectTarget = ref<ReviewTargetItem | null>(null);
  const rejectOpen = computed(() => rejectTarget.value !== null);
  const rejectReason = ref("");
  const canConfirmReject = computed(() => rejectReason.value.trim() !== "");

  function openReject(item: ReviewTargetItem) {
    rejectTarget.value = item;
    rejectReason.value = "";
  }

  function closeReject() {
    rejectTarget.value = null;
    rejectReason.value = "";
  }

  return {
    rejectTarget,
    rejectOpen,
    rejectReason,
    canConfirmReject,
    openReject,
    closeReject,
  };
}

function setupWaive() {
  const waiveOpen = ref(false);
  const waiveTargetLabel = ref("");
  const waiveReasonCode = ref<WaivedReasonCode | "">("");
  const waiveNote = ref("");
  const waiveNoteRequired = computed(() => waiveReasonCode.value === "other");
  const canConfirmWaive = computed(() => {
    if (!waiveReasonCode.value) return false;
    if (waiveReasonCode.value === "other" && !waiveNote.value.trim())
      return false;
    return true;
  });

  function openWaive(label?: string) {
    waiveTargetLabel.value = label ?? "";
    waiveReasonCode.value = "";
    waiveNote.value = "";
    waiveOpen.value = true;
  }

  function closeWaive() {
    waiveOpen.value = false;
    waiveTargetLabel.value = "";
    waiveReasonCode.value = "";
    waiveNote.value = "";
  }

  return {
    waiveOpen,
    waiveTargetLabel,
    waiveReasonCode,
    waiveNote,
    waiveNoteRequired,
    canConfirmWaive,
    openWaive,
    closeWaive,
  };
}

function adaptCandidate(
  dto: ReferenceCandidateDto,
  caseNameLookup?: Map<string, string>,
): ReferenceCandidate {
  return {
    id: dto.fileId,
    sourceCaseId: dto.sourceCaseId,
    sourceCaseName: caseNameLookup?.get(dto.sourceCaseId) ?? dto.sourceCaseId,
    sourceDocName: dto.sourceRequirementName,
    version: dto.versionNo,
    reviewedAt: dto.uploadedAt,
    expiryDate: dto.expiryDate,
  };
}

function setupReferenceState(submitting: Ref<boolean>) {
  const referenceTarget = ref<ReviewTargetItem | null>(null);
  const referenceOpen = computed(() => referenceTarget.value !== null);
  const selectedReferenceId = ref("");
  const canConfirmReference = computed(
    () => selectedReferenceId.value !== "" && !submitting.value,
  );
  const referenceCandidates = ref<ReferenceCandidate[]>([]);
  const referenceCandidatesLoading = ref(false);

  function resetAll() {
    referenceTarget.value = null;
    selectedReferenceId.value = "";
    referenceCandidates.value = [];
  }

  return {
    referenceTarget,
    referenceOpen,
    selectedReferenceId,
    canConfirmReference,
    referenceCandidates,
    referenceCandidatesLoading,
    resetAll,
  };
}

function setupReferenceActions(
  deps: DocumentReviewDeps,
  submitting: Ref<boolean>,
  s: ReturnType<typeof setupReferenceState>,
) {
  async function loadCandidates(requirementId: string) {
    if (!deps.repository?.listReferenceCandidates) return;
    s.referenceCandidatesLoading.value = true;
    try {
      const dtos = await deps.repository.listReferenceCandidates(requirementId);
      s.referenceCandidates.value = dtos.map((d) => adaptCandidate(d));
    } catch {
      s.referenceCandidates.value = [];
    } finally {
      s.referenceCandidatesLoading.value = false;
    }
  }

  function openReference(item: ReviewTargetItem) {
    s.referenceTarget.value = item;
    s.selectedReferenceId.value = "";
    s.referenceCandidates.value = [];
    loadCandidates(item.id);
  }

  async function confirmReference() {
    const target = s.referenceTarget.value;
    if (!target || !s.selectedReferenceId.value || submitting.value) return;
    submitting.value = true;
    try {
      await deps.repository?.linkRef({
        requirementId: target.id,
        fileVersionId: s.selectedReferenceId.value,
      });
      s.resetAll();
      deps.onReferenceSuccess?.(target);
    } catch (error) {
      deps.onError?.(error);
    } finally {
      submitting.value = false;
    }
  }

  return {
    ...s,
    openReference,
    closeReference: s.resetAll,
    confirmReference,
  };
}

interface RiskPanelDeps {
  repository?: Pick<DocumentRepository, "listFiles" | "getSharedExpiryRisk">;
  onError?: (error: unknown) => void;
}

function setupRiskPanel(riskDeps: RiskPanelDeps) {
  const riskPanelOpen = ref(false);
  const riskData = ref<SharedExpiryRiskData | null>(null);
  const riskLoading = ref(false);

  async function loadRiskData(itemId: string) {
    const repo = riskDeps.repository;
    if (!repo?.listFiles || !repo?.getSharedExpiryRisk) return;
    riskLoading.value = true;
    riskData.value = null;
    try {
      const files = await repo.listFiles(itemId, { limit: 1 });
      const assetId = files.items[0]?.assetId;
      if (!assetId) return;
      riskData.value = await repo.getSharedExpiryRisk(assetId);
    } catch (error) {
      riskDeps.onError?.(error);
    } finally {
      riskLoading.value = false;
    }
  }

  function openRiskPanel(item: ReviewTargetItem) {
    riskPanelOpen.value = true;
    void loadRiskData(item.id);
  }

  function closeRiskPanel() {
    riskPanelOpen.value = false;
    riskData.value = null;
  }

  return {
    riskPanelOpen,
    riskData,
    riskLoading,
    openRiskPanel,
    closeRiskPanel,
  };
}

function setupConfirmActions(
  deps: DocumentReviewDeps,
  approve: ReturnType<typeof setupApprove>,
  reject: ReturnType<typeof setupReject>,
  submitting: Ref<boolean>,
) {
  async function confirmApprove() {
    const target = approve.approveTarget.value;
    if (!target || submitting.value) return;
    submitting.value = true;
    try {
      await deps.repository?.transition(target.id, { toStatus: "approved" });
      approve.closeApprove();
      deps.onApproveSuccess?.(target);
    } catch (error) {
      deps.onError?.(error);
    } finally {
      submitting.value = false;
    }
  }

  async function confirmReject() {
    const target = reject.rejectTarget.value;
    if (!target || !reject.canConfirmReject.value || submitting.value) return;
    submitting.value = true;
    try {
      await deps.repository?.transition(target.id, {
        toStatus: "revision_required",
      });
      reject.closeReject();
      deps.onRejectSuccess?.(target);
    } catch (error) {
      deps.onError?.(error);
    } finally {
      submitting.value = false;
    }
  }

  async function confirmRemind(item: ReviewTargetItem) {
    if (submitting.value) return;
    submitting.value = true;
    try {
      await deps.repository?.followUp(item.id);
      deps.onRemindSuccess?.(item);
    } catch (error) {
      deps.onError?.(error);
    } finally {
      submitting.value = false;
    }
  }

  return { confirmApprove, confirmReject, confirmRemind };
}

/**
 * 审核/退回/waive/引用/风险面板的状态管理 + API 调用（P0-CONTRACT §8）。
 *
 * @param deps - 可选依赖注入（repository + 回调）
 * @returns 各面板的状态 refs、操作方法、与 API 对接的 confirm 方法
 */
export function useDocumentReviewModel(deps: DocumentReviewDeps = {}) {
  const approve = setupApprove();
  const reject = setupReject();
  const submitting = ref(false);
  const actions = setupConfirmActions(deps, approve, reject, submitting);
  const refState = setupReferenceState(submitting);
  const reference = setupReferenceActions(deps, submitting, refState);

  return {
    ...approve,
    ...reject,
    ...setupWaive(),
    ...reference,
    ...setupRiskPanel({
      repository: deps.repository,
      onError: deps.onError,
    }),
    submitting,
    ...actions,
  };
}
