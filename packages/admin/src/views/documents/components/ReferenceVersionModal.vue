<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { ReferenceCandidate } from "../types";

/**
 * 引用既有版本弹窗（P0-CONTRACT §8.4）。
 *
 * 展示可复用版本列表，用户选中一个后确认引用。
 */
const { t } = useI18n();

defineProps<{
  open: boolean;
  docName: string;
  candidates: ReferenceCandidate[];
  selectedId: string;
  canConfirm: boolean;
}>();

defineEmits<{
  close: [];
  "update:selectedId": [value: string];
  confirm: [];
}>();
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ref-backdrop" @click.self="$emit('close')">
      <div
        class="ref-modal"
        role="dialog"
        :aria-label="t('documents.reference.title')"
      >
        <div class="ref-modal__header">
          <h3 class="ref-modal__title">
            {{ t("documents.reference.title") }}
          </h3>
          <button
            class="ref-modal__close"
            type="button"
            @click="$emit('close')"
          >
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
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="ref-modal__body">
          <div class="ref-modal__field">
            <label class="ref-modal__label">
              {{ t("documents.reference.targetLabel") }}
            </label>
            <p class="ref-modal__text">{{ docName }}</p>
          </div>

          <div class="ref-modal__field">
            <label class="ref-modal__label">
              {{ t("documents.reference.selectLabel") }}
              <span class="ref-modal__required">*</span>
            </label>

            <div v-if="candidates.length === 0" class="ref-modal__empty">
              {{ t("documents.reference.selectPlaceholder") }}
            </div>

            <div
              v-for="candidate in candidates"
              :key="candidate.id"
              :class="[
                'ref-modal__candidate',
                {
                  'ref-modal__candidate--selected': selectedId === candidate.id,
                },
              ]"
              @click="$emit('update:selectedId', candidate.id)"
            >
              <input
                type="radio"
                class="ref-modal__radio"
                :checked="selectedId === candidate.id"
                :value="candidate.id"
                @change="$emit('update:selectedId', candidate.id)"
              />
              <div class="ref-modal__candidate-body">
                <div class="ref-modal__candidate-label">
                  {{ candidate.sourceCaseName }} —
                  {{ candidate.sourceDocName }} v{{ candidate.version }}
                </div>
                <div class="ref-modal__candidate-detail">
                  {{ t("documents.reference.reviewedAt") }}:
                  {{ candidate.reviewedAt }}
                  <template v-if="candidate.expiryDate">
                    &nbsp;|&nbsp;{{ t("documents.reference.expiryDate") }}:
                    {{ candidate.expiryDate }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="ref-modal__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("documents.reference.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canConfirm"
            @click="$emit('confirm')"
          >
            {{ t("documents.reference.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ref-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ref-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.ref-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.ref-modal__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.ref-modal__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.ref-modal__close:hover {
  color: var(--color-text-1);
}

.ref-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ref-modal__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ref-modal__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.ref-modal__required {
  color: #dc2626;
}

.ref-modal__text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  font-weight: var(--font-weight-semibold);
}

.ref-modal__empty {
  padding: 16px;
  text-align: center;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}

.ref-modal__candidate {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default);
  cursor: pointer;
  transition:
    border-color var(--transition-normal),
    background-color var(--transition-normal);
}

.ref-modal__candidate:hover {
  border-color: var(--color-primary-6);
  background: rgba(59, 130, 246, 0.04);
}

.ref-modal__candidate--selected {
  border-color: var(--color-primary-6);
  background: rgba(59, 130, 246, 0.06);
}

.ref-modal__radio {
  margin-top: 2px;
  accent-color: var(--color-primary-6);
  cursor: pointer;
}

.ref-modal__candidate-body {
  flex: 1;
  min-width: 0;
}

.ref-modal__candidate-label {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.ref-modal__candidate-detail {
  margin-top: 4px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.ref-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
