import type { TaskI18nT } from "./taskWorkbenchViewHelpers";
import type { TaskWorkbenchCompleteEvent } from "./useTaskWorkbenchModel";

/**
 * Toast 控制器最小依赖，复用 `shared/model/useToast` 的入参结构，
 * 便于在测试中注入 stub。
 */
export interface TaskWorkbenchToastSink {
  /** 推送一条 toast。 */
  add(input: {
    title: string;
    description?: string;
    tone?: "success" | "info" | "warning" | "error";
  }): string;
}

/**
 * 创建任务工作台 `notifyComplete` 通知器：
 * 把 model 派发的事件翻译为本地化 toast，主语保留 model 不依赖 i18n / toast。
 *
 * @param toast - toast 控制器（一般传入 `useToast()` 单例）。
 * @param t - vue-i18n 翻译函数。
 * @returns 可直接传给 `useTaskWorkbenchModel({ notifyComplete })` 的回调。
 */
export function createTaskWorkbenchToastNotifier(
  toast: TaskWorkbenchToastSink,
  t: TaskI18nT,
) {
  return (event: TaskWorkbenchCompleteEvent): void => {
    if (event.kind === "success") {
      const title =
        event.task?.title?.trim() ||
        t("tasks.workbench.toast.completedFallbackTitle");
      toast.add({
        title: t("tasks.workbench.toast.completedTitle"),
        description: t("tasks.workbench.toast.completedDescription", {
          title,
        }),
        tone: "success",
      });
      return;
    }
    toast.add({
      title: t("tasks.workbench.toast.failedTitle"),
      description: t("tasks.workbench.toast.failedDescription"),
      tone: "error",
    });
  };
}
