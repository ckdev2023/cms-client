<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CaseDetail, MessageItem, MessageTypeKey } from "../types-detail";
import { MESSAGE_FILTERS } from "../constants";
import type { MessageChannelChoice } from "../model/CaseAdapterMessageWriteBuilders";
import {
  CASE_MESSAGE_CHIP_TONE_MAP,
  caseMessageAvatarBg,
  caseMessageAvatarColor,
} from "./CaseMessagesTab.chipStyle";

/** 沟通记录 Tab：消息时间线、撰写区与类型筛选面板。 */
const { t } = useI18n();
const props = defineProps<{
  detail: CaseDetail;
  readonly: boolean;
  /** 成功发布沟通记录后递增，用于在服务端确认成功后再清空撰写区。 */
  publishSuccessNonce?: number;
  /** 任意写操作中（含发布沟通记录）；用于禁用按钮避免误解。 */
  writeSubmitting?: boolean;
}>();

const emit = defineEmits<{
  (
    e: "publish-message",
    payload: { content: string; channelChoice: MessageChannelChoice },
  ): void;
}>();

const composerText = ref("");
const channelChoice = ref<MessageChannelChoice>("internal");
const composerRef = ref<HTMLTextAreaElement | null>(null);
const draftBeforePublish = ref<string | null>(null);
const canPublish = computed(
  () => composerText.value.trim().length > 0 && !props.writeSubmitting,
);

let lastPublishSuccessNonce = props.publishSuccessNonce ?? 0;
watch(
  () => props.publishSuccessNonce ?? 0,
  (next) => {
    if (next <= lastPublishSuccessNonce) return;
    if (
      draftBeforePublish.value !== null &&
      composerText.value === draftBeforePublish.value
    ) {
      composerText.value = "";
    }
    draftBeforePublish.value = null;
    lastPublishSuccessNonce = next;
  },
  { immediate: true },
);

/**
 * 将消息类型映射为撰写区渠道下拉选项。
 *
 * @param type 消息类型（含自动邮件等）
 * @returns 与写入渠道一致的撰写区选项
 */
function channelChoiceForMessageType(
  type: MessageTypeKey,
): MessageChannelChoice {
  switch (type) {
    case "client_visible":
      return "client_visible";
    case "phone":
      return "phone";
    case "meeting":
      return "meeting";
    case "internal":
    case "auto_email":
    default:
      return "internal";
  }
}

/**
 * 将正文转为逐行引用格式（每行前加 `>`）。
 *
 * @param body 原始正文
 * @returns 带引用前缀的多行字符串
 */
function quotedBodyLines(body: string): string {
  return body
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

/** 下一帧聚焦撰写区并滚动到视口中间，便于继续输入。 */
function focusComposer(): void {
  void nextTick(() => {
    const el = composerRef.value;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

/**
 * 从时间线记录起草回复：引用原文并同步渠道选项。
 *
 * @param msg 被回复的沟通记录
 */
function handleReply(msg: MessageItem): void {
  channelChoice.value = channelChoiceForMessageType(msg.type);
  const header = t("cases.detail.messages.replyDraftHeader", {
    author: msg.author,
    time: msg.time,
  });
  composerText.value = `${header}\n${quotedBodyLines(msg.body)}\n\n`;
  focusComposer();
}

/**
 * 将记录正文载入撰写区，便于修改后重新发布。
 *
 * @param msg 待作为草稿载入的沟通记录
 */
function handleEdit(msg: MessageItem): void {
  channelChoice.value = channelChoiceForMessageType(msg.type);
  composerText.value = msg.body;
  focusComposer();
}

/** 发布当前撰写区内容；成功清空由 `publishSuccessNonce` 驱动。 */
function handlePublish(): void {
  if (!canPublish.value) return;
  draftBeforePublish.value = composerText.value;
  emit("publish-message", {
    content: composerText.value,
    channelChoice: channelChoice.value,
  });
}

const conversationsHref = computed(
  () => `#/conversations?caseId=${props.detail.id}`,
);

const activeFilter = ref<"all" | MessageTypeKey>("all");

const displayedMessages = computed(() =>
  activeFilter.value === "all"
    ? props.detail.messages
    : props.detail.messages.filter((m) => m.type === activeFilter.value),
);
</script>

<template>
  <div class="messages-tab">
    <div class="messages-tab__conv-link-bar">
      <a :href="conversationsHref" class="messages-tab__conv-link">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {{ t("cases.detail.messages.viewConversations") }}
      </a>
    </div>
    <div class="messages-tab__grid">
      <div class="messages-tab__main">
        <Card v-if="!readonly" padding="md">
          <textarea
            id="messages-composerText"
            ref="composerRef"
            name="composerText"
            v-model="composerText"
            class="messages-tab__composer"
            rows="3"
            data-testid="messages-composer"
            :placeholder="t('cases.detail.messages.composerPlaceholder')"
          />
          <p class="messages-tab__composer-hint">
            {{ t("cases.detail.messages.composerHint") }}
          </p>
          <div class="messages-tab__composer-footer">
            <div class="messages-tab__composer-right">
              <select
                id="messages-channelChoice"
                name="channelChoice"
                v-model="channelChoice"
                class="messages-tab__type-select"
                data-testid="messages-channel-select"
              >
                <option value="internal">
                  {{ t("cases.detail.messages.typeInternal") }}
                </option>
                <option value="client_visible">
                  {{ t("cases.detail.messages.typeClientVisible") }}
                </option>
                <option value="phone">
                  {{ t("cases.detail.messages.typePhone") }}
                </option>
                <option value="meeting">
                  {{ t("cases.detail.messages.typeMeeting") }}
                </option>
              </select>
              <button
                class="messages-tab__publish-btn"
                type="button"
                data-testid="messages-publish-btn"
                :disabled="!canPublish"
                @click="handlePublish"
              >
                {{ t("cases.detail.messages.publish") }}
              </button>
            </div>
          </div>
        </Card>

        <template v-if="detail.messages.length > 0">
          <template v-if="displayedMessages.length > 0">
            <Card
              v-for="msg in displayedMessages"
              :key="msg.id"
              padding="md"
              hoverable
            >
              <div class="messages-tab__msg-header">
                <div class="messages-tab__msg-author">
                  <span
                    class="messages-tab__avatar"
                    :style="{
                      backgroundColor: caseMessageAvatarBg(msg.avatarStyle),
                      color: caseMessageAvatarColor(msg.avatarStyle),
                    }"
                  >
                    {{ msg.avatar }}
                  </span>
                  <span class="messages-tab__author-name">{{
                    msg.author
                  }}</span>
                  <Chip
                    :tone="CASE_MESSAGE_CHIP_TONE_MAP[msg.type] ?? 'neutral'"
                  >
                    {{ t(msg.typeLabelKey) }}
                  </Chip>
                </div>
                <span class="messages-tab__msg-time">{{ msg.time }}</span>
              </div>
              <p class="messages-tab__msg-body">{{ msg.body }}</p>
              <div v-if="msg.actionLabel" class="messages-tab__msg-action">
                <button class="messages-tab__action-link" type="button">
                  {{ msg.actionLabel }}
                </button>
              </div>
              <div
                v-if="!readonly && !msg.actionLabel"
                class="messages-tab__msg-hover-actions"
              >
                <button
                  class="messages-tab__hover-btn"
                  type="button"
                  data-testid="messages-reply-btn"
                  @click="handleReply(msg)"
                >
                  {{ t("cases.detail.messages.reply") }}
                </button>
                <button
                  class="messages-tab__hover-btn"
                  type="button"
                  data-testid="messages-edit-btn"
                  @click="handleEdit(msg)"
                >
                  {{ t("cases.detail.messages.edit") }}
                </button>
              </div>
            </Card>
          </template>
          <Card v-else padding="lg">
            <p class="messages-tab__empty" data-testid="messages-filter-empty">
              {{ t("cases.detail.messages.filterEmpty") }}
            </p>
          </Card>
        </template>

        <Card v-else padding="lg">
          <p class="messages-tab__empty">
            {{ t("cases.detail.messages.empty") }}
          </p>
        </Card>
      </div>

      <div class="messages-tab__sidebar">
        <Card padding="md">
          <template #header>
            <h2 class="messages-tab__filter-title">
              {{ t("cases.detail.messages.filterTitle") }}
            </h2>
            <button
              class="messages-tab__filter-reset"
              type="button"
              @click="activeFilter = 'all'"
            >
              {{ t("cases.detail.messages.filterReset") }}
            </button>
          </template>
          <div class="messages-tab__filter-list">
            <label
              v-for="f in MESSAGE_FILTERS"
              :key="f.key"
              class="messages-tab__filter-item"
            >
              <input
                :id="`msgFilter-${f.key}`"
                type="radio"
                name="msgFilter"
                :value="f.key"
                :checked="activeFilter === f.key"
                class="messages-tab__filter-radio"
                :data-testid="`messages-filter-${f.key}`"
                @change="activeFilter = f.key as typeof activeFilter"
              />
              <span
                :class="[
                  'messages-tab__filter-label',
                  {
                    'messages-tab__filter-label--active':
                      activeFilter === f.key,
                  },
                ]"
              >
                {{ t(f.i18nKey) }}
              </span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped src="./CaseMessagesTab.styles.css"></style>
