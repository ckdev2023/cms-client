import { ref, computed } from "vue";
import type { WaivedReasonCode } from "../types";

interface ReviewTargetItem {
  id: string;
  name: string;
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

function setupReference() {
  const referenceTarget = ref<ReviewTargetItem | null>(null);
  const referenceOpen = computed(() => referenceTarget.value !== null);
  const selectedReferenceId = ref("");
  const canConfirmReference = computed(() => selectedReferenceId.value !== "");

  function openReference(item: ReviewTargetItem) {
    referenceTarget.value = item;
    selectedReferenceId.value = "";
  }

  function closeReference() {
    referenceTarget.value = null;
    selectedReferenceId.value = "";
  }

  return {
    referenceTarget,
    referenceOpen,
    selectedReferenceId,
    canConfirmReference,
    openReference,
    closeReference,
  };
}

function setupRiskPanel() {
  const riskPanelOpen = ref(false);

  function openRiskPanel() {
    riskPanelOpen.value = true;
  }

  function closeRiskPanel() {
    riskPanelOpen.value = false;
  }

  return { riskPanelOpen, openRiskPanel, closeRiskPanel };
}

/**
 * 审核/退回/waive/引用/风险面板的状态管理（P0-CONTRACT §8）。
 *
 * 纯状态管理，不包含业务副作用；视图层负责 toast 回调与选择清理。
 *
 * @returns 各面板的状态 refs 与操作方法
 */
export function useDocumentReviewModel() {
  return {
    ...setupApprove(),
    ...setupReject(),
    ...setupWaive(),
    ...setupReference(),
    ...setupRiskPanel(),
  };
}
