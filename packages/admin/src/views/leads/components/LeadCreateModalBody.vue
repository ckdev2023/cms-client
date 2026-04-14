<script setup lang="ts">
/**
 * 新建线索弹窗表单主体：12 字段 + 去重提示区。
 *
 * 来源为"介绍"时显示介绍人字段。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { LeadCreateFormFields, LeadSummary } from "../types";
import {
  GROUP_OPTIONS,
  OWNER_OPTIONS,
  BUSINESS_TYPE_OPTIONS,
  LEAD_SOURCE_OPTIONS,
  LANGUAGE_OPTIONS,
} from "../fixtures";

/** 新建线索弹窗表单主体：字段输入、来源联动与去重提示。 */
const { t } = useI18n();

const props = defineProps<{
  fields?: LeadCreateFormFields;
  showDedupe?: boolean;
  dedupeMatches?: LeadSummary[];
}>();

defineEmits<{
  "update:field": [name: keyof LeadCreateFormFields, value: string];
}>();

const showReferrer = computed(() => props.fields?.source === "referral");

const inputValue = (e: Event) => (e.target as HTMLInputElement).value;
</script>

<template>
  <div class="lead-modal-body">
    <p class="lead-modal-body__desc">
      {{ t("leads.list.createModal.description") }}
    </p>

    <div v-if="showDedupe" class="lead-modal-body__dedupe">
      <div class="lead-modal-body__dedupe-title">
        {{ t("leads.list.createModal.dedupe.title") }}
      </div>
      <div class="lead-modal-body__dedupe-desc">
        {{ t("leads.list.createModal.dedupe.description") }}
      </div>
      <ul
        v-if="dedupeMatches && dedupeMatches.length"
        class="lead-modal-body__dedupe-list"
      >
        <li v-for="match in dedupeMatches" :key="match.id">
          {{ match.name }}
          <span v-if="match.phone || match.email">
            ({{ [match.phone, match.email].filter(Boolean).join(" · ") }})
          </span>
        </li>
      </ul>
    </div>

    <div class="lead-modal-body__fields">
      <div class="lead-modal-body__field">
        <label class="lead-modal-body__label">
          {{ t("leads.list.createModal.fields.name") }}
          <span class="lead-modal-body__required">*</span>
        </label>
        <input
          type="text"
          class="lead-modal-body__input"
          :value="fields?.name"
          :placeholder="t('leads.list.createModal.fields.namePlaceholder')"
          @input="$emit('update:field', 'name', inputValue($event))"
        />
      </div>

      <div class="lead-modal-body__row">
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.phone") }}
          </label>
          <input
            type="tel"
            class="lead-modal-body__input"
            :value="fields?.phone"
            :placeholder="t('leads.list.createModal.fields.phonePlaceholder')"
            @input="$emit('update:field', 'phone', inputValue($event))"
          />
        </div>
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.email") }}
          </label>
          <input
            type="email"
            class="lead-modal-body__input"
            :value="fields?.email"
            :placeholder="t('leads.list.createModal.fields.emailPlaceholder')"
            @input="$emit('update:field', 'email', inputValue($event))"
          />
        </div>
      </div>

      <div class="lead-modal-body__row">
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.source") }}
          </label>
          <select
            class="lead-modal-body__input lead-modal-body__select"
            :value="fields?.source"
            @change="
              $emit(
                'update:field',
                'source',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">
              {{ t("leads.list.createModal.fields.sourcePlaceholder") }}
            </option>
            <option
              v-for="opt in LEAD_SOURCE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div v-if="showReferrer" class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.referrer") }}
          </label>
          <input
            type="text"
            class="lead-modal-body__input"
            :value="fields?.referrer"
            :placeholder="
              t('leads.list.createModal.fields.referrerPlaceholder')
            "
            @input="$emit('update:field', 'referrer', inputValue($event))"
          />
        </div>
      </div>

      <div class="lead-modal-body__row">
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.businessType") }}
          </label>
          <select
            class="lead-modal-body__input lead-modal-body__select"
            :value="fields?.businessType"
            @change="
              $emit(
                'update:field',
                'businessType',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">
              {{ t("leads.list.createModal.fields.businessTypePlaceholder") }}
            </option>
            <option
              v-for="opt in BUSINESS_TYPE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.group") }}
          </label>
          <select
            class="lead-modal-body__input lead-modal-body__select"
            :value="fields?.group"
            @change="
              $emit(
                'update:field',
                'group',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">
              {{ t("leads.list.createModal.fields.groupPlaceholder") }}
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

      <div class="lead-modal-body__row">
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.owner") }}
          </label>
          <select
            class="lead-modal-body__input lead-modal-body__select"
            :value="fields?.owner"
            @change="
              $emit(
                'update:field',
                'owner',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">
              {{ t("leads.list.createModal.fields.ownerPlaceholder") }}
            </option>
            <option
              v-for="opt in OWNER_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
        <div class="lead-modal-body__field">
          <label class="lead-modal-body__label">
            {{ t("leads.list.createModal.fields.language") }}
          </label>
          <select
            class="lead-modal-body__input lead-modal-body__select"
            :value="fields?.language"
            @change="
              $emit(
                'update:field',
                'language',
                ($event.target as HTMLSelectElement).value,
              )
            "
          >
            <option value="">
              {{ t("leads.list.createModal.fields.languagePlaceholder") }}
            </option>
            <option
              v-for="opt in LANGUAGE_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="lead-modal-body__field">
        <label class="lead-modal-body__label">
          {{ t("leads.list.createModal.fields.nextAction") }}
        </label>
        <input
          type="text"
          class="lead-modal-body__input"
          :value="fields?.nextAction"
          :placeholder="
            t('leads.list.createModal.fields.nextActionPlaceholder')
          "
          @input="$emit('update:field', 'nextAction', inputValue($event))"
        />
      </div>

      <div class="lead-modal-body__field">
        <label class="lead-modal-body__label">
          {{ t("leads.list.createModal.fields.nextFollowUp") }}
        </label>
        <input
          type="datetime-local"
          class="lead-modal-body__input"
          :value="fields?.nextFollowUp"
          @input="$emit('update:field', 'nextFollowUp', inputValue($event))"
        />
      </div>

      <div class="lead-modal-body__field">
        <label class="lead-modal-body__label">
          {{ t("leads.list.createModal.fields.note") }}
        </label>
        <input
          type="text"
          class="lead-modal-body__input"
          :value="fields?.note"
          :placeholder="t('leads.list.createModal.fields.notePlaceholder')"
          @input="$emit('update:field', 'note', inputValue($event))"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.lead-modal-body__desc {
  margin: 0 0 20px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.lead-modal-body__dedupe {
  padding: 12px;
  border-radius: var(--radius-lg);
  border: 1px solid #fde68a;
  background: #fffbeb;
  margin-bottom: 20px;
  color: #92400e;
  font-size: var(--font-size-sm);
}

.lead-modal-body__dedupe-title {
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
}

.lead-modal-body__dedupe-desc {
  margin-top: 4px;
}

.lead-modal-body__dedupe-list {
  margin: 8px 0 0;
  padding: 0 0 0 16px;
}

.lead-modal-body__fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.lead-modal-body__row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.lead-modal-body__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.lead-modal-body__label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
}

.lead-modal-body__required {
  color: #dc2626;
}

.lead-modal-body__input {
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

.lead-modal-body__input:focus {
  outline: none;
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}

.lead-modal-body__input::placeholder {
  color: var(--color-text-placeholder);
}

.lead-modal-body__select {
  appearance: none;
  cursor: pointer;
}
</style>
