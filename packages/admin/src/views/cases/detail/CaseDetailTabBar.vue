<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { CaseDetailTab, CaseDetailTabDef } from "../types";
import type { TabCounter } from "../model/caseDetailTabCounter";

/**
 * 案件详情 tablist：渲染 tab 条与计数徽标，并实现 ARIA tab pattern 的键盘导航
 * （ArrowLeft/Right/Home/End），跳过不可访问的 tab。
 *
 * 可访问性判定由壳通过 `isTabAccessible` 注入（`useCaseDetailGuard` 的判定），
 * 本组件不自行解释终态规则；切换一律以 `select` 事件上报，由壳统一改 URL 与状态。
 */
const props = defineProps<{
  tabs: readonly CaseDetailTabDef[];
  activeTab: CaseDetailTab;
  counters: Partial<Record<CaseDetailTab, TabCounter>>;
  isTabAccessible: (tabKey: CaseDetailTab) => boolean;
}>();

const emit = defineEmits<{
  select: [tabKey: CaseDetailTab];
}>();

const { t } = useI18n();
const tabRefs = ref<HTMLElement[]>([]);

/**
 * 解析 Tab 计数器展示文案，优先使用 i18n 文案。
 * @param c - Tab 计数器配置。
 * @returns 当前计数器应展示的文本。
 */
function counterLabel(c: TabCounter): string {
  return c.i18nKey ? t(c.i18nKey, c.i18nParams ?? {}) : c.label;
}

/**
 * 从指定索引出发，按方向查找下一个可访问的 tab 索引。
 *
 * @param fromIdx - 起始索引
 * @param direction - 搜索方向（1 向右，-1 向左）
 * @returns 可访问的 tab 索引，找不到时返回 -1
 */
function findNextAccessibleTab(fromIdx: number, direction: 1 | -1): number {
  const len = props.tabs.length;
  for (let i = 1; i <= len; i++) {
    const candidate = (fromIdx + direction * i + len) % len;
    if (props.isTabAccessible(props.tabs[candidate].key)) return candidate;
  }
  return -1;
}

/**
 * 处理 tab 键盘导航（ArrowLeft/Right/Home/End），跳过终态下不可访问的 tab。
 * @param event - 键盘事件
 */
function onTabKeydown(event: KeyboardEvent): void {
  const idx = props.tabs.findIndex((tab) => tab.key === props.activeTab);
  let targetIdx = -1;

  switch (event.key) {
    case "ArrowRight":
      targetIdx = findNextAccessibleTab(idx, 1);
      break;
    case "ArrowLeft":
      targetIdx = findNextAccessibleTab(idx, -1);
      break;
    case "Home":
      targetIdx = findNextAccessibleTab(-1, 1);
      break;
    case "End":
      targetIdx = findNextAccessibleTab(props.tabs.length, -1);
      break;
    default:
      return;
  }
  if (targetIdx < 0) return;
  event.preventDefault();
  emit("select", props.tabs[targetIdx].key);
  tabRefs.value[targetIdx]?.focus();
}

/**
 * 点击 tab 时守门：不可访问的 tab 不切换。
 *
 * @param tabKey - 目标 tab 键名
 */
function onTabClick(tabKey: CaseDetailTab): void {
  if (!props.isTabAccessible(tabKey)) return;
  emit("select", tabKey);
}
</script>

<template>
  <div
    class="case-detail-view__tabs"
    role="tablist"
    :aria-label="t('cases.detail.tabsLabel')"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      ref="tabRefs"
      type="button"
      role="tab"
      :id="`caseTab-${tab.key}`"
      :aria-controls="`casePanel-${tab.key}`"
      :class="[
        'case-detail-view__tab',
        { active: activeTab === tab.key },
        {
          'case-detail-view__tab--disabled': !isTabAccessible(tab.key),
        },
      ]"
      :aria-selected="activeTab === tab.key"
      :aria-disabled="!isTabAccessible(tab.key) || undefined"
      :tabindex="
        !isTabAccessible(tab.key) ? -1 : tab.key === activeTab ? 0 : -1
      "
      @click="onTabClick(tab.key)"
      @keydown="onTabKeydown($event)"
    >
      {{ t(tab.i18nKey) }}
      <span
        v-if="counters[tab.key]"
        :class="[
          'case-detail-view__counter',
          {
            'case-detail-view__counter--danger':
              counters[tab.key]!.tone === 'danger',
            'case-detail-view__counter--warning':
              counters[tab.key]!.tone === 'warning',
          },
        ]"
      >
        {{ counterLabel(counters[tab.key]!) }}
      </span>
    </button>
  </div>
</template>

<style scoped src="./CaseDetailTabBar.css"></style>
