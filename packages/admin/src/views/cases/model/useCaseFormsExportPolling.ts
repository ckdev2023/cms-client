import { ref, watch, onUnmounted, type Ref } from "vue";
import type { CaseDetail } from "../types-detail";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_COUNT = 60;

/**
 * 轮询状态——纯数据模型，方便测试。
 */
export interface ExportPollingState {
  /** 当前是否在轮询中。 */
  polling: boolean;
  /** 已执行的轮询次数。 */
  pollCount: number;
  /** 是否因超过最大次数而超时。 */
  timedOut: boolean;
}

/**
 * 判断 forms 数据中是否存在 exporting 状态的文書。
 *
 * @param forms 案件详情中的 forms 子树
 * @returns 任意已生成文书 backendStatus === "exporting" 时返回 true
 */
export function hasExportingDocs(
  forms: CaseDetail["forms"] | undefined,
): boolean {
  if (!forms) return false;
  return forms.generated.some((d) => d.backendStatus === "exporting");
}

/**
 * 创建轮询状态机——纯函数，不依赖 Vue 响应式。
 *
 * @returns 状态推进函数与初始状态
 */
export function createPollingStateMachine() {
  let state: ExportPollingState = {
    polling: false,
    pollCount: 0,
    timedOut: false,
  };

  function getState(): ExportPollingState {
    return { ...state };
  }

  function start(): ExportPollingState {
    state = { polling: true, pollCount: 0, timedOut: false };
    return getState();
  }

  function tick(): ExportPollingState {
    if (!state.polling) return getState();
    const next = state.pollCount + 1;
    if (next >= MAX_POLL_COUNT) {
      state = { polling: false, pollCount: next, timedOut: true };
    } else {
      state = { ...state, pollCount: next };
    }
    return getState();
  }

  function stop(): ExportPollingState {
    state = { ...state, polling: false };
    return getState();
  }

  function reset(): ExportPollingState {
    state = { polling: false, pollCount: 0, timedOut: false };
    return getState();
  }

  return { getState, start, tick, stop, reset };
}

/**
 * 文書导出轮询 composable——监测 detail 中是否有 exporting 文書，
 * 自动启动 5s 间隔轮询，最多 60 次（5 分钟），超时后停止并暴露超时状态。
 *
 * @param detail - 案件详情响应式引用
 * @param refetch - 触发详情重新拉取的回调
 * @returns 轮询状态 ref + 停止轮询的方法
 */
export function useCaseFormsExportPolling(
  detail: Ref<CaseDetail | null>,
  refetch: () => Promise<void>,
) {
  const pollingState = ref<ExportPollingState>({
    polling: false,
    pollCount: 0,
    timedOut: false,
  });

  const machine = createPollingStateMachine();
  const intervalRef: { id: ReturnType<typeof setInterval> | null } = {
    id: null,
  };

  function startPolling(): void {
    if (intervalRef.id !== null) return;
    pollingState.value = machine.start();
    intervalRef.id = setInterval(() => {
      pollingState.value = machine.tick();
      if (!pollingState.value.polling) {
        clearPollingTimer(intervalRef);
        return;
      }
      void refetch();
    }, POLL_INTERVAL_MS);
  }

  function stopPolling(): void {
    clearPollingTimer(intervalRef);
    pollingState.value = machine.stop();
  }

  watch(
    () => detail.value?.forms,
    (forms) =>
      reconcilePolling(
        hasExportingDocs(forms),
        pollingState,
        machine,
        startPolling,
        stopPolling,
      ),
    { immediate: true },
  );

  onUnmounted(() => clearPollingTimer(intervalRef));

  return { pollingState, stopPolling };
}

function clearPollingTimer(holder: {
  id: ReturnType<typeof setInterval> | null;
}): void {
  if (holder.id !== null) {
    clearInterval(holder.id);
    holder.id = null;
  }
}

function reconcilePolling(
  exporting: boolean,
  pollingState: Ref<ExportPollingState>,
  machine: ReturnType<typeof createPollingStateMachine>,
  startPolling: () => void,
  stopPolling: () => void,
): void {
  if (
    exporting &&
    !pollingState.value.polling &&
    !pollingState.value.timedOut
  ) {
    startPolling();
  } else if (!exporting && pollingState.value.polling) {
    stopPolling();
    pollingState.value = machine.reset();
  }
}
