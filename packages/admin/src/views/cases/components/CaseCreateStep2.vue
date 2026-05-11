<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import CaseCreateStep2ChecklistServerBanner from "./CaseCreateStep2ChecklistServerBanner.vue";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { PartyPickerMode } from "../model/useCasePartyPicker";
import type { CaseCreateCustomerOption } from "../types";
import { resolveTemplateLabel } from "../types-create";

/** 步骤二：主申请人、关联人管理、资料清单预览。 */
const { t, te, locale } = useI18n();

/**
 * BUG-152：roleHint 多为 i18n key；字面角色原文返回。
 * @param value 角色字面或 i18n key
 * @returns 本地化展示字符串
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
 * 下拉切换主申请人（已有客户）。
 * @param e 原生 change 事件
 */
function onPrimarySelect(e: Event) {
  const id = (e.target as HTMLSelectElement).value;
  const c = props.customerOptions.find((x) => x.id === id) ?? null;
  props.model.setPrimaryCustomer(c);
}

/** BUG-139：分组标签按原始 group + locale 实时解析。 */
const primaryGroupDisplay = computed(() => {
  const group = props.model.primaryCustomer.value?.group;
  if (!group) return "";
  return resolveGroupLabel(group, undefined, locale.value);
});

type SectionIcon = "applicant" | "supporter" | "office" | "folder";

/**
 * 资料预览分组图标：由 zh 标题关键字映射。
 * @param zhTitle 子分组中文标题（label.zh）
 * @returns 图标语义类别（用于选择对应 SVG）
 */
function resolveSectionIcon(zhTitle: string): SectionIcon {
  if (/主申请人|申请人/.test(zhTitle)) return "applicant";
  if (/扶养者|保证人|雇主|担保|sponsor/i.test(zhTitle)) return "supporter";
  if (/事务所|内部|office/i.test(zhTitle)) return "office";
  return "folder";
}

/** 资料清单整体统计：用于头部 summary chip（与服务端 blueprint 对齐）。 */
const requirementSummary = computed(() => {
  const tpl = props.model.currentTemplate.value;
  if (!tpl) return { total: 0, required: 0, sections: 0 };

  let total = 0;
  let required = 0;
  for (const sec of tpl.sections) {
    total += sec.items.length;
    for (const it of sec.items) if (it.required) required += 1;
  }

  const preview = props.model.checklistPreview;
  const srvTotal = preview.checklistCount.value;
  const srvRequired = preview.checklistRequiredCount.value;
  const st = preview.previewState.value;

  if (st === "ok" && srvTotal !== null) {
    return {
      total: srvTotal,
      required: srvRequired ?? required,
      sections: tpl.sections.length,
    };
  }
  if (st === "empty") {
    return { total: 0, required: 0, sections: tpl.sections.length };
  }

  return { total, required, sections: tpl.sections.length };
});

/**
 * 统计子分组下的必须项数量。
 * @param items 资料项列表
 * @returns 必须项条数
 */
function sectionRequiredCount(
  items: ReadonlyArray<{ required: boolean }>,
): number {
  let count = 0;
  for (const it of items) if (it.required) count += 1;
  return count;
}
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

    <CaseCreateStep2ChecklistServerBanner :model="model" />

    <section class="preview" data-testid="document-preview">
      <header class="preview__header">
        <div class="preview__heading">
          <h3 class="preview__title">
            {{ t("cases.create.step2.documentPreview") }}
          </h3>
          <p class="preview__hint">
            {{ t("cases.create.step2.documentPreviewHint") }}
          </p>
        </div>
        <Chip
          v-if="requirementSummary.total > 0"
          tone="primary"
          size="md"
          data-testid="document-preview-summary"
        >
          {{
            t("cases.create.step2.documentPreviewSummary", {
              total: requirementSummary.total,
              required: requirementSummary.required,
            })
          }}
        </Chip>
      </header>

      <div v-if="model.currentTemplate.value" class="preview__sections">
        <article
          v-for="(sec, si) in model.currentTemplate.value.sections"
          :key="si"
          class="preview-card"
        >
          <header class="preview-card__header">
            <span
              class="preview-card__icon"
              :data-icon="resolveSectionIcon(sec.title.zh)"
              aria-hidden="true"
            >
              <svg
                v-if="resolveSectionIcon(sec.title.zh) === 'applicant'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
              </svg>
              <svg
                v-else-if="resolveSectionIcon(sec.title.zh) === 'supporter'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="9" cy="8" r="3.2" />
                <circle cx="17" cy="9.5" r="2.6" />
                <path d="M2.5 20c0-3.4 3-5.8 6.5-5.8s6.5 2.4 6.5 5.8" />
                <path d="M15 20c0-2.6 2-4.6 5-4.6" />
              </svg>
              <svg
                v-else-if="resolveSectionIcon(sec.title.zh) === 'office'"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect x="3" y="7" width="18" height="13" rx="2" />
                <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                <path d="M3 13h18" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path
                  d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
                />
              </svg>
            </span>
            <h4 class="preview-card__title">
              {{ resolveTemplateLabel(sec.title, locale) }}
            </h4>
            <span class="preview-card__count">
              {{ sec.items.length }}
              <span class="preview-card__count-sep">·</span>
              <span class="preview-card__count-required">{{
                sectionRequiredCount(sec.items)
              }}</span>
            </span>
          </header>
          <ul class="preview-card__list">
            <li
              v-for="item in sec.items"
              :key="item.id"
              class="preview-item"
              :data-required="item.required"
            >
              <span class="preview-item__bullet" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="14"
                  height="14"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M5 12.5l4 4L19 7" />
                </svg>
              </span>
              <span class="preview-item__body">
                <span class="preview-item__label">{{
                  resolveTemplateLabel(item.label, locale)
                }}</span>
                <span
                  v-if="item.conditionalTag"
                  class="preview-item__condition"
                >
                  {{ item.conditionalTag }}
                </span>
              </span>
              <Chip
                v-if="item.required"
                tone="warning"
                size="micro"
                class="preview-item__chip"
              >
                {{ t("cases.create.step2.requiredBadge") }}
              </Chip>
              <Chip
                v-else
                tone="neutral"
                size="micro"
                class="preview-item__chip"
              >
                {{ t("cases.create.step2.optionalBadge") }}
              </Chip>
            </li>
          </ul>
        </article>
      </div>
      <div v-else class="preview__empty">
        {{ t("cases.create.step2.documentPreviewEmpty") }}
      </div>
    </section>
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
