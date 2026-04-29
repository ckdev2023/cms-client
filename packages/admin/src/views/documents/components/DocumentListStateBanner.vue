<script setup lang="ts">
import { useI18n } from "vue-i18n";

/**
 * 资料中心列表的加载/错误/兜底数据 banner。
 * 与 `useDocumentListModel` 的 `loading / errorCode / source` 三态一一对应；
 * 抽离到组件层是为了：
 * - 让 `DocumentListView.vue` 控制在 500 行以内（per AGENTS.md authoring rules）
 * - 把状态相关样式与文案集中到一处，方便回归测试定位 `data-testid`
 */
const props = defineProps<{
  loading: boolean;
  errorCode: string | null;
  source: "api" | "fallback";
}>();

const emit = defineEmits<{
  (e: "retry"): void;
}>();

const { t } = useI18n();

/** 触发上层重新拉取列表数据。 */
function handleRetry() {
  emit("retry");
}

void props;
</script>

<template>
  <div
    v-if="loading"
    class="document-list-state document-list-state--info"
    role="status"
    data-testid="document-list-loading"
  >
    {{ t("documents.list.state.loading") }}
  </div>
  <div
    v-else-if="errorCode"
    class="document-list-state document-list-state--error"
    role="alert"
    data-testid="document-list-error"
  >
    <span>{{ t(`documents.list.state.${errorCode}`) }}</span>
    <button
      type="button"
      class="document-list-state__retry"
      @click="handleRetry"
    >
      {{ t("documents.list.state.retry") }}
    </button>
  </div>
  <div
    v-else-if="source === 'fallback'"
    class="document-list-state document-list-state--hint"
    data-testid="document-list-fallback"
  >
    {{ t("documents.list.state.fallbackHint") }}
  </div>
</template>

<style scoped>
.document-list-state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
}

.document-list-state--info {
  background: var(--color-info-bg, #eff6ff);
  color: var(--color-info-text, #1d4ed8);
  border: 1px solid var(--color-info-border, #bfdbfe);
}

.document-list-state--error {
  background: var(--color-warning-bg, #fffbeb);
  color: var(--color-warning-text, #b45309);
  border: 1px solid var(--color-warning-border, #fde68a);
}

.document-list-state--hint {
  background: var(--color-bg-2, #f8fafc);
  color: var(--color-text-2, #64748b);
  border: 1px dashed var(--color-border-2, #cbd5e1);
}

.document-list-state__retry {
  font: inherit;
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  cursor: pointer;
}
</style>
