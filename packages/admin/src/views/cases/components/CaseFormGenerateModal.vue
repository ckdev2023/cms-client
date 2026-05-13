<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 登记文書弹窗：填写标题和外部资源 URL 后提交登记。 */
const { t } = useI18n();

/** 文书登记弹窗上下文：所选模板名称作为默认文书标题，`id` 随提交发往后端 `templateId`。 */
interface CaseFormGeneratePresetTemplate {
  /**
   *
   */
  id: string;
  /**
   *
   */
  name: string;
}

interface CaseFormGenerateModalProps {
  open?: boolean;
  caseName?: string;
  submitting?: boolean;
  /** 从模板行打开时传入；顶部「登记文书」不传。 */
  presetTemplate?: CaseFormGeneratePresetTemplate | null;
}

const props = defineProps<CaseFormGenerateModalProps>();

const emit = defineEmits<{
  close: [];
  submit: [payload: { title: string; fileUrl: string; templateId?: string }];
}>();

const backdropRef = ref<HTMLElement | null>(null);

const localTitle = ref("");
const localFileUrl = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localTitle.value =
        props.presetTemplate?.name?.trim() || props.caseName?.trim() || "";
      localFileUrl.value = "";
      nextTick(() => backdropRef.value?.focus());
    }
  },
  { immediate: true },
);

/** 校验当前是否允许提交（标题非空且未处于提交中）。
 * @returns 是否可点击提交
 */
function canSubmit(): boolean {
  return localTitle.value.trim().length > 0 && !props.submitting;
}

/** 提交登记表单：发出 `submit` 事件并携带标题与外部 URL。 */
function handleSubmit(): void {
  if (!canSubmit()) return;
  const tplId = props.presetTemplate?.id?.trim();
  emit("submit", {
    title: localTitle.value.trim(),
    fileUrl: localFileUrl.value.trim(),
    ...(tplId ? { templateId: tplId } : {}),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      ref="backdropRef"
      class="form-gen-modal-backdrop"
      data-testid="form-generate-modal-backdrop"
      tabindex="-1"
      @click.self="!props.submitting && emit('close')"
      @keydown.esc.stop.prevent="!props.submitting && emit('close')"
    >
      <div
        class="form-gen-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-form-generate-title"
        data-testid="form-generate-modal"
      >
        <header class="form-gen-modal__header">
          <h2 id="case-form-generate-title" class="form-gen-modal__title">
            {{ t("cases.detail.forms.generateModal.title") }}
          </h2>
          <button
            type="button"
            class="form-gen-modal__close"
            :aria-label="t('cases.common.close')"
            :disabled="props.submitting"
            @click="emit('close')"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="form-gen-modal__body">
          <label class="form-gen-modal__field" for="form-gen-docTitle">
            <span class="form-gen-modal__label">
              {{ t("cases.detail.forms.generateModal.fields.docTitle") }}
            </span>
            <input
              id="form-gen-docTitle"
              name="docTitle"
              type="text"
              class="form-gen-modal__input"
              :placeholder="
                t('cases.detail.forms.generateModal.fields.docTitlePlaceholder')
              "
              v-model="localTitle"
              :disabled="props.submitting"
              data-testid="form-gen-title-input"
            />
          </label>

          <label class="form-gen-modal__field" for="form-gen-fileUrl">
            <span class="form-gen-modal__label">
              {{ t("cases.detail.forms.generateModal.fields.fileUrl") }}
            </span>
            <input
              id="form-gen-fileUrl"
              name="fileUrl"
              type="url"
              class="form-gen-modal__input"
              :placeholder="
                t('cases.detail.forms.generateModal.fields.fileUrlPlaceholder')
              "
              v-model="localFileUrl"
              :disabled="props.submitting"
              data-testid="form-gen-file-url-input"
            />
            <p
              class="form-gen-modal__hint"
              data-testid="form-gen-file-url-hint"
            >
              {{ t("cases.detail.forms.generateModal.fields.fileUrlHint") }}
            </p>
          </label>
        </div>

        <footer class="form-gen-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.detail.forms.generateModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="!canSubmit()"
            data-testid="form-gen-submit-btn"
            @click="handleSubmit"
          >
            {{
              props.submitting
                ? t("cases.detail.forms.generateModal.submitting")
                : t("cases.detail.forms.generateModal.submit")
            }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.form-gen-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.form-gen-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.form-gen-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.form-gen-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.form-gen-modal__close {
  border: none;
  background: none;
  cursor: pointer;
  padding: 4px;
  color: var(--color-text-3);
  border-radius: var(--radius-md);
  &:hover {
    background: var(--color-bg-3);
  }
}

.form-gen-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-gen-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-gen-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.form-gen-modal__input,
.form-gen-modal__select {
  padding: 8px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-1);
  background: var(--color-bg-1, #fff);
  &:focus {
    outline: none;
    border-color: var(--color-primary-6);
    box-shadow: 0 0 0 2px rgba(var(--color-primary-6-rgb, 59 130 246), 0.15);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.form-gen-modal__hint {
  margin: 2px 0 0;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-3);
}

.form-gen-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
