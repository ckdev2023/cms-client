<script setup lang="ts">
import { useCounterStore } from "../store/counter";

const counter = useCounterStore();
</script>

<template>
  <a-space direction="vertical" size="large" fill>
    <a-card title="Admin 基建已就绪">
      <a-space direction="vertical">
        <a-typography-paragraph style="margin: 0">
          Vue 3 + TypeScript + Vite + Vue Router + Pinia + Arco Design Vue
        </a-typography-paragraph>
        <a-typography-text type="secondary">
          用于验证主题最小映射：主色、文本、边框、背景、圆角。
        </a-typography-text>
        <a-space>
          <a-button type="primary" @click="counter.increment"
            >Count: {{ counter.count }}</a-button
          >
          <a-tag>Double: {{ counter.doubled }}</a-tag>
        </a-space>
      </a-space>
    </a-card>
  </a-space>
</template>
