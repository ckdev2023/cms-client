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
import {
  buildCaseCreateRoute,
  type CaseCreateQueryParams,
} from "../../cases/query";
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
    /** 从父组件传入的客户默认值 query 参数基础，合并到批量建案 route。 */
    customerDefaults?: CaseCreateQueryParams;
  }>(),
  {
    batchCreateCaseDisabled: false,
    batchCreateCaseHint: null,
    customerDefaults: undefined,
  },
);
const { t, locale } = useI18n();
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

/**
 * 根据当前语言返回关联人关系类型展示文案。
 *
 * @param type 关系类型值
 * @returns 当前语言对应的关系类型标签
 */
function relationTypeLabel(type: string): string {
  return getRelationTypeLabel(type, locale.value);
}
/** 跳转到家族批量建案，并把当前选中的关联人上下文序列化到 query。 */
function handleBatchCreate(): void {
  const nextCustomerId = props.customerId.trim();
  if (!nextCustomerId || !selectedRelations.value.length) return;
  void router.push(
    buildCaseCreateRoute(
      {
        ...props.customerDefaults,
        customerId: nextCustomerId,
        relationIds: selectedRelations.value
          .map((relation) => relation.id)
          .join(","),
        selectedRelations: JSON.stringify(
          selectedRelations.value.map((relation) => ({
            id: relation.id,
            name: relation.name,
            relationType: relation.relationType,
            kind: "contact_person",
            roleTitle: relation.tags[0] || undefined,
            phone: relation.phone || undefined,
            email: relation.email || undefined,
            tags: relation.tags,
            note: relation.note || undefined,
          })),
        ),
      },
      true,
    ),
  );
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
                {{ relationTypeLabel(r.relationType) }}
              </td>
              <td class="contacts-tab__td contacts-tab__td--contact">
                <div>{{ r.phone || "—" }}</div>
                <div class="contacts-tab__sub">{{ r.email || "—" }}</div>
              </td>
              <td class="contacts-tab__td contacts-tab__td--tags">
                <div v-if="r.tags.length" class="contacts-tab__tag-wrap">
                  <Chip v-for="tag in r.tags.slice(0, 4)" :key="tag">
                    {{ tag }}
                  </Chip>
                  <Chip v-if="r.tags.length > 4">
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

<style scoped src="./CustomerContactsTab.css"></style>
