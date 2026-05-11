<script setup lang="ts">
import { useI18n } from "vue-i18n";

import type { CreateCaseModel } from "../model/useCreateCaseModel";

/**
 * 建案向导第二步：依据服务端 checklist-preview 展示资料模板预检横幅。
 */
const { t } = useI18n();

defineProps<{
  model: CreateCaseModel;
}>();
</script>

<template>
  <div
    v-if="
      model.checklistPreview &&
      model.checklistPreview.previewState.value === 'empty'
    "
    class="case-create-checklist-preflight case-create-checklist-preflight--warn"
    role="status"
    data-testid="case-create-step2-checklist-preflight-empty"
  >
    {{ t("cases.create.step2.documentPreviewServerEmpty") }}
  </div>
  <div
    v-else-if="
      model.checklistPreview &&
      model.checklistPreview.previewState.value === 'error'
    "
    class="case-create-checklist-preflight case-create-checklist-preflight--danger"
    role="alert"
    data-testid="case-create-step2-checklist-preflight-error"
  >
    {{ t("cases.create.checklistPreflight.errorWarning") }}
  </div>
</template>
