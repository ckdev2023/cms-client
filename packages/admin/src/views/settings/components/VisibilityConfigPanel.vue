<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import ToggleSwitch from "../../../shared/ui/ToggleSwitch.vue";
import { VISIBILITY_CONFIG_ITEMS } from "../fixtures";
import type { OrgSettings } from "../types";

/** 可见性配置面板，展示两个跨组开关和保存按钮。 */
defineProps<{
  visibility: OrgSettings["visibility"];
}>();

const emit = defineEmits<{
  "update:crossGroupCase": [value: boolean];
  "update:crossGroupView": [value: boolean];
  save: [];
}>();

const { t } = useI18n();

const VISIBILITY_FIELD_KEY: Record<string, keyof OrgSettings["visibility"]> = {
  crossGroupCase: "allowCrossGroupCaseCreate",
  crossGroupView: "allowPrincipalViewCrossGroupCollab",
};

/**
 * 根据配置项 ID 派发对应的开关变更事件。
 * @param itemId - 配置项标识
 * @param value - 开关新值
 */
function onToggle(itemId: string, value: boolean) {
  if (itemId === "crossGroupCase") emit("update:crossGroupCase", value);
  else if (itemId === "crossGroupView") emit("update:crossGroupView", value);
}
</script>

<template>
  <section class="visibility-panel" aria-label="Visibility settings">
    <div
      v-for="item in VISIBILITY_CONFIG_ITEMS"
      :key="item.id"
      class="visibility-panel__card"
    >
      <div class="visibility-panel__card-body">
        <div class="visibility-panel__card-text">
          <p class="visibility-panel__card-label">{{ t(item.labelKey) }}</p>
          <p class="visibility-panel__card-desc">
            {{ t(item.descriptionKey) }}
          </p>
        </div>
        <ToggleSwitch
          :model-value="visibility[VISIBILITY_FIELD_KEY[item.id]!]"
          :aria-label="t(item.labelKey)"
          @update:model-value="onToggle(item.id, $event)"
        />
      </div>
    </div>

    <div class="visibility-panel__actions">
      <Button variant="filled" tone="primary" size="sm" @click="emit('save')">
        {{ t("settings.visibility.saveButton") }}
      </Button>
    </div>
  </section>
</template>

<style scoped>
.visibility-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.visibility-panel__card {
  padding: 20px 24px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.visibility-panel__card-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.visibility-panel__card-text {
  min-width: 0;
}

.visibility-panel__card-label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.visibility-panel__card-desc {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  line-height: 1.5;
}

.visibility-panel__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
