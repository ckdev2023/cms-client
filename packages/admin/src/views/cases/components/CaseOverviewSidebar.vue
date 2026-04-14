<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import Button from "../../../shared/ui/Button.vue";
import type { CaseDetailTab } from "../types";
import type { CaseDetail, TeamMember } from "../types-detail";

/** 概览右侧边栏：阻断与风险摘要、案件团队、提交前校验提示。 */
defineProps<{
  detail: CaseDetail;
}>();

const emit = defineEmits<{
  (e: "switchTab", tab: CaseDetailTab): void;
}>();

/**
 * 将团队成员的 gradient 标识映射为 CSS linear-gradient 值。
 *
 * @param member - 团队成员数据
 * @returns CSS 渐变字符串
 */
function teamGradient(member: TeamMember): string {
  const map: Record<string, string> = {
    "from-[var(--primary)] to-[var(--primary-hover)]":
      "linear-gradient(135deg, var(--color-primary-6), var(--color-primary-7, #0369a1))",
    "from-[var(--success)] to-[#28a745]":
      "linear-gradient(135deg, var(--color-success), #28a745)",
    "from-[var(--warning)] to-[#e68a00]":
      "linear-gradient(135deg, #f59e0b, #e68a00)",
    "from-[#ec4899] to-[#db2777]": "linear-gradient(135deg, #ec4899, #db2777)",
    "from-[#8b5cf6] to-[#7c3aed]": "linear-gradient(135deg, #8b5cf6, #7c3aed)",
  };
  return (
    map[member.gradient] ??
    "linear-gradient(135deg, var(--color-primary-6), var(--color-primary-7))"
  );
}
</script>

<template>
  <div class="overview-sidebar">
    <!-- Risk summary -->
    <Card padding="md">
      <span class="overview-sidebar__kicker">阻断与风险摘要</span>
      <div class="overview-sidebar__risk-list">
        <div class="overview-sidebar__risk-item">
          <span
            class="overview-sidebar__risk-dot"
            style="background: var(--color-danger)"
          />
          <div>
            <div class="overview-sidebar__risk-title">
              {{ detail.risk.blockingCount }}
            </div>
            <div class="overview-sidebar__risk-detail">
              {{ detail.risk.blockingDetail }}
            </div>
          </div>
        </div>
        <div class="overview-sidebar__risk-item">
          <span
            class="overview-sidebar__risk-dot"
            style="background: #f59e0b"
          />
          <div>
            <div class="overview-sidebar__risk-title">
              {{ detail.risk.arrearsStatus }}
            </div>
            <div class="overview-sidebar__risk-detail">
              {{ detail.risk.arrearsDetail }}
            </div>
          </div>
        </div>
        <div class="overview-sidebar__risk-item">
          <span
            class="overview-sidebar__risk-dot"
            :style="{
              background: detail.deadlineDanger
                ? 'var(--color-danger)'
                : 'var(--color-border-2)',
            }"
          />
          <div>
            <div class="overview-sidebar__risk-title">
              {{ detail.risk.deadlineAlert }}
            </div>
            <div class="overview-sidebar__risk-detail">
              {{ detail.risk.deadlineAlertDetail }}
            </div>
          </div>
        </div>
        <div class="overview-sidebar__risk-item">
          <span
            class="overview-sidebar__risk-dot"
            style="background: var(--color-border-2)"
          />
          <div>
            <div class="overview-sidebar__risk-title">
              {{ detail.risk.lastValidation }}
            </div>
            <div class="overview-sidebar__risk-detail">
              {{ detail.risk.reviewStatus }}
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Team -->
    <Card padding="md">
      <template #header>
        <h3 class="overview-sidebar__section-title">案件团队</h3>
      </template>
      <div class="overview-sidebar__team-list">
        <div
          v-for="(member, i) in detail.team"
          :key="i"
          class="overview-sidebar__team-member"
        >
          <span
            class="overview-sidebar__team-avatar"
            :style="{ background: teamGradient(member) }"
          >
            {{ member.initials }}
          </span>
          <div class="overview-sidebar__team-info">
            <div class="overview-sidebar__team-name">
              {{ member.name }}
              <span
                v-if="member.role"
                class="overview-sidebar__team-role-chip"
                >{{ member.role }}</span
              >
            </div>
            <div class="overview-sidebar__team-subtitle">
              {{ member.subtitle }}
            </div>
          </div>
        </div>
      </div>
    </Card>

    <!-- Validation hint -->
    <Card padding="md">
      <div class="overview-sidebar__validation-hint">
        <div class="overview-sidebar__validation-hint-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="overview-sidebar__validation-hint-title">提交前校验</h3>
      </div>
      <p class="overview-sidebar__validation-hint-text">
        {{ detail.validationHint }}
      </p>
      <Button
        variant="filled"
        tone="primary"
        size="sm"
        class="overview-sidebar__validation-hint-btn"
        @click="emit('switchTab', 'validation')"
      >
        查看校验与提交包
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M9 5l7 7-7 7" />
        </svg>
      </Button>
    </Card>
  </div>
</template>

<style scoped>
.overview-sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.overview-sidebar__kicker {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* ── Risk ──────────────────────────────────────────────── */

.overview-sidebar__risk-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-top: 12px;
}

.overview-sidebar__risk-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.overview-sidebar__risk-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  margin-top: 5px;
}

.overview-sidebar__risk-title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.overview-sidebar__risk-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  margin-top: 1px;
}

/* ── Team ──────────────────────────────────────────────── */

.overview-sidebar__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.overview-sidebar__team-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-sidebar__team-member {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin: 0 -8px;
  border-radius: var(--radius-lg, 12px);
  transition: background-color 0.15s;
}

.overview-sidebar__team-member:hover {
  background: var(--color-bg-3);
}

.overview-sidebar__team-avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
}

.overview-sidebar__team-info {
  min-width: 0;
}

.overview-sidebar__team-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.overview-sidebar__team-role-chip {
  display: inline-flex;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: var(--font-weight-bold);
  border-radius: var(--radius-full);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-2);
  color: var(--color-text-2);
}

.overview-sidebar__team-subtitle {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}

/* ── Validation hint ───────────────────────────────────── */

.overview-sidebar__validation-hint {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.overview-sidebar__validation-hint-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: rgba(245, 158, 11, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #f59e0b;
}

.overview-sidebar__validation-hint-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.overview-sidebar__validation-hint-text {
  margin: 0 0 16px;
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  line-height: 1.6;
}

.overview-sidebar__validation-hint-btn {
  width: 100%;
  justify-content: center;
}
</style>
