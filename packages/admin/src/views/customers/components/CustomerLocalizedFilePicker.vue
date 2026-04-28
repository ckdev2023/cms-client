<script setup lang="ts">
import { computed, ref, watch } from "vue";

/**
 * 本地化文件选择器：用自定义按钮与状态文案替代浏览器原生 file input 文本。
 */
const props = withDefaults(
  defineProps<{
    inputId: string;
    disabled?: boolean;
    ariaLabel: string;
    buttonText: string;
    emptyText: string;
    currentValue?: string;
  }>(),
  {
    disabled: false,
    currentValue: "",
  },
);

const inputRef = ref<HTMLInputElement | null>(null);
const selectedFileName = ref("");
const statusId = computed(() => `${props.inputId}Status`);
const statusText = computed(
  () => selectedFileName.value || props.currentValue || props.emptyText,
);

/**
 * 打开文件选择窗口。
 */
function openPicker(): void {
  if (props.disabled) return;
  inputRef.value?.click();
}

/**
 * 读取当前已选择文件名并更新展示状态。
 *
 * @param event 文件输入变更事件
 */
function handleChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  selectedFileName.value = input.files?.[0]?.name ?? "";
}

/**
 * 清理临时文件选择状态。
 */
function clearSelection(): void {
  selectedFileName.value = "";
  if (inputRef.value) inputRef.value.value = "";
}

watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) clearSelection();
  },
);
</script>

<template>
  <div
    :class="[
      'basic-info__file-picker',
      { 'basic-info__file-picker--readonly': disabled },
    ]"
  >
    <input
      :id="inputId"
      ref="inputRef"
      class="basic-info__file-input"
      type="file"
      accept="image/*"
      tabindex="-1"
      :disabled="disabled"
      :aria-disabled="disabled"
      :aria-describedby="statusId"
      :aria-label="ariaLabel"
      @change="handleChange"
    />
    <button
      class="basic-info__file-trigger"
      type="button"
      :disabled="disabled"
      :aria-controls="inputId"
      @click="openPicker"
    >
      {{ buttonText }}
    </button>
    <span :id="statusId" class="basic-info__file-status" aria-live="polite">
      {{ statusText }}
    </span>
  </div>
</template>

<style scoped>
.basic-info__file-picker {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 12px;
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default, 10px);
  transition:
    border-color 0.15s,
    background-color 0.15s,
    box-shadow 0.15s;
}
.basic-info__file-picker:focus-within {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 3px var(--color-primary-outline, rgba(0, 113, 227, 0.15));
}
.basic-info__file-picker--readonly {
  background-color: var(--color-bg-3, #f5f5f7);
}
.basic-info__file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.basic-info__file-trigger {
  flex: 0 0 auto;
  padding: 6px 12px;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: 999px;
  cursor: pointer;
}
.basic-info__file-trigger:disabled {
  color: var(--color-text-3);
  background-color: var(--color-bg-3, #f5f5f7);
  cursor: default;
}
.basic-info__file-status {
  min-width: 0;
  overflow: hidden;
  font-size: var(--font-size-sm);
  color: var(--color-text-2, #4b5563);
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
