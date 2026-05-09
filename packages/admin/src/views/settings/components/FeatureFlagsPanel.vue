<script setup lang="ts">
import { onMounted } from "vue";
import { useI18n } from "vue-i18n";
import ToggleSwitch from "../../../shared/ui/ToggleSwitch.vue";
import Button from "../../../shared/ui/Button.vue";
import type { MergedFlagItem } from "../model/useFeatureFlagsPanel";
import type { UseFeatureFlagsPanelReturn } from "../model/useFeatureFlagsPanel";

/** Feature flag 管理面板，展示 catalog × server 合并列表并支持 toggle / reset 操作。 */
const props = defineProps<{
  panel: UseFeatureFlagsPanelReturn;
}>();

const { t } = useI18n();

onMounted(() => {
  void props.panel.load();
});

/**
 * 获取 flag 的显示标签：catalog 有定义则走 i18n，否则显示原始 key。
 *
 * @param item - 合并后的 flag 条目
 * @returns 本地化标签文本
 */
function flagLabel(item: MergedFlagItem): string {
  if (item.catalogDefinition) return t(item.catalogDefinition.labelKey);
  return item.key;
}

/**
 * 获取 flag 的描述文案：catalog 有定义则走 i18n，否则显示 unknownFlag 提示。
 *
 * @param item - 合并后的 flag 条目
 * @returns 本地化描述文本
 */
function flagDescription(item: MergedFlagItem): string {
  if (item.catalogDefinition) return t(item.catalogDefinition.descriptionKey);
  return t("settings.featureFlags.unknownFlag.description");
}
</script>

<template>
  <section class="ff-panel" :aria-label="t('settings.aria.featureFlags')">
    <div v-if="panel.loading.value" class="ff-panel__skeleton">
      <div
        v-for="n in 2"
        :key="n"
        class="ff-panel__skeleton-card"
        role="status"
        :aria-label="t('settings.featureFlags.loading')"
      />
    </div>

    <div v-else-if="panel.error.value" class="ff-panel__error" role="alert">
      {{ t("settings.featureFlags.loadError") }}
    </div>

    <template v-else>
      <div
        v-for="item in panel.items.value"
        :key="item.key"
        class="ff-panel__card"
        :class="{ 'ff-panel__card--unknown': !item.catalogDefinition }"
      >
        <div class="ff-panel__card-body">
          <div class="ff-panel__card-text">
            <p class="ff-panel__card-label">
              {{ flagLabel(item) }}
            </p>
            <p class="ff-panel__card-desc">
              {{ flagDescription(item) }}
            </p>

            <p class="ff-panel__status">
              <span class="ff-panel__status-label">
                {{ t("settings.featureFlags.currentlyResolvedAs") }}
              </span>
              <span
                class="ff-panel__status-badge"
                :class="
                  item.resolvedEnabled
                    ? 'ff-panel__status-badge--enabled'
                    : 'ff-panel__status-badge--disabled'
                "
              >
                {{
                  item.resolvedEnabled
                    ? t("settings.featureFlags.state.enabled")
                    : t("settings.featureFlags.state.disabled")
                }}
              </span>
            </p>

            <p
              v-if="item.rowStatus === 'missing'"
              class="ff-panel__row-missing"
            >
              {{ t("settings.featureFlags.rowMissing") }}
            </p>

            <div
              v-if="!item.catalogDefinition"
              class="ff-panel__unknown-warning"
              role="alert"
            >
              <svg
                class="ff-panel__warning-icon"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{{ t("settings.featureFlags.unknownFlag.warning") }}</span>
            </div>
          </div>

          <div class="ff-panel__card-actions">
            <ToggleSwitch
              :model-value="item.resolvedEnabled"
              :disabled="panel.saving.value"
              :aria-label="flagLabel(item)"
              @update:model-value="panel.toggleFlag(item.key)"
            />
            <Button
              v-if="item.catalogDefinition"
              variant="outlined"
              tone="neutral"
              size="sm"
              :disabled="panel.saving.value"
              :title="
                t('settings.featureFlags.resetTooltip', {
                  state: item.catalogDefinition.recommendedDefaultEnabled
                    ? t('settings.featureFlags.state.enabled')
                    : t('settings.featureFlags.state.disabled'),
                })
              "
              @click="panel.resetFlag(item.key)"
            >
              {{ t("settings.featureFlags.resetButton") }}
            </Button>
          </div>
        </div>

        <p v-if="item.catalogDefinition" class="ff-panel__recommend">
          {{
            t("settings.featureFlags.recommendedDefaultHint", {
              state: item.catalogDefinition.recommendedDefaultEnabled
                ? t("settings.featureFlags.state.enabled")
                : t("settings.featureFlags.state.disabled"),
            })
          }}
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>
.ff-panel {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Skeleton */
.ff-panel__skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ff-panel__skeleton-card {
  height: 120px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  animation: ff-pulse 1.5s ease-in-out infinite;
}

@keyframes ff-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Error */
.ff-panel__error {
  padding: 24px;
  text-align: center;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
}

/* Card */
.ff-panel__card {
  padding: 20px 24px;
  background: var(--color-bg-2);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
}

.ff-panel__card--unknown {
  border-color: var(--color-warning-border, #fde68a);
}

.ff-panel__card-body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.ff-panel__card-text {
  min-width: 0;
  flex: 1;
}

.ff-panel__card-label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.ff-panel__card-desc {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

/* Status line */
.ff-panel__status {
  margin: 8px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-2);
  display: flex;
  align-items: center;
  gap: 6px;
}

.ff-panel__status-label {
  color: var(--color-text-3);
}

.ff-panel__status-badge {
  display: inline-flex;
  padding: 1px 8px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.ff-panel__status-badge--enabled {
  background: var(--color-success-bg, #dcfce7);
  color: var(--color-success-text, #166534);
}

.ff-panel__status-badge--disabled {
  background: var(--color-fill-2);
  color: var(--color-text-3);
}

/* Row missing notice */
.ff-panel__row-missing {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-style: italic;
}

/* Unknown flag warning */
.ff-panel__unknown-warning {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-warning-border, #fde68a);
  background: var(--color-warning-bg, #fffbeb);
  font-size: var(--font-size-xs);
  color: var(--color-warning-text, #92400e);
}

.ff-panel__warning-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--color-warning-icon, #d97706);
}

/* Actions column */
.ff-panel__card-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}

/* Recommended default hint */
.ff-panel__recommend {
  margin: 8px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
