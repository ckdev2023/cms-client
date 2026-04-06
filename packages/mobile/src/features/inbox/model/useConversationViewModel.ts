import { useEffect, useState, useCallback, useRef } from "react";

import { useAppContainer } from "@app/container/AppContainerContext";
import type { Message } from "@domain/inbox/Message";
import type { AppError } from "@shared/errors/AppError";
import { toAppError } from "@shared/errors/toAppError";

/**
 * Conversation 页面的 ViewState。
 */
export type ConversationViewState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; messages: Message[] }
  | { status: "error"; error: AppError };

const POLL_INTERVAL = 5_000;

/**
 * Conversation 页面的 ViewModel Hook。
 *
 * @param conversationId 会话 ID
 * @returns ViewModel 状态与操作
 */
export function useConversationViewModel(conversationId: string) {
  const { inboxRepository, logger } = useAppContainer();
  const [state, setState] = useState<ConversationViewState>({
    status: "idle",
  });
  const [sending, setSending] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadMessages = useCallback(async () => {
    try {
      const messages = await inboxRepository.getMessages(conversationId);
      setState({ status: "success", messages });
    } catch (e) {
      const error = toAppError(e);
      logger.error("Conversation:load_failed", { code: error.code });
      setState({ status: "error", error });
    }
  }, [conversationId, inboxRepository, logger]);

  useEffect(() => {
    setState({ status: "loading" });
    loadMessages();

    timerRef.current = setInterval(loadMessages, POLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loadMessages]);

  const sendMessage = useCallback(
    async (text: string) => {
      setSending(true);
      try {
        await inboxRepository.sendMessage(conversationId, text);
        await loadMessages();
      } catch (e) {
        const error = toAppError(e);
        logger.error("Conversation:send_failed", { code: error.code });
      } finally {
        setSending(false);
      }
    },
    [conversationId, inboxRepository, loadMessages, logger],
  );

  const toggleTranslation = useCallback(() => {
    setShowOriginal((prev) => !prev);
  }, []);

  return { state, sending, sendMessage, showOriginal, toggleTranslation };
}
