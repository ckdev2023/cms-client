<script setup lang="ts">
/**
 * 客户表格行：头像、识别名、案件统计、操作按钮；支持草稿行禁用选择。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { CustomerSummary } from "../types";

/** 客户表格行：头像、识别名、案件统计、操作按钮；支持草稿行禁用选择。 */
const { t } = useI18n();

const props = defineProps<{
  customer: CustomerSummary;
  selected?: boolean;
  isDraft?: boolean;
}>();

defineEmits<{
  select: [id: string, checked: boolean];
}>();

const avatarInitial = computed(
  () => props.customer.displayName.charAt(0) || "?",
);

const casesSummary = computed(() =>
  t("customers.list.casesSummary", {
    total: props.customer.totalCases,
    active: props.customer.activeCases,
  }),
);

const detailHref = computed(() => `#/customers/${props.customer.id}`);
const casesHref = computed(() => `#/cases?customerId=${props.customer.id}`);
const createCaseHref = computed(
  () => `#/cases/create?customerId=${props.customer.id}`,
);
</script>

<template>
  <tr :class="['customer-row', { 'customer-row--draft': isDraft }]">
    <td class="customer-row__check">
      <input
        type="checkbox"
        class="customer-row__checkbox"
        :checked="selected"
        :disabled="isDraft || undefined"
        :aria-label="
          t('customers.list.selectRow', { name: customer.displayName })
        "
        @change="
          $emit(
            'select',
            customer.id,
            ($event.target as HTMLInputElement).checked,
          )
        "
      />
    </td>

    <td>
      <div class="customer-row__identity">
        <div class="customer-row__avatar">{{ avatarInitial }}</div>
        <div class="customer-row__info">
          <div class="customer-row__name-line">
            <a class="customer-row__name" :href="detailHref">
              {{ customer.displayName }}
            </a>
            <span class="customer-row__meta">
              {{ customer.customerNumber }}
            </span>
          </div>
          <div
            v-if="customer.phone || customer.email"
            class="customer-row__contact"
          >
            {{ [customer.phone, customer.email].filter(Boolean).join(" · ") }}
          </div>
        </div>
      </div>
    </td>

    <td class="customer-row__hide-md">{{ customer.furigana }}</td>

    <td class="customer-row__cases">
      <a class="customer-row__cases-link" :href="casesHref">
        {{ casesSummary }}
      </a>
    </td>

    <td class="customer-row__hide-md">
      <template v-if="customer.lastContactDate">
        <div class="customer-row__contact-date">
          {{ customer.lastContactDate }}
        </div>
        <div
          v-if="customer.lastContactChannel"
          class="customer-row__contact-channel"
        >
          {{ customer.lastContactChannel }}
        </div>
      </template>
      <span v-else class="customer-row__na">—</span>
    </td>

    <td class="customer-row__hide-md">
      <div class="customer-row__owner">
        <span class="customer-row__owner-avatar">{{
          customer.owner.initials
        }}</span>
        {{ customer.owner.name }}
      </div>
    </td>

    <td class="customer-row__hide-lg">
      <template v-if="customer.referralSource">
        {{ customer.referralSource }}
      </template>
      <span v-else class="customer-row__na">—</span>
    </td>

    <td class="customer-row__hide-lg">
      <Chip size="sm">{{ customer.group }}</Chip>
    </td>

    <td class="customer-row__actions-cell">
      <div class="customer-row__actions">
        <a
          class="customer-row__action-btn"
          :href="detailHref"
          :title="t('customers.list.actions.viewDetail')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path
              d="M13 7h8m0 0v8m0-8L13 15m-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v6"
            />
          </svg>
        </a>
        <a
          class="customer-row__action-btn"
          :href="createCaseHref"
          :title="t('customers.list.actions.createCase')"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 4v16m8-8H4" />
          </svg>
        </a>
      </div>
    </td>
  </tr>
</template>

<style scoped>
.customer-row td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-table-row);
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  vertical-align: middle;
}

.customer-row:last-child td {
  border-bottom: none;
}

.customer-row__check {
  width: 44px;
  text-align: center;
}

.customer-row__checkbox {
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.customer-row__identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.customer-row__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: var(--color-primary-light);
  color: var(--color-primary-6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  flex-shrink: 0;
}

.customer-row__info {
  min-width: 0;
}

.customer-row__name-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.customer-row__name {
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  text-decoration: none;
  transition: color var(--transition-normal);
}

.customer-row__name:hover {
  color: var(--color-primary-6);
}

.customer-row__meta {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.customer-row__contact {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.customer-row__cases {
  text-align: center;
  white-space: nowrap;
  width: 140px;
}

.customer-row__cases-link {
  display: inline-flex;
  justify-content: center;
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-primary-6);
  text-decoration: none;
}

.customer-row__cases-link:hover {
  text-decoration: underline;
}

.customer-row__hide-md {
  font-size: var(--font-size-base);
  color: var(--color-text-2);
}

.customer-row__hide-lg {
  font-size: var(--font-size-base);
  color: var(--color-text-2);
}

@media (max-width: 767px) {
  .customer-row__hide-md {
    display: none;
  }
}

@media (max-width: 1023px) {
  .customer-row__hide-lg {
    display: none;
  }
}

.customer-row__contact-date {
  font-size: var(--font-size-base);
  color: var(--color-text-1);
}

.customer-row__contact-channel {
  margin-top: 2px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.customer-row__na {
  color: var(--color-text-3);
}

.customer-row__owner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-base);
}

.customer-row__owner-avatar {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  font-size: var(--font-size-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.customer-row__actions-cell {
  text-align: right;
  white-space: nowrap;
  width: 92px;
}

.customer-row__actions {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.customer-row__action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: var(--radius-md);
  color: var(--color-text-3);
  cursor: pointer;
  text-decoration: none;
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal);
}

.customer-row__action-btn:hover {
  background: var(--color-bg-3);
  color: var(--color-text-1);
}

.customer-row--draft td {
  background: var(--color-bg-elevated);
}

.customer-row__checkbox:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
