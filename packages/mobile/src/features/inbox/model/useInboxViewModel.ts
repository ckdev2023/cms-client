import { useEffect, useState } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { ConversationSummary } from "@domain/inbox/Conversation";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * Inbox 页面的 ViewState。
 */
export type InboxViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; conversations: ConversationSummary[] }
  | { status: "error"; error: AppError };

/**
 * Inbox 页面的 ViewModel Hook。
 *
 * @returns ViewModel 状态
 */
export function useInboxViewModel() {
  const { inboxRepository, logger } = useAppContainer();
  const [state, setState] = useState<InboxViewState>({ status: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setState({ status: "loading" });
      try {
        const conversations = await inboxRepository.listConversations();
        if (cancelled) return;
        setState({ status: "success", conversations });
      } catch (e) {
        const error = toAppError(e);
        logger.error("Inbox:list_failed", { code: error.code });
        if (cancelled) return;
        setState({ status: "error", error });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [inboxRepository, logger]);

  return { state };
}
