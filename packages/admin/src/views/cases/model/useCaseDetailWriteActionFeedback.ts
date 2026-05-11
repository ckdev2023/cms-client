import { CaseRepositoryError } from "./CaseRepository";
import {
  resolveWriteErrorI18nKey,
  isGateBlockError,
} from "./CaseWriteErrorMapping";

/**
 * 写操作反馈状态——在 UI 层展示操作结果或门禁阻断提示。
 */
export interface WriteActionFeedback {
  /** 是否正在提交。 */
  submitting: boolean;
  /** 人类可读错误信息（原始 Error.message）。 */
  errorMessage: string | null;
  /** 已解析的 i18n key（用于前端国际化展示）。 */
  errorI18nKey: string | null;
  /** 服务端原始错误码。 */
  serverErrorCode: string | null;
  /** 是否为门禁级阻断（需前置操作才能继续）。 */
  isGateBlock: boolean;
}

/** 空白反馈状态常量。 */
export const EMPTY_FEEDBACK: WriteActionFeedback = {
  submitting: false,
  errorMessage: null,
  errorI18nKey: null,
  serverErrorCode: null,
  isGateBlock: false,
};

/**
 * 构造提交中占位 feedback。
 *
 * @returns submitting=true 的 feedback 对象
 */
export function createSubmittingFeedback(): WriteActionFeedback {
  return { ...EMPTY_FEEDBACK, submitting: true };
}

/**
 * 从异常构建错误 feedback。
 *
 * @param e - 捕获到的异常
 * @returns 包含错误码与门禁标记的 feedback
 */
export function createErrorFeedback(e: unknown): WriteActionFeedback {
  const message = e instanceof Error ? e.message : String(e);
  const serverCode =
    e instanceof CaseRepositoryError ? (e.serverErrorCode ?? null) : null;
  return {
    submitting: false,
    errorMessage: message,
    errorI18nKey: resolveWriteErrorI18nKey(serverCode ?? undefined),
    serverErrorCode: serverCode,
    isGateBlock: isGateBlockError(serverCode ?? undefined),
  };
}
