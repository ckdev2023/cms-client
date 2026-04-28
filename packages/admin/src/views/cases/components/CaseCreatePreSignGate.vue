<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { CreatePreSignGateResult } from "../model/useCreateCaseModel";

/** 建案预签约门禁卡片：提示客户是否满足签约前条件。 */
const { t } = useI18n();

defineProps<{
  gate: CreatePreSignGateResult;
  customerId: string | null;
}>();

const emit = defineEmits<{
  (e: "goToCustomer"): void;
}>();
</script>

<template>
  <div
    v-if="gate.active"
    class="psg"
    :class="gate.passed ? 'psg--passed' : 'psg--blocked'"
    data-testid="create-pre-sign-gate"
  >
    <div class="psg__header">
      <div
        class="psg__icon"
        :class="gate.passed ? 'psg__icon--passed' : 'psg__icon--blocked'"
      >
        <svg
          v-if="gate.passed"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <svg
          v-else
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div class="psg__title-group">
        <h3 class="psg__title">{{ t("cases.create.preSignGate.title") }}</h3>
        <p v-if="gate.passed" class="psg__status psg__status--passed">
          {{ t("cases.create.preSignGate.passed") }}
        </p>
        <p v-else class="psg__status psg__status--blocked">
          {{ t("cases.create.preSignGate.blockedTitle") }}
        </p>
      </div>
    </div>

    <template v-if="!gate.passed">
      <p class="psg__desc">{{ t("cases.create.preSignGate.blockedDesc") }}</p>

      <ul class="psg__blockers">
        <li
          v-for="blocker in gate.blockers"
          :key="blocker.code"
          class="psg__blocker"
        >
          <div class="psg__blocker-main">
            <span class="psg__blocker-dot" aria-hidden="true" />
            <span class="psg__blocker-label">{{ t(blocker.i18nKey) }}</span>
          </div>
          <p class="psg__blocker-recovery">{{ t(blocker.recoveryI18nKey) }}</p>
        </li>
      </ul>

      <div v-if="customerId" class="psg__actions">
        <Button size="sm" @click="emit('goToCustomer')">
          {{ t("cases.create.preSignGate.goToCustomer") }}
        </Button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.psg {
  padding: 20px;
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
}

.psg--passed {
  border: 1px solid rgba(22, 163, 74, 0.3);
  background: rgba(240, 253, 244, 0.6);
}

.psg--blocked {
  border: 1px solid rgba(245, 158, 11, 0.3);
  background: rgba(255, 251, 235, 0.6);
}

.psg__header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.psg__icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-full);
}

.psg__icon--passed {
  background: rgba(22, 163, 74, 0.1);
  color: #166534;
}

.psg__icon--blocked {
  background: rgba(245, 158, 11, 0.1);
  color: #92400e;
}

.psg__title-group {
  flex: 1;
  min-width: 0;
}

.psg__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.psg__status {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.psg__status--passed {
  color: #166534;
}

.psg__status--blocked {
  color: #92400e;
}

.psg__desc {
  margin: 12px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.5;
}

.psg__blockers {
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.psg__blocker {
  padding: 10px 14px;
  border-radius: var(--radius-md, 6px);
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.12);
}

.psg__blocker-main {
  display: flex;
  align-items: center;
  gap: 8px;
}

.psg__blocker-dot {
  flex-shrink: 0;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: #d97706;
}

.psg__blocker-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: #92400e;
}

.psg__blocker-recovery {
  margin: 4px 0 0 14px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  line-height: 1.5;
}

.psg__actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
}
</style>
