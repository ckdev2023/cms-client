<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 生成文書弹窗：选择模板、填写标题和输出格式后提交生成。 */
const { t } = useI18n();

interface CaseFormGenerateModalProps {
  open?: boolean;
  caseName?: string;
  submitting?: boolean;
}

const props = defineProps<CaseFormGenerateModalProps>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: { title: string; templateId: string | null; outputFormat: string },
  ];
}>();

const localTitle = ref("");
const localOutputFormat = ref("pdf");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localTitle.value = props.caseName ?? "";
      localOutputFormat.value = "pdf";
    }
  },
  { immediate: true },
);

/**
 * 判断是否可以提交。
 * @returns 标题非空且非提交中时返回 true
 */
function canSubmit(): boolean {
  return localTitle.value.trim().length > 0 && !props.submitting;
}

/** 提交生成文書表单。 */
function handleSubmit(): void {
  if (!canSubmit()) return;
  emit("submit", {
    title: localTitle.value.trim(),
    templateId: null,
    outputFormat: localOutputFormat.value,
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      class="form-gen-modal-backdrop"
      data-testid="form-generate-modal-backdrop"
      @click.self="!props.submitting && emit('close')"
    >
      <div
        class="form-gen-modal"
        role="dialog"
        aria-modal="true"
        data-testid="form-generate-modal"
      >
        <header class="form-gen-modal__header">
          <h2 class="form-gen-modal__title">
            {{ t("cases.detail.forms.generateModal.title") }}
          </h2>
          <button
            type="button"
            class="form-gen-modal__close"
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

        <div class="form-gen-modal__body">
          <label class="form-gen-modal__field">
            <span class="form-gen-modal__label">
              {{ t("cases.detail.forms.generateModal.fields.templateId") }}
            </span>
            <select
              class="form-gen-modal__select"
              disabled
              data-testid="form-gen-template-select"
            >
              <option value="">
                {{
                  t(
                    "cases.detail.forms.generateModal.fields.templatePlaceholder",
                  )
                }}
              </option>
            </select>
          </label>

          <label class="form-gen-modal__field">
            <span class="form-gen-modal__label">
              {{ t("cases.detail.forms.generateModal.fields.docTitle") }}
            </span>
            <input
              type="text"
              class="form-gen-modal__input"
              :placeholder="
                t('cases.detail.forms.generateModal.fields.docTitlePlaceholder')
              "
              :value="localTitle"
              :disabled="props.submitting"
              data-testid="form-gen-title-input"
              @input="localTitle = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label class="form-gen-modal__field">
            <span class="form-gen-modal__label">
              {{ t("cases.detail.forms.generateModal.fields.outputFormat") }}
            </span>
            <select
              class="form-gen-modal__select"
              :value="localOutputFormat"
              :disabled="props.submitting"
              data-testid="form-gen-format-select"
              @change="
                localOutputFormat = ($event.target as HTMLSelectElement).value
              "
            >
              <option value="pdf">PDF</option>
              <option value="docx">DOCX</option>
            </select>
          </label>
        </div>

        <footer class="form-gen-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.detail.forms.generateModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit()"
            data-testid="form-gen-submit-btn"
            @click="handleSubmit"
          >
            {{
              props.submitting
                ? t("cases.detail.forms.generateModal.submitting")
                : t("cases.detail.forms.generateModal.submit")
            }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.form-gen-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.form-gen-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.form-gen-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.form-gen-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.form-gen-modal__close {
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

.form-gen-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-gen-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-gen-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.form-gen-modal__input,
.form-gen-modal__select {
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

.form-gen-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
