<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { CASE_GROUP_OPTIONS } from "../constants";
import type { CaseCreateCustomerOption } from "../types";
import type { QuickCreateCustomerForm } from "../model/useCasePartyPicker";

/** 案件新建：当事人快速新建弹窗，含去重确认流程。 */
const { t } = useI18n();

const PARTY_ROLE_OPTIONS = computed(() => [
  { value: "主申請人", label: t("cases.create.modal.roles.primary") },
  { value: "配偶", label: t("cases.create.modal.roles.spouse") },
  { value: "子女", label: t("cases.create.modal.roles.child") },
  { value: "扶養者", label: t("cases.create.modal.roles.supporter") },
  { value: "保証人", label: t("cases.create.modal.roles.guarantor") },
]);

defineProps<{
  open: boolean;
  form: QuickCreateCustomerForm;
  formErrors: Partial<Record<keyof QuickCreateCustomerForm, string>>;
  showDuplicateConfirmation: boolean;
  duplicateHits: CaseCreateCustomerOption[];
  confirmReason: string;
  canSave: boolean;
}>();

defineEmits<{
  close: [];
  "update:field": [field: keyof QuickCreateCustomerForm, value: string];
  "update:confirmReason": [value: string];
  attemptSave: [];
}>();

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="ccm-backdrop" @click.self="$emit('close')">
      <div
        class="ccm"
        role="dialog"
        :aria-label="t('cases.create.modal.dialogLabel')"
      >
        <div class="ccm__header">
          <h3 class="ccm__title">{{ t("cases.create.modal.title") }}</h3>
          <button class="ccm__close" type="button" @click="$emit('close')">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="ccm__body">
          <p class="ccm__desc">
            {{ t("cases.create.modal.description") }}
          </p>

          <div v-if="showDuplicateConfirmation" class="ccm__dedupe">
            <div class="ccm__dedupe-title">
              {{ t("cases.create.modal.dedupe.title") }}
            </div>
            <div class="ccm__dedupe-desc">
              {{ t("cases.create.modal.dedupe.description") }}
            </div>
            <ul v-if="duplicateHits.length" class="ccm__dedupe-list">
              <li v-for="hit in duplicateHits" :key="hit.id">
                {{ hit.name }} ({{ hit.contact }})
              </li>
            </ul>
            <div class="ccm__field" style="margin-top: 12px">
              <label class="ccm__label">
                {{ t("cases.create.modal.dedupe.reasonLabel") }}
                <span class="ccm__required">*</span>
              </label>
              <input
                type="text"
                class="ccm__input"
                :value="confirmReason"
                :placeholder="t('cases.create.modal.dedupe.reasonPlaceholder')"
                @input="$emit('update:confirmReason', inputValue($event))"
              />
            </div>
          </div>

          <div class="ccm__fields">
            <div class="ccm__row">
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ t("cases.create.modal.fields.name") }}
                  <span class="ccm__required">*</span>
                </label>
                <input
                  type="text"
                  class="ccm__input"
                  :value="form.name"
                  :placeholder="t('cases.create.modal.fields.namePlaceholder')"
                  @input="$emit('update:field', 'name', inputValue($event))"
                />
                <div v-if="formErrors.name" class="ccm__error">
                  {{ formErrors.name }}
                </div>
              </div>
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ t("cases.create.modal.fields.role") }}
                  <span class="ccm__required">*</span>
                </label>
                <select
                  class="ccm__input ccm__select"
                  :value="form.role"
                  @change="
                    $emit(
                      'update:field',
                      'role',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="" disabled>
                    {{ t("cases.create.modal.fields.rolePlaceholder") }}
                  </option>
                  <option
                    v-for="r in PARTY_ROLE_OPTIONS"
                    :key="r.value"
                    :value="r.value"
                  >
                    {{ r.label }}
                  </option>
                </select>
                <div v-if="formErrors.role" class="ccm__error">
                  {{ formErrors.role }}
                </div>
              </div>
            </div>

            <div class="ccm__row">
              <div class="ccm__field">
                <label class="ccm__label">
                  {{ t("cases.create.modal.fields.group") }}
                  <span class="ccm__required">*</span>
                </label>
                <select
                  class="ccm__input ccm__select"
                  :value="form.groupId"
                  @change="
                    $emit(
                      'update:field',
                      'groupId',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="" disabled>
                    {{ t("cases.create.modal.fields.groupPlaceholder") }}
                  </option>
                  <option
                    v-for="g in CASE_GROUP_OPTIONS"
                    :key="g.value"
                    :value="g.value"
                  >
                    {{ g.label }}
                  </option>
                </select>
                <div v-if="formErrors.groupId" class="ccm__error">
                  {{ formErrors.groupId }}
                </div>
              </div>
              <div class="ccm__field">
                <label class="ccm__label">{{
                  t("cases.create.modal.fields.phone")
                }}</label>
                <input
                  type="tel"
                  class="ccm__input"
                  :value="form.phone"
                  :placeholder="t('cases.create.modal.fields.phonePlaceholder')"
                  @input="$emit('update:field', 'phone', inputValue($event))"
                />
                <div v-if="formErrors.phone" class="ccm__error">
                  {{ formErrors.phone }}
                </div>
              </div>
            </div>

            <div class="ccm__field">
              <label class="ccm__label">{{
                t("cases.create.modal.fields.email")
              }}</label>
              <input
                type="email"
                class="ccm__input"
                :value="form.email"
                :placeholder="t('cases.create.modal.fields.emailPlaceholder')"
                @input="$emit('update:field', 'email', inputValue($event))"
              />
              <div v-if="formErrors.email" class="ccm__error">
                {{ formErrors.email }}
              </div>
            </div>

            <div class="ccm__field">
              <label class="ccm__label">{{
                t("cases.create.modal.fields.note")
              }}</label>
              <input
                type="text"
                class="ccm__input"
                :value="form.note"
                :placeholder="t('cases.create.modal.fields.notePlaceholder')"
                @input="$emit('update:field', 'note', inputValue($event))"
              />
            </div>
          </div>
        </div>

        <div class="ccm__footer">
          <Button variant="outlined" @click="$emit('close')">{{
            t("cases.create.modal.cancel")
          }}</Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canSave"
            @click="$emit('attemptSave')"
          >
            {{
              showDuplicateConfirmation
                ? t("cases.create.modal.confirmCreate")
                : t("cases.create.modal.saveAndFill")
            }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.ccm-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.ccm {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.ccm__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.ccm__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.ccm__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.ccm__close:hover {
  color: var(--color-text-1);
}

.ccm__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
}

.ccm__desc {
  margin: 0 0 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.ccm__dedupe {
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid #fde68a;
  background: #fffbeb;
  margin-bottom: 20px;
  color: #92400e;
  font-size: var(--font-size-sm);
}

.ccm__dedupe-title {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
}

.ccm__dedupe-desc {
  margin-top: 4px;
}

.ccm__dedupe-list {
  margin: 8px 0 0;
  padding: 0 0 0 16px;
}

.ccm__fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ccm__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.ccm__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ccm__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.ccm__required {
  color: #dc2626;
}

.ccm__input {
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

.ccm__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.ccm__input::placeholder {
  color: var(--color-text-placeholder);
}

.ccm__select {
  appearance: none;
  cursor: pointer;
}

.ccm__error {
  font-size: var(--font-size-xs);
  color: #dc2626;
  font-weight: var(--font-weight-semibold);
}

.ccm__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
