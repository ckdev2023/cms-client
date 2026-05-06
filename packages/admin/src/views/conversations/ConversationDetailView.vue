<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Card from "../../shared/ui/Card.vue";
import Chip from "../../shared/ui/Chip.vue";
import Button from "../../shared/ui/Button.vue";
import MessageBubble from "./components/MessageBubble.vue";
import ConversationOwnerPickerDialog from "./components/ConversationOwnerPickerDialog.vue";
import { createConversationRepository } from "./model/ConversationRepository";
import { useConversationDetailModel } from "./model/useConversationDetailModel";

/** 会话详情页：消息时间线、元信息面板、编辑区与会话操作入口；支持 compact 嵌入模式。 */
const props = withDefaults(
  defineProps<{
    compact?: boolean;
    autoMarkRead?: boolean;
    conversationId?: string;
  }>(),
  {
    compact: false,
    autoMarkRead: false,
    conversationId: undefined,
  },
);

const { t } = useI18n();
const route = useRoute();

const resolvedId = computed(
  () => props.conversationId || (route.params.id as string),
);

const repository = createConversationRepository();
const {
  detail,
  messages,
  loading,
  error,
  isClosed,
  messageInput,
  sending,
  fetchDetail,
  sendMessage,
  assignOwner: assignOwnerModel,
  closeConversation,
  reopenConversation,
  retryTranslation,
} = useConversationDetailModel(resolvedId, {
  repo: repository,
  autoMarkRead: props.autoMarkRead,
});

const showOwnerPicker = ref(false);

/** 打开负责人选择弹窗 */
function openOwnerPicker() {
  showOwnerPicker.value = true;
}

/**
 * 处理负责人选择结果并触发指派
 *
 * @param ownerId - 选中的用户 ID
 */
function handleOwnerPick(ownerId: string) {
  showOwnerPicker.value = false;
  assignOwnerModel(ownerId);
}

watch(resolvedId, () => {
  fetchDetail();
});

onMounted(() => {
  fetchDetail();
});
</script>

<template>
  <div :class="['conv-detail', { 'conv-detail--compact': compact }]">
    <PageHeader
      v-if="!compact"
      :title="t('conversations.detail.title')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('conversations.list.title'), href: '#/conversations' },
        { label: detail?.appUserName || '…' },
      ]"
    >
      <template v-if="detail" #actions>
        <Button
          v-if="!isClosed"
          variant="outlined"
          tone="neutral"
          size="sm"
          @click="openOwnerPicker"
        >
          {{
            detail.ownerUserId
              ? t("conversations.detail.reassign")
              : t("conversations.detail.assignOwner")
          }}
        </Button>
        <Button
          v-if="!isClosed"
          variant="outlined"
          tone="danger"
          size="sm"
          @click="closeConversation"
        >
          {{ t("conversations.detail.close") }}
        </Button>
        <Button
          v-if="isClosed"
          variant="outlined"
          tone="primary"
          size="sm"
          @click="reopenConversation"
        >
          {{ t("conversations.detail.reopen") }}
        </Button>
      </template>
    </PageHeader>

    <div v-if="error" class="conv-detail__error">
      {{ t(error) }}
    </div>

    <div v-if="loading" class="conv-detail__loading">Loading…</div>

    <template v-else-if="detail">
      <div v-if="isClosed" class="conv-detail__closed-banner">
        {{ t("conversations.detail.closedBanner") }}
      </div>

      <div v-if="!compact" class="conv-detail__sidebar">
        <Card padding="md">
          <dl class="conv-detail__meta-list">
            <div class="conv-detail__meta-item">
              <dt>{{ t("conversations.detail.channel") }}</dt>
              <dd>{{ detail.channel }}</dd>
            </div>
            <div class="conv-detail__meta-item">
              <dt>{{ t("conversations.detail.preferredLanguage") }}</dt>
              <dd>{{ detail.preferredLanguage }}</dd>
            </div>
            <div class="conv-detail__meta-item">
              <dt>{{ t("conversations.detail.linkedLead") }}</dt>
              <dd>
                <template v-if="detail.linkedLead">
                  <a :href="`#/leads/${detail.linkedLead.id}`">
                    {{ detail.linkedLead.label }}
                  </a>
                </template>
                <template v-else>
                  {{ t("conversations.detail.noLinkedEntity") }}
                </template>
              </dd>
            </div>
            <div class="conv-detail__meta-item">
              <dt>{{ t("conversations.detail.linkedCustomer") }}</dt>
              <dd>
                <template v-if="detail.linkedCustomer">
                  <a :href="`#/customers/${detail.linkedCustomer.id}`">
                    {{ detail.linkedCustomer.label }}
                  </a>
                </template>
                <template v-else>
                  {{ t("conversations.detail.noLinkedEntity") }}
                </template>
              </dd>
            </div>
            <div class="conv-detail__meta-item">
              <dt>{{ t("conversations.detail.linkedCase") }}</dt>
              <dd>
                <template v-if="detail.linkedCase">
                  <a :href="`#/cases/${detail.linkedCase.id}`">
                    {{ detail.linkedCase.label }}
                  </a>
                </template>
                <template v-else>
                  {{ t("conversations.detail.noLinkedEntity") }}
                </template>
              </dd>
            </div>
          </dl>
        </Card>

        <Card padding="sm">
          <div class="conv-detail__unread-summary">
            <Chip tone="neutral">
              {{ t("conversations.list.unread.user") }}:
              {{ detail.unreadCountUser }}
            </Chip>
            <Chip tone="neutral">
              {{ t("conversations.list.unread.staffTenant") }}:
              {{ detail.unreadCountStaffTenant }}
            </Chip>
            <Chip tone="neutral">
              {{ t("conversations.list.unread.staffOwner") }}:
              {{ detail.unreadCountStaffOwner }}
            </Chip>
          </div>
        </Card>
      </div>

      <div class="conv-detail__messages">
        <MessageBubble
          v-for="msg in messages"
          :key="msg.id"
          :message="msg"
          :is-closed="isClosed"
          @retry-translation="retryTranslation"
        />
      </div>

      <div v-if="!isClosed" class="conv-detail__composer">
        <textarea
          v-model="messageInput"
          class="conv-detail__composer-input"
          rows="3"
          :placeholder="t('conversations.messages.inputPlaceholder')"
          @keydown.enter.ctrl="sendMessage"
        />
        <div class="conv-detail__composer-footer">
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!messageInput.trim() || sending"
            @click="sendMessage"
          >
            {{ t("conversations.messages.send") }}
          </Button>
        </div>
      </div>

      <div v-else class="conv-detail__closed-notice">
        {{ t("conversations.messages.closedCannotSend") }}
      </div>
    </template>

    <ConversationOwnerPickerDialog
      v-if="showOwnerPicker"
      :current-owner-user-id="detail?.ownerUserId"
      @pick="handleOwnerPick"
      @close="showOwnerPicker = false"
    />
  </div>
</template>

<style scoped>
.conv-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.conv-detail--compact {
  padding: 0;
}

.conv-detail__error {
  padding: 12px 16px;
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger, #ef4444);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.conv-detail__loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-3, #6b7280);
}

.conv-detail__closed-banner {
  padding: 12px 16px;
  background: var(--color-warning-bg, #fffbeb);
  color: var(--color-warning-text);
  border: 1px solid var(--color-warning-border, #fcd34d);
  border-radius: var(--radius-md);
  font-size: var(--font-size-base);
  line-height: var(--leading-base);
}

.conv-detail__sidebar {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.conv-detail__meta-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.conv-detail__meta-item {
  display: flex;
  gap: 8px;
}

.conv-detail__meta-item dt {
  flex: 0 0 120px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-3, #6b7280);
}

.conv-detail__meta-item dd {
  font-size: 14px;
  color: var(--color-text-1, #1f2937);
}

.conv-detail__meta-item a {
  color: var(--color-primary-6);
  text-decoration: none;
}

.conv-detail__meta-item a:hover {
  text-decoration: underline;
}

.conv-detail__unread-summary {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.conv-detail__messages {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 0;
  min-height: 200px;
}

.conv-detail__composer {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.conv-detail__composer-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-1, #d1d5db);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  color: var(--color-text-1, #1f2937);
  background: var(--color-bg-1, #fff);
}

.conv-detail__composer-input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.conv-detail__composer-footer {
  display: flex;
  justify-content: flex-end;
}

.conv-detail__closed-notice {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: var(--color-text-3, #6b7280);
  background: var(--color-bg-2, #f3f4f6);
  border-radius: var(--radius-md);
}
</style>
