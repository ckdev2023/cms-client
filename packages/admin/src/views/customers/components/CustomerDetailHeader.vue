<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CustomerDetail } from "../types";

/** 客户详情页头部：面包屑返回、头像、客户名称、属性 chip 与操作按钮区。 */
defineProps<{
  customer: CustomerDetail;
  avatarInitials: string;
}>();

defineEmits<{
  createCase: [];
  batchCreateCase: [];
}>();

const { t } = useI18n();
</script>

<template>
  <section class="detail-header">
    <div class="detail-header__top">
      <nav class="detail-header__breadcrumb" aria-label="パンくずリスト">
        <a href="#/customers" class="detail-header__back-link">
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
            <path d="M15 19l-7-7 7-7" />
          </svg>
          {{ t("shell.nav.items.customers") }}
        </a>
        <span class="detail-header__sep" aria-hidden="true">/</span>
        <span class="detail-header__crumb-current" aria-current="page">
          {{ t("customers.detail.breadcrumb") }}
        </span>
      </nav>
      <div class="detail-header__actions">
        <Button size="sm" @click="$emit('batchCreateCase')">
          {{ t("customers.detail.actions.batchCreateCase") }}
        </Button>
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          @click="$emit('createCase')"
        >
          {{ t("customers.detail.actions.createCase") }}
        </Button>
      </div>
    </div>

    <div class="detail-header__identity">
      <div class="detail-header__avatar" aria-hidden="true">
        {{ avatarInitials }}
      </div>
      <div class="detail-header__info">
        <h1 class="detail-header__name">{{ customer.displayName }}</h1>

        <div class="detail-header__chips">
          <Chip size="sm">
            {{ t("customers.detail.header.number") }}
            <strong>{{ customer.customerNumber }}</strong>
          </Chip>
          <Chip size="sm">
            {{ t("customers.detail.header.group") }}
            <strong>{{ customer.group }}</strong>
          </Chip>
          <Chip size="sm">
            {{ t("customers.detail.header.owner") }}
            <strong>{{ customer.owner.name }}</strong>
          </Chip>
          <Chip size="sm">
            {{ t("customers.detail.header.lastContact") }}
            <strong>{{ customer.lastContactDate ?? "—" }}</strong>
          </Chip>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-header__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.detail-header__breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.detail-header__back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--color-primary-6);
  text-decoration: none;
  transition: color 0.15s;
}

.detail-header__back-link:hover {
  text-decoration: underline;
}

.detail-header__sep {
  color: var(--color-text-3);
}

.detail-header__crumb-current {
  color: var(--color-text-1);
  font-weight: var(--font-weight-bold);
}

.detail-header__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.detail-header__identity {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.detail-header__avatar {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background-color: var(--color-bg-3);
  color: var(--color-primary-6);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-black);
  font-size: var(--font-size-lg);
  flex-shrink: 0;
  border: 1px solid var(--color-border-1);
}

.detail-header__info {
  min-width: 0;
  flex: 1;
}

.detail-header__name {
  margin: 0;
  font-size: 24px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-header__chips {
  margin-top: 10px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.detail-header__chips strong {
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}
</style>
