<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import Button from "../../../shared/ui/Button.vue";
import type { ChipTone } from "../../../shared/ui/Chip.vue";
import type { GroupDetail } from "../types";
import { GROUP_STATUS_BADGE } from "../fixtures";

/** Group 详情元数据面板，展示名称、编号、状态与操作按钮。 */
const props = defineProps<{
  group: GroupDetail;
}>();

defineEmits<{
  rename: [];
  disable: [];
}>();

const { t } = useI18n();

const STATUS_CHIP_TONE: Record<string, ChipTone> = {
  green: "success",
  gray: "neutral",
};

/**
 * 将 Group 状态映射为 Chip 色调。
 *
 * @returns 对应的 Chip 色调
 */
function chipTone(): ChipTone {
  const badge = GROUP_STATUS_BADGE[props.group.status];
  return STATUS_CHIP_TONE[badge.variant] ?? "neutral";
}
</script>

<template>
  <section class="group-detail-meta" aria-label="Group detail">
    <div class="group-detail-meta__header">
      <h3 class="group-detail-meta__name">{{ group.name }}</h3>
      <div class="group-detail-meta__actions">
        <Button
          v-if="group.status === 'active'"
          variant="ghost"
          tone="neutral"
          size="sm"
          @click="$emit('rename')"
        >
          {{ t("settings.group.actions.rename") }}
        </Button>
        <Button
          v-if="group.status === 'active'"
          variant="ghost"
          tone="danger"
          size="sm"
          @click="$emit('disable')"
        >
          {{ t("settings.group.actions.disable") }}
        </Button>
      </div>
    </div>

    <dl class="group-detail-meta__fields">
      <div class="group-detail-meta__field">
        <dt class="group-detail-meta__label">
          {{ t("settings.group.detail.groupNo") }}
        </dt>
        <dd class="group-detail-meta__value group-detail-meta__value--mono">
          {{ group.groupNo }}
        </dd>
      </div>
      <div class="group-detail-meta__field">
        <dt class="group-detail-meta__label">
          {{ t("settings.group.detail.status") }}
        </dt>
        <dd class="group-detail-meta__value">
          <Chip :tone="chipTone()" size="sm" dot>
            {{ t(GROUP_STATUS_BADGE[group.status].label) }}
          </Chip>
        </dd>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.group-detail-meta {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-detail-meta__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.group-detail-meta__name {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
}

.group-detail-meta__actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.group-detail-meta__fields {
  display: flex;
  gap: 24px;
  margin: 0;
}

.group-detail-meta__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-detail-meta__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.group-detail-meta__value {
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.group-detail-meta__value--mono {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono, monospace);
}
</style>
