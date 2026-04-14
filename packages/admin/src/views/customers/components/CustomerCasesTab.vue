<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import SegmentedControl, {
  type SegmentOption,
} from "../../../shared/ui/SegmentedControl.vue";
import type { CaseFilter, CustomerCase } from "../types";
import { useCustomerCasesModel } from "../model/useCustomerCasesModel";

/** 关联案件 Tab：按全部/活跃/归档筛选案件列表，保留办案入口占位。 */
const props = defineProps<{
  customerId: string;
}>();

const { t } = useI18n();

const customerIdRef = computed(() => props.customerId);
const { caseFilter, filteredCases, setCaseFilter } =
  useCustomerCasesModel(customerIdRef);

const segmentOptions = computed<SegmentOption<CaseFilter>[]>(() => [
  { value: "all", label: t("customers.detail.casesTab.filterAll") },
  { value: "active", label: t("customers.detail.casesTab.filterActive") },
  { value: "archived", label: t("customers.detail.casesTab.filterArchived") },
]);

/**
 * 根据案件状态返回标签色调。
 *
 * @param c 案件对象
 * @returns Chip 色调
 */
function statusTone(c: CustomerCase) {
  return c.status === "active" ? ("success" as const) : ("neutral" as const);
}

/**
 * 根据案件状态返回显示文案。
 *
 * @param c 案件对象
 * @returns 状态标签文案
 */
function statusLabel(c: CustomerCase) {
  return c.status === "active"
    ? t("customers.detail.casesTab.statusActive")
    : t("customers.detail.casesTab.statusArchived");
}
</script>

<template>
  <Card padding="lg">
    <div class="cases-tab">
      <div class="cases-tab__header">
        <h3 class="cases-tab__title">
          {{ t("customers.detail.casesTab.title") }}
        </h3>
        <div class="cases-tab__actions">
          <Button size="sm" pill disabled>
            {{ t("customers.detail.casesTab.batchCreate") }}
          </Button>
          <Button variant="filled" tone="primary" size="sm" disabled>
            {{ t("customers.detail.casesTab.create") }}
          </Button>
        </div>
      </div>

      <div class="cases-tab__filter">
        <SegmentedControl
          :model-value="caseFilter"
          :options="segmentOptions"
          :aria-label="t('customers.detail.casesTab.filterLabel')"
          @update:model-value="setCaseFilter"
        />
      </div>

      <div class="cases-tab__table-wrap">
        <table v-if="filteredCases.length" class="cases-tab__table">
          <thead>
            <tr>
              <th class="cases-tab__th cases-tab__th--id">
                {{ t("customers.detail.casesTab.colId") }}
              </th>
              <th class="cases-tab__th">
                {{ t("customers.detail.casesTab.colName") }}
              </th>
              <th class="cases-tab__th cases-tab__th--type">
                {{ t("customers.detail.casesTab.colType") }}
              </th>
              <th class="cases-tab__th cases-tab__th--stage">
                {{ t("customers.detail.casesTab.colStage") }}
              </th>
              <th class="cases-tab__th cases-tab__th--status">
                {{ t("customers.detail.casesTab.colStatus") }}
              </th>
              <th class="cases-tab__th cases-tab__th--updated">
                {{ t("customers.detail.casesTab.colUpdated") }}
              </th>
              <th class="cases-tab__th cases-tab__th--action">
                {{ t("customers.detail.casesTab.colAction") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in filteredCases" :key="c.id" class="cases-tab__row">
              <td class="cases-tab__td cases-tab__td--id">{{ c.id }}</td>
              <td class="cases-tab__td">
                <button
                  type="button"
                  class="cases-tab__name-link"
                  :aria-label="
                    t('customers.detail.casesTab.openCase', { name: c.name })
                  "
                >
                  {{ c.name }}
                </button>
              </td>
              <td class="cases-tab__td cases-tab__td--type">
                {{ c.type || "—" }}
              </td>
              <td class="cases-tab__td cases-tab__td--stage">
                <div>{{ c.stage || "—" }}</div>
                <div class="cases-tab__sub">
                  {{ t("customers.detail.casesTab.owner") }}{{ c.owner }}
                </div>
              </td>
              <td class="cases-tab__td cases-tab__td--status">
                <Chip :tone="statusTone(c)" size="sm">
                  {{ statusLabel(c) }}
                </Chip>
              </td>
              <td class="cases-tab__td cases-tab__td--updated">
                {{ c.updatedAt || "—" }}
              </td>
              <td class="cases-tab__td cases-tab__td--action">
                <Button
                  size="sm"
                  pill
                  disabled
                  :aria-label="
                    t('customers.detail.casesTab.openCase', { name: c.name })
                  "
                >
                  {{ t("customers.detail.casesTab.open") }}
                </Button>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="cases-tab__empty">
          <p class="cases-tab__empty-text">
            {{
              caseFilter === "active"
                ? t("customers.detail.casesTab.emptyActive")
                : caseFilter === "archived"
                  ? t("customers.detail.casesTab.emptyArchived")
                  : t("customers.detail.casesTab.emptyAll")
            }}
          </p>
        </div>
      </div>
    </div>
  </Card>
</template>

<style scoped>
.cases-tab {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.cases-tab__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.cases-tab__title {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.cases-tab__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cases-tab__filter {
  margin-top: 12px;
}

.cases-tab__table-wrap {
  margin-top: 16px;
  overflow-x: auto;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
}

.cases-tab__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.cases-tab__th {
  padding: 12px 16px;
  text-align: left;
  font-weight: var(--font-weight-black);
  color: var(--color-text-3);
  background: var(--color-bg-3);
  white-space: nowrap;
}

.cases-tab__th--id {
  width: 140px;
}

.cases-tab__th--type {
  width: 160px;
}

.cases-tab__th--stage {
  width: 150px;
}

.cases-tab__th--status {
  width: 100px;
}

.cases-tab__th--updated {
  width: 120px;
}

.cases-tab__th--action {
  width: 90px;
}

@media (max-width: 767px) {
  .cases-tab__th--type,
  .cases-tab__td--type {
    display: none;
  }
}

@media (max-width: 1023px) {
  .cases-tab__th--updated,
  .cases-tab__td--updated {
    display: none;
  }
}

.cases-tab__row {
  transition: background-color var(--transition-normal);
}

.cases-tab__row:hover {
  background-color: var(--color-bg-3);
}

.cases-tab__row + .cases-tab__row {
  border-top: 1px solid var(--color-border-1);
}

.cases-tab__td {
  padding: 12px 16px;
  color: var(--color-text-2);
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
}

.cases-tab__td--id {
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.cases-tab__name-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-weight: var(--font-weight-black);
  color: var(--color-primary-6);
  cursor: pointer;
  text-align: left;
}

.cases-tab__name-link:hover {
  text-decoration: underline;
}

.cases-tab__sub {
  margin-top: 2px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}

.cases-tab__empty {
  padding: 48px 24px;
  text-align: center;
}

.cases-tab__empty-text {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  font-weight: var(--font-weight-semibold);
}
</style>
