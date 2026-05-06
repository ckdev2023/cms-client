<script setup lang="ts">
import { computed } from "vue";
import { getDefaultPermissionsStore } from "../model/PermissionsStore";

/** 权限条件渲染包裹组件，无权限时不渲染子内容。 */
const props = defineProps<{
  code?: string;
  codes?: string[];
  mode?: "all" | "any";
}>();

const store = getDefaultPermissionsStore();

const permitted = computed(() => {
  if (props.code) {
    return store.has(props.code);
  }
  if (props.codes && props.codes.length > 0) {
    return props.mode === "all"
      ? store.hasAll(...props.codes)
      : store.hasAny(...props.codes);
  }
  return true;
});
</script>

<template>
  <template v-if="permitted">
    <slot />
  </template>
  <template v-else-if="$slots.fallback">
    <slot name="fallback" />
  </template>
</template>
