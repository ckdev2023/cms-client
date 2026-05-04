<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import type { DocumentProviderType } from "../types";
import { DOCUMENT_PROVIDER_IDS, DOCUMENT_PROVIDERS } from "../constants";

/** 手动添加资料项弹窗：输入名称、提供方、截止日与备注后调用后端创建资料项。 */
const { t } = useI18n();

const props = defineProps<{
  open: boolean;
  name: string;
  ownerSide: DocumentProviderType | "";
  dueAt: string;
  note: string;
  canSubmit: boolean;
  submitting: boolean;
}>();

const emit = defineEmits<{
  close: [];
  "update:name": [value: string];
  "update:ownerSide": [value: DocumentProviderType | ""];
  "update:dueAt": [value: string];
  "update:note": [value: string];
  submit: [];
}>();

const backdropRef = ref<HTMLElement | null>(null);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) nextTick(() => backdropRef.value?.focus());
  },
);

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
const selectValue = (e: Event) => (e.target as HTMLSelectElement).value;
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="backdropRef"
      class="adim-backdrop"
      data-testid="adim-backdrop"
      tabindex="-1"
      @click.self="emit('close')"
      @keydown.esc.stop.prevent="emit('close')"
    >
      <div
        class="adim"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adim-title"
      >
        <div class="adim__header">
          <h3 id="adim-title" class="adim__title">
            {{ t("documents.addItem.title") }}
          </h3>
          <button
            class="adim__close"
            type="button"
            :aria-label="t('documents.addItem.closeAriaLabel')"
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
        </div>

        <div class="adim__body">
          <div class="adim__field">
            <label class="adim__label">
              {{ t("documents.addItem.fields.name") }}
              <span class="adim__required">*</span>
            </label>
            <input
              id="doc-addItem-name"
              name="docAddItemName"
              type="text"
              class="adim__input"
              :value="name"
              :placeholder="t('documents.addItem.fields.namePlaceholder')"
              @input="emit('update:name', inputValue($event))"
            />
          </div>

          <div class="adim__field">
            <label class="adim__label">
              {{ t("documents.addItem.fields.ownerSide") }}
              <span class="adim__required">*</span>
            </label>
            <select
              id="doc-addItem-ownerSide"
              name="docAddItemOwnerSide"
              class="adim__input adim__select"
              :value="ownerSide"
              @change="
                emit(
                  'update:ownerSide',
                  selectValue($event) as DocumentProviderType,
                )
              "
            >
              <option value="" disabled>
                {{ t("documents.addItem.fields.ownerSidePlaceholder") }}
              </option>
              <option v-for="id in DOCUMENT_PROVIDER_IDS" :key="id" :value="id">
                {{ t(DOCUMENT_PROVIDERS[id].labelKey) }}
              </option>
            </select>
          </div>

          <div class="adim__field">
            <label class="adim__label">
              {{ t("documents.addItem.fields.dueAt") }}
            </label>
            <input
              id="doc-addItem-dueAt"
              name="docAddItemDueAt"
              type="date"
              class="adim__input"
              :value="dueAt"
              @input="emit('update:dueAt', inputValue($event))"
            />
            <p class="adim__hint">
              {{ t("documents.addItem.fields.dueAtHint") }}
            </p>
          </div>

          <div class="adim__field">
            <label class="adim__label">
              {{ t("documents.addItem.fields.note") }}
            </label>
            <textarea
              id="doc-addItem-note"
              name="docAddItemNote"
              class="adim__textarea"
              :value="note"
              :placeholder="t('documents.addItem.fields.notePlaceholder')"
              rows="3"
              @input="
                emit(
                  'update:note',
                  ($event.target as HTMLTextAreaElement).value,
                )
              "
            />
          </div>
        </div>

        <div class="adim__footer">
          <Button variant="outlined" @click="emit('close')">
            {{ t("documents.addItem.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canSubmit || submitting"
            @click="emit('submit')"
          >
            {{ t("documents.addItem.confirm") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.adim-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.adim {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.adim__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.adim__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.adim__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.adim__close:hover {
  color: var(--color-text-1);
}

.adim__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.adim__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.adim__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.adim__required {
  color: #dc2626;
}

.adim__input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  transition: border-color var(--transition-normal);
}

.adim__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.adim__input::placeholder {
  color: var(--color-text-placeholder);
}

.adim__select {
  appearance: none;
  cursor: pointer;
}

.adim__textarea {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  resize: vertical;
  transition: border-color var(--transition-normal);
}

.adim__textarea:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.adim__textarea::placeholder {
  color: var(--color-text-placeholder);
}

.adim__hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.adim__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
