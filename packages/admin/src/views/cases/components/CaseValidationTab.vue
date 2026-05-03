<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import Chip from "../../../shared/ui/Chip.vue";
import CaseValidationSupport from "./CaseValidationSupport.vue";

import type { CaseDetail, GateItem } from "../types-detail";
import type { CaseDetailTab } from "../types";

/** 校验与提交 Tab：展示 Gate 报告、提交包、补正包与支持区。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const emit = defineEmits<{
  (e: "switch-tab", tab: CaseDetailTab): void;
  (e: "open-risk-modal"): void;
}>();

const { t } = useI18n();

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
              disabled
              :title="t('shell.topbar.comingSoon')"
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

          <div class="vt__last-time">{{ detail.validation.lastTime }}</div>

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
                <div class="vt__item-row">
                  <div class="vt__item-main">
                    <div class="vt__item-title">{{ item.title }}</div>
                    <div v-if="item.fix" class="vt__item-desc">
                      {{
                        t(
                          "cases.detail.validation.tab.gateCard.fixSuggestion",
                          { fix: item.fix },
                        )
                      }}
                    </div>
                  </div>
                  <Button
                    v-if="item.actionLabel && item.actionTab"
                    size="sm"
                    pill
                    @click="onNavigate(item.actionTab!)"
                  >
                    {{ item.actionLabel }}
                  </Button>
                </div>
                <div
                  v-if="item.assignee || item.deadline"
                  class="vt__item-meta"
                >
                  <span v-if="item.assignee">{{
                    t("cases.detail.validation.tab.gateCard.assignee", {
                      name: item.assignee,
                    })
                  }}</span>
                  <span v-if="item.deadline">{{
                    t("cases.detail.validation.tab.gateCard.deadline", {
                      date: item.deadline,
                    })
                  }}</span>
                </div>
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
                <div class="vt__item-title">{{ item.title }}</div>
                <div v-if="item.note" class="vt__item-desc">
                  {{
                    t("cases.detail.validation.tab.gateCard.suggestion", {
                      note: item.note,
                    })
                  }}
                </div>
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
                <div class="vt__item-title">{{ item.title }}</div>
                <div v-if="item.note" class="vt__item-desc">
                  {{ item.note }}
                </div>
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
              {{ detail.validation.retriggerNote }}
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
              disabled
              :title="t('shell.topbar.comingSoon')"
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
            {{ t("cases.detail.validation.tab.submissionPackages.empty") }}
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
      @open-risk-modal="emit('open-risk-modal')"
    />
  </div>
</template>

<style scoped src="./CaseValidationTab.css"></style>
