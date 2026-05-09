<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 新建提交包弹窗：收集 submittedAt 与 authorityName 等必要字段。 */

const props = defineProps<{
  open: boolean;
  submitting?: boolean;
  defaultAuthorityName?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [payload: { submittedAt: string; authorityName: string }];
}>();

const { t } = useI18n();

/**
 * 生成当前本地时间的 `datetime-local` 输入字符串（YYYY-MM-DDTHH:mm）。
 *
 * @returns 适用于 `<input type="datetime-local">` 的当地时间字符串。
 */
function nowDateTimeLocal(): string {
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const submittedAt = ref(nowDateTimeLocal());
const authorityName = ref((props.defaultAuthorityName ?? "").trim());

const canSubmit = computed(() => {
  if (props.submitting) return false;
  if (!submittedAt.value) return false;
  if (!authorityName.value.trim()) return false;
  return true;
});

watch(
  () => props.open,
  (val) => {
    if (val) {
      submittedAt.value = nowDateTimeLocal();
      authorityName.value = (props.defaultAuthorityName ?? "").trim();
    }
  },
);

/** 弹窗内点击「创建提交包」时触发：将本地时间转 ISO 后向上 emit。 */
function handleSubmit() {
  if (!canSubmit.value) return;
  const iso = new Date(submittedAt.value).toISOString();
  emit("submit", {
    submittedAt: iso,
    authorityName: authorityName.value.trim(),
  });
}

/** 弹窗关闭：通过 `close` 事件交由父组件处理。 */
function handleClose() {
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sp-overlay" @click.self="handleClose">
      <div
        class="sp-dialog"
        role="dialog"
        aria-modal="true"
        :aria-label="t('cases.submissionPackage.createModal.title')"
        data-testid="submission-package-create-modal"
      >
        <div class="sp-header">
          <h3 class="sp-header__title">
            {{ t("cases.submissionPackage.createModal.title") }}
          </h3>
          <button
            class="sp-header__close"
            type="button"
            :aria-label="t('cases.submissionPackage.createModal.close')"
            @click="handleClose"
          >
            <svg
              class="sp-header__close-icon"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div class="sp-body">
          <p class="sp-hint">
            {{ t("cases.submissionPackage.createModal.hint") }}
          </p>
          <div class="sp-fields">
            <div class="sp-field">
              <label class="sp-label" for="sp-submittedAt">
                {{ t("cases.submissionPackage.createModal.submittedAt") }}
                <span class="sp-label__required">*</span>
              </label>
              <input
                id="sp-submittedAt"
                v-model="submittedAt"
                type="datetime-local"
                class="sp-input"
                data-testid="sp-submittedAt"
              />
            </div>

            <div class="sp-field">
              <label class="sp-label" for="sp-authorityName">
                {{ t("cases.submissionPackage.createModal.authorityName") }}
                <span class="sp-label__required">*</span>
              </label>
              <input
                id="sp-authorityName"
                v-model="authorityName"
                type="text"
                class="sp-input"
                data-testid="sp-authorityName"
                :placeholder="
                  t(
                    'cases.submissionPackage.createModal.authorityNamePlaceholder',
                  )
                "
              />
            </div>
          </div>
        </div>

        <div class="sp-footer">
          <Button
            variant="outlined"
            tone="neutral"
            size="md"
            @click="handleClose"
          >
            {{ t("cases.submissionPackage.createModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="md"
            :disabled="!canSubmit"
            data-testid="sp-submit"
            @click="handleSubmit"
          >
            {{ t("cases.submissionPackage.createModal.submit") }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.sp-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.sp-dialog {
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-1);
  width: 100%;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.sp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid var(--color-border-1);
}

.sp-header__title {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
}

.sp-header__close {
  all: unset;
  color: var(--color-text-3);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-md);
  transition: color var(--transition-fast);
}

.sp-header__close:hover {
  color: var(--color-text-1);
}

.sp-header__close-icon {
  width: 20px;
  height: 20px;
}

.sp-body {
  padding: 24px;
  overflow-y: auto;
  flex: 1;
}

.sp-hint {
  margin: 0 0 16px 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
  line-height: 1.5;
}

.sp-fields {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.sp-field {
  display: flex;
  flex-direction: column;
}

.sp-label {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
  margin-bottom: 6px;
}

.sp-label__required {
  color: var(--color-danger);
}

.sp-input {
  appearance: none;
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
}

.sp-input:focus {
  outline: 2px solid var(--color-primary-outline);
  outline-offset: 1px;
}

.sp-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-1);
  background: var(--color-bg-2);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}
</style>
