<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import SearchField from "../../../shared/ui/SearchField.vue";
import { getRelationTypeLabel } from "../types";
import { useCustomerContactsModel } from "../model/useCustomerContactsModel";

/** 关联人 Tab：展示关联人表格，支持搜索、多选与批量操作占位。 */
const props = defineProps<{
  customerId: string;
}>();

const { t } = useI18n();

const customerIdRef = computed(() => props.customerId);
const {
  searchQuery,
  filteredRelations,
  isAllSelected,
  isIndeterminate,
  hasSelection,
  toggleSelectAll,
  toggleSelect,
  selectedIds,
  setSearch,
} = useCustomerContactsModel(customerIdRef);
</script>

<template>
  <Card padding="lg">
    <div class="contacts-tab">
      <div class="contacts-tab__header">
        <h3 class="contacts-tab__title">
          {{ t("customers.detail.contactsTab.title") }}
        </h3>
        <div class="contacts-tab__actions">
          <Button size="sm" pill :disabled="!hasSelection">
            {{ t("customers.detail.contactsTab.batchCreate") }}
          </Button>
          <Button variant="filled" tone="primary" size="sm" disabled>
            {{ t("customers.detail.contactsTab.add") }}
          </Button>
        </div>
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
        <table v-if="filteredRelations.length" class="contacts-tab__table">
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
                  disabled
                  :aria-label="t('customers.detail.contactsTab.edit')"
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
    </div>
  </Card>
</template>

<style scoped>
.contacts-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
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
  flex-shrink: 0;
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
  flex-shrink: 0;
}

.contacts-tab__table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
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
