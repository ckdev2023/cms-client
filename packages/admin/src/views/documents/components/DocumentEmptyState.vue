<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 资料表格空状态提示行。
 */
const { t } = useI18n();
</script>

<template>
  <tr class="doc-empty-state">
    <td colspan="9">
      <div class="doc-empty-state__title">
        {{ t("documents.list.empty.title") }}
      </div>
      <div class="doc-empty-state__desc">
        {{ t("documents.list.empty.description") }}
      </div>
    </td>
  </tr>
</template>

<style scoped>
.doc-empty-state td {
  padding: 40px 24px;
  text-align: center;
}

.doc-empty-state__title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
}

.doc-empty-state__desc {
  margin-top: 4px;
  font-size: 13px;
  color: var(--color-text-3);
}
</style>
