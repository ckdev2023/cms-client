<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 滞纳リスク確認弹窗：入金未済案件提出前の理由・証跡入力。 */
const { t } = useI18n();
defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (
    e: "confirm",
    payload: { reason: string; person: string; evidence: string },
  ): void;
}>();

const reason = ref("");
const person = ref("");
const evidence = ref("");

/**
 * 提交风险确认并重置表单。
 */
function onConfirm() {
  emit("confirm", {
    reason: reason.value,
    person: person.value,
    evidence: evidence.value,
  });
  reason.value = "";
  person.value = "";
  evidence.value = "";
}

/**
 * 关闭弹窗。
 */
function onClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="risk-modal">
      <div v-if="visible" class="risk-modal__backdrop" @click.self="onClose">
        <div
          class="risk-modal__dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="riskModalTitle"
        >
          <div class="risk-modal__header">
            <div id="riskModalTitle" class="risk-modal__title">
              {{ t("cases.detail.riskModal.title") }}
            </div>
            <p class="risk-modal__subtitle">
              {{ t("cases.detail.riskModal.subtitle") }}
            </p>
          </div>

          <div class="risk-modal__body">
            <div class="risk-modal__field">
              <label class="risk-modal__label" for="riskReason">
                {{ t("cases.detail.riskModal.reasonLabel") }}
              </label>
              <textarea
                id="riskReason"
                v-model="reason"
                class="risk-modal__textarea"
                :placeholder="t('cases.detail.riskModal.reasonPlaceholder')"
                rows="3"
              />
            </div>
            <div class="risk-modal__field">
              <label class="risk-modal__label" for="riskPerson">
                {{ t("cases.detail.riskModal.personLabel") }}
              </label>
              <input
                id="riskPerson"
                v-model="person"
                class="risk-modal__input"
                type="text"
                :placeholder="t('cases.detail.riskModal.personPlaceholder')"
              />
            </div>
            <div class="risk-modal__field">
              <label class="risk-modal__label" for="riskEvidence">
                {{ t("cases.detail.riskModal.evidenceLabel") }}
              </label>
              <input
                id="riskEvidence"
                v-model="evidence"
                class="risk-modal__input"
                type="text"
                :placeholder="t('cases.detail.riskModal.evidencePlaceholder')"
              />
              <p class="risk-modal__hint">
                {{ t("cases.detail.riskModal.evidenceHint") }}
              </p>
            </div>
          </div>

          <div class="risk-modal__footer">
            <Button size="sm" @click="onClose">{{
              t("cases.detail.riskModal.cancel")
            }}</Button>
            <Button
              variant="filled"
              tone="primary"
              size="sm"
              @click="onConfirm"
            >
              {{ t("cases.detail.riskModal.confirm") }}
            </Button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.risk-modal__backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.risk-modal__dialog {
  width: 100%;
  max-width: 540px;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-hover);
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────── */

.risk-modal__header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border-1);
}

.risk-modal__title {
  font-size: 18px;
  font-weight: var(--font-weight-black);
  color: var(--color-text-1);
}

.risk-modal__subtitle {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

/* ── Body ──────────────────────────────────────────────── */

.risk-modal__body {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 24px;
}

.risk-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.risk-modal__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.risk-modal__input,
.risk-modal__textarea {
  padding: 10px 14px;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.risk-modal__input:focus,
.risk-modal__textarea:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 3px var(--color-primary-outline, rgba(59, 130, 246, 0.15));
}

.risk-modal__textarea {
  resize: vertical;
  min-height: 80px;
}

.risk-modal__hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

/* ── Footer ────────────────────────────────────────────── */

.risk-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-1);
}

/* ── Transition ────────────────────────────────────────── */

.risk-modal-enter-active,
.risk-modal-leave-active {
  transition: opacity 0.2s ease;
}

.risk-modal-enter-active .risk-modal__dialog,
.risk-modal-leave-active .risk-modal__dialog {
  transition: transform 0.2s ease;
}

.risk-modal-enter-from,
.risk-modal-leave-to {
  opacity: 0;
}

.risk-modal-enter-from .risk-modal__dialog {
  transform: scale(0.95) translateY(8px);
}

.risk-modal-leave-to .risk-modal__dialog {
  transform: scale(0.95) translateY(8px);
}
</style>
