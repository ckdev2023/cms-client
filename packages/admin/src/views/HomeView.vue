<script setup lang="ts">
import { useI18n } from "vue-i18n";
import PageHeader from "../shared/ui/PageHeader.vue";
import Card from "../shared/ui/Card.vue";
import Button from "../shared/ui/Button.vue";
import Chip from "../shared/ui/Chip.vue";
import SearchField from "../shared/ui/SearchField.vue";

/**
 * 共享 UI 组件展示页，用于预览基础组件样式与组合效果。
 */
const { t } = useI18n();
</script>

<template>
  <div class="foundation-view">
    <PageHeader
      :title="t('foundation.title')"
      :subtitle="t('foundation.subtitle')"
    />

    <div class="foundation-grid">
      <Card :title="t('foundation.button')">
        <div class="showcase-row">
          <Button variant="filled" tone="primary">
            {{ t("foundation.buttons.primary") }}
          </Button>
          <Button variant="outlined">
            {{ t("foundation.buttons.outlined") }}
          </Button>
          <Button variant="ghost">{{ t("foundation.buttons.ghost") }}</Button>
        </div>
      </Card>

      <Card :title="t('foundation.chip')">
        <div class="showcase-row">
          <Chip>{{ t("foundation.chips.default") }}</Chip>
          <Chip tone="primary">{{ t("foundation.chips.primary") }}</Chip>
          <Chip tone="success" dot>{{ t("foundation.chips.success") }}</Chip>
          <Chip tone="warning">{{ t("foundation.chips.warning") }}</Chip>
          <Chip tone="danger">{{ t("foundation.chips.danger") }}</Chip>
        </div>
      </Card>

      <Card :title="t('foundation.searchField')">
        <SearchField :placeholder="t('foundation.searchPlaceholder')" />
      </Card>
    </div>
  </div>
</template>

<style scoped>
.foundation-view {
  display: grid;
  gap: 24px;
}

.foundation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.showcase-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
