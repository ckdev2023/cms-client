<script setup lang="ts">
/* eslint-disable max-lines */
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../shared/ui/Button.vue";
import BlueprintWizardEditor from "./BlueprintWizardEditor.vue";
import type {
  CaseTemplateCreateParams,
  CaseTemplateDetail,
  CaseTemplateItem,
} from "./model/CaseTemplatesRepository";
import { getCaseTypeI18nKey } from "../../shared/model/caseTypeI18n";
import {
  parseBlueprintToItems,
  itemsToBlueprint,
  itemsToBlueprintJson,
  validateBlueprintItems,
  tryParseJsonToItems,
  type BlueprintWizardItem,
} from "./model/blueprintWizardModel";

/** 案件資料蓝图新建对话框 — 支持空白创建或从现有模板复制。 */
const props = defineProps<{
  saving: boolean;
  errorCode: string | null;
  caseTypeOptions: string[];
  sourceTemplates: CaseTemplateItem[];
  loadingSource: boolean;
  sourceDetail: CaseTemplateDetail | null;
}>();
const emit = defineEmits<{
  submit: [params: CaseTemplateCreateParams];
  cancel: [];
  "request-source": [id: string];
}>();
const { t } = useI18n();
type CreateMode = "blank" | "copy";
const createMode = ref<CreateMode>("blank");
const selectedSourceId = ref("");
const blueprintItems = ref<BlueprintWizardItem[]>([]);
const blueprintJsonDraft = ref("");
const blueprintParseError = ref<string | null>(null);
const blueprintEditMode = ref<"wizard" | "json">("wizard");

/** 将当前向导条目序列化为 JSON 草稿并清除解析错误。 */
function syncJsonFromItems() {
  blueprintJsonDraft.value = itemsToBlueprintJson(blueprintItems.value);
  blueprintParseError.value = null;
}

/**
 * 从 JSON 草稿解析为向导条目；失败时写入 i18n 错误提示。
 * @returns 是否解析成功
 */
function syncItemsFromJson(): boolean {
  const result = tryParseJsonToItems(blueprintJsonDraft.value);
  if ("error" in result) {
    blueprintParseError.value = t(
      "caseTemplates.createDialog.blueprintInvalidJson",
    );
    return false;
  }
  blueprintItems.value = result.items;
  blueprintParseError.value = null;
  return true;
}
watch(
  () => props.sourceDetail,
  (detail) => {
    if (!detail || createMode.value !== "copy") return;
    form.value.templateName = "";
    form.value.caseType = detail.caseType;
    form.value.applicationType = detail.applicationType ?? "";
    form.value.reviewRequiredFlag = detail.reviewRequiredFlag;
    form.value.billingGateMode = detail.billingGateMode;
    form.value.useCustomCaseType = false;
    form.value.customCaseType = "";
    blueprintItems.value = parseBlueprintToItems(detail.requirementBlueprint);
    syncJsonFromItems();
  },
);
watch(selectedSourceId, (id) => {
  if (id) emit("request-source", id);
});
const form = ref({
  templateName: "",
  caseType: "",
  customCaseType: "",
  useCustomCaseType: false,
  applicationType: "",
  reviewRequiredFlag: false,
  billingGateMode: "warn",
});
const effectiveCaseType = computed(() =>
  form.value.useCustomCaseType
    ? form.value.customCaseType.trim()
    : form.value.caseType,
);
const caseTypeLocked = computed(
  () => createMode.value === "copy" && props.sourceDetail != null,
);
const blueprintValidationErrors = computed(() =>
  blueprintItems.value.length > 0
    ? validateBlueprintItems(blueprintItems.value)
    : [],
);
const formValid = computed(
  () =>
    form.value.templateName.trim().length > 0 &&
    effectiveCaseType.value.length > 0 &&
    blueprintValidationErrors.value.length === 0 &&
    !blueprintParseError.value,
);

/**
 * 将案件类型代码映射为界面标签。
 * @param code 案件类型代码（可为 wizard id 或 canonical）
 * @returns 翻译后的标签或原样代码
 */
function caseTypeLabel(code: string): string {
  const key = getCaseTypeI18nKey(code);
  const translated = t(key);
  return translated !== key ? translated : code;
}

/**
 * 读取用户选择的蓝图 JSON 文件并尝试同步到条目。
 * @param event 文件 input 的 change 事件
 */
function handleBlueprintFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      blueprintJsonDraft.value = reader.result;
      syncItemsFromJson();
    }
  };
  reader.readAsText(file);
}

/** 进入「直接编辑 JSON」模式前，用当前条目刷新草稿文本。 */
function switchToJsonMode() {
  syncJsonFromItems();
  blueprintEditMode.value = "json";
}

/** 回到向导模式；若草稿非空则先尝试解析 JSON。 */
function switchToWizardMode() {
  if (blueprintJsonDraft.value.trim()) syncItemsFromJson();
  blueprintEditMode.value = "wizard";
}

/** 校验表单与蓝图后向父组件提交创建参数。 */
function handleSubmit() {
  if (blueprintEditMode.value === "json" && blueprintJsonDraft.value.trim()) {
    if (!syncItemsFromJson()) return;
  }
  emit("submit", {
    templateName: form.value.templateName.trim(),
    caseType: effectiveCaseType.value,
    applicationType: form.value.applicationType.trim() || undefined,
    requirementBlueprint: itemsToBlueprint(blueprintItems.value) ?? undefined,
    reviewRequiredFlag: form.value.reviewRequiredFlag,
    billingGateMode: form.value.billingGateMode,
  });
}

/** 将对话框恢复为「空白创建」初始状态。 */
function resetToBlank() {
  form.value.templateName = "";
  form.value.caseType = "";
  form.value.customCaseType = "";
  form.value.useCustomCaseType = false;
  form.value.applicationType = "";
  form.value.reviewRequiredFlag = false;
  form.value.billingGateMode = "warn";
  blueprintItems.value = [];
  blueprintJsonDraft.value = "";
  blueprintParseError.value = null;
  selectedSourceId.value = "";
  blueprintEditMode.value = "wizard";
}
watch(createMode, (mode) => {
  if (mode === "blank") resetToBlank();
});
defineExpose({ form, blueprintItems });
</script>

<template>
  <div
    class="ct-dialog-backdrop"
    data-testid="create-dialog-backdrop"
    @click.self="emit('cancel')"
  >
    <div
      class="ct-dialog"
      role="dialog"
      aria-modal="true"
      data-testid="create-dialog"
    >
      <div class="ct-dialog__header">
        <h2 class="ct-dialog__title">
          {{ t("caseTemplates.createDialog.title") }}
        </h2>
        <p class="ct-dialog__desc">
          {{ t("caseTemplates.createDialog.description") }}
        </p>
      </div>
      <form class="ct-dialog__body" @submit.prevent="handleSubmit">
        <div
          class="ct-dialog__mode-selector"
          data-testid="create-mode-selector"
        >
          <label class="ct-dialog__mode-option">
            <input
              v-model="createMode"
              type="radio"
              value="blank"
              name="create-mode"
              data-testid="create-mode-blank"
            />
            {{ t("caseTemplates.createDialog.modeBlank") }}
          </label>
          <label class="ct-dialog__mode-option">
            <input
              v-model="createMode"
              type="radio"
              value="copy"
              name="create-mode"
              data-testid="create-mode-copy"
            />
            {{ t("caseTemplates.createDialog.modeCopy") }}
          </label>
        </div>

        <div v-if="createMode === 'copy'" class="ct-dialog__field">
          <label for="ct-source-template">{{
            t("caseTemplates.createDialog.sourceTemplateLabel")
          }}</label>
          <select
            id="ct-source-template"
            v-model="selectedSourceId"
            class="ct-dialog__input"
            data-testid="create-source-template"
          >
            <option value="" disabled>
              {{ t("caseTemplates.createDialog.sourceTemplatePlaceholder") }}
            </option>
            <option
              v-for="tmpl in props.sourceTemplates"
              :key="tmpl.id"
              :value="tmpl.id"
            >
              {{ tmpl.templateName }} ({{ caseTypeLabel(tmpl.caseType) }})
            </option>
          </select>
          <p v-if="props.loadingSource" class="ct-dialog__hint">
            {{ t("caseTemplates.createDialog.loadingSource") }}
          </p>
        </div>
        <div class="ct-dialog__field">
          <label for="ct-name">{{
            t("caseTemplates.createDialog.templateNameLabel")
          }}</label>
          <input
            id="ct-name"
            v-model="form.templateName"
            type="text"
            class="ct-dialog__input"
            :placeholder="
              t('caseTemplates.createDialog.templateNamePlaceholder')
            "
            data-testid="create-template-name"
            required
          />
        </div>
        <div class="ct-dialog__field">
          <label for="ct-case-type">{{
            t("caseTemplates.createDialog.caseTypeLabel")
          }}</label>
          <select
            v-if="!form.useCustomCaseType"
            id="ct-case-type"
            v-model="form.caseType"
            class="ct-dialog__input"
            :disabled="caseTypeLocked"
            data-testid="create-case-type"
            required
          >
            <option value="" disabled>
              {{ t("caseTemplates.createDialog.caseTypeSelectPlaceholder") }}
            </option>
            <option v-for="ct in props.caseTypeOptions" :key="ct" :value="ct">
              {{ caseTypeLabel(ct) }}
            </option>
          </select>
          <input
            v-else
            id="ct-case-type-custom"
            v-model="form.customCaseType"
            type="text"
            class="ct-dialog__input"
            :placeholder="
              t('caseTemplates.createDialog.caseTypeCustomPlaceholder')
            "
            data-testid="create-case-type-custom"
            required
          />
          <label v-if="!caseTypeLocked" class="ct-dialog__toggle-label">
            <input
              id="ct-case-type-custom-toggle"
              v-model="form.useCustomCaseType"
              type="checkbox"
              name="caseTypeUseCustomCode"
              data-testid="create-case-type-custom-toggle"
            />
            {{ t("caseTemplates.createDialog.caseTypeCustomToggle") }}
          </label>
          <p v-if="caseTypeLocked" class="ct-dialog__hint">
            {{ t("caseTemplates.createDialog.caseTypeLockedHint") }}
          </p>
        </div>
        <div class="ct-dialog__field">
          <label for="ct-app-type">{{
            t("caseTemplates.createDialog.applicationTypeLabel")
          }}</label>
          <input
            id="ct-app-type"
            v-model="form.applicationType"
            type="text"
            class="ct-dialog__input"
            :placeholder="
              t('caseTemplates.createDialog.applicationTypePlaceholder')
            "
            data-testid="create-application-type"
          />
        </div>
        <div class="ct-dialog__row">
          <div class="ct-dialog__field ct-dialog__field--half">
            <label for="ct-review">{{
              t("caseTemplates.createDialog.reviewRequiredLabel")
            }}</label>
            <select
              id="ct-review"
              v-model="form.reviewRequiredFlag"
              class="ct-dialog__input"
              data-testid="create-review-required"
            >
              <option :value="false">
                {{ t("caseTemplates.reviewFlag.no") }}
              </option>
              <option :value="true">
                {{ t("caseTemplates.reviewFlag.yes") }}
              </option>
            </select>
          </div>
          <div class="ct-dialog__field ct-dialog__field--half">
            <label for="ct-billing-gate">{{
              t("caseTemplates.createDialog.billingGateModeLabel")
            }}</label>
            <select
              id="ct-billing-gate"
              v-model="form.billingGateMode"
              class="ct-dialog__input"
              data-testid="create-billing-gate"
            >
              <option value="warn">
                {{ t("caseTemplates.createDialog.billingGateModes.warn") }}
              </option>
              <option value="block">
                {{ t("caseTemplates.createDialog.billingGateModes.block") }}
              </option>
              <option value="none">
                {{ t("caseTemplates.createDialog.billingGateModes.none") }}
              </option>
            </select>
          </div>
        </div>
        <div class="ct-dialog__field">
          <div class="ct-dialog__blueprint-header">
            <span class="ct-dialog__blueprint-title">
              {{ t("caseTemplates.createDialog.blueprintLabel") }}
            </span>
            <span
              v-if="blueprintItems.length > 0"
              class="ct-dialog__badge"
              data-testid="blueprint-item-count"
            >
              {{
                t("caseTemplates.createDialog.blueprintItemCount", {
                  count: blueprintItems.length,
                })
              }}
            </span>
          </div>
          <BlueprintWizardEditor
            v-if="blueprintEditMode === 'wizard'"
            :items="blueprintItems"
            :prefilled="createMode === 'copy'"
            @update:items="blueprintItems = $event"
            @switch-to-json="switchToJsonMode"
          />
          <div
            v-if="blueprintEditMode === 'json'"
            data-testid="blueprint-json-mode"
          >
            <button
              type="button"
              class="ct-dialog__collapse-toggle"
              data-testid="create-blueprint-toggle"
              @click="switchToWizardMode"
            >
              {{ t("caseTemplates.createDialog.blueprintWizardLabel") }}
              <span class="ct-dialog__collapse-icon">▾</span>
            </button>
            <textarea
              id="ct-blueprint"
              v-model="blueprintJsonDraft"
              rows="8"
              class="ct-dialog__input ct-dialog__textarea"
              data-testid="create-blueprint-json"
            />
            <div class="ct-dialog__file-row">
              <label class="ct-dialog__file-label">
                <input
                  id="ct-blueprint-file"
                  type="file"
                  accept=".json,application/json"
                  class="ct-dialog__file-input"
                  data-testid="create-blueprint-file"
                  @change="handleBlueprintFile"
                />
                {{ t("caseTemplates.createDialog.blueprintFileHint") }}
              </label>
            </div>
            <p
              v-if="blueprintParseError"
              class="ct-dialog__error"
              data-testid="blueprint-parse-error"
            >
              {{ blueprintParseError }}
            </p>
          </div>
        </div>
        <div
          v-if="props.errorCode"
          class="ct-dialog__alert"
          role="alert"
          data-testid="create-error-banner"
        >
          {{
            props.errorCode === "unauthorized"
              ? t("caseTemplates.writeState.unauthorized")
              : props.errorCode === "validation"
                ? t("caseTemplates.writeState.validation")
                : t("caseTemplates.writeState.requestFailed")
          }}
        </div>
        <div class="ct-dialog__footer">
          <Button
            variant="outlined"
            size="sm"
            html-type="button"
            data-testid="create-cancel-button"
            @click="emit('cancel')"
            >{{ t("caseTemplates.createDialog.cancel") }}</Button
          >
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            html-type="submit"
            :disabled="!formValid"
            :loading="props.saving"
            data-testid="create-submit-button"
          >
            {{
              props.saving
                ? t("caseTemplates.createDialog.submitting")
                : t("caseTemplates.createDialog.submit")
            }}
          </Button>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* prettier-ignore */
.ct-dialog-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 0.4); padding: 24px; }
/* prettier-ignore */
.ct-dialog { background: var(--color-bg-1, #fff); border-radius: var(--radius-xl, 12px); box-shadow: var(--shadow-3, 0 12px 40px rgb(0 0 0 / 0.15)); width: 100%; max-width: 720px; max-height: 90vh; overflow-y: auto; }
/* prettier-ignore */
.ct-dialog__header { padding: 24px 24px 0; }
/* prettier-ignore */
.ct-dialog__title { margin: 0; font-size: var(--font-size-lg, 18px); font-weight: var(--font-weight-semibold, 600); color: var(--color-text-1); }
/* prettier-ignore */
.ct-dialog__desc { margin: 4px 0 0; font-size: var(--font-size-sm, 14px); color: var(--color-text-3); }
/* prettier-ignore */
.ct-dialog__body { padding: 20px 24px 24px; display: grid; gap: 16px; }
/* prettier-ignore */
.ct-dialog__field { display: flex; flex-direction: column; gap: 4px; }
/* prettier-ignore */
.ct-dialog__field label { font-size: var(--font-size-sm, 14px); font-weight: var(--font-weight-medium, 500); color: var(--color-text-2); }
/* prettier-ignore */
.ct-dialog__field--half { flex: 1; min-width: 0; }
/* prettier-ignore */
.ct-dialog__row { display: flex; gap: 12px; }
/* prettier-ignore */
.ct-dialog__input { padding: 8px 12px; border: 1px solid var(--color-border-1, #e5e7eb); border-radius: var(--radius-md, 6px); font-size: var(--font-size-sm, 14px); background: var(--color-bg-1, #fff); color: var(--color-text-1); font-family: inherit; }
/* prettier-ignore */
.ct-dialog__input:focus { outline: 2px solid var(--color-primary-outline, #3b82f6); outline-offset: -1px; }
/* prettier-ignore */
.ct-dialog__textarea { resize: vertical; font-family: var(--font-family-mono, monospace); font-size: var(--font-size-xs, 12px); line-height: 1.5; }
/* prettier-ignore */
.ct-dialog__file-row { margin-top: 4px; }
/* prettier-ignore */
.ct-dialog__file-label { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-xs, 12px); color: var(--color-text-3); cursor: pointer; }
/* prettier-ignore */
.ct-dialog__file-input { width: 0; height: 0; opacity: 0; position: absolute; }
/* prettier-ignore */
.ct-dialog__toggle-label, .ct-dialog__mode-option { display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm, 14px); color: var(--color-text-2); cursor: pointer; user-select: none; }
/* prettier-ignore */
.ct-dialog__toggle-label { margin-top: 4px; font-size: var(--font-size-xs, 12px); color: var(--color-text-3); }
/* prettier-ignore */
.ct-dialog__mode-selector { display: flex; gap: 16px; }
/* prettier-ignore */
.ct-dialog__hint, .ct-dialog__collapse-icon { margin: 2px 0 0; font-size: var(--font-size-xs, 12px); color: var(--color-text-3); }
/* prettier-ignore */
.ct-dialog__collapse-toggle { all: unset; display: inline-flex; align-items: center; gap: 6px; font-size: var(--font-size-sm, 14px); font-weight: var(--font-weight-medium, 500); color: var(--color-text-2); cursor: pointer; user-select: none; }
/* prettier-ignore */
.ct-dialog__error { margin: 2px 0 0; font-size: var(--font-size-xs, 12px); color: var(--color-danger-text, #dc2626); }
/* prettier-ignore */
.ct-dialog__alert { padding: 10px 14px; border-radius: var(--radius-md, 6px); font-size: var(--font-size-sm, 14px); background: var(--color-danger-bg, #fef2f2); color: var(--color-danger-text, #dc2626); border: 1px solid var(--color-danger-border, #fecaca); }
/* prettier-ignore */
.ct-dialog__footer { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; }
/* prettier-ignore */
.ct-dialog__blueprint-header { display: flex; align-items: center; gap: 8px; }
/* prettier-ignore */
.ct-dialog__blueprint-title { font-size: var(--font-size-sm, 14px); font-weight: var(--font-weight-medium, 500); color: var(--color-text-2); }
/* prettier-ignore */
.ct-dialog__badge { display: inline-flex; align-items: center; padding: 1px 8px; border-radius: var(--radius-full, 9999px); font-size: var(--font-size-xs, 12px); font-weight: var(--font-weight-medium, 500); background: var(--color-primary-bg, #eff6ff); color: var(--color-primary-text, #1d4ed8); }
/* prettier-ignore */
@media (max-width: 767px) { .ct-dialog__row { flex-direction: column; } }
</style>
