<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 客户表格空状态提示行。
 */
const { t } = useI18n();
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
    </td>
  </tr>
</template>

<style scoped>
.customer-empty-state td {
  padding: 40px 24px;
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
</style>
