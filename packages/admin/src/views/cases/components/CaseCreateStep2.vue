<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { DocumentProviderType } from "../../documents/types";
import CaseCreateStep2ChecklistServerBanner from "./CaseCreateStep2ChecklistServerBanner.vue";
import CaseCreateStep2DocumentPreview from "./CaseCreateStep2DocumentPreview.vue";
import { resolveGroupLabel } from "../../../shared/model/groupOptions";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { PartyPickerMode } from "../model/useCasePartyPicker";
import type { CaseCreateCustomerOption } from "../types";
import {
  resolveTemplateLabel,
  type CaseTemplateRequirementSection,
} from "../types-create";
import { buildChecklistPreviewSections } from "../model/buildChecklistPreviewSections";
import { resolveCaseCreateRequirementSummary } from "../model/caseCreateRequirementSummary";

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

type PreviewRow = {
  id: string;
  label: string;
  required: boolean;
  conditionalTag?: string;
};

type PreviewSectionVM = {
  key: string;
  icon: SectionIcon;
  title: string;
  items: PreviewRow[];
};

/**
 * Step2 预览卡片区段图标：服务端的 `DocumentProviderType` 语义映射。
 * @param provider 资料提供方枚举
 * @returns 图标语义类别
 */
function resolveProviderSectionIcon(
  provider: DocumentProviderType,
): SectionIcon {
  if (provider === "main_applicant") return "applicant";
  if (provider === "dependent_guarantor") return "supporter";
  if (provider === "employer_org") return "supporter";
  if (provider === "office_internal") return "office";
  return "folder";
}

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

/**
 * 累计 fixtures 模板分段内的资料项总数与必填项数。
 *
 * @param sections 模板分段列表
 * @returns 总条数与必填条数
 */
function countFixtureItemTotals(
  sections: readonly CaseTemplateRequirementSection[],
) {
  let fixtureTotal = 0;
  let fixtureRequired = 0;
  for (const sec of sections) {
    fixtureTotal += sec.items.length;
    for (const it of sec.items) if (it.required) fixtureRequired += 1;
  }
  return { fixtureTotal, fixtureRequired };
}

/**
 * 合并清单预览与 fixtures，供 Step2 摘要 chip 使用。
 *
 * @param model 建案模型
 * @returns 总条数、必填条数与分段数快照
 */
function resolveStep2RequirementSummary(model: CreateCaseModel) {
  const tpl = model.currentTemplate.value;
  if (!tpl) return { total: 0, required: 0, sections: 0 };

  const { fixtureTotal, fixtureRequired } = countFixtureItemTotals(
    tpl.sections,
  );
  const preview = model.checklistPreview;
  return resolveCaseCreateRequirementSummary({
    fixtureTotal,
    fixtureRequired,
    sectionCount: tpl.sections.length,
    srvTotal: preview?.checklistCount?.value ?? null,
    srvRequired: preview?.checklistRequiredCount?.value ?? null,
    previewState: preview?.previewState?.value,
  });
}

/** 资料清单整体统计：用于头部 summary chip（与服务端 blueprint 对齐）。 */
const requirementSummary = computed(() =>
  resolveStep2RequirementSummary(props.model),
);

/** 与服务端 checklist-preview 条目同源时的规范分段。 */
const checklistPreviewSectionsFromApi = computed(() => {
  const lines = props.model.checklistPreview?.checklistItems?.value ?? [];
  if (!lines.length) return [];
  return buildChecklistPreviewSections(lines, props.model.draft?.templateId, t);
});

const documentPreviewLoading = computed(
  () => props.model.checklistPreview?.previewState?.value === "loading",
);

/** 统一「资料清单预览」分段模型：优先 API 蓝图，缺省回退至 fixtures。 */
const documentPreviewSections = computed<PreviewSectionVM[] | null>(() => {
  if (documentPreviewLoading.value) return null;

  const apiSeq = checklistPreviewSectionsFromApi.value;
  if (apiSeq.length > 0) {
    return apiSeq.map((sec) => ({
      key: `api-${sec.provider}`,
      icon: resolveProviderSectionIcon(sec.provider),
      title: sec.title,
      items: sec.items.map((it) => ({
        id: it.code,
        label: it.name,
        required: it.requiredFlag,
      })),
    }));
  }

  const tpl = props.model.currentTemplate.value;
  if (!tpl) return [];

  return tpl.sections.map((sec, si) => ({
    key: `tpl-${si}`,
    icon: resolveSectionIcon(sec.title.zh),
    title: resolveTemplateLabel(sec.title, locale.value),
    items: sec.items.map((it) => ({
      id: it.id,
      label: resolveTemplateLabel(it.label, locale.value),
      required: it.required,
      conditionalTag: it.conditionalTag,
    })),
  }));
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

    <CaseCreateStep2ChecklistServerBanner :model="model" />

    <CaseCreateStep2DocumentPreview
      :loading="documentPreviewLoading"
      :sections="documentPreviewSections"
      :summary-total="requirementSummary.total"
      :summary-required="requirementSummary.required"
    />
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
