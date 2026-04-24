<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import { getRelationTypeLabel } from "../types";
import type { CustomerRepository } from "../model/CustomerRepository";
import { useCustomerContactsModel } from "../model/useCustomerContactsModel";
import CustomerRelationModal from "./CustomerRelationModal.vue";
/** 关联人 Tab：展示关联人表格，支持搜索、多选与批量操作占位。 */
const props = withDefaults(
  defineProps<{
    customerId: string;
    repository: Pick<
      CustomerRepository,
      "createRelation" | "listRelations" | "updateRelation"
    >;
    batchCreateCaseDisabled?: boolean;
    batchCreateCaseHint?: string | null;
  }>(),
  {
    batchCreateCaseDisabled: false,
    batchCreateCaseHint: null,
  },
);
const { t } = useI18n();
const router = useRouter();
const customerIdRef = computed(() => props.customerId);
const {
  searchQuery,
  filteredRelations,
  selectedRelations,
  isAllSelected,
  isIndeterminate,
  hasSelection,
  loading,
  errorCode,
  isModalOpen,
  relationForm,
  isEditing,
  canSubmit,
  saving,
  saveErrorCode,
  toggleSelectAll,
  toggleSelect,
  selectedIds,
  setSearch,
  openCreateModal,
  openEditModal,
  closeModal,
  updateFormField,
  submitModal,
  retry,
} = useCustomerContactsModel({
  customerId: customerIdRef,
  repository: props.repository,
});
/** 跳转到家族批量建案，并把当前选中的关联人上下文序列化到 query。 */
function handleBatchCreate(): void {
  const nextCustomerId = props.customerId.trim();
  if (!nextCustomerId || !selectedRelations.value.length) return;
  void router.push({
    name: "case-create",
    hash: "#family-bulk",
    query: {
      customerId: nextCustomerId,
      relationIds: selectedRelations.value
        .map((relation) => relation.id)
        .join(","),
      selectedRelations: JSON.stringify(
        selectedRelations.value.map((relation) => ({
          id: relation.id,
          name: relation.name,
          relationType: relation.relationType,
          roleTitle: relation.tags[0] || undefined,
          phone: relation.phone || undefined,
          email: relation.email || undefined,
          tags: relation.tags,
          note: relation.note || undefined,
        })),
      ),
    },
  });
}
</script>

<template>
  <Card padding="lg">
    <div class="contacts-tab">
      <div class="contacts-tab__header">
        <h3 class="contacts-tab__title">
          {{ t("customers.detail.contactsTab.title") }}
        </h3>
        <div class="contacts-tab__actions">
          <Button
            size="sm"
            pill
            :disabled="batchCreateCaseDisabled || !hasSelection"
            @click="handleBatchCreate"
          >
            {{ t("customers.detail.contactsTab.batchCreate") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            @click="openCreateModal"
          >
            {{ t("customers.detail.contactsTab.add") }}
          </Button>
        </div>
        <p v-if="batchCreateCaseHint" class="contacts-tab__actions-hint">
          {{ batchCreateCaseHint }}
        </p>
      </div>
      <div class="contacts-tab__toolbar">
        <SearchField
          variant="inline"
          :model-value="searchQuery"
          :placeholder="t('customers.detail.contactsTab.searchPlaceholder')"
          :label="t('customers.detail.contactsTab.searchLabel')"
          @update:model-value="setSearch"
        />
        <span class="contacts-tab__count">
          {{
            t("customers.detail.contactsTab.count", {
              count: filteredRelations.length,
            })
          }}
        </span>
      </div>
      <div class="contacts-tab__table-wrap">
        <div v-if="loading" class="contacts-tab__state">
          <p class="contacts-tab__state-text">
            {{ t("customers.detail.contactsTab.loading") }}
          </p>
        </div>
        <div v-else-if="errorCode" class="contacts-tab__state">
          <p class="contacts-tab__state-text">
            {{ t("customers.detail.contactsTab.requestFailed") }}
          </p>
          <Button size="sm" pill @click="retry">
            {{ t("customers.detail.contactsTab.retry") }}
          </Button>
        </div>
        <table v-else-if="filteredRelations.length" class="contacts-tab__table">
          <thead>
            <tr>
              <th class="contacts-tab__th contacts-tab__th--check">
                <input
                  class="contacts-tab__checkbox"
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  :aria-label="t('customers.detail.contactsTab.selectAll')"
                  :disabled="!filteredRelations.length"
                  @change="toggleSelectAll"
                />
              </th>
              <th class="contacts-tab__th">
                {{ t("customers.detail.contactsTab.colName") }}
              </th>
              <th class="contacts-tab__th contacts-tab__th--type">
                {{ t("customers.detail.contactsTab.colRelation") }}
              </th>
              <th class="contacts-tab__th contacts-tab__th--contact">
                {{ t("customers.detail.contactsTab.colContact") }}
              </th>
              <th class="contacts-tab__th contacts-tab__th--tags">
                {{ t("customers.detail.contactsTab.colTags") }}
              </th>
              <th class="contacts-tab__th contacts-tab__th--note">
                {{ t("customers.detail.contactsTab.colNote") }}
              </th>
              <th class="contacts-tab__th contacts-tab__th--action">
                {{ t("customers.detail.contactsTab.colAction") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="r in filteredRelations"
              :key="r.id"
              class="contacts-tab__row"
            >
              <td class="contacts-tab__td contacts-tab__td--check">
                <input
                  class="contacts-tab__checkbox"
                  type="checkbox"
                  :checked="!!selectedIds[r.id]"
                  :aria-label="
                    t('customers.detail.contactsTab.selectRow', {
                      name: r.name,
                    })
                  "
                  @change="toggleSelect(r.id)"
                />
              </td>
              <td class="contacts-tab__td">
                <div class="contacts-tab__name">{{ r.name || "—" }}</div>
                <div class="contacts-tab__sub">{{ r.kana || "—" }}</div>
              </td>
              <td class="contacts-tab__td contacts-tab__td--type">
                {{ getRelationTypeLabel(r.relationType) }}
              </td>
              <td class="contacts-tab__td contacts-tab__td--contact">
                <div>{{ r.phone || "—" }}</div>
                <div class="contacts-tab__sub">{{ r.email || "—" }}</div>
              </td>
              <td class="contacts-tab__td contacts-tab__td--tags">
                <div v-if="r.tags.length" class="contacts-tab__tag-wrap">
                  <Chip v-for="tag in r.tags.slice(0, 4)" :key="tag" size="sm">
                    {{ tag }}
                  </Chip>
                  <Chip v-if="r.tags.length > 4" size="sm">
                    +{{ r.tags.length - 4 }}
                  </Chip>
                </div>
                <span v-else class="contacts-tab__dash">—</span>
              </td>
              <td class="contacts-tab__td contacts-tab__td--note">
                {{ r.note || "—" }}
              </td>
              <td class="contacts-tab__td contacts-tab__td--action">
                <Button
                  size="sm"
                  pill
                  :aria-label="t('customers.detail.contactsTab.edit')"
                  @click="openEditModal(r)"
                >
                  {{ t("customers.detail.contactsTab.edit") }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-else class="contacts-tab__empty">
          <div class="contacts-tab__empty-icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <p class="contacts-tab__empty-title">
            {{
              searchQuery
                ? t("customers.detail.contactsTab.emptySearch")
                : t("customers.detail.contactsTab.emptyNone")
            }}
          </p>
          <p class="contacts-tab__empty-desc">
            {{
              searchQuery
                ? t("customers.detail.contactsTab.emptySearchHint")
                : t("customers.detail.contactsTab.emptyNoneHint")
            }}
          </p>
        </div>
      </div>
      <CustomerRelationModal
        :open="isModalOpen"
        :form="relationForm"
        :is-editing="isEditing"
        :can-submit="canSubmit"
        :saving="saving"
        :error-code="saveErrorCode"
        @close="closeModal"
        @submit="submitModal"
        @update:field="updateFormField"
      />
    </div>
  </Card>
</template>

<style scoped>
.contacts-tab {
  display: flex;
  flex-direction: column;
}

.contacts-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.contacts-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.contacts-tab__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contacts-tab__actions-hint {
  margin: 0;
  width: 100%;
  text-align: right;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.contacts-tab__toolbar {
  margin-top: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.contacts-tab__count {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
}

.contacts-tab__table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
}

.contacts-tab__state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
}

.contacts-tab__state-text {
  margin: 0;
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.contacts-tab__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.contacts-tab__th {
  padding: 12px 16px;
  text-align: left;
  font-weight: var(--font-weight-black);
  color: var(--color-text-3);
  background: var(--color-bg-3);
  white-space: nowrap;
}

.contacts-tab__th--check {
  width: 44px;
}

.contacts-tab__th--type {
  width: 120px;
}

.contacts-tab__th--contact {
  width: 180px;
}

.contacts-tab__th--tags {
  width: 160px;
}

.contacts-tab__th--note {
  width: 180px;
}

.contacts-tab__th--action {
  width: 120px;
}

@media (max-width: 767px) {
  .contacts-tab__th--contact,
  .contacts-tab__td--contact {
    display: none;
  }
}

@media (max-width: 1023px) {
  .contacts-tab__th--tags,
  .contacts-tab__td--tags,
  .contacts-tab__th--note,
  .contacts-tab__td--note {
    display: none;
  }
}

.contacts-tab__checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.contacts-tab__row {
  transition: background-color var(--transition-normal);
}

.contacts-tab__row:hover {
  background-color: var(--color-bg-3);
}

.contacts-tab__row + .contacts-tab__row {
  border-top: 1px solid var(--color-border-1);
}

.contacts-tab__td {
  padding: 12px 16px;
  color: var(--color-text-2);
  font-weight: var(--font-weight-semibold);
}

.contacts-tab__name {
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.contacts-tab__sub {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.contacts-tab__tag-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.contacts-tab__dash {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.contacts-tab__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 48px 24px;
}

.contacts-tab__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xl);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-3);
}

.contacts-tab__empty-title {
  margin: 16px 0 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.contacts-tab__empty-desc {
  margin: 8px 0 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  max-width: 400px;
}
</style>
