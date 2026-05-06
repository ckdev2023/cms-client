<script setup lang="ts">
/**
 * 已废弃：渲染由 shared/ui/Toast.vue（全局挂载于 App.vue）统一处理。
 * 保留此文件仅为兼容尚未移除 <LeadToast> 的模板；不再渲染任何 DOM。
 */
defineProps<{
  title?: string;
  description?: string;
  visible?: boolean;
}>();
</script>

<template>
  <span v-if="false" />
</template>
