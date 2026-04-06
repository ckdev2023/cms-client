import { useEffect, useState } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { Todo } from "@domain/home/Todo";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * Home 页面的 ViewState。
 *
 * 设计要点：
 * - 用联合类型表示状态机（idle/loading/success/error）
 * - UI 层只做状态渲染，不直接处理异常/请求细节
 */
export type HomeViewState =
  | {
      /**
       * 视图状态：空闲。
       */
      status: "idle";
    }
  | {
      /**
       * 视图状态：加载中。
       */
      status: "loading";
    }
  | {
      /**
       * 视图状态：成功。
       */
      status: "success";
      /**
       * Todo 数据。
       */
      todo: Todo;
    }
  | {
      /**
       * 视图状态：失败。
       */
      status: "error";
      /**
       * 应用统一错误。
       */
      error: AppError;
    };

/**
 * Home 页面的 ViewModel Hook。
 *
 * 职责：
 * - 触发加载流程（通过 domain 接口 homeRepository）
 * - 做错误收敛（toAppError）与日志上报（logger）
 * - 输出可直接驱动 UI 的 HomeViewState
 *
 * @returns HomeViewModel 状态
 */
export function useHomeViewModel() {
  const { homeRepository, logger } = useAppContainer();
  const [state, setState] = useState<HomeViewState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const todo = await homeRepository.getSampleTodo();
        if (cancelled) return;
        setState({ status: "success", todo });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Home:load_failed", { code: error.code });
        if (cancelled) return;
        setState({ status: "error", error });
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [homeRepository, logger]);

  return { state };
}
