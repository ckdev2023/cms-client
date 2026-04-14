import { ref } from "vue";

/**
 *
 */
export interface ToastPayload {
  /**
   *
   */
  title: string;
  /**
   *
   */
  description: string;
}

const DEFAULT_DURATION = 3000;

/**
 * 客户列表页 toast 状态管理（5 种场景触发）。
 *
 * @param options - 可选配置
 * @param options.duration - 自动隐藏延迟（ms）
 * @param options.setTimeoutFn - 可注入的 setTimeout 实现，便于测试
 * @param options.clearTimeoutFn - 可注入的 clearTimeout 实现，便于测试
 * @returns toast 状态与触发方法
 */
export function useCustomerToast(options?: {
  duration?: number;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}) {
  const duration = options?.duration ?? DEFAULT_DURATION;
  const _setTimeout = options?.setTimeoutFn ?? setTimeout;
  const _clearTimeout = options?.clearTimeoutFn ?? clearTimeout;

  const visible = ref(false);
  const title = ref("");
  const description = ref("");

  let timer: ReturnType<typeof setTimeout> | null = null;

  function show(payload: ToastPayload) {
    if (timer) _clearTimeout(timer);
    title.value = payload.title;
    description.value = payload.description;
    visible.value = true;
    timer = _setTimeout(() => {
      visible.value = false;
      timer = null;
    }, duration);
  }

  function hide() {
    if (timer) _clearTimeout(timer);
    visible.value = false;
    timer = null;
  }

  return { visible, title, description, show, hide };
}
