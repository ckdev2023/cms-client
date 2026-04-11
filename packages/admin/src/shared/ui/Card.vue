<script setup lang="ts">
import { useAttrs } from "vue";

type UiCardProps = {
  title?: string;
};

const props = defineProps<UiCardProps>();
const attrs = useAttrs();
</script>

<template>
  <a-card v-bind="attrs" :title="props.title">
    <slot />
  </a-card>
</template>
