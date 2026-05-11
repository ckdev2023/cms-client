<script setup lang="ts">
import Button from "../../../shared/ui/Button.vue";

/**
 * 案件资料 Tab：清单接口失败时的错误提示条与重试入口。
 */
defineProps<{
  message: string;
  loading: boolean;
  retryLabel: string;
}>();

const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="load-error-banner" role="alert">
    <p class="load-error-banner__text">{{ message }}</p>
    <Button
      variant="outlined"
      tone="primary"
      size="sm"
      :disabled="loading"
      @click="emit('retry')"
    >
      {{ retryLabel }}
    </Button>
  </div>
</template>

<style scoped>
.load-error-banner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-danger-border, #fbbcbc);
  background: var(--color-danger-bg, #fff5f5);
}

.load-error-banner__text {
  margin: 0;
  flex: 1;
  min-width: 200px;
  font-size: var(--font-size-base);
  line-height: var(--leading-relaxed);
  font-weight: var(--font-weight-semibold);
  color: var(--color-danger-text, #c53030);
}
</style>
