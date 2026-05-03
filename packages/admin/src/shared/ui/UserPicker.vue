<script setup lang="ts">
import { computed } from "vue";
import {
  getActiveUserOptions,
  resolveUserLabel,
} from "../model/useOrgUserOptions";

/**
 * 用户选择器，绑定 `useOrgUserOptions` 的运行期别名表，
 * 未注册的 UUID 自动兜底显示为 `"—"`。
 */
const props = withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
    id?: string;
    name?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: "",
    placeholder: "—",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const options = computed(() => getActiveUserOptions());

const hasCurrentInOptions = computed(() =>
  props.modelValue
    ? options.value.some((o) => o.value === props.modelValue)
    : true,
);

const fallbackLabel = computed(() =>
  props.modelValue ? resolveUserLabel(props.modelValue) : "",
);

/**
 * 同步选中值到 `v-model`。
 * @param event - 原生 change 事件
 */
function onChange(event: Event) {
  emit("update:modelValue", (event.target as HTMLSelectElement).value);
}
</script>

<template>
  <select
    class="ui-user-picker"
    :id="props.id"
    :name="props.name"
    :disabled="props.disabled || undefined"
    :value="props.modelValue"
    @change="onChange"
  >
    <option value="">{{ props.placeholder }}</option>
    <option
      v-if="modelValue && !hasCurrentInOptions"
      :value="modelValue"
      disabled
    >
      {{ fallbackLabel }}
    </option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">
      {{ opt.label }}
    </option>
  </select>
</template>

<style scoped>
.ui-user-picker {
  display: block;
  width: 100%;
  padding: 8px 12px;
  font-size: var(--font-size-base);
  font-family: inherit;
  color: var(--color-text-1);
  background-color: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
  cursor: pointer;
  appearance: auto;
}

.ui-user-picker:focus {
  border-color: var(--color-primary-6);
  box-shadow: var(--shadow-focus-ring);
  outline: none;
}

.ui-user-picker:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
