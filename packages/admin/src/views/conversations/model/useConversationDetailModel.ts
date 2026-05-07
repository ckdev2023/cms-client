import { ref, computed, type Ref } from "vue";
import type { ConversationRepository } from "./ConversationRepository";
import type { ConversationDetail, MessageItem } from "../types";

/**
 *
 */
export interface ConversationDetailModelDeps {
  /**
   *
   */
  repo: ConversationRepository;
  /**
   *
   */
  autoMarkRead?: boolean;
}

/**
 *
 */
export interface ConversationDetailModel {
  /**
   *
   */
  detail: Ref<ConversationDetail | null>;
  /**
   *
   */
  messages: Ref<MessageItem[]>;
  /**
   *
   */
  loading: Ref<boolean>;
  /**
   *
   */
  error: Ref<string | null>;
  /**
   *
   */
  isClosed: Ref<boolean>;
  /**
   *
   */
  messageInput: Ref<string>;
  /**
   *
   */
  sending: Ref<boolean>;
  /**
   *
   */
  canSend: Ref<boolean>;
  /**
   *
   */
  fetchDetail: () => Promise<void>;
  /**
   *
   */
  sendMessage: () => Promise<void>;
  /**
   *
   */
  assignOwner: (ownerUserId: string) => Promise<void>;
  /**
   *
   */
  closeConversation: () => Promise<void>;
  /**
   *
   */
  reopenConversation: () => Promise<void>;
  /**
   *
   */
  retryTranslation: (messageId: string) => Promise<void>;
}

interface DetailState {
  detail: Ref<ConversationDetail | null>;
  messages: Ref<MessageItem[]>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  messageInput: Ref<string>;
  sending: Ref<boolean>;
}

interface ActionContext {
  conversationId: Ref<string>;
  repo: ConversationRepository;
  state: DetailState;
  fetchDetail: () => Promise<void>;
}

function resolveId(conversationId: Ref<string>): string | null {
  const id = conversationId.value?.trim();
  return id || null;
}

function createDetailState(): DetailState {
  return {
    detail: ref<ConversationDetail | null>(null),
    messages: ref<MessageItem[]>([]),
    loading: ref(false),
    error: ref<string | null>(null),
    messageInput: ref(""),
    sending: ref(false),
  };
}

function createFetchDetail(
  conversationId: Ref<string>,
  repo: ConversationRepository,
  autoMarkRead: boolean,
  state: DetailState,
) {
  return async () => {
    const id = resolveId(conversationId);
    if (!id) return;
    state.loading.value = true;
    state.error.value = null;
    try {
      const result = await repo.getDetail(id);
      if (result) {
        state.detail.value = result.detail;
        const lang = result.detail.preferredLanguage || undefined;
        const msgs = await repo.getMessages(id, undefined, undefined, lang);
        state.messages.value = msgs.items;
        if (autoMarkRead && result.detail.status === "open") {
          await repo.getMessages(id);
        }
      } else {
        state.detail.value = null;
        state.messages.value = [];
      }
    } catch {
      state.error.value = "conversations.errors.fetchFailed";
    } finally {
      state.loading.value = false;
    }
  };
}

function createSendMessage(ctx: ActionContext, isClosed: Ref<boolean>) {
  return async () => {
    const id = resolveId(ctx.conversationId);
    const { state } = ctx;
    if (
      !id ||
      !state.messageInput.value.trim() ||
      state.sending.value ||
      isClosed.value
    )
      return;
    state.sending.value = true;
    try {
      await ctx.repo.sendMessage(id, {
        originalText: state.messageInput.value.trim(),
        originalLanguage: ctx.state.detail.value?.preferredLanguage ?? "ja",
      });
      state.messageInput.value = "";
      await ctx.fetchDetail();
    } catch {
      state.error.value = "conversations.errors.sendFailed";
    } finally {
      state.sending.value = false;
    }
  };
}

function createAssignOwner(ctx: ActionContext) {
  return async (ownerUserId: string) => {
    const id = resolveId(ctx.conversationId);
    if (!id) return;
    try {
      await ctx.repo.assign(id, { ownerUserId });
      await ctx.fetchDetail();
    } catch {
      ctx.state.error.value = "conversations.errors.assignFailed";
    }
  };
}

function createMutationAction(
  ctx: ActionContext,
  action: (id: string) => Promise<unknown>,
  errorKey: string,
) {
  return async () => {
    const id = resolveId(ctx.conversationId);
    if (!id) return;
    try {
      await action(id);
      await ctx.fetchDetail();
    } catch {
      ctx.state.error.value = errorKey;
    }
  };
}

function createRetryTranslation(ctx: ActionContext) {
  return async (messageId: string) => {
    const id = resolveId(ctx.conversationId);
    if (!id) return;
    try {
      await ctx.repo.retryTranslation(id, { messageId });
      await ctx.fetchDetail();
    } catch {
      ctx.state.error.value = "conversations.errors.retryTranslationFailed";
    }
  };
}

/**
 * 会话详情视图模型。
 *
 * 纯逻辑组合函数，不包含 onMounted / watch 等生命周期钩子。
 * 调用方（Vue 组件）应在 onMounted 和 watch 中调用 `fetchDetail()`。
 *
 * @param conversationId - 当前会话 ID 的响应式引用
 * @param deps - 仓储和配置依赖
 * @returns 会话详情视图模型
 */
export function useConversationDetailModel(
  conversationId: Ref<string>,
  deps: ConversationDetailModelDeps,
): ConversationDetailModel {
  const { repo, autoMarkRead = false } = deps;
  const state = createDetailState();
  const isClosed = computed(() => state.detail.value?.status === "closed");
  const canSend = computed(
    () =>
      !isClosed.value &&
      !!state.messageInput.value.trim() &&
      !state.sending.value,
  );
  const fetchDetail = createFetchDetail(
    conversationId,
    repo,
    autoMarkRead,
    state,
  );
  const ctx: ActionContext = { conversationId, repo, state, fetchDetail };
  return {
    ...state,
    isClosed,
    canSend,
    fetchDetail,
    sendMessage: createSendMessage(ctx, isClosed),
    assignOwner: createAssignOwner(ctx),
    closeConversation: createMutationAction(
      ctx,
      (id) => repo.close(id),
      "conversations.errors.closeFailed",
    ),
    reopenConversation: createMutationAction(
      ctx,
      (id) => repo.reopen(id),
      "conversations.errors.reopenFailed",
    ),
    retryTranslation: createRetryTranslation(ctx),
  };
}
