<script setup lang="ts">
import { ref, computed } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../shared/ui/Button.vue";
import type { CaseTemplateCreateParams } from "./model/CaseTemplatesRepository";

/** 案件資料蓝图新建对话框 — 收集模板名称、案件类型、蓝图 JSON 等字段后提交创建。 */
const props = defineProps<{
  saving: boolean;
  errorCode: string | null;
}>();

const emit = defineEmits<{
  submit: [params: CaseTemplateCreateParams];
  cancel: [];
}>();

const { t } = useI18n();

const form = ref({
  templateName: "",
  caseType: "",
  applicationType: "",
  reviewRequiredFlag: false,
  billingGateMode: "warn",
  blueprintJson: "",
});

const formValid = computed(
  () =>
    form.value.templateName.trim().length > 0 &&
    form.value.caseType.trim().length > 0,
);

const blueprintParseError = ref<string | null>(null);

/**
 * 解析蓝图 JSON 字符串，无效时设置解析错误提示。
 * @param raw JSON 字符串
 * @returns 解析结果；无效时返回 null
 */
function parseBlueprintJson(raw: string): unknown {
  blueprintParseError.value = null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    blueprintParseError.value = "Invalid JSON";
    return null;
  }
}

/**
 * 处理蓝图文件上传，读取内容填入 JSON 编辑区。
 * @param event 文件选择变更事件
 */
function handleBlueprintFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === "string") {
      form.value.blueprintJson = reader.result;
      blueprintParseError.value = null;
    }
  };
  reader.readAsText(file);
}

/**
 * 提交创建表单，解析蓝图后发出 submit 事件。
 */
function handleSubmit() {
  const bp = parseBlueprintJson(form.value.blueprintJson);
  emit("submit", {
    templateName: form.value.templateName.trim(),
    caseType: form.value.caseType.trim(),
    applicationType: form.value.applicationType.trim() || undefined,
    requirementBlueprint: bp ?? undefined,
    reviewRequiredFlag: form.value.reviewRequiredFlag,
    billingGateMode: form.value.billingGateMode,
  });
}

defineExpose({ form });
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
          <input
            id="ct-case-type"
            v-model="form.caseType"
            type="text"
            class="ct-dialog__input"
            :placeholder="t('caseTemplates.createDialog.caseTypePlaceholder')"
            data-testid="create-case-type"
            required
          />
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
          <label for="ct-blueprint">{{
            t("caseTemplates.createDialog.blueprintLabel")
          }}</label>
          <textarea
            id="ct-blueprint"
            v-model="form.blueprintJson"
            rows="6"
            class="ct-dialog__input ct-dialog__textarea"
            :placeholder="t('caseTemplates.createDialog.blueprintPlaceholder')"
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
          >
            {{ t("caseTemplates.createDialog.cancel") }}
          </Button>
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
.ct-dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.4);
  padding: 24px;
}

.ct-dialog {
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-xl, 12px);
  box-shadow: var(--shadow-3, 0 12px 40px rgb(0 0 0 / 0.15));
  width: 100%;
  max-width: 560px;
  max-height: 90vh;
  overflow-y: auto;
}

.ct-dialog__header {
  padding: 24px 24px 0;
}

.ct-dialog__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-1);
}

.ct-dialog__desc {
  margin: 4px 0 0;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-3);
}

.ct-dialog__body {
  padding: 20px 24px 24px;
  display: grid;
  gap: 16px;
}

.ct-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ct-dialog__field label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-medium, 500);
  color: var(--color-text-2);
}

.ct-dialog__field--half {
  flex: 1;
  min-width: 0;
}

.ct-dialog__row {
  display: flex;
  gap: 12px;
}

.ct-dialog__input {
  padding: 8px 12px;
  border: 1px solid var(--color-border-1, #e5e7eb);
  border-radius: var(--radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
  background: var(--color-bg-1, #fff);
  color: var(--color-text-1);
  font-family: inherit;
}

.ct-dialog__input:focus {
  outline: 2px solid var(--color-primary-outline, #3b82f6);
  outline-offset: -1px;
}

.ct-dialog__textarea {
  resize: vertical;
  font-family: var(--font-family-mono, monospace);
  font-size: var(--font-size-xs, 12px);
  line-height: 1.5;
}

.ct-dialog__file-row {
  margin-top: 4px;
}

.ct-dialog__file-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-3);
  cursor: pointer;
}

.ct-dialog__file-input {
  width: 0;
  height: 0;
  opacity: 0;
  position: absolute;
}

.ct-dialog__error {
  margin: 2px 0 0;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-danger-text, #dc2626);
}

.ct-dialog__alert {
  padding: 10px 14px;
  border-radius: var(--radius-md, 6px);
  font-size: var(--font-size-sm, 14px);
  background: var(--color-danger-bg, #fef2f2);
  color: var(--color-danger-text, #dc2626);
  border: 1px solid var(--color-danger-border, #fecaca);
}

.ct-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

@media (max-width: 767px) {
  .ct-dialog__row {
    flex-direction: column;
  }
}
</style>
