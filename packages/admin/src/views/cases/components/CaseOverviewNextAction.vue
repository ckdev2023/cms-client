<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { CaseDetailTab } from "../types";
import type { CaseDetail } from "../types-detail";

/** 概览页"下一关键动作"区：常态显示主/次动作按钮，终态显示结案与收费/退款入口。 */
const { t } = useI18n();
const props = defineProps<{
  detail: CaseDetail;
  isTerminal?: boolean;
  canRunValidation?: boolean;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
  (e: "openCloseReason"): void;
}>();

const secondaryTab = computed(
  () => props.detail.overviewActions.secondary.tab as CaseDetailTab,
);

const secondaryDisabled = computed(
  () => secondaryTab.value === "validation" && !props.canRunValidation,
);

const secondaryDisabledTitle = computed(() =>
  secondaryDisabled.value ? t("cases.detail.wip") : undefined,
);
</script>

<template>
  <div
    class="overview-next-action"
    :data-testid="props.isTerminal ? 'terminal-next-action' : 'next-action'"
  >
    <div class="overview-next-action__icon">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
    <div class="overview-next-action__body">
      <h3 class="overview-next-action__title">
        {{ t("cases.detail.overview.nextAction.title") }}
      </h3>
      <p v-if="props.isTerminal" class="overview-next-action__text">
        {{
          t(
            "cases.detail.terminalNextAction." +
              (detail.businessPhase === "CLOSED_SUCCESS"
                ? "success"
                : "failed"),
          )
        }}
      </p>
      <p v-else class="overview-next-action__text">
        {{ detail.nextAction }}
      </p>

      <div
        v-if="props.isTerminal"
        class="overview-next-action__buttons"
        data-testid="terminal-next-action-buttons"
      >
        <Button
          size="sm"
          data-testid="terminal-view-close-reason"
          @click="emit('openCloseReason')"
        >
          {{
            t(
              detail.businessPhase === "CLOSED_SUCCESS"
                ? "cases.detail.terminalActions.viewResult"
                : "cases.detail.terminalActions.viewCloseReason",
            )
          }}
        </Button>
        <Button
          size="sm"
          data-testid="terminal-view-billing"
          :disabled="detail.businessPhase !== 'CLOSED_SUCCESS'"
          :title="
            detail.businessPhase !== 'CLOSED_SUCCESS'
              ? t('cases.detail.terminalActions.refundWip')
              : undefined
          "
          @click="emit('switchTab', 'billing')"
        >
          {{
            t(
              detail.businessPhase === "CLOSED_SUCCESS"
                ? "cases.detail.terminalActions.viewBilling"
                : "cases.detail.terminalActions.handleRefund",
            )
          }}
        </Button>
      </div>

      <div v-if="!props.isTerminal" class="overview-next-action__buttons">
        <Button
          variant="filled"
          tone="primary"
          size="sm"
          @click="
            emit(
              'switchTab',
              detail.overviewActions.primary.tab as CaseDetailTab,
            )
          "
        >
          {{ t(detail.overviewActions.primary.label) }}
        </Button>
        <Button
          size="sm"
          :disabled="secondaryDisabled"
          :title="secondaryDisabledTitle"
          @click="emit('switchTab', secondaryTab)"
        >
          {{ t(detail.overviewActions.secondary.label) }}
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overview-next-action {
  display: flex;
  gap: 16px;
  padding: 24px;
  background: linear-gradient(135deg, #fffaf5 0%, var(--color-bg-1) 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  border-radius: var(--radius-xl);
}
.overview-next-action__icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
  background: #fff;
  border: 1px solid rgba(245, 158, 11, 0.2);
  box-shadow: var(--shadow-1);
  color: #f59e0b;
}
.overview-next-action__body {
  flex: 1;
  min-width: 0;
}
.overview-next-action__title {
  margin: 0 0 6px;
  font-size: var(--font-size-md);
  line-height: var(--leading-md);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.overview-next-action__text {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  line-height: var(--leading-relaxed);
}
.overview-next-action__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>
