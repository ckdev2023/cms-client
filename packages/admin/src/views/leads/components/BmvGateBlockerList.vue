<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { resolveLeadBmvBlockerI18nKeys } from "../model/LeadBmvGateBinding";
import type { ServerBlocker } from "../model/LeadRepository";

/**
 * BMV 建案门禁阻断列表渲染组件。
 *
 * 用于在 LeadConvertCaseDialog 内 inline 展示服务端 `CASE_BMV_GATE_BLOCKED`
 * 返回的 4 类阻断码（QUESTIONNAIRE_NOT_RETURNED / QUOTE_NOT_CONFIRMED /
 * NOT_SIGNED / INTAKE_NOT_READY），引导用户回到对应步骤补齐前置条件。
 *
 * - role="alert" + aria-live="assertive"：屏幕阅读器立即通告
 * - blocker 顺序与服务端响应一致；同义阻断会被 binding 自动去重
 */
const props = defineProps<{
  blockers: ServerBlocker[];
}>();

const { t } = useI18n();

const messageKeys = computed(() =>
  resolveLeadBmvBlockerI18nKeys(props.blockers),
);
</script>

<template>
  <section
    v-if="messageKeys.length > 0"
    class="bmv-gate-blocker-list"
    role="alert"
    aria-live="assertive"
    data-testid="bmv-gate-blocker-list"
  >
    <h4 class="bmv-gate-blocker-list__title">
      {{ t("leads.errors.bmvGate.title") }}
    </h4>
    <p class="bmv-gate-blocker-list__desc">
      {{ t("leads.errors.bmvGate.description") }}
    </p>
    <ul class="bmv-gate-blocker-list__items">
      <li
        v-for="(key, idx) in messageKeys"
        :key="key + ':' + idx"
        class="bmv-gate-blocker-list__item"
      >
        {{ t(key) }}
      </li>
    </ul>
  </section>
</template>

<style scoped>
.bmv-gate-blocker-list {
  border: 1px solid var(--color-warning-border, #f0b429);
  background: var(--color-warning-bg, #fffaf0);
  border-radius: var(--radius-md, 8px);
  padding: 12px 14px;
  display: grid;
  gap: 8px;
}

.bmv-gate-blocker-list__title {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-warning-text, #ad6800);
}

.bmv-gate-blocker-list__desc {
  margin: 0;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-3);
}

.bmv-gate-blocker-list__items {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 4px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.bmv-gate-blocker-list__item {
  line-height: var(--leading-sm, 1.4);
}
</style>
