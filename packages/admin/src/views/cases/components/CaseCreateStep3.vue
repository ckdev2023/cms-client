<script setup lang="ts">
import { onMounted, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseGroupOption, CaseOwnerOption } from "../types";
import type { CreateCaseModel } from "../model/useCreateCaseModel";

/** 步骤三：分派 Group、负责人、截止日期、收费金额与初始动作选项。 */
const { t } = useI18n();

const props = defineProps<{
  model: CreateCaseModel;
  ownerOptions?: readonly CaseOwnerOption[];
  groupOptions?: readonly CaseGroupOption[];
}>();

/**
 * 同步 DatePicker 选中的截止日期到建案表单。
 *
 * @param value 当前选择的日期字符串；清空时可能为空
 */
function handleDueDateChange(value: string | number | Date | undefined): void {
  props.model.setDueDate(typeof value === "string" ? value : "");
}

onMounted(async () => {
  await nextTick();
  const label = document.getElementById("case-create-dueDate-label");
  const input = label?.parentElement?.querySelector(
    "input.arco-picker-start-time",
  ) as HTMLElement | null;
  if (input) {
    input.setAttribute("aria-label", t("cases.create.step3.dueDateLabel"));
  }
});
</script>

<template>
  <div>
    <h2 class="cc__title">{{ t("cases.create.step3.title") }}</h2>
    <div v-if="props.model.groupInheritanceLabel.value" class="info-box">
      {{ t("cases.create.step3.groupInherit") }}
      <strong>{{ props.model.groupInheritanceLabel.value }}</strong>
    </div>
    <div class="cc__fields cc__fields--3">
      <div class="cc__field">
        <label class="cc__label" for="case-create-group">{{
          t("cases.create.step3.groupLabel")
        }}</label>
        <select
          id="case-create-group"
          name="group"
          class="cc__input cc__input--select"
          :value="props.model.draft.group"
          @change="
            props.model.setGroup(($event.target as HTMLSelectElement).value)
          "
        >
          <option
            v-for="g in props.groupOptions ?? []"
            :key="g.value"
            :value="g.value"
          >
            {{ g.label }}
          </option>
        </select>
      </div>
      <div class="cc__field">
        <label class="cc__label" for="case-create-owner">{{
          t("cases.create.step3.ownerLabel")
        }}</label>
        <select
          id="case-create-owner"
          name="owner"
          class="cc__input cc__input--select"
          :value="props.model.draft.owner"
          @change="
            props.model.setOwner(($event.target as HTMLSelectElement).value)
          "
        >
          <option
            v-for="o in props.ownerOptions ?? []"
            :key="o.value"
            :value="o.value"
          >
            {{ o.label }}
          </option>
        </select>
      </div>
      <div class="cc__field">
        <label id="case-create-dueDate-label" class="cc__label">{{
          t("cases.create.step3.dueDateLabel")
        }}</label>
        <a-date-picker
          class="cc__date-picker"
          :model-value="props.model.draft.dueDate || undefined"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          aria-labelledby="case-create-dueDate-label"
          @change="handleDueDateChange"
        />
      </div>
    </div>
    <div class="cc__fields" style="margin-top: 16px">
      <div class="cc__field">
        <label class="cc__label" for="case-create-amount">{{
          t("cases.create.step3.amountLabel")
        }}</label>
        <input
          id="case-create-amount"
          name="amount"
          type="text"
          class="cc__input"
          :value="props.model.draft.amount"
          :placeholder="t('cases.create.step3.amountPlaceholder')"
          @input="
            props.model.setAmount(($event.target as HTMLInputElement).value)
          "
        />
      </div>
    </div>
    <div
      v-if="props.model.needsGroupOverrideReason.value"
      class="cc__field"
      style="margin-top: 16px"
    >
      <label class="cc__label" for="case-create-groupOverrideReason">
        {{ t("cases.create.step3.crossGroupReason") }}
        <span class="req-mark">*</span>
      </label>
      <input
        id="case-create-groupOverrideReason"
        name="groupOverrideReason"
        type="text"
        class="cc__input"
        :value="props.model.draft.groupOverrideReason"
        :placeholder="t('cases.create.step3.crossGroupPlaceholder')"
        @input="
          props.model.setGroupOverrideReason(
            ($event.target as HTMLInputElement).value,
          )
        "
      />
    </div>
    <div class="checks">
      <label class="check-item ui-checkbox-hit">
        <input
          type="checkbox"
          name="autoChecklist"
          :checked="props.model.draft.autoChecklist"
          @change="
            props.model.setAutoChecklist(
              ($event.target as HTMLInputElement).checked,
            )
          "
        />
        {{ t("cases.create.step3.autoChecklist") }}
      </label>
      <label class="check-item ui-checkbox-hit">
        <input
          type="checkbox"
          name="autoTasks"
          :checked="props.model.draft.autoTasks"
          @change="
            props.model.setAutoTasks(
              ($event.target as HTMLInputElement).checked,
            )
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

.cc__date-picker {
  width: 100%;
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
