<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { PartyPickerMode } from "../model/useCasePartyPicker";
import type { CaseCreateCustomerOption } from "../types";
import { resolveTemplateLabel } from "../types-create";

/** 步骤二：主申请人、关联人管理、资料清单预览。 */
const { t, locale } = useI18n();

const props = defineProps<{
  model: CreateCaseModel;
  customerOptions: readonly CaseCreateCustomerOption[];
  customersLoading?: boolean;
  customersError?: string | null;
  customersLoaded?: boolean;
}>();

const emit = defineEmits<{
  openPicker: [mode: PartyPickerMode, defaultRole?: string];
  retryCustomers: [];
}>();

/**
 * 从下拉列表中选择已有客户作为主申请人。
 *
 * @param e - 原生 change 事件
 */
function onPrimarySelect(e: Event) {
  const id = (e.target as HTMLSelectElement).value;
  const c = props.customerOptions.find((x) => x.id === id) ?? null;
  props.model.setPrimaryCustomer(c);
}
</script>

<template>
  <div>
    <h2 class="cc__title">{{ t("cases.create.step2.primaryTitle") }}</h2>
    <div class="cc__fields">
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step2.selectExisting")
        }}</label>

        <div
          v-if="customersLoading"
          class="customer-loading"
          data-testid="customers-loading"
        >
          {{ t("cases.create.step2.customersLoading") }}
        </div>

        <div
          v-else-if="customersError"
          class="customer-error"
          data-testid="customers-error"
        >
          <span>{{ t("cases.create.step2.customersError") }}</span>
          <Button
            size="sm"
            @click="emit('retryCustomers')"
            data-testid="customers-retry"
          >
            {{ t("cases.create.step2.customersRetry") }}
          </Button>
        </div>

        <div
          v-else-if="customersLoaded && customerOptions.length === 0"
          class="customer-empty"
          data-testid="customers-empty"
        >
          {{ t("cases.create.step2.customersEmpty") }}
          <a href="#/customers" class="customer-empty__link">
            {{ t("cases.create.step2.customersGoCreate") }}
          </a>
        </div>

        <select
          v-else
          class="cc__input cc__input--select"
          :value="model.primaryCustomer.value?.id ?? ''"
          data-testid="customer-select"
          @change="onPrimarySelect"
        >
          <option value="" disabled>
            {{ t("cases.create.step2.selectPlaceholder") }}
          </option>
          <option v-for="c in customerOptions" :key="c.id" :value="c.id">
            {{ c.name }} / {{ c.groupLabel }}
          </option>
        </select>
      </div>
      <div class="cc__field cc__field--end">
        <Button
          size="sm"
          @click="
            emit('openPicker', 'primary', t('cases.create.step2.primaryRole'))
          "
        >
          {{ t("cases.create.step2.quickCreate") }}
        </Button>
      </div>
    </div>

    <div v-if="model.primaryCustomer.value" class="party">
      <strong>{{ model.primaryCustomer.value.name }}</strong>
      <span class="cc__muted">
        · {{ model.primaryCustomer.value.roleHint }} ·
        {{ model.primaryCustomer.value.groupLabel }}
      </span>
      <div class="cc__muted">{{ model.primaryCustomer.value.contact }}</div>
    </div>

    <template v-if="model.isFamilyBulkScenario.value">
      <h3 class="cc__subtitle">
        {{ t("cases.create.step2.familyBulkTitle") }}
      </h3>
      <p class="cc__hint">{{ t("cases.create.step2.familyBulkHint") }}</p>
      <div v-if="model.familyApplicants.value.length">
        <div class="cc__muted" style="margin-bottom: 8px">
          {{ t("cases.create.step2.familyApplicants") }}
        </div>
        <div
          v-for="(p, i) in model.familyApplicants.value"
          :key="'fa' + i"
          class="party"
        >
          {{ p.name }}
          <Chip size="sm">{{ p.role }}</Chip>
          <div v-if="p.note" class="cc__muted">{{ p.note }}</div>
        </div>
      </div>
      <div v-if="model.familySupporters.value.length">
        <div class="cc__muted" style="margin: 12px 0 8px">
          {{ t("cases.create.step2.familySupporters") }}
        </div>
        <div
          v-for="(p, i) in model.familySupporters.value"
          :key="'fs' + i"
          class="party"
        >
          {{ p.name }}
          <Chip size="sm">{{ p.role }}</Chip>
          <div v-if="p.contact" class="cc__muted">{{ p.contact }}</div>
        </div>
      </div>
    </template>

    <h3 class="cc__subtitle">{{ t("cases.create.step2.relatedTitle") }}</h3>
    <div
      v-for="(p, i) in model.additionalParties.value"
      :key="'rp' + i"
      class="party-row"
    >
      <div>
        {{ p.name }}
        <Chip size="sm">{{ p.role }}</Chip>
        <span v-if="p.contact" class="cc__muted"> {{ p.contact }}</span>
      </div>
      <button
        class="link-btn"
        type="button"
        @click="model.removeRelatedParty(i)"
      >
        {{ t("cases.create.step2.relatedRemove") }}
      </button>
    </div>
    <div v-if="!model.additionalParties.value.length" class="empty">
      {{ t("cases.create.step2.relatedEmpty") }}
    </div>
    <Button
      size="sm"
      style="margin-top: 8px"
      @click="emit('openPicker', 'related')"
    >
      {{ t("cases.create.step2.relatedAdd") }}
    </Button>

    <h3 class="cc__subtitle" style="margin-top: 24px">
      {{ t("cases.create.step2.documentPreview") }}
    </h3>
    <div v-if="model.currentTemplate.value">
      <div v-for="(sec, si) in model.currentTemplate.value.sections" :key="si">
        <div class="req-title">
          {{ resolveTemplateLabel(sec.title, locale) }}
        </div>
        <ul class="req-list">
          <li v-for="item in sec.items" :key="item.id">
            {{ resolveTemplateLabel(item.label, locale) }}
            <Chip v-if="item.required" size="sm" tone="warning">{{
              t("cases.create.step2.requiredBadge")
            }}</Chip>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.party {
  padding: 12px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  margin-top: 12px;
  background: var(--color-bg-1);
}

.party-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-default);
  margin-bottom: 8px;
}

.link-btn {
  border: none;
  background: none;
  color: var(--color-primary-6);
  cursor: pointer;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-default);
}

.req-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-2);
  margin-top: 12px;
}

.req-list {
  margin: 6px 0 0;
  padding: 0 0 0 20px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.req-list li {
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.customer-loading {
  padding: 12px 16px;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
}

.customer-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border: 1px solid var(--color-danger-border, #fdd);
  border-radius: var(--radius-default);
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger-text, #b91c1c);
  font-size: var(--font-size-sm);
}

.customer-empty {
  padding: 12px 16px;
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-default);
  text-align: center;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
}

.customer-empty__link {
  color: var(--color-primary-6);
  text-decoration: underline;
  margin-left: 4px;
}
</style>
