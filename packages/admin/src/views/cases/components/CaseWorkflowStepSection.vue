<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import type { WorkflowStepSummary } from "../types-detail";
import {
  getBmvStageGroups,
  type BmvStageGroup,
  type BmvWorkflowStepDef,
} from "../constantsBmvSteps";

/** 工作流步骤区块：展示 BMV 子步骤分组、当前状态与补正轮次。 */
const { t } = useI18n();

const props = defineProps<{
  workflowStep: WorkflowStepSummary;
  /** S1-S9 管理层阶段代码（如 "S5"），用于并行对照显示。 */
  managementStage?: string;
  /** 补正轮次（>0 时在补正步骤旁显示轮次标记）。 */
  supplementCount?: number;
}>();

const SUPPLEMENT_STEP_CODES = new Set([
  "NEED_SUPPLEMENT",
  "SUPPLEMENT_PROCESSING",
]);

const stageGroups = computed<BmvStageGroup[]>(() => getBmvStageGroups());

type StepStatus = "completed" | "current" | "upcoming" | "failed";

/**
 * 计算单个步骤在当前案件中的状态。
 * @param step - 工作流步骤定义。
 * @returns 步骤状态。
 */
function stepStatus(step: BmvWorkflowStepDef): StepStatus {
  const currentOrder = props.workflowStep.sortOrder;
  if (step.code === props.workflowStep.stepCode) {
    return props.workflowStep.isFailureStep ? "failed" : "current";
  }
  if (step.sortOrder < currentOrder) return "completed";
  return "upcoming";
}

/**
 * 获取步骤状态对应的展示文案。
 * @param status - 步骤状态。
 * @returns 对应的 i18n 文案。
 */
function stepStatusLabel(status: StepStatus): string {
  return t(`cases.detail.overview.workflowStep.${status}`);
}

/**
 * 判断某个步骤分组是否包含当前激活步骤。
 * @param group - 步骤分组。
 * @returns 是否为当前激活分组。
 */
function isGroupActive(group: BmvStageGroup): boolean {
  return group.steps.some((s) => s.code === props.workflowStep.stepCode);
}

/**
 * 判断某个步骤分组是否已经全部完成。
 * @param group - 步骤分组。
 * @returns 是否已经完成。
 */
function isGroupCompleted(group: BmvStageGroup): boolean {
  const currentOrder = props.workflowStep.sortOrder;
  return group.steps.every((s) => s.sortOrder < currentOrder);
}

type GroupStatus = "active" | "completed" | "upcoming";

/**
 * 计算步骤分组的整体状态。
 * @param group - 步骤分组。
 * @returns 分组状态。
 */
function groupStatus(group: BmvStageGroup): GroupStatus {
  if (isGroupActive(group)) return "active";
  if (isGroupCompleted(group)) return "completed";
  return "upcoming";
}
</script>

<template>
  <Card padding="md" data-testid="workflow-step-section">
    <div class="wf-section__header">
      <div class="wf-section__header-left">
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
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
          />
        </svg>
        <span class="wf-section__title">
          {{ t("cases.detail.overview.workflowStep.title") }}
        </span>
      </div>
      <div class="wf-section__header-right">
        <!-- S1-S9 parallel stage badge -->
        <span
          v-if="managementStage"
          class="wf-section__stage-pill"
          data-testid="workflow-management-stage"
        >
          {{ managementStage }}
          <span class="wf-section__stage-pill-label">
            {{ t(`cases.constants.stages.${managementStage}`) }}
          </span>
        </span>
        <span
          class="wf-section__current-badge"
          :class="{
            'wf-section__current-badge--failed': workflowStep.isFailureStep,
          }"
          data-testid="workflow-current-badge"
        >
          <span class="wf-section__current-badge-icon" aria-hidden="true">
            <svg
              v-if="workflowStep.isFailureStep"
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span v-else class="wf-section__pulse-dot" />
          </span>
          {{ t("cases.detail.overview.workflowStep.currentLabel") }}:
          {{
            t(
              workflowStep.stepCode
                ? `cases.constants.bmvSteps.${workflowStep.stepCode}`
                : "",
            ) || workflowStep.stepLabel
          }}
        </span>
      </div>
    </div>

    <div class="wf-section__track">
      <div
        v-for="(group, gi) in stageGroups"
        :key="group.stage"
        class="wf-section__stage-group"
        :class="[`wf-section__stage-group--${groupStatus(group)}`]"
      >
        <div class="wf-section__stage-label">
          <span class="wf-section__stage-code">{{ group.stage }}</span>
          <span class="wf-section__stage-name">
            {{ t(group.stageI18nKey) || group.stage }}
          </span>
          <span
            v-if="isGroupActive(group)"
            class="wf-section__stage-active-indicator"
          >
            {{ t("cases.detail.overview.workflowStep.current") }}
          </span>
        </div>

        <div class="wf-section__steps">
          <div
            v-for="step in group.steps"
            :key="step.code"
            class="wf-section__step"
            :class="[`wf-section__step--${stepStatus(step)}`]"
            :data-testid="`workflow-step-${step.code}`"
          >
            <!-- Status icon -->
            <span class="wf-section__step-icon" aria-hidden="true">
              <!-- Completed: checkmark -->
              <svg
                v-if="stepStatus(step) === 'completed'"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <!-- Current: pulse dot -->
              <span
                v-else-if="stepStatus(step) === 'current'"
                class="wf-section__pulse-dot"
              />
              <!-- Failed: cross -->
              <svg
                v-else-if="stepStatus(step) === 'failed'"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
              <!-- Upcoming: hollow circle -->
              <span v-else class="wf-section__hollow-dot" />
            </span>

            <span class="wf-section__step-label">
              {{ t(step.i18nKey) || step.label }}
            </span>

            <!-- Status badge chip -->
            <span
              class="wf-section__step-badge"
              :class="[`wf-section__step-badge--${stepStatus(step)}`]"
            >
              {{ stepStatusLabel(stepStatus(step)) }}
            </span>

            <!-- Supplement round count badge -->
            <span
              v-if="
                SUPPLEMENT_STEP_CODES.has(step.code) &&
                stepStatus(step) === 'current' &&
                supplementCount &&
                supplementCount > 0
              "
              class="wf-section__supplement-count"
              data-testid="workflow-supplement-count"
            >
              ×{{ supplementCount }}
            </span>
          </div>
        </div>

        <div
          v-if="gi < stageGroups.length - 1"
          class="wf-section__stage-connector"
          aria-hidden="true"
        />
      </div>
    </div>
  </Card>
</template>

<style scoped src="./CaseWorkflowStepSection.css"></style>
