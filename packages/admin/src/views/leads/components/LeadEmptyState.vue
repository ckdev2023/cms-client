<script setup lang="ts">
/**
 * 线索表格空状态提示行。
 */
import { useI18n } from "vue-i18n";

/** 线索表格空状态提示行。 */
const { t } = useI18n();

defineEmits<{
  openCreateModal: [];
}>();
</script>

<template>
  <tr class="lead-empty-state">
    <td colspan="8">
      <div class="lead-empty-state__title">
        {{ t("leads.list.empty.title") }}
      </div>
      <div class="lead-empty-state__desc">
        {{ t("leads.list.empty.description") }}
      </div>
      <button
        class="lead-empty-state__cta"
        type="button"
        @click="$emit('openCreateModal')"
      >
        {{ t("leads.list.empty.cta") }}
      </button>
    </td>
  </tr>
</template>

<style scoped>
.lead-empty-state td {
  padding: 64px 24px;
  text-align: center;
}

.lead-empty-state__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.lead-empty-state__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-3);
}

.lead-empty-state__cta {
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

.lead-empty-state__cta:hover {
  background: var(--color-primary-light);
}
</style>
