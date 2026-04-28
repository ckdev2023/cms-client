<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 客户表格空状态提示行。
 */
const { t } = useI18n();

defineEmits<{
  openCreateModal: [];
}>();
</script>

<template>
  <tr class="customer-empty-state">
    <td colspan="9">
      <div class="customer-empty-state__title">
        {{ t("customers.list.empty.title") }}
      </div>
      <div class="customer-empty-state__desc">
        {{ t("customers.list.empty.description") }}
      </div>
      <button
        class="customer-empty-state__cta"
        type="button"
        @click="$emit('openCreateModal')"
      >
        {{ t("customers.list.empty.cta") }}
      </button>
    </td>
  </tr>
</template>

<style scoped>
.customer-empty-state td {
  padding: 64px 24px;
  text-align: center;
}

.customer-empty-state__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.customer-empty-state__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-3);
}

.customer-empty-state__cta {
  margin-top: 16px;
  border: 1px solid var(--color-primary-6);
  background: transparent;
  border-radius: var(--radius-default);
  padding: 6px 16px;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-extrabold);
  color: var(--color-primary-6);
  cursor: pointer;
  transition:
    background-color var(--transition-normal),
    color var(--transition-normal);
}

.customer-empty-state__cta:hover {
  background: var(--color-primary-light);
}
</style>
