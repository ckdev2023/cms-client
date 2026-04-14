<script setup lang="ts">
/**
 * トグルスイッチ。チェックボックスベースのオン/オフ切り替え。
 */
withDefaults(
  defineProps<{
    modelValue?: boolean;
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  { modelValue: false },
);

defineEmits<{
  "update:modelValue": [value: boolean];
}>();
</script>

<template>
  <button
    type="button"
    role="switch"
    class="toggle-switch"
    :class="{ 'toggle-switch--on': modelValue }"
    :aria-checked="modelValue"
    :aria-label="ariaLabel"
    :disabled="disabled || undefined"
    @click="$emit('update:modelValue', !modelValue)"
  >
    <span class="toggle-switch__thumb" />
  </button>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 44px;
  height: 24px;
  padding: 2px;
  border: none;
  border-radius: var(--radius-full);
  background-color: var(--color-fill-3);
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.2s;
}

.toggle-switch:focus-visible {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 2px;
}

.toggle-switch:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-switch--on {
  background-color: var(--color-primary-6);
}

.toggle-switch__thumb {
  display: block;
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  background-color: #fff;
  box-shadow: 0 1px 3px rgb(0 0 0 / 0.15);
  transition: transform 0.2s;
}

.toggle-switch--on .toggle-switch__thumb {
  transform: translateX(20px);
}
</style>
