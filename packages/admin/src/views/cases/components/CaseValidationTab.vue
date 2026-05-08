<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import CaseValidationSupport from "./CaseValidationSupport.vue";
import GateItemVue from "./GateItem.vue";
import { formatDateTime } from "../../../shared/model/formatDateTime";

import type { CaseDetail, GateItem, ValidationData } from "../types-detail";
import type { CaseDetailTab } from "../types";

/** 校验与提交 Tab：展示 Gate 报告、提交包、补正包与支持区。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
  rerunLoading?: boolean;
  rerunError?: string | null;
  createSpLoading?: boolean;
  reviewLoading?: boolean;
}>();

const emit = defineEmits<{
  (e: "switch-tab", tab: CaseDetailTab): void;
  (e: "open-risk-modal"): void;
  (e: "rerun-validation"): void;
  (e: "create-submission-package"): void;
  (e: "start-review"): void;
}>();

const { t, locale } = useI18n();

const SEVERITY_CLASS: Record<string, string> = {
  A: "vt__item--danger",
  B: "vt__item--warning",
  C: "vt__item--info",
};

/**
 * 根据 Gate 等级返回条目边框色调类名。
 *
 * @param item - 校验条目
 * @returns CSS 类名
 */
function itemClass(item: GateItem): string {
  return SEVERITY_CLASS[item.gate] ?? "";
}

/**
 * 判断当前案件是否存在任何校验条目。
 *
 * @param detail - 案件详情
 * @returns 是否包含校验条目
 */
function hasValidationItems(detail: CaseDetail): boolean {
  const v = detail.validation;
  return v.blocking.length > 0 || v.warnings.length > 0 || v.info.length > 0;
}

/**
 * 跳转到指定 Tab。
 *
 * @param tab - 目标 Tab ID
 */
function onNavigate(tab: CaseDetailTab | string) {
  emit("switch-tab", tab as CaseDetailTab);
}

/**
 * 解析最后执行时间，优先使用 ISO 格式化。
 * @param v - 校验数据
 * @param loc - 当前语言
 * @returns 格式化后的时间文案
 */
function resolveLastTime(v: ValidationData, loc: string): string {
  if (v.lastTimeIso) {
    const formatted = formatDateTime(v.lastTimeIso, loc);
    if (formatted) return formatted;
  }
  return v.lastTime;
}
</script>

<template>
  <div class="vt">
    <div class="vt__grid">
      <!-- Left: gate report + post-approval -->
      <div class="vt__col">
        <Card padding="lg">
          <template #header>
            <div class="vt__header-left">
              <h2 class="vt__title">
                {{ t("cases.detail.validation.tab.gateCard.title") }}
              </h2>
              <span
                v-if="detail.validation.blocking.length > 0"
                class="vt__chip vt__chip--danger"
              >
                {{ t("cases.detail.validation.tab.gateCard.currentBlocker") }}
              </span>
            </div>
            <Button
              v-if="!readonly"
              variant="filled"
              tone="primary"
              size="sm"
              :disabled="rerunLoading"
              :aria-busy="rerunLoading"
              @click="emit('rerun-validation')"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {{ t("cases.detail.validation.tab.gateCard.recheck") }}
            </Button>
          </template>

          <div class="vt__last-time">
            {{ resolveLastTime(detail.validation, locale) }}
          </div>

          <template v-if="hasValidationItems(detail)">
            <div v-if="detail.validation.blocking.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--danger">{{
                  t("cases.detail.validation.tab.gateCard.mustHandleFirst")
                }}</span>
                <span class="vt__chip vt__chip--danger">{{
                  t("cases.detail.validation.tab.gateCard.currentBlocker")
                }}</span>
              </div>
              <div
                v-for="(item, i) in detail.validation.blocking"
                :key="`b-${i}`"
                :class="['vt__item', itemClass(item)]"
              >
                <GateItemVue
                  :item="item"
                  :readonly="readonly"
                  show-assignee-meta
                  show-fix
                  @navigate="onNavigate"
                />
              </div>
            </div>

            <div v-if="detail.validation.warnings.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--warning">{{
                  t("cases.detail.validation.tab.gateCard.recommendStrengthen")
                }}</span>
                <span class="vt__chip vt__chip--warning">{{
                  t("cases.detail.validation.tab.gateCard.recommendHandle")
                }}</span>
              </div>
              <div
                v-for="(item, i) in detail.validation.warnings"
                :key="`w-${i}`"
                :class="['vt__item', itemClass(item)]"
              >
                <GateItemVue
                  :item="item"
                  :readonly="readonly"
                  wrap-note-as-suggestion
                />
              </div>
            </div>

            <div v-if="detail.validation.info.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--info">{{
                  t("cases.detail.validation.tab.gateCard.supplementaryInfo")
                }}</span>
                <span class="vt__chip vt__chip--info">{{
                  t("cases.detail.validation.tab.gateCard.onlyTip")
                }}</span>
              </div>
              <div
                v-for="(item, i) in detail.validation.info"
                :key="`i-${i}`"
                :class="['vt__item', itemClass(item)]"
              >
                <GateItemVue :item="item" :readonly="readonly" />
              </div>
            </div>
          </template>

          <div v-else class="vt__empty-gates">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>{{ t("cases.detail.validation.tab.gateCard.noBlockers") }}</p>
          </div>

          <template #footer>
            <div v-if="detail.validation.retriggerNote" class="vt__retrigger">
              {{ t(detail.validation.retriggerNote) }}
            </div>
          </template>
        </Card>
      </div>

      <!-- Right: submission packages + correction -->
      <div class="vt__col">
        <Card padding="lg">
          <template #header>
            <h2 class="vt__title">
              {{ t("cases.detail.validation.tab.submissionPackages.title") }}
            </h2>
            <Button
              v-if="!readonly"
              size="sm"
              :disabled="createSpLoading"
              :aria-busy="createSpLoading"
              @click="emit('create-submission-package')"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 4v16m8-8H4" />
              </svg>
              {{ t("cases.detail.validation.tab.submissionPackages.create") }}
            </Button>
          </template>

          <div v-if="detail.submissionPackages.length > 0" class="vt__packages">
            <div
              v-for="pkg in detail.submissionPackages"
              :key="pkg.id"
              class="vt__pkg"
            >
              <div class="vt__pkg-id">{{ pkg.id }}</div>
              <div class="vt__pkg-meta">{{ pkg.summary }}</div>
              <div class="vt__pkg-info">
                <span>{{ pkg.date }}</span>
                <Chip :tone="pkg.locked ? 'neutral' : 'primary'">
                  {{
                    pkg.locked
                      ? t(
                          "cases.detail.validation.tab.submissionPackages.locked",
                        )
                      : pkg.status
                  }}
                </Chip>
              </div>
            </div>
          </div>
          <div v-else class="vt__empty">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              class="vt__empty-icon"
            >
              <path
                d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
              />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p class="vt__empty-text">
              {{ t("cases.detail.validation.tab.submissionPackages.empty") }}
            </p>
          </div>
        </Card>

        <Card v-if="detail.correctionPackage" padding="lg">
          <span class="vt__kicker vt__kicker--warning">{{
            t("cases.detail.validation.tab.correction.kicker")
          }}</span>
          <h2 class="vt__title">
            {{ t("cases.detail.validation.tab.correction.title") }}
          </h2>
          <div class="vt__corr">
            <div class="vt__pkg-id">{{ detail.correctionPackage.id }}</div>
            <div class="vt__pkg-meta">
              {{ detail.correctionPackage.status }}
            </div>
            <div class="vt__corr-details">
              <span>{{
                t("cases.detail.validation.tab.correction.relatedSub", {
                  id: detail.correctionPackage.relatedSub,
                })
              }}</span>
              <span>{{
                t("cases.detail.validation.tab.correction.deadline", {
                  date: detail.correctionPackage.corrDeadline,
                })
              }}</span>
            </div>
            <div v-if="detail.correctionPackage.items" class="vt__corr-items">
              {{
                t("cases.detail.validation.tab.correction.items", {
                  items: detail.correctionPackage.items,
                })
              }}
            </div>
            <div v-if="detail.correctionPackage.note" class="vt__corr-note">
              {{ detail.correctionPackage.note }}
            </div>
          </div>
        </Card>
      </div>
    </div>

    <CaseValidationSupport
      :detail="detail"
      :readonly="readonly"
      :review-loading="reviewLoading"
      @open-risk-modal="emit('open-risk-modal')"
      @start-review="emit('start-review')"
    />
  </div>
</template>

<style scoped src="./CaseValidationTab.css"></style>
