<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import Button from "../../../shared/ui/Button.vue";

/** 业务阶段流转弹窗：选择目标阶段并提交流转请求。 */
const { t, te } = useI18n();

interface PhaseTransitionPopoverProps {
  menuOpen?: boolean;
  currentPhase?: string | null;
  availableTargets?: readonly string[];
  submitting?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
}

const props = withDefaults(defineProps<PhaseTransitionPopoverProps>(), {
  menuOpen: false,
  currentPhase: null,
  availableTargets: () => [],
  submitting: false,
  errorMessage: null,
  errorCode: null,
});

const localizedError = computed(() => {
  if (!props.errorCode && !props.errorMessage) return null;
  if (props.errorCode) {
    const key = `cases.detail.phaseMenu.errors.${props.errorCode}`;
    if (te(key)) return t(key);
    return `[${props.errorCode}] ${props.errorMessage ?? ""}`;
  }
  return props.errorMessage;
});

const currentPhaseLabel = computed(() => {
  if (!props.currentPhase) return null;
  return t("cases.detail.phaseMenu.currentPhaseLabel", {
    phase: t("cases.constants.phases." + props.currentPhase),
  });
});

const emit = defineEmits<{
  close: [];
  submit: [
    payload: {
      toPhase: string;
      closeReason?: string;
      resultOutcome?: string;
    },
  ];
}>();

const backdropRef = ref<HTMLElement | null>(null);

const selectedPhase = ref<string | null>(null);
const closeReason = ref("");
const validationError = ref<string | null>(null);

watch(
  () => props.menuOpen,
  (open) => {
    if (open) {
      nextTick(() => backdropRef.value?.focus());
    } else {
      selectedPhase.value = null;
      closeReason.value = "";
      selectedPreset.value = null;
      validationError.value = null;
    }
  },
);

const needsCloseReason = computed(
  () => selectedPhase.value === "CLOSED_FAILED",
);

const cancelReasonPresets = [
  "MID_CASE_WITHDRAWAL",
  "CLIENT_LOST_CONTACT",
  "SWITCHED_TO_OTHER_FIRM",
  "OTHER",
] as const;

const selectedPreset = ref<string | null>(null);

/**
 * 选择撤案原因预设项，同步 closeReason。
 *
 * @param code - 预设原因代码
 */
function selectCancelPreset(code: string): void {
  selectedPreset.value = code;
  if (code === "OTHER") {
    closeReason.value = "";
  } else {
    closeReason.value = t(`cases.detail.phaseMenu.cancelReasonPresets.${code}`);
  }
  validationError.value = null;
}

/**
 * 选中目标阶段并重置表单状态。
 *
 * @param phase - 目标阶段代码
 */
function selectPhase(phase: string): void {
  selectedPhase.value = phase;
  closeReason.value = "";
  selectedPreset.value = null;
  validationError.value = null;
}

/** 校验并提交阶段流转。 */
function handleSubmit(): void {
  if (!selectedPhase.value || props.submitting) return;

  if (needsCloseReason.value && !selectedPreset.value) {
    validationError.value = t("cases.detail.phaseMenu.closeReasonRequired");
    return;
  }
  if (
    needsCloseReason.value &&
    selectedPreset.value === "OTHER" &&
    !closeReason.value.trim()
  ) {
    validationError.value = t("cases.detail.phaseMenu.closeReasonRequired");
    return;
  }

  validationError.value = null;
  emit("submit", {
    toPhase: selectedPhase.value,
    closeReason: needsCloseReason.value ? closeReason.value.trim() : undefined,
    resultOutcome: needsCloseReason.value ? "failure" : undefined,
  });
}

/** 关闭弹窗并清除选中状态。 */
function handleClose(): void {
  selectedPhase.value = null;
  closeReason.value = "";
  selectedPreset.value = null;
  validationError.value = null;
  emit("close");
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="props.menuOpen"
      ref="backdropRef"
      class="phase-popover-backdrop"
      data-testid="phase-transition-popover-backdrop"
      tabindex="-1"
      @click.self="!props.submitting && handleClose()"
      @keydown.esc.stop.prevent="!props.submitting && handleClose()"
    >
      <div
        class="phase-popover"
        role="dialog"
        aria-modal="true"
        data-testid="phase-transition-popover"
      >
        <header class="phase-popover__header">
          <div>
            <h3 class="phase-popover__title">
              {{ t("cases.detail.phaseMenu.title") }}
            </h3>
            <p
              v-if="currentPhaseLabel"
              class="phase-popover__subtitle"
              data-testid="phase-current-label"
            >
              {{ currentPhaseLabel }}
            </p>
          </div>
          <button
            type="button"
            class="phase-popover__close-btn"
            :disabled="props.submitting"
            @click="handleClose"
          >
            <svg
              width="18"
              height="18"
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

        <div class="phase-popover__body">
          <div
            v-if="props.availableTargets.length === 0"
            class="phase-popover__empty"
          >
            {{ t("cases.detail.phaseMenu.title") }}
          </div>

          <ul v-else class="phase-popover__list">
            <li
              v-for="target in props.availableTargets"
              :key="target"
              :class="[
                'phase-popover__item',
                { 'phase-popover__item--selected': selectedPhase === target },
              ]"
              data-testid="phase-target-item"
              @click="selectPhase(target)"
            >
              {{
                props.currentPhase
                  ? t("cases.detail.phaseMenu.targetArrow", {
                      from: t("cases.constants.phases." + props.currentPhase),
                      to: t("cases.constants.phases." + target),
                    })
                  : t("cases.constants.phases." + target)
              }}
            </li>
          </ul>

          <div v-if="needsCloseReason" class="phase-popover__close-reason">
            <div
              class="phase-popover__presets"
              data-testid="cancel-reason-presets"
            >
              <button
                v-for="code in cancelReasonPresets"
                :key="code"
                type="button"
                :class="[
                  'phase-popover__preset-chip',
                  {
                    'phase-popover__preset-chip--active':
                      selectedPreset === code,
                  },
                ]"
                :disabled="props.submitting"
                :data-testid="`cancel-preset-${code}`"
                @click="selectCancelPreset(code)"
              >
                {{ t(`cases.detail.phaseMenu.cancelReasonPresets.${code}`) }}
              </button>
            </div>
            <label
              v-if="selectedPreset === 'OTHER'"
              class="phase-popover__label"
            >
              {{ t("cases.detail.phaseMenu.closeReasonLabel") }}
              <input
                id="phase-closeReason"
                name="closeReason"
                type="text"
                class="phase-popover__input"
                :value="closeReason"
                :disabled="props.submitting"
                data-testid="close-reason-input"
                @input="closeReason = ($event.target as HTMLInputElement).value"
              />
            </label>
            <p
              v-if="validationError"
              class="phase-popover__validation-error"
              data-testid="close-reason-validation-error"
            >
              {{ validationError }}
            </p>
          </div>

          <p
            v-if="localizedError"
            class="phase-popover__error"
            data-testid="phase-transition-error"
          >
            {{ t("cases.detail.phaseMenu.errorPrefix") }}:
            {{ localizedError }}
          </p>
        </div>

        <footer class="phase-popover__footer">
          <Button size="sm" :disabled="props.submitting" @click="handleClose">
            {{ t("cases.detail.phaseMenu.cancel") }}
          </Button>
          <Button
            variant="filled"
            tone="primary"
            size="sm"
            :disabled="props.submitting || !selectedPhase"
            @click="handleSubmit"
          >
            {{ t("cases.detail.phaseMenu.submit") }}
          </Button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.phase-popover-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
}

.phase-popover {
  width: 100%;
  max-width: 400px;
  background: var(--color-bg-1, #fff);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
}

.phase-popover__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.phase-popover__title {
  margin: 0;
  font-size: var(--font-size-lg, 18px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-1);
}

.phase-popover__subtitle {
  margin: 4px 0 0;
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-normal, 400);
  color: var(--color-text-3);
}

.phase-popover__close-btn {
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

.phase-popover__body {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.phase-popover__empty {
  color: var(--color-text-3);
  font-size: var(--font-size-sm, 14px);
  text-align: center;
  padding: 12px 0;
}

.phase-popover__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.phase-popover__item {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm, 14px);
  color: var(--color-text-1);
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: var(--color-bg-3);
  }
}

.phase-popover__item--selected {
  background: rgba(var(--color-primary-6-rgb, 59 130 246), 0.1);
  color: var(--color-primary-6);
  font-weight: var(--font-weight-semibold, 600);
}

.phase-popover__close-reason {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.phase-popover__presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.phase-popover__preset-chip {
  padding: 4px 12px;
  border: 1px solid var(--color-border-1);
  border-radius: 999px;
  background: var(--color-bg-1, #fff);
  font: inherit;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-text-2);
  cursor: pointer;
  transition: all 0.15s;
  &:hover:not(:disabled) {
    border-color: var(--color-primary-6);
    color: var(--color-primary-6);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.phase-popover__preset-chip--active {
  background: rgba(var(--color-primary-6-rgb, 59 130 246), 0.1);
  border-color: var(--color-primary-6);
  color: var(--color-primary-6);
  font-weight: var(--font-weight-semibold, 600);
}

.phase-popover__label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: var(--font-size-sm, 14px);
  font-weight: var(--font-weight-semibold, 600);
  color: var(--color-text-2);
}

.phase-popover__input {
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

.phase-popover__validation-error {
  margin: 0;
  font-size: var(--font-size-xs, 12px);
  color: var(--color-danger, #dc2626);
}

.phase-popover__error {
  margin: 0;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: rgba(220, 38, 38, 0.06);
  font-size: var(--font-size-sm, 14px);
  color: #991b1b;
}

.phase-popover__footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 24px 20px;
}
</style>
