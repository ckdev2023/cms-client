<script setup lang="ts">
/**
 * 新建客户弹窗：12 字段表单 + 去重提示 + 创建/草稿按钮。
 */
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import { GROUP_OPTIONS } from "../fixtures";
import type { CustomerCreateFormFields, CustomerSummary } from "../types";

/** 新建客户弹窗：12 字段表单 + 去重提示 + 草稿/创建按钮。 */
const { t } = useI18n();

defineProps<{
  open?: boolean;
  fields?: CustomerCreateFormFields;
  canCreate?: boolean;
  showDedupe?: boolean;
  dedupeMatches?: CustomerSummary[];
}>();

defineEmits<{
  close: [];
  saveDraft: [];
  create: [];
  "update:field": [name: keyof CustomerCreateFormFields, value: string];
}>();

/**
 * 从输入事件中提取当前值。
 *
 * @param e - 输入事件对象
 * @returns 当前输入值
 */
const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="customer-modal-backdrop"
      @click.self="$emit('close')"
    >
      <div
        class="customer-modal"
        role="dialog"
        :aria-label="t('customers.list.createModal.title')"
      >
        <div class="customer-modal__header">
          <h3 class="customer-modal__title">
            {{ t("customers.list.createModal.title") }}
          </h3>
          <button
            class="customer-modal__close"
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
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="customer-modal__body">
          <p class="customer-modal__desc">
            {{ t("customers.list.createModal.description") }}
          </p>

          <div v-if="showDedupe" class="customer-modal__dedupe">
            <div class="customer-modal__dedupe-title">
              {{ t("customers.list.createModal.dedupe.title") }}
            </div>
            <div class="customer-modal__dedupe-desc">
              {{ t("customers.list.createModal.dedupe.description") }}
            </div>
            <ul
              v-if="dedupeMatches && dedupeMatches.length"
              class="customer-modal__dedupe-list"
            >
              <li
                v-for="match in dedupeMatches"
                :key="match.id"
                class="customer-modal__dedupe-item"
              >
                {{ match.displayName }}
                <span v-if="match.phone || match.email">
                  ({{ [match.phone, match.email].filter(Boolean).join(" · ") }})
                </span>
              </li>
            </ul>
          </div>

          <div class="customer-modal__fields">
            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.displayName") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="fields?.displayName"
                  :placeholder="
                    t(
                      'customers.list.createModal.fields.displayNamePlaceholder',
                    )
                  "
                  @input="
                    $emit('update:field', 'displayName', inputValue($event))
                  "
                />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.group") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <select
                  class="customer-modal__input customer-modal__select"
                  :value="fields?.group"
                  @change="
                    $emit(
                      'update:field',
                      'group',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="" disabled>
                    {{
                      t("customers.list.createModal.fields.groupPlaceholder")
                    }}
                  </option>
                  <option
                    v-for="opt in GROUP_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </option>
                </select>
              </div>
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.legalName") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="fields?.legalName"
                  :placeholder="
                    t('customers.list.createModal.fields.legalNamePlaceholder')
                  "
                  @input="
                    $emit('update:field', 'legalName', inputValue($event))
                  "
                />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.kana") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="fields?.kana"
                  :placeholder="
                    t('customers.list.createModal.fields.kanaPlaceholder')
                  "
                  @input="$emit('update:field', 'kana', inputValue($event))"
                />
              </div>
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.gender") }}
                </label>
                <select
                  class="customer-modal__input customer-modal__select"
                  :value="fields?.gender"
                  @change="
                    $emit(
                      'update:field',
                      'gender',
                      ($event.target as HTMLSelectElement).value,
                    )
                  "
                >
                  <option value="">
                    {{ t("customers.list.createModal.fields.genderDefault") }}
                  </option>
                  <option value="male">
                    {{ t("customers.list.createModal.fields.genderMale") }}
                  </option>
                  <option value="female">
                    {{ t("customers.list.createModal.fields.genderFemale") }}
                  </option>
                </select>
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.birthDate") }}
                </label>
                <input
                  type="date"
                  class="customer-modal__input"
                  :value="fields?.birthDate"
                  @input="
                    $emit('update:field', 'birthDate', inputValue($event))
                  "
                />
              </div>
            </div>

            <div class="customer-modal__field">
              <label class="customer-modal__label">
                {{ t("customers.list.createModal.fields.nationality") }}
              </label>
              <input
                type="text"
                class="customer-modal__input"
                :value="fields?.nationality"
                :placeholder="
                  t('customers.list.createModal.fields.nationalityPlaceholder')
                "
                @input="
                  $emit('update:field', 'nationality', inputValue($event))
                "
              />
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.phone") }}
                  <span class="customer-modal__required">*</span>
                </label>
                <input
                  type="tel"
                  class="customer-modal__input"
                  :value="fields?.phone"
                  :placeholder="
                    t('customers.list.createModal.fields.phonePlaceholder')
                  "
                  @input="$emit('update:field', 'phone', inputValue($event))"
                />
                <div class="customer-modal__hint">
                  {{ t("customers.list.createModal.fields.phoneHint") }}
                </div>
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.email") }}
                </label>
                <input
                  type="email"
                  class="customer-modal__input"
                  :value="fields?.email"
                  :placeholder="
                    t('customers.list.createModal.fields.emailPlaceholder')
                  "
                  @input="$emit('update:field', 'email', inputValue($event))"
                />
              </div>
            </div>

            <div class="customer-modal__field">
              <label class="customer-modal__label">
                {{ t("customers.list.createModal.fields.referrer") }}
              </label>
              <input
                type="text"
                class="customer-modal__input"
                :value="fields?.referrer"
                :placeholder="
                  t('customers.list.createModal.fields.referrerPlaceholder')
                "
                @input="$emit('update:field', 'referrer', inputValue($event))"
              />
            </div>

            <div class="customer-modal__row">
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.avatar") }}
                </label>
                <input type="file" class="customer-modal__input" />
              </div>
              <div class="customer-modal__field">
                <label class="customer-modal__label">
                  {{ t("customers.list.createModal.fields.note") }}
                </label>
                <input
                  type="text"
                  class="customer-modal__input"
                  :value="fields?.note"
                  :placeholder="
                    t('customers.list.createModal.fields.notePlaceholder')
                  "
                  @input="$emit('update:field', 'note', inputValue($event))"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="customer-modal__footer">
          <Button variant="outlined" @click="$emit('close')">
            {{ t("customers.list.createModal.cancel") }}
          </Button>
          <Button variant="outlined" @click="$emit('saveDraft')">
            {{ t("customers.list.createModal.saveDraft") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            :disabled="!canCreate"
            @click="$emit('create')"
          >
            {{ t("customers.list.createModal.create") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.customer-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  background: var(--color-bg-modal-scrim);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.customer-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: 90vh;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}

.customer-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-table-row);
}

.customer-modal__title {
  margin: 0;
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.customer-modal__close {
  border: none;
  background: none;
  padding: 4px;
  color: var(--color-text-3);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: color var(--transition-normal);
}

.customer-modal__close:hover {
  color: var(--color-text-1);
}
.customer-modal__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 24px;
}

.customer-modal__desc {
  margin: 0 0 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.customer-modal__dedupe {
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid #fde68a;
  background: #fffbeb;
  margin-bottom: 20px;
  color: #92400e;
  font-size: var(--font-size-sm);
}

.customer-modal__dedupe-title {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
}

.customer-modal__dedupe-desc {
  margin-top: 4px;
}

.customer-modal__dedupe-list {
  margin: 8px 0 0;
  padding: 0 0 0 16px;
}

.customer-modal__fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.customer-modal__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.customer-modal__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.customer-modal__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}
.customer-modal__required {
  color: #dc2626;
}
.customer-modal__input {
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

.customer-modal__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
.customer-modal__input::placeholder {
  color: var(--color-text-placeholder);
}
.customer-modal__select {
  appearance: none;
  cursor: pointer;
}

.customer-modal__hint {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.customer-modal__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-table-row);
  background: var(--color-bg-elevated);
}
</style>
