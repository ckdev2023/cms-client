<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import {
  getRelationTypeOptions,
  type CustomerRelationFormFields,
} from "../types";

/** 关联人编辑弹窗：承载新增与编辑表单输入，并反馈保存状态。 */
const props = defineProps<{
  open: boolean;
  form: CustomerRelationFormFields;
  isEditing: boolean;
  canSubmit: boolean;
  saving: boolean;
  errorCode: "requestFailed" | "validation" | null;
}>();

defineEmits<{
  close: [];
  submit: [];
  "update:field": [field: keyof CustomerRelationFormFields, value: string];
}>();

const { t, locale } = useI18n();
const relationTypeOptions = computed(() =>
  getRelationTypeOptions(locale.value),
);
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="crm-overlay" @click.self="$emit('close')">
      <div
        class="crm-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="
          t(
            props.isEditing
              ? 'customers.detail.contactsTab.form.editTitle'
              : 'customers.detail.contactsTab.form.createTitle',
          )
        "
        @keydown.escape="$emit('close')"
      >
        <div class="crm-header">
          <h3 class="crm-title">
            {{
              t(
                props.isEditing
                  ? "customers.detail.contactsTab.form.editTitle"
                  : "customers.detail.contactsTab.form.createTitle",
              )
            }}
          </h3>
        </div>

        <div class="crm-body">
          <label class="crm-field" for="crm-name">
            <span class="crm-label">{{
              t("customers.detail.contactsTab.form.nameLabel")
            }}</span>
            <input
              id="crm-name"
              name="relationName"
              class="crm-input"
              :value="form.name"
              :placeholder="
                t('customers.detail.contactsTab.form.namePlaceholder')
              "
              @input="
                $emit(
                  'update:field',
                  'name',
                  ($event.target as HTMLInputElement).value,
                )
              "
              @keydown.enter="props.canSubmit && $emit('submit')"
            />
          </label>

          <label class="crm-field" for="crm-relationType">
            <span class="crm-label">{{
              t("customers.detail.contactsTab.form.relationTypeLabel")
            }}</span>
            <select
              id="crm-relationType"
              name="relationType"
              class="crm-input"
              :value="form.relationType"
              @change="
                $emit(
                  'update:field',
                  'relationType',
                  ($event.target as HTMLSelectElement).value,
                )
              "
            >
              <option
                v-for="option in relationTypeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </label>

          <label class="crm-field" for="crm-roleTitle">
            <span class="crm-label">{{
              t("customers.detail.contactsTab.form.roleTitleLabel")
            }}</span>
            <input
              id="crm-roleTitle"
              name="roleTitle"
              class="crm-input"
              :value="form.roleTitle"
              :placeholder="
                t('customers.detail.contactsTab.form.roleTitlePlaceholder')
              "
              @input="
                $emit(
                  'update:field',
                  'roleTitle',
                  ($event.target as HTMLInputElement).value,
                )
              "
              @keydown.enter="props.canSubmit && $emit('submit')"
            />
          </label>

          <label class="crm-field" for="crm-phone">
            <span class="crm-label">{{
              t("customers.detail.contactsTab.form.phoneLabel")
            }}</span>
            <input
              id="crm-phone"
              name="phone"
              class="crm-input"
              :value="form.phone"
              @input="
                $emit(
                  'update:field',
                  'phone',
                  ($event.target as HTMLInputElement).value,
                )
              "
              @keydown.enter="props.canSubmit && $emit('submit')"
            />
          </label>

          <label class="crm-field" for="crm-email">
            <span class="crm-label">{{
              t("customers.detail.contactsTab.form.emailLabel")
            }}</span>
            <input
              id="crm-email"
              name="email"
              class="crm-input"
              :value="form.email"
              @input="
                $emit(
                  'update:field',
                  'email',
                  ($event.target as HTMLInputElement).value,
                )
              "
              @keydown.enter="props.canSubmit && $emit('submit')"
            />
          </label>

          <p v-if="props.errorCode" class="crm-error">
            {{
              t(
                props.errorCode === "validation"
                  ? "customers.detail.contactsTab.form.validationNameRequired"
                  : "customers.detail.contactsTab.form.requestFailed",
              )
            }}
          </p>
        </div>

        <div class="crm-footer">
          <Button size="sm" @click="$emit('close')">
            {{ t("customers.detail.contactsTab.form.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!props.canSubmit"
            :loading="props.saving"
            @click="$emit('submit')"
          >
            {{
              t(
                props.isEditing
                  ? "customers.detail.contactsTab.form.save"
                  : "customers.detail.contactsTab.form.create",
              )
            }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.crm-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal, 50);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--color-bg-modal-scrim, rgba(0, 0, 0, 0.4));
}

.crm-dialog {
  width: min(100%, 520px);
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal, var(--shadow-1));
}

.crm-header,
.crm-footer {
  padding: 20px 24px;
}

.crm-title {
  margin: 0;
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.crm-body {
  display: grid;
  gap: 12px;
  padding: 0 24px;
}

.crm-field {
  display: grid;
  gap: 6px;
}

.crm-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.crm-input {
  width: 100%;
  min-height: 40px;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-md);
  box-sizing: border-box;
  font: inherit;
}

.crm-error {
  margin: 0;
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.crm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
