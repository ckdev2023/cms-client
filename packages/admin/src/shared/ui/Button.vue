<script setup lang="ts">
import { computed, useAttrs } from "vue";

type UiButtonProps = {
  type?: "primary" | "default";
  status?: "normal" | "danger";
};

const props = withDefaults(defineProps<UiButtonProps>(), {
  type: "default",
  status: "normal",
});

const attrs = useAttrs();

const arcoType = computed(() =>
  props.type === "primary" ? "primary" : "secondary",
);
const arcoStatus = computed(() =>
  props.status === "danger" ? "danger" : undefined,
);
</script>

<template>
  <a-button v-bind="attrs" :type="arcoType" :status="arcoStatus">
    <slot />
  </a-button>
</template>
