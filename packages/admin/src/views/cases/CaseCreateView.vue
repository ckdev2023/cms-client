<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import Chip from "../../shared/ui/Chip.vue";
import Card from "../../shared/ui/Card.vue";
import CaseCreateStep1 from "./components/CaseCreateStep1.vue";
import CaseCreateStep2 from "./components/CaseCreateStep2.vue";
import CaseCreateStep3 from "./components/CaseCreateStep3.vue";
import CaseCreateStep4 from "./components/CaseCreateStep4.vue";
import CaseCreateModal from "./components/CaseCreateModal.vue";
import CaseCreateToast from "./components/CaseCreateToast.vue";
import { useCreateCaseModel } from "./model/useCreateCaseModel";
import { useCasePartyPicker } from "./model/useCasePartyPicker";
import type { PartyPickerMode } from "./model/useCasePartyPicker";
import { parseCaseCreateQuery } from "./query";
import { createMockCaseRepository } from "./repository";
import { CREATE_CASE_STEPS, CASE_OWNER_OPTIONS } from "./constants";
import "./case-create-shared.css";

/** 案件新建页：四步表单向导、来源上下文、party picker modal、toast。 */
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const repo = createMockCaseRepository();
const viewer = repo.getViewer();
const sourceContext = parseCaseCreateQuery(route.query, route.hash);
const templates = repo.getCreateTemplates();

const model = useCreateCaseModel({
  templates: () => templates,
  customers: () => repo.getCreateCustomers(),
  familyScenario: () => repo.getFamilyScenario(),
  ownerOptions: () => repo.getOwnerOptions(),
  groupOptions: () => repo.getGroupOptions(),
  sourceContext,
  defaultGroup: viewer.groupId,
  defaultOwner: viewer.ownerId,
});

const picker = useCasePartyPicker({
  existingCustomers: () => repo.getCreateCustomers(),
});

const toastVisible = ref(false);
const toastTitle = ref("");
const toastDesc = ref("");
let toastTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * 显示底部 toast 通知并在 3 秒后自动关闭。
 *
 * @param title - 通知标题
 * @param desc - 可选的描述文字
 */
function showToast(title: string, desc = "") {
  toastTitle.value = title;
  toastDesc.value = desc;
  toastVisible.value = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastVisible.value = false;
  }, 3000);
}

const submitted = ref(false);
const submitting = ref(false);
const createdCaseId = ref("CASE-MOCK-001");

/** 模拟提交案件并展示成功状态。 */
function handleSubmit() {
  if (!model.canSubmit.value || submitting.value) return;
  submitting.value = true;
  setTimeout(() => {
    submitting.value = false;
    submitted.value = true;
    showToast(
      t("cases.create.toast.caseCreated"),
      t("cases.create.toast.caseCreatedDesc", {
        title: model.effectiveTitle.value,
      }),
    );
  }, 600);
}

/**
 * 打开当事人快速新建弹窗并预填角色。
 *
 * @param mode - 弹窗模式（主申请人或关联人）
 * @param defaultRole - 预填的角色名称
 */
function openPicker(mode: PartyPickerMode, defaultRole?: string) {
  picker.open(mode);
  if (defaultRole) picker.setField("role", defaultRole);
}

watch(
  () => picker.lastResult.value,
  (result) => {
    if (!result) return;
    if (result.mode === "primary") {
      model.setPrimaryCustomer(result.customer);
      showToast(t("cases.create.toast.primarySet"), result.customer.name);
    } else {
      model.addRelatedParty({
        customerId: result.customer.id,
        name: result.customer.name,
        role: result.customer.roleHint,
        contact: result.customer.contact,
        note: result.customer.summary,
        group: result.customer.group,
        groupLabel: result.customer.groupLabel,
      });
      showToast(t("cases.create.toast.relatedAdded"), result.customer.name);
    }
  },
);

const customerSelectOptions = computed(() => {
  const base = [...repo.getCreateCustomers()];
  const p = model.primaryCustomer.value;
  if (p && !base.some((c) => c.id === p.id)) base.unshift(p);
  return base;
});

const nextLabel = computed(() => {
  const labels: Record<number, string> = {
    1: t("cases.create.navigation.nextParties"),
    2: t("cases.create.navigation.nextAssignment"),
    3: t("cases.create.navigation.nextReview"),
  };
  return labels[model.draft.currentStep] ?? t("cases.create.navigation.next");
});

const summaryItems = computed(() => {
  const owner = CASE_OWNER_OPTIONS.find((o) => o.value === model.draft.owner);
  const notSet = t("cases.create.summary.notSet");
  return [
    {
      label: t("cases.create.summary.template"),
      value: `${model.currentTemplate.value?.label ?? ""} · ${model.draft.applicationType}`,
    },
    {
      label: t("cases.create.summary.title"),
      value: model.effectiveTitle.value || notSet,
    },
    {
      label: t("cases.create.summary.primaryApplicant"),
      value: model.primaryCustomer.value?.name ?? notSet,
    },
    {
      label: t("cases.create.summary.relatedParties"),
      value: t("cases.create.summary.personCount", {
        count: model.additionalParties.value.length,
      }),
    },
    {
      label: t("cases.create.summary.owner"),
      value: owner?.label ?? model.draft.owner,
    },
    {
      label: t("cases.create.summary.dueDate"),
      value: model.draft.dueDate || notSet,
    },
    {
      label: t("cases.create.summary.amount"),
      value: model.draft.amount || notSet,
    },
  ];
});
</script>

<template>
  <div class="cc">
    <PageHeader
      :title="t('cases.create.title')"
      :subtitle="t('cases.create.subtitle')"
      :breadcrumbs="[
        { label: t('shell.nav.items.dashboard'), href: '#/' },
        { label: t('shell.nav.groups.business') },
        { label: t('shell.nav.items.cases'), href: '#/cases' },
        { label: t('cases.create.breadcrumbNew') },
      ]"
    />

    <div v-if="model.hasSourceContext.value" class="cc__source">
      <div class="cc__source-kicker">{{ t("cases.create.source.kicker") }}</div>
      <div class="cc__source-row">
        <span v-if="sourceContext.customerId">
          {{
            t("cases.create.source.fromCustomer", {
              id: sourceContext.customerId,
            })
          }}
        </span>
        <span v-else-if="sourceContext.sourceLeadId">
          {{
            t("cases.create.source.fromLead", {
              id: sourceContext.sourceLeadId,
            })
          }}
        </span>
        <Chip v-if="sourceContext.familyBulkMode" tone="primary" size="sm">
          {{ t("cases.create.source.familyBulk") }}
        </Chip>
      </div>
    </div>

    <div
      class="cc__stepper"
      role="list"
      :aria-label="t('cases.create.stepperLabel')"
    >
      <button
        v-for="s in CREATE_CASE_STEPS"
        :key="s.step"
        type="button"
        :class="[
          'cc__step',
          {
            'is-active': model.draft.currentStep === s.step,
            'is-done': model.draft.currentStep > s.step,
          },
        ]"
        role="listitem"
        @click="model.goToStep(s.step)"
      >
        <span class="cc__step-num">{{ s.step }}</span>
        <span class="cc__step-text">{{ s.label }}</span>
      </button>
    </div>

    <Card v-show="model.draft.currentStep === 1" padding="lg">
      <CaseCreateStep1 :model="model" :templates="templates" />
    </Card>

    <Card v-show="model.draft.currentStep === 2" padding="lg">
      <CaseCreateStep2
        :model="model"
        :customer-options="customerSelectOptions"
        @open-picker="openPicker"
      />
    </Card>

    <Card v-show="model.draft.currentStep === 3" padding="lg">
      <CaseCreateStep3 :model="model" />
    </Card>

    <Card v-show="model.draft.currentStep === 4" padding="lg">
      <CaseCreateStep4
        :model="model"
        :submitted="submitted"
        :summary-items="summaryItems"
        :created-case-id="createdCaseId"
        @view-detail="router.push(`/cases/${createdCaseId}`)"
        @view-list="router.push('/cases')"
      />
    </Card>

    <div v-if="!submitted" class="cc__footer">
      <div class="cc__footer-inner">
        <span class="cc__footer-hint">
          {{
            t("cases.create.navigation.stepHint", {
              current: model.draft.currentStep,
              total: 4,
            })
          }}
        </span>
        <div class="cc__footer-actions">
          <Button v-if="!model.isFirstStep.value" @click="model.goPrev()">
            {{ t("cases.create.navigation.prev") }}
          </Button>
          <Button
            v-if="!model.isLastStep.value"
            variant="filled"
            tone="primary"
            :disabled="!model.canGoNext.value"
            @click="model.goNext()"
          >
            {{ nextLabel }}
          </Button>
          <Button
            v-if="model.isLastStep.value"
            variant="filled"
            tone="primary"
            :disabled="!model.canSubmit.value"
            :loading="submitting"
            @click="handleSubmit"
          >
            {{ t("cases.create.navigation.submit") }}
          </Button>
        </div>
      </div>
    </div>

    <CaseCreateModal
      :open="picker.isOpen.value"
      :form="picker.form"
      :form-errors="picker.formErrors.value"
      :show-duplicate-confirmation="picker.showDuplicateConfirmation.value"
      :duplicate-hits="picker.duplicateHits.value"
      :confirm-reason="picker.confirmReason.value"
      :can-save="picker.canSave.value"
      @close="picker.close()"
      @update:field="picker.setField"
      @update:confirm-reason="picker.setConfirmReason"
      @attempt-save="picker.attemptSave()"
    />

    <CaseCreateToast
      :visible="toastVisible"
      :title="toastTitle"
      :description="toastDesc"
    />
  </div>
</template>

<style scoped>
.cc {
  display: grid;
  gap: 24px;
  padding-bottom: 80px;
}

.cc__source {
  padding: 16px 20px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
}

.cc__source-kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}

.cc__source-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}

.cc__stepper {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.cc__step {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
  cursor: pointer;
  font: inherit;
  transition: all var(--transition-normal);
}

.cc__step.is-active {
  border-color: var(--color-primary-6);
  background: rgba(3, 105, 161, 0.04);
}

.cc__step.is-done {
  border-color: rgba(22, 163, 74, 0.3);
  background: rgba(22, 163, 74, 0.04);
}

.cc__step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  border: 2px solid var(--color-border-2);
  color: var(--color-text-3);
  flex-shrink: 0;
}

.cc__step.is-active .cc__step-num {
  background: var(--color-primary-6);
  color: #fff;
  border-color: var(--color-primary-6);
}

.cc__step.is-done .cc__step-num {
  background: var(--color-success);
  color: #fff;
  border-color: var(--color-success);
}

.cc__step-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}

.cc__step.is-active .cc__step-text {
  color: var(--color-primary-6);
}

.cc__footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  margin: 0 -32px;
  padding: 0 32px;
}

.cc__footer-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 24px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border-1);
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.cc__footer-hint {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.cc__footer-actions {
  display: flex;
  gap: 10px;
}
</style>
