<script setup lang="ts">
import { ref } from "vue";
import Card from "../../../shared/ui/Card.vue";
import Chip from "../../../shared/ui/Chip.vue";
import type { CaseDetail, MessageTypeKey } from "../types-detail";
import { MESSAGE_FILTERS } from "../constants";

/** 沟通记录 Tab：消息时间线、撰写区与类型筛选面板。 */
defineProps<{
  detail: CaseDetail;
  readonly: boolean;
}>();

const activeFilter = ref<"all" | MessageTypeKey>("all");

const CHIP_TONE_MAP: Record<
  string,
  "neutral" | "primary" | "success" | "warning"
> = {
  internal: "success",
  client_visible: "warning",
  phone: "primary",
  meeting: "primary",
  auto_email: "neutral",
};

const AVATAR_BG: Record<string, string> = {
  primary: "var(--color-primary-6)",
  success: "var(--color-success, #22c55e)",
  warning: "#f59e0b",
  surface: "var(--color-bg-3)",
};

/**
 * 根据头像色调键返回背景色。
 *
 * @param style - 头像样式标识
 * @returns CSS 背景色值
 */
function avatarBg(style: string): string {
  return AVATAR_BG[style] ?? "var(--color-primary-6)";
}

/**
 * 根据头像色调键返回前景色。
 *
 * @param style - 头像样式标识
 * @returns CSS 前景色值
 */
function avatarColor(style: string): string {
  return style === "surface" ? "var(--color-text-2)" : "#fff";
}
</script>

<template>
  <div class="messages-tab">
    <div class="messages-tab__grid">
      <div class="messages-tab__main">
        <Card v-if="!readonly" padding="md">
          <textarea
            class="messages-tab__composer"
            rows="3"
            placeholder="记录内部备注、客户可见备注或电话/线下沟通内容..."
          />
          <p class="messages-tab__composer-hint">
            内部备注默认客户不可见；如需客户可见，需显式选择"客户可见备注"。
          </p>
          <div class="messages-tab__composer-footer">
            <div class="messages-tab__composer-right">
              <select class="messages-tab__type-select">
                <option>内部备注</option>
                <option>客户可见备注</option>
                <option>电话记录</option>
                <option>线下会议</option>
              </select>
              <button class="messages-tab__publish-btn" type="button">
                记录留痕
              </button>
            </div>
          </div>
        </Card>

        <template v-if="detail.messages.length > 0">
          <Card
            v-for="msg in activeFilter === 'all'
              ? detail.messages
              : detail.messages.filter((m) => m.type === activeFilter)"
            :key="msg.id"
            padding="md"
            hoverable
          >
            <div class="messages-tab__msg-header">
              <div class="messages-tab__msg-author">
                <span
                  class="messages-tab__avatar"
                  :style="{
                    backgroundColor: avatarBg(msg.avatarStyle),
                    color: avatarColor(msg.avatarStyle),
                  }"
                >
                  {{ msg.avatar }}
                </span>
                <span class="messages-tab__author-name">{{ msg.author }}</span>
                <Chip :tone="CHIP_TONE_MAP[msg.type] ?? 'neutral'" size="sm">
                  {{ msg.typeLabel }}
                </Chip>
              </div>
              <span class="messages-tab__msg-time">{{ msg.time }}</span>
            </div>
            <p class="messages-tab__msg-body">{{ msg.body }}</p>
            <div v-if="msg.actionLabel" class="messages-tab__msg-action">
              <button class="messages-tab__action-link" type="button">
                {{ msg.actionLabel }}
              </button>
            </div>
            <div
              v-if="!readonly && !msg.actionLabel"
              class="messages-tab__msg-hover-actions"
            >
              <button class="messages-tab__hover-btn" type="button">
                回复
              </button>
              <button class="messages-tab__hover-btn" type="button">
                编辑
              </button>
            </div>
          </Card>
        </template>

        <Card v-else padding="lg">
          <p class="messages-tab__empty">暂无沟通记录</p>
        </Card>
      </div>

      <div class="messages-tab__sidebar">
        <Card padding="md">
          <template #header>
            <h2 class="messages-tab__filter-title">过滤筛选</h2>
            <button
              class="messages-tab__filter-reset"
              type="button"
              @click="activeFilter = 'all'"
            >
              重置
            </button>
          </template>
          <div class="messages-tab__filter-list">
            <label
              v-for="f in MESSAGE_FILTERS"
              :key="f.key"
              class="messages-tab__filter-item"
            >
              <input
                type="radio"
                name="msgFilter"
                :value="f.key"
                :checked="activeFilter === f.key"
                class="messages-tab__filter-radio"
                @change="activeFilter = f.key as typeof activeFilter"
              />
              <span
                :class="[
                  'messages-tab__filter-label',
                  {
                    'messages-tab__filter-label--active':
                      activeFilter === f.key,
                  },
                ]"
              >
                {{ f.label }}
              </span>
            </label>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.messages-tab {
  display: grid;
  gap: 20px;
}
.messages-tab__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}
@media (min-width: 1024px) {
  .messages-tab__grid {
    grid-template-columns: 2fr 1fr;
  }
}
.messages-tab__main {
  display: grid;
  gap: 16px;
}
.messages-tab__sidebar {
  display: grid;
  gap: 16px;
  align-content: start;
}

.messages-tab__composer {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-sm);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  resize: none;
  transition: border-color var(--transition-normal);
  &:focus {
    outline: none;
    border-color: var(--color-primary-6);
    box-shadow: 0 0 0 3px var(--color-primary-outline);
  }
}
.messages-tab__composer-hint {
  margin: 8px 0 12px;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
}
.messages-tab__composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.messages-tab__composer-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.messages-tab__type-select {
  appearance: none;
  padding: 6px 10px;
  border: 1px solid var(--color-border-2);
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
  background: var(--color-bg-1);
  cursor: pointer;
}
.messages-tab__publish-btn {
  padding: 6px 16px;
  border: none;
  border-radius: var(--radius-default);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: #fff;
  background: var(--color-primary-6);
  cursor: pointer;
  transition: background-color 0.15s;
  &:hover {
    background: var(--color-primary-hover, #025a8c);
  }
}

.messages-tab__msg-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.messages-tab__msg-author {
  display: flex;
  align-items: center;
  gap: 8px;
}
.messages-tab__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: var(--font-weight-black);
  flex-shrink: 0;
}
.messages-tab__author-name {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.messages-tab__msg-time {
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  white-space: nowrap;
  flex-shrink: 0;
}
.messages-tab__msg-body {
  margin: 0 0 0 36px;
  font-size: 14px;
  color: var(--color-text-1);
  line-height: 1.6;
}
.messages-tab__msg-action {
  margin: 8px 0 0 36px;
}
.messages-tab__action-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-bold);
  color: var(--color-primary-6);
  cursor: pointer;
  &:hover {
    text-decoration: underline;
  }
}
.messages-tab__msg-hover-actions {
  display: flex;
  gap: 12px;
  margin: 8px 0 0 36px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ui-card--hoverable:hover .messages-tab__msg-hover-actions {
  opacity: 1;
}
.messages-tab__hover-btn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  cursor: pointer;
  transition: color 0.15s;
  &:hover {
    color: var(--color-primary-6);
  }
}

.messages-tab__filter-title {
  margin: 0;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}
.messages-tab__filter-reset {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: var(--font-size-xs);
  color: var(--color-text-3);
  cursor: pointer;
  &:hover {
    color: var(--color-text-1);
  }
}
.messages-tab__filter-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.messages-tab__filter-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-default);
  cursor: pointer;
  transition: background-color 0.15s;
  &:hover {
    background: var(--color-bg-3);
  }
}
.messages-tab__filter-radio {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-6);
  flex-shrink: 0;
}
.messages-tab__filter-label {
  font-size: var(--font-size-sm);
  color: var(--color-text-2);
}
.messages-tab__filter-label--active {
  font-weight: var(--font-weight-bold);
  color: var(--color-text-1);
}

.messages-tab__empty {
  margin: 0;
  padding: 48px 24px;
  text-align: center;
  color: var(--color-text-3);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}
</style>
