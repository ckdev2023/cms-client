<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import { createConversationRepository } from "../../conversations/model/ConversationRepository";
import type { ConversationListItem } from "../../conversations/types";

/** 线索详情会话 Tab：按 leadId 拉取关联会话列表，点击行跳转会话详情。 */
const props = defineProps<{
  leadId: string;
}>();

const { t } = useI18n();
const repository = createConversationRepository();

const items = ref<ConversationListItem[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

/**
 * 根据会话状态返回 Chip 色调。
 * @param status 会话状态
 * @returns 对应的 ChipTone
 */
function statusTone(status: string): ChipTone {
  return status === "closed" ? "neutral" : "success";
}

/**
 * 计算员工侧总未读数。
 * @param item 会话列表行
 * @returns 员工侧总未读数
 */
function totalUnread(item: ConversationListItem): number {
  return item.unreadCountStaffTenant + item.unreadCountStaffOwner;
}

async function fetchConversations(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const result = await repository.listConversations({
      leadId: props.leadId,
      limit: 50,
    });
    items.value = result.items;
  } catch {
    error.value = t("conversations.errors.fetchFailed");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchConversations();
});
</script>

<template>
  <div class="lead-conv-tab">
    <div v-if="loading" class="lead-conv-tab__loading">
      <p>{{ t("shared.loading") }}</p>
    </div>

    <div v-else-if="error" class="lead-conv-tab__error">
      {{ error }}
    </div>

    <div v-else-if="items.length > 0" data-h5-mode="scroll">
      <table class="lead-conv-tab__table">
        <thead>
          <tr>
            <th>{{ t("conversations.list.columns.conversation") }}</th>
            <th>{{ t("conversations.list.columns.lastMessage") }}</th>
            <th>{{ t("conversations.list.columns.status") }}</th>
            <th>{{ t("conversations.list.columns.owner") }}</th>
            <th>{{ t("conversations.list.columns.updated") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="lead-conv-tab__row"
            @click="$router.push(`/conversations/${item.id}`)"
          >
            <td>
              <div class="lead-conv-tab__identity">
                <span class="lead-conv-tab__name">{{ item.appUserName }}</span>
                <span class="lead-conv-tab__meta">
                  {{ item.channel }} · {{ item.preferredLanguage }}
                </span>
              </div>
            </td>
            <td class="lead-conv-tab__preview-cell">
              <span class="lead-conv-tab__preview">
                {{ item.lastMessagePreview || "—" }}
              </span>
              <Chip v-if="totalUnread(item) > 0" tone="danger">
                {{ totalUnread(item) }}
              </Chip>
            </td>
            <td>
              <Chip :tone="statusTone(item.status)">
                {{ t(`conversations.list.status.${item.status}`) }}
              </Chip>
            </td>
            <td>{{ item.ownerLabel || "—" }}</td>
            <td>{{ item.lastMessageAtLabel }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="lead-conv-tab__empty">
      <p>{{ t("leads.detail.conversationsTab.empty") }}</p>
    </div>
  </div>
</template>

<style scoped>
.lead-conv-tab__loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
}

.lead-conv-tab__error {
  padding: 12px 16px;
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger, #ef4444);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.lead-conv-tab__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.lead-conv-tab__table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-3, #6b7280);
  border-bottom: 1px solid var(--color-border-1, #e5e7eb);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.lead-conv-tab__table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-border-1, #e5e7eb);
  vertical-align: middle;
}

.lead-conv-tab__row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.lead-conv-tab__row:hover {
  background: var(--color-bg-2, #f9fafb);
}

.lead-conv-tab__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lead-conv-tab__name {
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-1, #1f2937);
}

.lead-conv-tab__meta {
  font-size: 12px;
  color: var(--color-text-3, #6b7280);
}

.lead-conv-tab__preview-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lead-conv-tab__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  color: var(--color-text-2, #4b5563);
}

.lead-conv-tab__empty {
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-3);
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-lg, 16px);
  font-size: var(--font-size-sm);
}
</style>
