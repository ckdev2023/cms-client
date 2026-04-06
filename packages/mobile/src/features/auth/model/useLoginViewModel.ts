import { useState, useCallback } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * Login 页面的 ViewState。
 *
 * 用联合类型表示状态机：
 * idle → requesting_code → code_sent → verifying → success / error
 */
export type LoginViewState =
  | { status: "idle" }
  | { status: "requesting_code" }
  | { status: "code_sent" }
  | { status: "verifying" }
  | { status: "success"; token: string }
  | { status: "error"; error: AppError; previousStatus: "idle" | "code_sent" };

/**
 * Login 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态与操作
 */
export function useLoginViewModel() {
  const { authRepository, logger } = useAppContainer();
  const [state, setState] = useState<LoginViewState>({ status: "idle" });

  const requestCode = useCallback(
    async (contact: string) => {
      setState({ status: "requesting_code" });
      try {
        await authRepository.requestCode(contact);
        setState({ status: "code_sent" });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Auth:request_code_failed", { code: error.code });
        setState({ status: "error", error, previousStatus: "idle" });
      }
    },
    [authRepository, logger],
  );

  const verifyCode = useCallback(
    async (contact: string, code: string) => {
      setState({ status: "verifying" });
      try {
        const result = await authRepository.verifyCode(contact, code);
        setState({ status: "success", token: result.token });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Auth:verify_code_failed", { code: error.code });
        setState({ status: "error", error, previousStatus: "code_sent" });
      }
    },
    [authRepository, logger],
  );

  return { state, requestCode, verifyCode };
}
