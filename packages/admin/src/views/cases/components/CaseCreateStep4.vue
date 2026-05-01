<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import CaseCreatePreSignGate from "./CaseCreatePreSignGate.vue";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { SubmitErrorInfo } from "../model/useCreateCaseModelSubmit";

/** 步骤四：创建复核摘要与成功状态展示。 */
const { t } = useI18n();

defineProps<{
  model: CreateCaseModel;
  submitted: boolean;
  submitError: SubmitErrorInfo | null;
  ownerErrorChip: boolean;
  summaryItems: { label: string; value: string }[];
}>();

const emit = defineEmits<{
  viewDetail: [];
  viewList: [];
  goToCustomer: [];
}>();
</script>

<template>
  <div>
    <!-- Pre-sign gate feedback (p1-fe-003-02) -->
    <CaseCreatePreSignGate
      :gate="model.preSignGate.value"
      :customer-id="model.primaryCustomer.value?.id ?? null"
      @go-to-customer="emit('goToCustomer')"
    />

    <div v-if="submitted" class="success">
      <div class="success__title">
        {{ t("cases.create.step4.successTitle") }}
      </div>
      <div class="success__desc">
        {{
          t("cases.create.step4.successDesc", {
            title: model.effectiveTitle.value,
          })
        }}
      </div>
      <div class="success__actions">
        <Button size="sm" @click="emit('viewDetail')">{{
          t("cases.create.step4.viewDetail")
        }}</Button>
        <Button size="sm" @click="emit('viewList')">{{
          t("cases.create.step4.viewList")
        }}</Button>
      </div>
    </div>
    <div v-if="submitError" class="submit-error">
      <div class="submit-error__title">
        {{ t("cases.create.step4.errorTitle") }}
      </div>
      <div class="submit-error__desc">
        {{ submitError.detail || submitError.message }}
      </div>
      <Chip
        v-if="ownerErrorChip"
        tone="danger"
        size="sm"
        class="submit-error__chip"
        data-testid="owner-error-chip"
      >
        {{ t("cases.create.errorChip.ownerInvalid") }}
      </Chip>
    </div>
    <h2 class="cc__title">{{ t("cases.create.step4.reviewTitle") }}</h2>
    <div class="summary">
      <div v-for="item in summaryItems" :key="item.label" class="sum-box">
        <div class="sum-label">{{ item.label }}</div>
        <div class="sum-value">{{ item.value }}</div>
      </div>
    </div>
    <div class="sum-box" style="margin-top: 12px">
      <div class="sum-label">{{ t("cases.create.step4.postAction") }}</div>
      <div class="sum-value">
        <template v-if="model.draft.autoChecklist">
          {{ t("cases.create.step4.autoChecklistMark") }}
        </template>
        <template v-if="model.draft.autoTasks">
          {{ t("cases.create.step4.autoTasksMark") }}
        </template>
        <template v-if="!model.draft.autoChecklist && !model.draft.autoTasks">
          {{ t("cases.create.step4.noAutoAction") }}
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.success {
  padding: 20px;
  border: 1px solid rgba(22, 163, 74, 0.3);
  border-radius: var(--radius-lg);
  background: rgba(240, 253, 244, 0.8);
  margin-bottom: 20px;
}

.success__title {
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: #166534;
}

.success__desc {
  font-size: var(--font-size-sm);
  color: #166534;
  margin-top: 4px;
}

.success__actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.submit-error {
  padding: 20px;
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: var(--radius-lg);
  background: rgba(254, 242, 242, 0.8);
  margin-bottom: 20px;
}

.submit-error__title {
  font-size: 17px;
  font-weight: var(--font-weight-semibold);
  color: #991b1b;
}

.submit-error__desc {
  font-size: var(--font-size-sm);
  color: #991b1b;
  margin-top: 4px;
}

.submit-error__chip {
  margin-top: 8px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.sum-box {
  padding: 14px 16px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
}

.sum-label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 4px;
}

.sum-value {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}
</style>
