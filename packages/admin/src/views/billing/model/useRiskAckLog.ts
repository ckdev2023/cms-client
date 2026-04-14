import { ref } from "vue";
import type { RiskAcknowledgement } from "../types";

/**
 * 欠款风险确认展示/操作 — T05 填充实现。
 *
 * @returns 风险确认面板状态与操作方法
 */
export function useRiskAckLog() {
  const isVisible = ref(false);
  const riskAck = ref<RiskAcknowledgement | null>(null);

  function show(ack: RiskAcknowledgement) {
    riskAck.value = ack;
    isVisible.value = true;
  }

  function hide() {
    isVisible.value = false;
  }

  return { isVisible, riskAck, show, hide };
}
