<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { PartyPickerMode } from "../model/useCasePartyPicker";
import type { CaseCreateCustomerOption } from "../types";
import { resolveTemplateLabel } from "../types-create";

/** 步骤二：主申请人、关联人管理、资料清单预览。 */
const { t, te, locale } = useI18n();

/**
 * 角色字面解析：当 `value` 为已注册 i18n key 时返回当前 locale 翻译，
 * 否则原样返回（兼容快速新建时用户自填的角色字面，如 "扶养者"、"配偶"）。
 *
 * 修复 BUG-152：服务端拉取 / sourceContext 合成的客户 roleHint 现统一为
 * `cases.create.step2.primaryRole`，渲染时按当前语言翻译，避免硬编码 JA。
 *
 * @param value - 角色字面或 i18n key
 * @returns 渲染用本地化字符串
 */
function resolveRoleLabel(value: string | undefined | null): string {
  if (!value) return "";
  return te(value) ? t(value) : value;
}

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

/**
 * 选中主申请人卡片的分组标签：始终基于 raw `group` 字段实时解析，
 * 以便 locale 切换或 `/api/groups` 别名晚到时仍能保持本地化（BUG-139）。
 */
const primaryGroupDisplay = computed(() => {
  const group = props.model.primaryCustomer.value?.group;
  if (!group) return "";
  return resolveGroupLabel(group, undefined, locale.value);
});
</script>

<template>
  <div>
    <h2 class="cc__title">{{ t("cases.create.step2.primaryTitle") }}</h2>
    <div class="cc__fields">
      <div class="cc__field">
        <label class="cc__label" for="case-create-primaryCustomer">{{
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
          id="case-create-primaryCustomer"
          name="primaryCustomer"
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
        · {{ resolveRoleLabel(model.primaryCustomer.value.roleHint) }} ·
        {{ primaryGroupDisplay }}
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
          <Chip>{{ resolveRoleLabel(p.role) }}</Chip>
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
          <Chip>{{ resolveRoleLabel(p.role) }}</Chip>
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
        <Chip>{{ resolveRoleLabel(p.role) }}</Chip>
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
            <Chip v-if="item.required" tone="warning">{{
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
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
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
  border-radius: var(--radius-md);
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger-text, #b91c1c);
  font-size: var(--font-size-sm);
}

.customer-empty {
  padding: 12px 16px;
  border: 1px dashed var(--color-border-1);
  border-radius: var(--radius-md);
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
