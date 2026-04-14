<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import { CASE_GROUP_OPTIONS, CASE_OWNER_OPTIONS } from "../constants";

/** 步骤三：分派 Group、负责人、截止日期、收费金额与初始动作选项。 */
const { t } = useI18n();

defineProps<{
  model: CreateCaseModel;
}>();
</script>

<template>
  <div>
    <h2 class="cc__title">{{ t("cases.create.step3.title") }}</h2>
    <div v-if="model.groupInheritanceLabel.value" class="info-box">
      {{ t("cases.create.step3.groupInherit") }}
      <strong>{{ model.groupInheritanceLabel.value }}</strong>
    </div>
    <div class="cc__fields cc__fields--3">
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step3.groupLabel")
        }}</label>
        <select
          class="cc__input cc__input--select"
          :value="model.draft.group"
          @change="model.setGroup(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="g in CASE_GROUP_OPTIONS"
            :key="g.value"
            :value="g.value"
          >
            {{ g.label }}
          </option>
        </select>
      </div>
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step3.ownerLabel")
        }}</label>
        <select
          class="cc__input cc__input--select"
          :value="model.draft.owner"
          @change="model.setOwner(($event.target as HTMLSelectElement).value)"
        >
          <option
            v-for="o in CASE_OWNER_OPTIONS"
            :key="o.value"
            :value="o.value"
          >
            {{ o.label }}
          </option>
        </select>
      </div>
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step3.dueDateLabel")
        }}</label>
        <input
          type="date"
          class="cc__input"
          :value="model.draft.dueDate"
          @input="model.setDueDate(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div class="cc__fields" style="margin-top: 16px">
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step3.amountLabel")
        }}</label>
        <input
          type="text"
          class="cc__input"
          :value="model.draft.amount"
          :placeholder="t('cases.create.step3.amountPlaceholder')"
          @input="model.setAmount(($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>
    <div
      v-if="model.needsGroupOverrideReason.value"
      class="cc__field"
      style="margin-top: 16px"
    >
      <label class="cc__label">
        {{ t("cases.create.step3.crossGroupReason") }}
        <span class="req-mark">*</span>
      </label>
      <input
        type="text"
        class="cc__input"
        :value="model.draft.groupOverrideReason"
        :placeholder="t('cases.create.step3.crossGroupPlaceholder')"
        @input="
          model.setGroupOverrideReason(
            ($event.target as HTMLInputElement).value,
          )
        "
      />
    </div>
    <div class="checks">
      <label class="check-item">
        <input
          type="checkbox"
          :checked="model.draft.autoChecklist"
          @change="
            model.setAutoChecklist(($event.target as HTMLInputElement).checked)
          "
        />
        {{ t("cases.create.step3.autoChecklist") }}
      </label>
      <label class="check-item">
        <input
          type="checkbox"
          :checked="model.draft.autoTasks"
          @change="
            model.setAutoTasks(($event.target as HTMLInputElement).checked)
          "
        />
        {{ t("cases.create.step3.autoTasks") }}
      </label>
    </div>
  </div>
</template>

<style scoped>
.info-box {
  padding: 12px 16px;
  border: 1px solid rgba(3, 105, 161, 0.15);
  border-radius: var(--radius-lg);
  background: rgba(3, 105, 161, 0.03);
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  margin-bottom: 16px;
}

.req-mark {
  color: #dc2626;
}

.checks {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.check-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  cursor: pointer;
}

.check-item input {
  accent-color: var(--color-primary-6);
}
</style>
