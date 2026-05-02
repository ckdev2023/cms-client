<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 案件信息编辑弹窗：编辑案件名称、事务所、备注。 */
const { t } = useI18n();

interface CaseEditModalProps {
  open?: boolean;
  caseName?: string;
  agency?: string;
  memo?: string;
  submitting?: boolean;
}

const props = defineProps<CaseEditModalProps>();

const emit = defineEmits<{
  close: [];
  save: [fields: { caseName: string; agency: string; memo: string }];
}>();

const localCaseName = ref(props.caseName ?? "");
const localAgency = ref(props.agency ?? "");
const localMemo = ref(props.memo ?? "");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localCaseName.value = props.caseName ?? "";
      localAgency.value = props.agency ?? "";
      localMemo.value = props.memo ?? "";
    }
  },
);

/** 提交编辑表单。 */
function handleSave(): void {
  emit("save", {
    caseName: localCaseName.value.trim(),
    agency: localAgency.value.trim(),
    memo: localMemo.value.trim(),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="case-edit-modal-backdrop"
      data-testid="case-edit-modal-backdrop"
      @click.self="!props.submitting && emit('close')"
    >
      <div class="case-edit-modal" role="dialog" aria-modal="true">
        <header class="case-edit-modal__header">
          <h2 class="case-edit-modal__title">
            {{ t("cases.detail.editModal.title") }}
          </h2>
          <button
            type="button"
            class="case-edit-modal__close"
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

        <div class="case-edit-modal__body">
          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.caseName")
            }}</span>
            <input
              id="case-edit-caseName"
              name="caseName"
              type="text"
              class="case-edit-modal__input"
              :value="localCaseName"
              :disabled="props.submitting"
              @input="localCaseName = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.agency")
            }}</span>
            <input
              id="case-edit-agency"
              name="agency"
              type="text"
              class="case-edit-modal__input"
              :value="localAgency"
              :disabled="props.submitting"
              @input="localAgency = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="case-edit-modal__field">
            <span class="case-edit-modal__label">{{
              t("cases.detail.editModal.fields.memo")
            }}</span>
            <textarea
              id="case-edit-memo"
              name="memo"
              class="case-edit-modal__textarea"
              rows="4"
              :value="localMemo"
              :disabled="props.submitting"
              @input="localMemo = ($event.target as HTMLTextAreaElement).value"
            />
          </label>
        </div>

        <footer class="case-edit-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.detail.editModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="props.submitting"
            @click="handleSave"
          >
            {{ t("cases.detail.editModal.save") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.case-edit-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.case-edit-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.case-edit-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.case-edit-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.case-edit-modal__close {
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

.case-edit-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.case-edit-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.case-edit-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.case-edit-modal__input,
.case-edit-modal__textarea {
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

.case-edit-modal__textarea {
  resize: vertical;
  min-height: 80px;
}

.case-edit-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
