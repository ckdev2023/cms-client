<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { DeadlineKindChoice } from "../model/CaseAdapterReminderWriteBuilders";

/** 期限新建弹窗：创建案件关联的提醒/期限。 */
const { t } = useI18n();

interface CaseDeadlineCreateModalProps {
  open?: boolean;
  caseId?: string;
  submitting?: boolean;
}

const props = defineProps<CaseDeadlineCreateModalProps>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      targetType: "case" | "case_party_residence";
      remindAt: string;
      kind: DeadlineKindChoice;
      memo: string;
    },
  ];
}>();

const TARGET_TYPES = ["case", "case_party_residence"] as const;
const KINDS: DeadlineKindChoice[] = [
  "residence_expiry",
  "renewal_reminder",
  "custom",
];

const localTargetType = ref<"case" | "case_party_residence">("case");
const localRemindAt = ref("");
const localKind = ref<DeadlineKindChoice>("custom");
const localMemo = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localTargetType.value = "case";
      localRemindAt.value = "";
      localKind.value = "custom";
      localMemo.value = "";
    }
  },
);

/** 提交期限表单。 */
function handleSubmit(): void {
  if (!localRemindAt.value) return;
  emit("submit", {
    targetType: localTargetType.value,
    remindAt: new Date(localRemindAt.value).toISOString(),
    kind: localKind.value,
    memo: localMemo.value.trim(),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="deadline-modal-backdrop"
      data-testid="deadline-create-modal-backdrop"
      @click.self="!props.submitting && emit('close')"
    >
      <div
        class="deadline-modal"
        role="dialog"
        aria-modal="true"
        data-testid="deadline-create-modal"
      >
        <header class="deadline-modal__header">
          <h2 class="deadline-modal__title">
            {{ t("cases.deadlines.createModal.title") }}
          </h2>
          <button
            type="button"
            class="deadline-modal__close"
            :disabled="props.submitting"
            @click="emit('close')"
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
        </header>

        <div class="deadline-modal__body">
          <label class="deadline-modal__field">
            <span class="deadline-modal__label">{{
              t("cases.deadlines.createModal.fields.targetType")
            }}</span>
            <select
              class="deadline-modal__select"
              :value="localTargetType"
              :disabled="props.submitting"
              data-testid="deadline-target-type"
              @change="
                localTargetType = ($event.target as HTMLSelectElement)
                  .value as typeof localTargetType
              "
            >
              <option v-for="tt in TARGET_TYPES" :key="tt" :value="tt">
                {{ t(`cases.deadlines.createModal.targetTypes.${tt}`) }}
              </option>
            </select>
          </label>

          <label class="deadline-modal__field">
            <span class="deadline-modal__label">{{
              t("cases.deadlines.createModal.fields.remindAt")
            }}</span>
            <input
              type="date"
              class="deadline-modal__input"
              :value="localRemindAt"
              :disabled="props.submitting"
              data-testid="deadline-remind-at"
              @input="localRemindAt = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="deadline-modal__field">
            <span class="deadline-modal__label">{{
              t("cases.deadlines.createModal.fields.kind")
            }}</span>
            <select
              class="deadline-modal__select"
              :value="localKind"
              :disabled="props.submitting"
              data-testid="deadline-kind"
              @change="
                localKind = ($event.target as HTMLSelectElement)
                  .value as DeadlineKindChoice
              "
            >
              <option v-for="k in KINDS" :key="k" :value="k">
                {{ t(`cases.deadlines.createModal.kinds.${k}`) }}
              </option>
            </select>
          </label>

          <label class="deadline-modal__field">
            <span class="deadline-modal__label">{{
              t("cases.deadlines.createModal.fields.memo")
            }}</span>
            <textarea
              class="deadline-modal__textarea"
              rows="3"
              :value="localMemo"
              :disabled="props.submitting"
              :placeholder="
                t('cases.deadlines.createModal.fields.memoPlaceholder')
              "
              data-testid="deadline-memo"
              @input="localMemo = ($event.target as HTMLTextAreaElement).value"
            />
          </label>
        </div>

        <footer class="deadline-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.deadlines.createModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="props.submitting || !localRemindAt"
            data-testid="deadline-submit-btn"
            @click="handleSubmit"
          >
            {{ t("cases.deadlines.createModal.submit") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.deadline-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.deadline-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.deadline-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.deadline-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.deadline-modal__close {
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-text-3);
  border-radius: var(--radius-md);
  &:hover {
    background: var(--color-bg-3);
  }
}

.deadline-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.deadline-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.deadline-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.deadline-modal__input,
.deadline-modal__select,
.deadline-modal__textarea {
  padding: 8px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-1);
  background: var(--color-bg-1, #fff);
  &:focus {
    outline: none;
    border-color: var(--color-primary-6);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-6-rgb, 59 130 246), 0.15);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.deadline-modal__textarea {
  resize: vertical;
  min-height: 60px;
}

.deadline-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
