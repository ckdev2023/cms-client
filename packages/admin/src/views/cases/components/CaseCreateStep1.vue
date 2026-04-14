<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Chip from "../../../shared/ui/Chip.vue";
import type { CreateCaseModel } from "../model/useCreateCaseModel";
import type { ApplicationType, CaseTemplateDef } from "../types";

/** 步骤一：选择案件模板、申请类型、案件标题。 */
const { t } = useI18n();

defineProps<{
  model: CreateCaseModel;
  templates: readonly CaseTemplateDef[];
}>();
</script>

<template>
  <div>
    <h2 class="cc__title">{{ t("cases.create.step1.title") }}</h2>
    <div class="tpl-grid">
      <button
        v-for="tpl in templates"
        :key="tpl.id"
        type="button"
        :class="['tpl', { 'is-active': model.draft.templateId === tpl.id }]"
        @click="model.selectTemplate(tpl.id)"
      >
        <div class="tpl__head">
          <span class="tpl__name">{{ tpl.label }}</span>
          <Chip size="sm" tone="primary">{{ tpl.badge }}</Chip>
        </div>
        <span class="tpl__sub">{{ tpl.subtitle }}</span>
      </button>
    </div>
    <div class="cc__fields">
      <div class="cc__field">
        <label class="cc__label">{{
          t("cases.create.step1.applicationType")
        }}</label>
        <select
          class="cc__input cc__input--select"
          :value="model.draft.applicationType"
          @change="
            model.setApplicationType(
              ($event.target as HTMLSelectElement).value as ApplicationType,
            )
          "
        >
          <option
            v-for="at in model.applicationTypes.value"
            :key="at"
            :value="at"
          >
            {{ at }}
          </option>
        </select>
      </div>
      <div class="cc__field">
        <label class="cc__label">{{ t("cases.create.step1.caseTitle") }}</label>
        <input
          type="text"
          class="cc__input"
          :value="
            model.draft.caseTitleManual
              ? model.draft.caseTitle
              : model.derivedTitle.value
          "
          :placeholder="
            model.derivedTitle.value || t('cases.create.step1.titlePlaceholder')
          "
          @input="model.setCaseTitle(($event.target as HTMLInputElement).value)"
        />
        <span class="cc__hint">
          {{
            model.draft.caseTitleManual
              ? t("cases.create.step1.titleHintManual")
              : t("cases.create.step1.titleHintAuto")
          }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tpl-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.tpl {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px;
  border: 2px solid var(--color-border-1);
  border-radius: var(--radius-lg);
  background: var(--color-bg-1);
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: all var(--transition-normal);
}

.tpl:hover {
  border-color: var(--color-border-2);
}

.tpl.is-active {
  border-color: var(--color-primary-6);
  background: rgba(3, 105, 161, 0.03);
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.08);
}

.tpl__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tpl__name {
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.tpl__sub {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
}
</style>
