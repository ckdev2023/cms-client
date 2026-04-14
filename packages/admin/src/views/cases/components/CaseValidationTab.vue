<script setup lang="ts">
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
              <h2 class="vt__title">提交前检查</h2>
              <span
                v-if="detail.validation.blocking.length > 0"
                class="vt__chip vt__chip--danger"
              >
                当前卡点
              </span>
            </div>
            <Button v-if="!readonly" variant="filled" tone="primary" size="sm">
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
              重新检查
            </Button>
          </template>

          <div class="vt__last-time">{{ detail.validation.lastTime }}</div>

          <template v-if="hasValidationItems(detail)">
            <div v-if="detail.validation.blocking.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--danger">必须先处理</span>
                <span class="vt__chip vt__chip--danger">当前卡点</span>
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
                      修复建议：{{ item.fix }}
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
                  <span v-if="item.assignee">责任人：{{ item.assignee }}</span>
                  <span v-if="item.deadline">截止：{{ item.deadline }}</span>
                </div>
              </div>
            </div>

            <div v-if="detail.validation.warnings.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--warning">建议补强</span>
                <span class="vt__chip vt__chip--warning">建议处理</span>
              </div>
              <div
                v-for="(item, i) in detail.validation.warnings"
                :key="`w-${i}`"
                :class="['vt__item', itemClass(item)]"
              >
                <div class="vt__item-title">{{ item.title }}</div>
                <div v-if="item.note" class="vt__item-desc">
                  建议：{{ item.note }}
                </div>
              </div>
            </div>

            <div v-if="detail.validation.info.length > 0" class="vt__group">
              <div class="vt__group-head">
                <span class="vt__kicker vt__kicker--info">补充说明</span>
                <span class="vt__chip vt__chip--info">仅提示</span>
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
            <p>校验通过，无阻断项</p>
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
            <h2 class="vt__title">提交包（历史快照）</h2>
            <Button v-if="!readonly" size="sm">
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
              新建提交包
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
                <Chip :tone="pkg.locked ? 'neutral' : 'primary'" size="sm">
                  {{ pkg.locked ? "已锁定" : pkg.status }}
                </Chip>
              </div>
            </div>
          </div>
          <div v-else class="vt__empty">暂无提交包记录</div>
        </Card>

        <Card v-if="detail.correctionPackage" padding="lg">
          <span class="vt__kicker vt__kicker--warning">补正包</span>
          <h2 class="vt__title">补正通知关联</h2>
          <div class="vt__corr">
            <div class="vt__pkg-id">{{ detail.correctionPackage.id }}</div>
            <div class="vt__pkg-meta">
              {{ detail.correctionPackage.status }}
            </div>
            <div class="vt__corr-details">
              <span
                >关联原提交包：{{ detail.correctionPackage.relatedSub }}</span
              >
              <span>补正截止：{{ detail.correctionPackage.corrDeadline }}</span>
            </div>
            <div v-if="detail.correctionPackage.items" class="vt__corr-items">
              补正项：{{ detail.correctionPackage.items }}
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

<style scoped>
.vt {
  display: grid;
  gap: 20px;
}
.vt__grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
@media (max-width: 1024px) {
  .vt__grid {
    grid-template-columns: 1fr;
  }
}
.vt__col {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vt__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.vt__title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.vt__last-time {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-bottom: 16px;
}

.vt__chip {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  line-height: 1.5;
  white-space: nowrap;
}
.vt__chip--danger {
  background: rgba(220, 38, 38, 0.08);
  color: #991b1b;
}
.vt__chip--warning {
  background: rgba(245, 158, 11, 0.08);
  color: #92400e;
}
.vt__chip--info {
  background: rgba(59, 130, 246, 0.08);
  color: #1d4ed8;
}

.vt__group {
  padding-top: 12px;
}
.vt__group + .vt__group {
  border-top: 1px solid var(--color-border-1);
}
.vt__group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.vt__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.vt__kicker--danger {
  color: var(--color-danger);
}
.vt__kicker--warning {
  color: #f59e0b;
}
.vt__kicker--info {
  color: var(--color-primary-6);
}

.vt__item {
  padding: 12px 16px;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-3);
}
.vt__item + .vt__item {
  margin-top: 8px;
}
.vt__item--danger {
  border-left: 3px solid var(--color-danger);
}
.vt__item--warning {
  border-left: 3px solid #f59e0b;
}
.vt__item--info {
  border-left: 3px solid var(--color-primary-6);
}

.vt__item-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.vt__item-main {
  min-width: 0;
  flex: 1;
}
.vt__item-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.vt__item-desc {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 4px;
}
.vt__item-meta {
  display: flex;
  gap: 16px;
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.vt__empty-gates {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  color: var(--color-success, #22c55e);
}
.vt__empty-gates p {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
.vt__retrigger {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.vt__packages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.vt__pkg {
  padding: 16px;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid var(--color-border-1);
  background: var(--color-bg-3);
}
.vt__pkg-id {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.vt__pkg-meta {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 4px;
}
.vt__pkg-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

.vt__corr {
  padding: 16px;
  margin-top: 12px;
  border-radius: var(--radius-lg, 12px);
  border: 1px solid rgba(245, 158, 11, 0.2);
  background: rgba(245, 158, 11, 0.03);
}
.vt__corr-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
.vt__corr-items {
  margin-top: 8px;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-2);
}
.vt__corr-note {
  margin-top: 8px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  font-style: italic;
}

.vt__empty {
  padding: 24px 16px;
  text-align: center;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}
</style>
