<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { BannerPresetKey } from "../types";

/** 线索详情页横幅提示：只读态（已流失）与警告态（已签约未转化）。 */
defineProps<{
  banner: BannerPresetKey;
}>();

defineEmits<{
  convertCase: [];
}>();

const { t } = useI18n();
</script>

<template>
  <div v-if="banner === 'lost'" class="banner banner--readonly" role="status">
    <svg
      class="banner__icon"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
    <span>{{ t("leads.detail.banner.lost") }}</span>
  </div>

  <div
    v-else-if="banner === 'signedNotConverted'"
    class="banner banner--warning"
    role="status"
  >
    <svg
      class="banner__icon"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
    <span class="banner__text">
      {{ t("leads.detail.banner.signedNotConverted") }}
    </span>
    <button class="banner__action" type="button" @click="$emit('convertCase')">
      {{ t("leads.detail.actions.convertCase") }}
    </button>
  </div>
</template>

<style scoped>
.banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--radius-default, 10px);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.banner--readonly {
  background: var(--color-bg-3);
  color: var(--color-text-3);
  border: 1px solid var(--color-border-1);
}

.banner--warning {
  background: #fffbeb;
  color: #92400e;
  border: 1px solid #fde68a;
}

.banner__icon {
  flex-shrink: 0;
}

.banner__text {
  flex: 1;
}

.banner__action {
  flex-shrink: 0;
  padding: 4px 12px;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-bg-1);
  background: var(--color-primary-6);
  border: none;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition:
    background-color 0.15s,
    opacity 0.15s;
}

.banner__action:hover {
  opacity: 0.85;
}
</style>
