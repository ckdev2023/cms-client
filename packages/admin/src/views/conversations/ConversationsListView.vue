<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Chip from "../../shared/ui/Chip.vue";
import type { ChipTone } from "../../shared/ui/Chip.vue";
import ConversationFilters from "./components/ConversationFilters.vue";
import { createConversationRepository } from "./model/ConversationRepository";
import type {
  ConversationListParams,
  ConversationListResult,
} from "./model/ConversationAdapterTypes";
import type {
  ConversationScope,
  ConversationStatusFilter,
  ConversationOwnerFilter,
  ConversationListItem,
} from "./types";

/** 会话列表页：装配筛选、表格与分页等子模块。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const repository = createConversationRepository();

const scope = ref<ConversationScope>(
  (route.query.scope as ConversationScope) || "mine",
);
const search = ref((route.query.search as string) || "");
const statusFilter = ref<ConversationStatusFilter>(
  (route.query.status as ConversationStatusFilter) || "",
);
const ownerFilter = ref<ConversationOwnerFilter>(
  (route.query.owner as ConversationOwnerFilter) || "",
);
const unreadOnly = ref(route.query.unreadOnly === "true");
const linkedCustomerId = ref((route.query.customerId as string) || "");
const linkedCaseId = ref((route.query.caseId as string) || "");
const linkedLeadId = ref((route.query.leadId as string) || "");

const items = ref<ConversationListItem[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = 20;
const loading = ref(false);
const error = ref<string | null>(null);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(total.value / pageSize)),
);
const paginationStart = computed(() =>
  total.value === 0 ? 0 : (page.value - 1) * pageSize + 1,
);
const paginationEnd = computed(() =>
  total.value === 0 ? 0 : Math.min(page.value * pageSize, total.value),
);

async function fetchList() {
  loading.value = true;
  error.value = null;
  try {
    const params: ConversationListParams = {
      scope: scope.value,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      ownerUserId: ownerFilter.value || undefined,
      unreadOnly: unreadOnly.value || undefined,
      customerId: linkedCustomerId.value || undefined,
      caseId: linkedCaseId.value || undefined,
      leadId: linkedLeadId.value || undefined,
      page: page.value,
      limit: pageSize,
    };
    const result: ConversationListResult =
      await repository.listConversations(params);
    items.value = result.items;
    total.value = result.total;
  } catch {
    items.value = [];
    total.value = 0;
    error.value = t("conversations.errors.fetchFailed");
  } finally {
    loading.value = false;
  }
}

/** 将当前筛选状态同步到路由查询参数。 */
function syncQueryToRoute() {
  const query: Record<string, string> = {};
  if (scope.value !== "mine") query.scope = scope.value;
  if (search.value) query.search = search.value;
  if (statusFilter.value) query.status = statusFilter.value;
  if (ownerFilter.value) query.owner = ownerFilter.value;
  if (unreadOnly.value) query.unreadOnly = "true";
  if (linkedCustomerId.value) query.customerId = linkedCustomerId.value;
  if (linkedCaseId.value) query.caseId = linkedCaseId.value;
  if (linkedLeadId.value) query.leadId = linkedLeadId.value;
  if (page.value > 1) query.page = String(page.value);
  router.replace({ path: route.path, query });
}

/** 重置所有筛选条件到默认值。 */
function resetFilters() {
  scope.value = "mine";
  search.value = "";
  statusFilter.value = "";
  ownerFilter.value = "";
  unreadOnly.value = false;
  linkedCustomerId.value = "";
  linkedCaseId.value = "";
  linkedLeadId.value = "";
  page.value = 1;
}

/**
 * 切换分页页码并约束范围。
 *
 * @param p - 目标页码
 */
function setPage(p: number) {
  page.value = Math.max(1, Math.min(p, totalPages.value));
}

/**
 * 根据会话状态返回对应的 Chip 色调。
 *
 * @param status - 会话状态
 * @returns 对应的 ChipTone
 */
function statusTone(status: string): ChipTone {
  return status === "closed" ? "neutral" : "success";
}

/**
 * 计算员工侧总未读数。
 *
 * @param item - 会话列表行
 * @returns 员工侧总未读数
 */
function totalUnread(item: ConversationListItem): number {
  return item.unreadCountStaffTenant + item.unreadCountStaffOwner;
}

watch(
  [
    scope,
    search,
    statusFilter,
    ownerFilter,
    unreadOnly,
    linkedCustomerId,
    linkedCaseId,
    linkedLeadId,
    page,
  ],
  () => {
    syncQueryToRoute();
    fetchList();
  },
);

onMounted(() => {
  fetchList();
});
</script>

<template>
  <div class="conv-list-view">
    <PageHeader
      :title="t('conversations.list.title')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('conversations.list.title') },
      ]"
    />

    <ConversationFilters
      :scope="scope"
      :search="search"
      :status="statusFilter"
      :owner="ownerFilter"
      :unread-only="unreadOnly"
      :filtered-count="total"
      @update:scope="scope = $event"
      @update:search="search = $event"
      @update:status="statusFilter = $event"
      @update:owner="ownerFilter = $event"
      @update:unread-only="unreadOnly = $event"
      @reset-filters="resetFilters"
    />

    <div v-if="error" class="conv-list-view__error">
      {{ error }}
    </div>

    <div v-else-if="loading" class="conv-list-view__loading">Loading…</div>

    <template v-else-if="items.length > 0">
      <table class="conv-list-view__table">
        <thead>
          <tr>
            <th>{{ t("conversations.list.columns.conversation") }}</th>
            <th>{{ t("conversations.list.columns.lastMessage") }}</th>
            <th>{{ t("conversations.list.columns.status") }}</th>
            <th>{{ t("conversations.list.columns.owner") }}</th>
            <th>{{ t("conversations.list.columns.linkedEntity") }}</th>
            <th>{{ t("conversations.list.columns.updated") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in items"
            :key="item.id"
            class="conv-list-view__row"
            @click="$router.push(`/conversations/${item.id}`)"
          >
            <td>
              <div class="conv-list-view__identity">
                <span class="conv-list-view__name">{{ item.appUserName }}</span>
                <span class="conv-list-view__meta">
                  {{ item.channel }} · {{ item.preferredLanguage }}
                </span>
              </div>
            </td>
            <td class="conv-list-view__preview-cell">
              <span class="conv-list-view__preview">
                {{ item.lastMessagePreview }}
              </span>
              <Chip v-if="totalUnread(item) > 0" tone="danger">
                {{
                  t("conversations.list.unread.badge", {
                    count: totalUnread(item),
                  })
                }}
              </Chip>
            </td>
            <td>
              <Chip :tone="statusTone(item.status)">
                {{ t(`conversations.list.status.${item.status}`) }}
              </Chip>
            </td>
            <td>{{ item.ownerLabel || "—" }}</td>
            <td>
              <template v-if="item.linkedEntity">
                {{ item.linkedEntity.label }}
              </template>
              <template v-else>—</template>
            </td>
            <td>{{ item.lastMessageAtLabel }}</td>
          </tr>
        </tbody>
      </table>

      <div class="conv-list-view__pagination">
        <span class="conv-list-view__pagination-summary">
          {{
            t("conversations.list.pagination.summary", {
              start: paginationStart,
              end: paginationEnd,
              total,
            })
          }}
        </span>
        <div class="conv-list-view__pagination-controls">
          <button
            type="button"
            :disabled="page <= 1"
            @click="setPage(page - 1)"
          >
            {{ t("conversations.list.pagination.prev") }}
          </button>
          <button
            type="button"
            :disabled="page >= totalPages"
            @click="setPage(page + 1)"
          >
            {{ t("conversations.list.pagination.next") }}
          </button>
        </div>
      </div>
    </template>

    <div v-else-if="!loading" class="conv-list-view__empty">
      <h3>{{ t("conversations.list.empty.title") }}</h3>
      <p>{{ t("conversations.list.empty.description") }}</p>
    </div>
  </div>
</template>

<style scoped>
.conv-list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
}

.conv-list-view__error {
  padding: 12px 16px;
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger, #ef4444);
  border-radius: var(--radius-md);
  font-size: 14px;
}

.conv-list-view__loading {
  text-align: center;
  padding: 40px;
  color: var(--color-text-3, #6b7280);
}

.conv-list-view__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.conv-list-view__table th {
  text-align: left;
  padding: 10px 12px;
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-3, #6b7280);
  border-bottom: 1px solid var(--color-border-1, #e5e7eb);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.conv-list-view__table td {
  padding: 12px;
  border-bottom: 1px solid var(--color-border-1, #e5e7eb);
  vertical-align: middle;
}

.conv-list-view__row {
  cursor: pointer;
  transition: background-color 0.15s;
}

.conv-list-view__row:hover {
  background: var(--color-bg-2, #f9fafb);
}

.conv-list-view__identity {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.conv-list-view__name {
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-1, #1f2937);
}

.conv-list-view__meta {
  font-size: 12px;
  color: var(--color-text-3, #6b7280);
}

.conv-list-view__preview-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.conv-list-view__preview {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 280px;
  color: var(--color-text-2, #4b5563);
}

.conv-list-view__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

.conv-list-view__pagination-summary {
  font-size: var(--font-size-sm);
  color: var(--color-text-3, #6b7280);
}

.conv-list-view__pagination-controls {
  display: flex;
  gap: 8px;
}

.conv-list-view__pagination-controls button {
  padding: 6px 14px;
  border: 1px solid var(--color-border-1, #d1d5db);
  border-radius: var(--radius-md);
  background: var(--color-bg-1, #fff);
  font-size: var(--font-size-sm);
  cursor: pointer;
  color: var(--color-text-1, #1f2937);
}

.conv-list-view__pagination-controls button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.conv-list-view__empty {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-3, #6b7280);
}

.conv-list-view__empty h3 {
  font-size: 16px;
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-2, #4b5563);
  margin-bottom: 8px;
}

.conv-list-view__empty p {
  font-size: 14px;
}
</style>
