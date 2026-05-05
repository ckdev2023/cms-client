<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { MessageItem } from "../types";

/** 消息气泡组件：支持文本、系统事件、链接类消息展示，含翻译状态与重试入口。 */
const { t } = useI18n();

const props = defineProps<{
  message: MessageItem;
  isClosed?: boolean;
}>();

const isStaff = computed(() => props.message.senderType === "staff");
const isSystem = computed(() => props.message.kind === "system_event");
const isLinkKind = computed(() =>
  ["intake_link", "quote_link", "sign_link"].includes(props.message.kind),
);
const showTranslationFailed = computed(
  () => props.message.translationStatus === "failed",
);
const showTranslationPending = computed(
  () => props.message.translationStatus === "pending",
);
const isInternalOnly = computed(
  () => props.message.visibleScope === "internal_only",
);

defineEmits<{
  retryTranslation: [messageId: string];
}>();
</script>

<template>
  <div v-if="isSystem" class="message-bubble message-bubble--system">
    <span class="message-bubble__system-icon">ℹ</span>
    <span class="message-bubble__system-text">
      {{ message.content || t("conversations.messages.systemEvent") }}
    </span>
    <span class="message-bubble__time">{{ message.createdAtLabel }}</span>
  </div>

  <div
    v-else
    :class="[
      'message-bubble',
      isStaff ? 'message-bubble--staff' : 'message-bubble--user',
    ]"
  >
    <div class="message-bubble__header">
      <span class="message-bubble__sender">{{ message.senderName }}</span>
      <span class="message-bubble__time">{{ message.createdAtLabel }}</span>
      <Chip v-if="isInternalOnly" tone="neutral">
        {{ t("conversations.messages.visibility.internal_only") }}
      </Chip>
      <Chip v-if="isLinkKind" tone="primary">
        {{ t(`conversations.messages.kind.${message.kind}`) }}
      </Chip>
    </div>

    <div class="message-bubble__body">
      <template v-if="isLinkKind && !message.content">
        <span class="message-bubble__link-placeholder">
          [{{ t(`conversations.messages.kind.${message.kind}`) }}]
        </span>
      </template>
      <template v-else>
        {{ message.content }}
      </template>
    </div>

    <div v-if="message.translatedContent" class="message-bubble__translation">
      {{ message.translatedContent }}
    </div>

    <div v-if="showTranslationPending" class="message-bubble__translation-hint">
      {{ t("conversations.messages.translationPending") }}
    </div>

    <div v-if="showTranslationFailed" class="message-bubble__translation-error">
      <span>{{ t("conversations.messages.translationFailed") }}</span>
      <button
        type="button"
        class="message-bubble__retry-btn"
        @click="$emit('retryTranslation', message.id)"
      >
        {{ t("conversations.messages.retryTranslation") }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-bubble {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 75%;
  padding: 10px 14px;
  border-radius: var(--radius-lg);
  font-size: 14px;
}

.message-bubble--user {
  align-self: flex-start;
  background: var(--color-bg-2, #f3f4f6);
  color: var(--color-text-1, #1f2937);
}

.message-bubble--staff {
  align-self: flex-end;
  background: var(--color-primary-1, #eff6ff);
  color: var(--color-text-1, #1f2937);
}

.message-bubble--system {
  align-self: center;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  max-width: 90%;
  padding: 6px 12px;
  background: var(--color-bg-3, #e5e7eb);
  border-radius: var(--radius-full, 9999px);
  font-size: 12px;
  color: var(--color-text-3, #6b7280);
}

.message-bubble__system-icon {
  font-size: 14px;
}

.message-bubble__system-text {
  flex: 1;
}

.message-bubble__header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.message-bubble__sender {
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-2, #374151);
}

.message-bubble__time {
  color: var(--color-text-3, #6b7280);
  font-size: var(--font-size-xs);
}

.message-bubble__body {
  white-space: pre-wrap;
  word-break: break-word;
}

.message-bubble__link-placeholder {
  color: var(--color-primary-6);
  font-style: italic;
}

.message-bubble__translation {
  padding-top: 6px;
  border-top: 1px solid var(--color-border-1, #e5e7eb);
  margin-top: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3, #6b7280);
  font-style: italic;
}

.message-bubble__translation-hint {
  font-size: var(--font-size-xs);
  color: var(--color-text-3, #6b7280);
  font-style: italic;
}

.message-bubble__translation-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-danger, #ef4444);
}

.message-bubble__retry-btn {
  background: none;
  border: none;
  color: var(--color-primary-6);
  cursor: pointer;
  font-size: var(--font-size-xs);
  text-decoration: underline;
  padding: 0;
}

.message-bubble__retry-btn:hover {
  color: var(--color-primary-7);
}
</style>
