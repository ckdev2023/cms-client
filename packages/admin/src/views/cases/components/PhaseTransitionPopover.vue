<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import type { TransitionGuardReason } from "../types-detail";
import Button from "../../../shared/ui/Button.vue";
import {
  CANCEL_REASON_PRESETS,
  isTargetDisabled as _isDisabled,
  guardTooltip as _guardTooltip,
} from "./phaseTransitionPopoverHelpers";

/** 业务阶段流转弹窗：选择目标阶段并提交流转请求。 */
const { t, te } = useI18n();

interface PhaseTransitionPopoverProps {
  menuOpen?: boolean;
  currentPhase?: string | null;
  availableTargets?: readonly string[];
  transitionGuards?: Record<string, TransitionGuardReason>;
  submitting?: boolean;
  errorMessage?: string | null;
  errorCode?: string | null;
}

const props = withDefaults(defineProps<PhaseTransitionPopoverProps>(), {
  menuOpen: false,
  currentPhase: null,
  availableTargets: () => [],
  transitionGuards: () => ({}),
  submitting: false,
  errorMessage: null,
  errorCode: null,
});

/**
 * 目标阶段是否被门禁阻断。
 *
 * @param target - 目标阶段代码
 * @returns 是否被阻断
 */
function isDisabled(target: string): boolean {
  return _isDisabled(props.transitionGuards, target);
}
/**
 * 返回门禁阻断的翻译文案。
 *
 * @param target - 目标阶段代码
 * @returns 翻译后的提示文案
 */
function tooltip(target: string): string | undefined {
  return _guardTooltip(props.transitionGuards, target, t);
}

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
  if (isDisabled(phase)) return;
  selectedPhase.value = phase;
  closeReason.value = "";
  selectedPreset.value = null;
  validationError.value = null;
}

/** 校验并提交阶段流转。 */
function handleSubmit(): void {
  if (!selectedPhase.value || props.submitting) return;
  if (isDisabled(selectedPhase.value)) return;

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
        aria-labelledby="phase-popover-title"
        data-testid="phase-transition-popover"
      >
        <header class="phase-popover__header">
          <div>
            <h3 id="phase-popover-title" class="phase-popover__title">
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
            :aria-label="t('cases.common.close')"
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

          <ul v-else class="phase-popover__list" role="listbox">
            <li
              v-for="target in props.availableTargets"
              :key="target"
              role="option"
              :tabindex="isDisabled(target) ? -1 : 0"
              :aria-selected="selectedPhase === target"
              :aria-disabled="isDisabled(target) || undefined"
              :title="tooltip(target)"
              :class="[
                'phase-popover__item',
                { 'phase-popover__item--selected': selectedPhase === target },
                { 'phase-popover__item--disabled': isDisabled(target) },
              ]"
              data-testid="phase-target-item"
              @click="selectPhase(target)"
              @keydown.enter.prevent="selectPhase(target)"
              @keydown.space.prevent="selectPhase(target)"
            >
              {{
                props.currentPhase
                  ? t("cases.detail.phaseMenu.targetArrow", {
                      from: t("cases.constants.phases." + props.currentPhase),
                      to: t("cases.constants.phases." + target),
                    })
                  : t("cases.constants.phases." + target)
              }}
              <span
                v-if="isDisabled(target)"
                class="phase-popover__guard-hint"
                data-testid="phase-guard-hint"
              >
                {{ tooltip(target) }}
              </span>
            </li>
          </ul>

          <div v-if="needsCloseReason" class="phase-popover__close-reason">
            <div
              class="phase-popover__presets"
              data-testid="cancel-reason-presets"
            >
              <button
                v-for="code in CANCEL_REASON_PRESETS"
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

<style scoped src="./PhaseTransitionPopover.css"></style>
