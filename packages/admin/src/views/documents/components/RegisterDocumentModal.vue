<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { RegisterDocumentForm } from "../model/useRegisterDocumentModel";

/** 登记资料（本地归档）弹窗，含案件/资料项选择与 relative_path 校验。 */
const { t } = useI18n();

defineProps<{
  open: boolean;
  form: RegisterDocumentForm;
  pathError: string | null;
  caseOptions: { value: string; label: string }[];
  docItemOptions: { value: string; label: string }[];
  versionLabel: string;
  canSubmit: boolean;
}>();

defineEmits<{
  close: [];
  "update:field": [field: keyof RegisterDocumentForm, value: string];
  submit: [];
}>();

const selectValue = (e: Event) => (e.target as HTMLSelectElement).value;
const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="rdm-backdrop" @click.self="$emit('close')">
      <div
        class="rdm"
        role="dialog"
        :aria-label="t('documents.register.dialogLabel')"
      >
        <div class="rdm__header">
          <h3 class="rdm__title">{{ t("documents.register.title") }}</h3>
          <button class="rdm__close" type="button" @click="$emit('close')">
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

        <div class="rdm__body">
          <div class="rdm__field">
            <label class="rdm__label">
              {{ t("documents.register.fields.case") }}
              <span class="rdm__required">*</span>
            </label>
            <select
              class="rdm__input rdm__select"
              :value="form.caseId"
              @change="$emit('update:field', 'caseId', selectValue($event))"
            >
              <option value="" disabled>
                {{ t("documents.register.fields.casePlaceholder") }}
              </option>
              <option
                v-for="opt in caseOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="rdm__field">
            <label class="rdm__label">
              {{ t("documents.register.fields.docItem") }}
              <span class="rdm__required">*</span>
            </label>
            <select
              class="rdm__input rdm__select"
              :value="form.docItemId"
              :disabled="!form.caseId"
              @change="$emit('update:field', 'docItemId', selectValue($event))"
            >
              <option value="" disabled>
                {{
                  form.caseId
                    ? t("documents.register.fields.docItemPlaceholder")
                    : t("documents.register.fields.docItemDisabled")
                }}
              </option>
              <option
                v-for="opt in docItemOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <p class="rdm__hint">
              {{ t("documents.register.fields.docItemHint") }}
            </p>
          </div>

          <div class="rdm__field">
            <label class="rdm__label">
              {{ t("documents.register.fields.relativePath") }}
              <span class="rdm__required">*</span>
            </label>
            <input
              type="text"
              :class="[
                'rdm__input',
                'rdm__mono',
                { 'rdm__input--error': pathError },
              ]"
              :value="form.relativePath"
              :placeholder="
                t('documents.register.fields.relativePathPlaceholder')
              "
              @input="$emit('update:field', 'relativePath', inputValue($event))"
            />
            <p v-if="pathError" class="rdm__error">{{ pathError }}</p>
            <p v-else class="rdm__hint">
              {{ t("documents.register.fields.relativePathHint") }}
            </p>
          </div>

          <div class="rdm__field">
            <label class="rdm__label">
              {{ t("documents.register.fields.fileName") }}
            </label>
            <input
              type="text"
              class="rdm__input"
              :value="form.fileName"
              :placeholder="t('documents.register.fields.fileNamePlaceholder')"
              @input="$emit('update:field', 'fileName', inputValue($event))"
            />
            <p class="rdm__hint">
              {{ t("documents.register.fields.fileNameHint") }}
            </p>
          </div>

          <div class="rdm__field">
            <label class="rdm__label">
              {{ t("documents.register.fields.version") }}
            </label>
            <input
              type="text"
              class="rdm__input rdm__input--readonly"
              :value="versionLabel"
              readonly
            />
          </div>
        </div>

        <div class="rdm__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("documents.register.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canSubmit"
            @click="$emit('submit')"
          >
            {{ t("documents.register.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.rdm-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.rdm {
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

.rdm__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.rdm__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.rdm__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.rdm__close:hover {
  color: var(--color-text-1);
}

.rdm__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rdm__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rdm__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.rdm__required {
  color: #dc2626;
}

.rdm__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  transition: border-color var(--transition-normal);
}

.rdm__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.rdm__input::placeholder {
  color: var(--color-text-placeholder);
}

.rdm__input--error {
  border-color: #dc2626;
}

.rdm__input--error:focus {
  border-color: #dc2626;
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
}

.rdm__input--readonly {
  background: var(--color-bg-elevated);
  cursor: not-allowed;
  color: var(--color-text-3);
}

.rdm__select {
  appearance: none;
  cursor: pointer;
}

.rdm__select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.rdm__mono {
  font-family: var(
    --font-family-mono,
    ui-monospace,
    SFMono-Regular,
    Menlo,
    monospace
  );
  font-size: 13px;
}

.rdm__hint {
  margin: 0;
  font-size: 11px;
  color: var(--color-text-3);
}

.rdm__error {
  margin: 0;
  font-size: 11px;
  color: #dc2626;
  font-weight: var(--font-weight-semibold);
}

.rdm__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
