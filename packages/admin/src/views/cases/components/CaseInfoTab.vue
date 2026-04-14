<script setup lang="ts">
import Card from "../../../shared/ui/Card.vue";
import type { CaseDetail, RelatedParty } from "../types-detail";

/** 基础信息 Tab：案件属性表单、关联主体列表与风险标签占位。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

/**
 * 根据关联主体的 avatarStyle 生成头像内联样式。
 *
 * @param party - 关联主体数据
 * @returns 包含 background 和 color 的样式对象
 */
function partyAvatarStyle(party: RelatedParty): Record<string, string> {
  if (party.avatarStyle === "gradient") {
    return {
      background:
        "linear-gradient(135deg, var(--color-primary-6), var(--color-primary-7, #0369a1))",
      color: "#fff",
    };
  }
  return {
    background: "var(--color-bg-3)",
    color: "var(--color-text-1)",
  };
}
</script>

<template>
  <div class="info-tab">
    <div class="info-tab__grid">
      <!-- Case attributes -->
      <div class="info-tab__main">
        <Card title="案件属性" padding="md">
          <div class="info-tab__fields">
            <div class="info-tab__field">
              <label class="info-tab__label">案件编号</label>
              <input
                type="text"
                class="info-tab__input info-tab__input--disabled"
                :value="detail.id"
                disabled
              />
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">案件类型</label>
              <input
                type="text"
                class="info-tab__input"
                :class="{ 'info-tab__input--disabled': readonly }"
                :value="detail.caseType"
                :disabled="readonly"
                readonly
              />
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">申请类型</label>
              <input
                type="text"
                class="info-tab__input"
                :class="{ 'info-tab__input--disabled': readonly }"
                :value="detail.applicationType"
                :disabled="readonly"
                readonly
              />
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">受理日期</label>
              <input
                type="text"
                class="info-tab__input"
                :class="{ 'info-tab__input--disabled': readonly }"
                :value="detail.acceptedDate"
                :disabled="readonly"
                readonly
              />
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">目标提交日期</label>
              <input
                type="text"
                class="info-tab__input"
                :class="{ 'info-tab__input--disabled': readonly }"
                :value="detail.targetDate"
                :disabled="readonly"
                readonly
              />
            </div>
            <div class="info-tab__field">
              <label class="info-tab__label">管辖机构</label>
              <input
                type="text"
                class="info-tab__input"
                :class="{ 'info-tab__input--disabled': readonly }"
                :value="detail.agency"
                :disabled="readonly"
                readonly
              />
            </div>
          </div>
        </Card>
      </div>

      <!-- Sidebar -->
      <div class="info-tab__sidebar">
        <!-- Related parties -->
        <Card padding="md">
          <template #header>
            <h3 class="info-tab__section-title">关联主体</h3>
          </template>
          <div class="info-tab__parties">
            <div
              v-for="(party, i) in detail.relatedParties"
              :key="i"
              class="info-tab__party-card"
            >
              <div class="info-tab__party-header">
                <span
                  class="info-tab__party-avatar"
                  :style="partyAvatarStyle(party)"
                >
                  {{ party.initials }}
                </span>
                <div>
                  <div class="info-tab__party-name">{{ party.name }}</div>
                  <div class="info-tab__party-role">{{ party.role }}</div>
                </div>
              </div>
              <div class="info-tab__party-detail">{{ party.detail }}</div>
            </div>
          </div>
        </Card>

        <!-- Risk tags placeholder -->
        <Card padding="md">
          <h3 class="info-tab__section-title" style="margin-bottom: 12px">
            风险标签
          </h3>
          <div class="info-tab__placeholder">
            <span class="info-tab__placeholder-text">暂无风险标签</span>
            <span class="info-tab__placeholder-sub"
              >风险标签功能将在后续版本上线</span
            >
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.info-tab {
  display: grid;
  gap: 20px;
}

.info-tab__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

@media (max-width: 1024px) {
  .info-tab__grid {
    grid-template-columns: 1fr;
  }
}

.info-tab__main,
.info-tab__sidebar {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Fields ────────────────────────────────────────────── */

.info-tab__fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 600px) {
  .info-tab__fields {
    grid-template-columns: 1fr;
  }
}

.info-tab__field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-tab__label {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info-tab__input {
  padding: 8px 12px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  outline: none;
  transition:
    border-color var(--transition-normal),
    box-shadow var(--transition-normal);
}

.info-tab__input:focus-visible {
  border-color: var(--color-primary-6);
  box-shadow: 0 0 0 2px var(--color-primary-outline);
}

.info-tab__input--disabled {
  background: var(--color-bg-3);
  color: var(--color-text-3);
  cursor: not-allowed;
}

/* ── Section title ─────────────────────────────────────── */

.info-tab__section-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

/* ── Related parties ───────────────────────────────────── */

.info-tab__parties {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-tab__party-card {
  padding: 12px;
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg, 12px);
  transition: border-color 0.15s;
}

.info-tab__party-card:hover {
  border-color: rgba(3, 105, 161, 0.25);
}

.info-tab__party-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.info-tab__party-avatar {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
}

.info-tab__party-name {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.info-tab__party-role {
  font-size: 11px;
  color: var(--color-text-3);
}

.info-tab__party-detail {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  padding-left: 42px;
}

/* ── Placeholder ───────────────────────────────────────── */

.info-tab__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 24px 12px;
}

.info-tab__placeholder-text {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
}

.info-tab__placeholder-sub {
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
</style>
