<script setup lang="ts">
import { ref, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";
import UserPicker from "../../../shared/ui/UserPicker.vue";
import type { TaskPriorityChoice } from "../model/CaseAdapterTaskWriteBuilders";

/** 任务新建弹窗：在案件详情内创建关联任务（替代跳转 /tasks 死循环）。 */
const { t } = useI18n();

interface CaseTaskCreateModalProps {
  open?: boolean;
  caseId?: string;
  submitting?: boolean;
  errorMessageKey?: string | null;
}

const props = defineProps<CaseTaskCreateModalProps>();

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      title: string;
      description?: string;
      priority: TaskPriorityChoice;
      dueAt?: string;
      assigneeUserId?: string;
    },
  ];
}>();

const PRIORITIES: TaskPriorityChoice[] = ["low", "normal", "high", "urgent"];

const backdropRef = ref<HTMLElement | null>(null);

const localTitle = ref("");
const localDescription = ref("");
const localPriority = ref<TaskPriorityChoice>("normal");
const localDueAt = ref("");
const localAssignee = ref("");

const titleError = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      localTitle.value = "";
      localDescription.value = "";
      localPriority.value = "normal";
      localDueAt.value = "";
      localAssignee.value = "";
      titleError.value = false;
      nextTick(() => backdropRef.value?.focus());
    }
  },
);

/** 提交任务表单，校验标题必填后 emit 载荷。 */
function handleSubmit(): void {
  if (!localTitle.value.trim()) {
    titleError.value = true;
    return;
  }
  emit("submit", {
    title: localTitle.value.trim(),
    ...(localDescription.value.trim()
      ? { description: localDescription.value.trim() }
      : {}),
    priority: localPriority.value,
    ...(localDueAt.value ? { dueAt: localDueAt.value } : {}),
    ...(localAssignee.value.trim()
      ? { assigneeUserId: localAssignee.value.trim() }
      : {}),
  });
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.open"
      ref="backdropRef"
      class="task-create-modal-backdrop"
      data-testid="task-create-modal-backdrop"
      tabindex="-1"
      @click.self="!props.submitting && emit('close')"
      @keydown.esc.stop.prevent="!props.submitting && emit('close')"
    >
      <div
        class="task-create-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-task-create-title"
        data-testid="task-create-modal"
      >
        <header class="task-create-modal__header">
          <h2 id="case-task-create-title" class="task-create-modal__title">
            {{ t("cases.detail.tasks.createModal.title") }}
          </h2>
          <button
            type="button"
            class="task-create-modal__close"
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

        <div class="task-create-modal__body">
          <label class="task-create-modal__field" for="task-create-title">
            <span class="task-create-modal__label">{{
              t("cases.detail.tasks.createModal.fields.title")
            }}</span>
            <input
              id="task-create-title"
              name="title"
              type="text"
              class="task-create-modal__input"
              :class="{ 'task-create-modal__input--error': titleError }"
              :value="localTitle"
              :disabled="props.submitting"
              data-testid="task-title-input"
              @input="
                localTitle = ($event.target as HTMLInputElement).value;
                titleError = false;
              "
            />
            <span v-if="titleError" class="task-create-modal__error">
              {{ t("cases.detail.tasks.createModal.validation.titleRequired") }}
            </span>
          </label>

          <label class="task-create-modal__field" for="task-create-description">
            <span class="task-create-modal__label">{{
              t("cases.detail.tasks.createModal.fields.description")
            }}</span>
            <textarea
              id="task-create-description"
              name="description"
              class="task-create-modal__textarea"
              rows="3"
              :value="localDescription"
              :disabled="props.submitting"
              data-testid="task-description-input"
              @input="
                localDescription = ($event.target as HTMLTextAreaElement).value
              "
            />
          </label>

          <label class="task-create-modal__field" for="task-create-priority">
            <span class="task-create-modal__label">{{
              t("cases.detail.tasks.createModal.fields.priority")
            }}</span>
            <select
              id="task-create-priority"
              name="priority"
              class="task-create-modal__select"
              :value="localPriority"
              :disabled="props.submitting"
              data-testid="task-priority-select"
              @change="
                localPriority = ($event.target as HTMLSelectElement)
                  .value as TaskPriorityChoice
              "
            >
              <option v-for="p in PRIORITIES" :key="p" :value="p">
                {{ t(`cases.detail.tasks.createModal.priorities.${p}`) }}
              </option>
            </select>
          </label>

          <label class="task-create-modal__field" for="task-create-dueAt">
            <span class="task-create-modal__label">{{
              t("cases.detail.tasks.createModal.fields.dueAt")
            }}</span>
            <input
              id="task-create-dueAt"
              name="dueAt"
              type="date"
              class="task-create-modal__input"
              :value="localDueAt"
              :disabled="props.submitting"
              data-testid="task-due-at-input"
              @input="localDueAt = ($event.target as HTMLInputElement).value"
            />
          </label>

          <label
            class="task-create-modal__field"
            for="task-create-assigneeUserId"
          >
            <span class="task-create-modal__label">{{
              t("cases.detail.tasks.createModal.fields.assignee")
            }}</span>
            <UserPicker
              id="task-create-assigneeUserId"
              name="assigneeUserId"
              v-model="localAssignee"
              :disabled="props.submitting"
              :placeholder="
                t('cases.detail.tasks.createModal.fields.assigneePlaceholder')
              "
              data-testid="task-assignee-input"
            />
          </label>
        </div>

        <div
          v-if="props.errorMessageKey"
          role="alert"
          class="task-create-modal__server-error"
          data-testid="task-create-server-error"
        >
          {{ t(props.errorMessageKey) }}
        </div>

        <footer class="task-create-modal__footer">
          <Button size="sm" :disabled="props.submitting" @click="emit('close')">
            {{ t("cases.detail.tasks.createModal.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="props.submitting"
            data-testid="task-submit-btn"
            @click="handleSubmit"
          >
            {{ t("cases.detail.tasks.createModal.submit") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.task-create-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.task-create-modal {
  width: 100%;
  max-width: 480px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.task-create-modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.task-create-modal__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.task-create-modal__close {
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

.task-create-modal__body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-create-modal__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.task-create-modal__label {
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.task-create-modal__input,
.task-create-modal__select,
.task-create-modal__textarea {
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

.task-create-modal__input--error {
  border-color: var(--color-danger, #dc2626);
}

.task-create-modal__textarea {
  resize: vertical;
  min-height: 60px;
}

.task-create-modal__error {
  font-size: var(--font-size-xs, 12px);
  color: var(--color-danger, #dc2626);
}

.task-create-modal__server-error {
  margin: 0 24px;
  padding: 10px 14px;
  font-size: var(--font-size-sm, 14px);
  color: var(--color-danger, #dc2626);
  background: var(--color-danger-bg, #fef2f2);
  border: 1px solid var(--color-danger-border, #fecaca);
  border-radius: var(--radius-md);
}

.task-create-modal__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
