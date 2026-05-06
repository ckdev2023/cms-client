import {
  createToastController,
  useToast,
  type UseToastReturn,
} from "../../../shared/model/useToast";

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
 * 线索列表页 toast 状态管理。
 * 内部委托给 shared/model/useToast 全局队列（带 role/aria-live），
 * 保留原有 show/hide API 以兼容现有调用方。
 *
 * @param options - 可选配置
 * @param options.duration - 自动隐藏延迟（ms）
 * @param options.controller - 可注入的 Toast 控制器（测试用）
 * @returns toast 状态与触发方法
 */
export function useLeadToast(options?: {
  duration?: number;
  controller?: UseToastReturn;
}) {
  const duration = options?.duration ?? DEFAULT_DURATION;
  const ctrl: UseToastReturn =
    options?.controller ?? tryGetGlobalToast() ?? createToastController();

  let currentId: string | null = null;

  function show(payload: ToastPayload) {
    if (currentId) {
      ctrl.dismiss(currentId);
    }
    currentId = ctrl.add({
      title: payload.title,
      description: payload.description,
      tone: "success",
      durationMs: duration,
    });
  }

  function hide() {
    if (currentId) {
      ctrl.dismiss(currentId);
      currentId = null;
    }
  }

  return { show, hide };
}

function tryGetGlobalToast(): UseToastReturn | null {
  try {
    return useToast();
  } catch {
    return null;
  }
}
