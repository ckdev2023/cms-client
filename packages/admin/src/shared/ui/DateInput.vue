<script setup lang="ts">
/**
 * 通用日期入力コンポーネント。
 * max 默认为 9999-12-31，防止浏览器允许输入超长年份。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    id?: string;
    name?: string;
    disabled?: boolean;
    max?: string;
    min?: string;
    /** data-testid 属性透传 */
    dataTestid?: string;
  }>(),
  {
    modelValue: "",
    disabled: false,
    max: "9999-12-31",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

/**
 * 判断日期值是否超过允许的最大日期。
 *
 * @param value - YYYY-MM-DD 格式的日期字符串
 * @returns 超出 max 时返回 true
 */
function exceedsMax(value: string): boolean {
  const year = parseInt(value.split("-")[0], 10);
  const maxYear = parseInt(props.max.split("-")[0], 10);
  if (year > maxYear) return true;
  if (
    year === maxYear &&
    value.slice(value.indexOf("-")) > props.max.slice(props.max.indexOf("-"))
  )
    return true;
  return false;
}

/**
 * 处理输入事件，超出 max 时截断到最大值。
 *
 * @param event - 原生 input 事件
 */
function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value;
  if (raw && exceedsMax(raw)) {
    emit("update:modelValue", props.max);
    return;
  }
  emit("update:modelValue", raw);
}
</script>

<template>
  <input
    type="date"
    class="ui-date-input"
    :id="props.id"
    :name="props.name"
    :value="props.modelValue"
    :disabled="props.disabled"
    :max="props.max"
    :min="props.min"
    :data-testid="props.dataTestid"
    @input="onInput"
  />
</template>

<style scoped>
.ui-date-input {
  font-family: inherit;
  font-size: var(--font-size-base, 14px);
  padding: 8px 12px;
  border: 1px solid var(--color-border-1, #d9d9d9);
  border-radius: var(--radius-md, 6px);
  background: var(--color-bg-1, #fff);
  color: var(--color-text-1, #1d2129);
  outline: none;
  transition:
    border-color var(--transition-normal, 0.2s),
    box-shadow var(--transition-normal, 0.2s);
  width: 100%;
}

.ui-date-input:focus {
  border-color: var(--color-primary-6, #165dff);
  box-shadow: 0 0 0 2px rgba(22, 93, 255, 0.1);
}

.ui-date-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
