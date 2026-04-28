import { onScopeDispose, ref } from "vue";

const DEFAULT_DURATION = 5000;

/**
 * 新建客户成功后的行高亮状态。
 *
 * 记录最近需要高亮的 customer id，并在指定时间后自动清除。
 *
 * @param options - 高亮行为的可选配置
 * @param options.duration - 自动清除高亮的延迟时间（毫秒）
 * @param options.setTimeoutFn - 可注入的 `setTimeout` 实现，便于测试
 * @param options.clearTimeoutFn - 可注入的 `clearTimeout` 实现，便于测试
 * @returns 高亮 customer id 与触发/清理方法
 */
export function useCustomerCreatedHighlight(options?: {
  duration?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  const duration = options?.duration ?? DEFAULT_DURATION;
  const scheduleTimeout = options?.setTimeoutFn ?? setTimeout;
  const cancelTimeout = options?.clearTimeoutFn ?? clearTimeout;
  const highlightedCustomerId = ref<string | null>(null);

  let timer: ReturnType<typeof setTimeout> | null = null;

  function clearTimer() {
    if (!timer) return;
    cancelTimeout(timer);
    timer = null;
  }

  function clearHighlight() {
    clearTimer();
    highlightedCustomerId.value = null;
  }

  function highlightCustomer(customerId: string) {
    const normalizedId = customerId.trim();
    if (normalizedId === "") return;

    clearTimer();
    highlightedCustomerId.value = normalizedId;
    timer = scheduleTimeout(() => {
      highlightedCustomerId.value = null;
      timer = null;
    }, duration);
  }

  onScopeDispose(() => {
    clearHighlight();
  }, true);

  return { highlightedCustomerId, highlightCustomer, clearHighlight };
}
