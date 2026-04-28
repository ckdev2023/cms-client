<script setup lang="ts">
import { computed, ref, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import PageHeader from "../../shared/ui/PageHeader.vue";
import Button from "../../shared/ui/Button.vue";
import Chip from "../../shared/ui/Chip.vue";
import Card from "../../shared/ui/Card.vue";
import { getActiveGroupOptions } from "../../shared/model/useGroupOptions";
import { getOwnerOptions } from "../../shared/model/useOwnerOptions";
import CaseCreateStep1 from "./components/CaseCreateStep1.vue";
import CaseCreateStep2 from "./components/CaseCreateStep2.vue";
import CaseCreateStep3 from "./components/CaseCreateStep3.vue";
import CaseCreateStep4 from "./components/CaseCreateStep4.vue";
import CaseCreateModal from "./components/CaseCreateModal.vue";
import CaseCreateToast from "./components/CaseCreateToast.vue";
import { useCreateCaseModel } from "./model/useCreateCaseModel";
import { useCasePartyPicker } from "./model/useCasePartyPicker";
import type { PartyPickerMode } from "./model/useCasePartyPicker";
import { useCustomerDropdownData } from "./model/useCustomerDropdownData";
import {
  parseCaseCreateQuery,
  buildCaseDetailRoute,
  buildCaseListRoute,
  buildCaseListHref,
  buildCustomerDetailHref,
} from "./query";
import { createMockCaseRepository } from "./repository";
import { CREATE_CASE_STEPS } from "./constants";
import "./case-create-shared.css";

/** 案件新建页：四步表单向导、来源上下文、party picker modal、toast。 */
const { t, locale } = useI18n();
const route = useRoute();
const router = useRouter();
const fixtureRepo = createMockCaseRepository();
const viewer = fixtureRepo.getViewer();
const sourceContext = parseCaseCreateQuery(route.query, route.hash);
const templates = fixtureRepo.getCreateTemplates();
const ownerOptions = computed(() => getOwnerOptions(locale.value));
const groupOptions = computed(() => getActiveGroupOptions(locale.value));

const customerDropdown = useCustomerDropdownData();
onMounted(() => {
  customerDropdown.fetch();
});

const model = useCreateCaseModel({
  templates: () => templates,
  customers: () => customerDropdown.customers.value,
  familyScenario: () => fixtureRepo.getFamilyScenario(),
  ownerOptions: () => ownerOptions.value,
  groupOptions: () => groupOptions.value,
  sourceContext,
  defaultGroup: viewer.groupId,
  defaultOwner: viewer.ownerId,
  locale: () => locale.value,
});

const picker = useCasePartyPicker({
  existingCustomers: () => customerDropdown.customers.value,
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

const submitted = computed(() => model.submitResult.value !== null);
const createdCaseId = computed(() => model.submitResult.value?.id ?? "");

async function handleSubmit() {
  const result = await model.submit();
  if (result) {
    showToast(
      t("cases.create.toast.caseCreated"),
      t("cases.create.toast.caseCreatedDesc", {
        title: model.effectiveTitle.value,
      }),
    );
  } else if (model.submitError.value) {
    showToast(t("cases.create.toast.createFailed"), model.submitError.value);
  }
}

/**
 * 跳转到刚创建完成的案件详情页。
 * @returns 无。
 */
function navigateToCreatedDetail() {
  if (!createdCaseId.value) return;
  router.push(buildCaseDetailRoute(createdCaseId.value));
}

/**
 * 返回案件列表页，并在存在客户来源时保留客户筛选上下文。
 * @returns 无。
 */
function navigateToList() {
  router.push(
    buildCaseListRoute(
      sourceContext.customerId
        ? { customerId: sourceContext.customerId }
        : undefined,
    ),
  );
}

/**
 * 跳转到当前主客户的详情页。
 * @returns 无。
 */
function navigateToCustomer() {
  const cid = model.primaryCustomer.value?.id;
  if (!cid) return;
  window.location.href = buildCustomerDetailHref(cid);
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
  const base = [...customerDropdown.customers.value];
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
  const owner = ownerOptions.value.find((o) => o.value === model.draft.owner);
  const notSet = t("cases.create.summary.notSet");
  return [
    {
      label: t("cases.create.summary.template"),
      value: `${model.templateLabel.value} · ${t("cases.create.applicationTypes." + model.draft.applicationType)}`,
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
        { label: t('shell.nav.items.cases'), href: buildCaseListHref() },
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
        <Chip v-if="sourceContext.templateCode" tone="primary" size="sm">
          {{ t("cases.create.source.templateLocked") }}
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
        <span class="cc__step-text">{{ t(s.i18nKey) }}</span>
      </button>
    </div>

    <Card v-show="model.draft.currentStep === 1" padding="lg">
      <CaseCreateStep1 :model="model" :templates="templates" />
    </Card>

    <Card v-show="model.draft.currentStep === 2" padding="lg">
      <CaseCreateStep2
        :model="model"
        :customer-options="customerSelectOptions"
        :customers-loading="customerDropdown.loading.value"
        :customers-error="customerDropdown.error.value"
        :customers-loaded="customerDropdown.loaded.value"
        @open-picker="openPicker"
        @retry-customers="customerDropdown.fetch()"
      />
    </Card>

    <Card v-show="model.draft.currentStep === 3" padding="lg">
      <CaseCreateStep3
        :model="model"
        :owner-options="ownerOptions"
        :group-options="groupOptions"
      />
    </Card>

    <Card v-show="model.draft.currentStep === 4" padding="lg">
      <CaseCreateStep4
        :model="model"
        :submitted="submitted"
        :submit-error="model.submitError.value"
        :summary-items="summaryItems"
        @view-detail="navigateToCreatedDetail"
        @view-list="navigateToList"
        @go-to-customer="navigateToCustomer"
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
          <span
            v-if="
              model.preSignGate.value.active && !model.preSignGate.value.passed
            "
            class="cc__footer-gate-warn"
            data-testid="footer-gate-warn"
          >
            — {{ t("cases.create.preSignGate.blockedTitle") }}
          </span>
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
            :loading="model.submitting.value"
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
      :group-options="groupOptions"
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
