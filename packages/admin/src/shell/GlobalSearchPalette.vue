<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { SearchHit } from "../shared/api/searchRepository";
import type { SearchGroup } from "./useGlobalSearch";
import NavIcon from "./NavIcon.vue";

/**
 * 全局搜索命令面板，⌘K 唤起，支持分组结果列表、键盘导航与 focus trap。
 */
const DIALOG_ID = "global-search-palette";

const props = defineProps<{
  open: boolean;
  groups: readonly SearchGroup[];
  flatHits: readonly SearchHit[];
  highlightedIndex: number;
  loading: boolean;
  query: string;
}>();

const emit = defineEmits<{
  "update:open": [value: boolean];
  "update:query": [value: string];
  moveHighlight: [delta: number];
  select: [hit?: SearchHit];
}>();

const { t } = useI18n();
const inputRef = ref<HTMLInputElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const hasQuery = computed(() => props.query.trim().length > 0);
const showEmpty = computed(
  () => hasQuery.value && !props.loading && props.flatHits.length === 0,
);
const showResults = computed(() => props.flatHits.length > 0);

let trapFocusCleanup: (() => void) | null = null;

watch(
  () => props.open,
  async (open) => {
    if (open) {
      await nextTick();
      inputRef.value?.focus();
      const handler = makeFocusTrapHandler();
      document.addEventListener("keydown", handler, true);
      trapFocusCleanup = () =>
        document.removeEventListener("keydown", handler, true);
    } else {
      trapFocusCleanup?.();
      trapFocusCleanup = null;
    }
  },
);

/**
 * 构造 Tab 键 focus trap 处理函数，防止焦点逃逸至面板外部。
 *
 * @returns keydown 事件处理函数
 */
function makeFocusTrapHandler(): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== "Tab" || !panelRef.value) return;
    const focusable = panelRef.value.querySelectorAll<HTMLElement>(
      'input, button, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}

/**
 * 处理面板内键盘快捷键（↑↓ 导航、Enter 选中、Esc 关闭）。
 *
 * @param e - 键盘事件
 */
function handleKeydown(e: KeyboardEvent): void {
  switch (e.key) {
    case "ArrowDown":
      e.preventDefault();
      emit("moveHighlight", 1);
      scrollActiveIntoView();
      break;
    case "ArrowUp":
      e.preventDefault();
      emit("moveHighlight", -1);
      scrollActiveIntoView();
      break;
    case "Enter":
      e.preventDefault();
      emit("select");
      break;
    case "Escape":
      e.preventDefault();
      emit("update:open", false);
      break;
  }
}

/**
 * 将当前高亮项滚动到可视区域。
 */
function scrollActiveIntoView(): void {
  nextTick(() => {
    panelRef.value
      ?.querySelector<HTMLElement>(
        `[data-search-index="${props.highlightedIndex}"]`,
      )
      ?.scrollIntoView({ block: "nearest" });
  });
}

/**
 * 计算命中项在展平列表中的全局索引。
 *
 * @param groupIdx - 分组序号
 * @param itemIdx - 分组内序号
 * @returns 展平列表中的位置
 */
function globalIndex(groupIdx: number, itemIdx: number): number {
  let offset = 0;
  for (let i = 0; i < groupIdx; i++) {
    offset += props.groups[i]!.hits.length;
  }
  return offset + itemIdx;
}

onBeforeUnmount(() => {
  trapFocusCleanup?.();
  trapFocusCleanup = null;
});
</script>

<template>
  <Teleport to="body">
    <Transition name="search-palette">
      <div
        v-if="open"
        class="search-palette-backdrop"
        @mousedown.self="$emit('update:open', false)"
      >
        <div
          :id="DIALOG_ID"
          ref="panelRef"
          class="search-palette"
          role="dialog"
          aria-modal="true"
          :aria-label="t('shell.search.title')"
          @keydown="handleKeydown"
        >
          <div class="search-palette-header">
            <NavIcon name="search" />
            <input
              id="global-search-input"
              name="globalSearch"
              ref="inputRef"
              type="search"
              class="search-palette-input"
              autocomplete="off"
              :placeholder="t('shell.search.placeholder')"
              :aria-label="t('shell.search.title')"
              :value="query"
              @input="
                $emit('update:query', ($event.target as HTMLInputElement).value)
              "
            />
            <kbd class="search-palette-kbd">Esc</kbd>
          </div>

          <div class="search-palette-body">
            <div v-if="loading" class="search-palette-state">
              <div class="search-palette-spinner" aria-hidden="true" />
              <span>{{ t("shell.search.loading") }}</span>
            </div>

            <div
              v-else-if="showEmpty"
              class="search-palette-state"
              role="status"
            >
              <p class="search-palette-empty-title">
                {{ t("shell.search.empty") }}
              </p>
              <p class="search-palette-muted">
                {{ t("shell.search.placeholder") }}
              </p>
            </div>

            <template v-else-if="showResults">
              <div
                v-for="(group, gIdx) in groups"
                :key="group.type"
                class="search-palette-group"
                role="group"
                :aria-label="t(`shell.search.group.${group.type}s`)"
              >
                <div class="search-palette-group-label">
                  {{ t(`shell.search.group.${group.type}s`) }}
                </div>
                <ul class="search-palette-list" role="listbox">
                  <li
                    v-for="(hit, hIdx) in group.hits"
                    :key="hit.id"
                    role="option"
                    :aria-selected="
                      globalIndex(gIdx, hIdx) === highlightedIndex
                    "
                    :data-search-index="globalIndex(gIdx, hIdx)"
                    :class="[
                      'search-palette-item',
                      {
                        'search-palette-item--active':
                          globalIndex(gIdx, hIdx) === highlightedIndex,
                      },
                    ]"
                    @click="$emit('select', hit)"
                    @mouseenter="
                      $emit(
                        'moveHighlight',
                        globalIndex(gIdx, hIdx) - highlightedIndex,
                      )
                    "
                  >
                    <span class="search-palette-item-title">{{
                      hit.title
                    }}</span>
                    <span
                      v-if="hit.subtitle"
                      class="search-palette-item-subtitle"
                      >{{ hit.subtitle }}</span
                    >
                  </li>
                </ul>
              </div>
            </template>

            <div
              v-else-if="!hasQuery"
              class="search-palette-state"
              role="status"
            >
              <p class="search-palette-muted">
                {{ t("shell.search.placeholder") }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: min(15vh, 120px);
  background: var(--color-bg-modal-scrim);
}
.search-palette {
  width: min(580px, 92vw);
  max-height: min(480px, 70vh);
  display: flex;
  flex-direction: column;
  background: var(--color-bg-1);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  overflow: hidden;
}
.search-palette-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6) var(--space-7);
  border-bottom: 1px solid var(--color-border-1);
  flex: 0 0 auto;
}
.search-palette-header > svg {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  color: var(--color-text-3);
}
.search-palette-input {
  all: unset;
  flex: 1 1 auto;
  min-width: 0;
  font-size: var(--font-size-lg);
  color: var(--color-text-1);
}
.search-palette-input::placeholder {
  color: var(--color-text-placeholder);
}
.search-palette-kbd {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 24px;
  padding: 0 6px;
  font-size: var(--font-size-xs);
  font-family: inherit;
  font-weight: var(--font-weight-medium);
  color: var(--color-text-3);
  background: var(--color-bg-3);
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-sm);
  line-height: 1;
}
.search-palette-body {
  flex: 1 1 auto;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: var(--space-3) 0;
}
.search-palette-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-7);
  text-align: center;
}
.search-palette-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border-1);
  border-top-color: var(--color-primary-6);
  border-radius: 50%;
  animation: search-spin 0.6s linear infinite;
}
@keyframes search-spin {
  to {
    transform: rotate(360deg);
  }
}
.search-palette-empty-title {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  margin: 0;
}
.search-palette-muted {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  margin: 0;
}
.search-palette-group {
  padding: var(--space-2) 0;
}
.search-palette-group-label {
  padding: var(--space-2) var(--space-7) var(--space-1);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-3);
  letter-spacing: var(--letter-spacing-wide);
  text-transform: uppercase;
}
.search-palette-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.search-palette-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-7);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}
.search-palette-item--active {
  background: var(--color-bg-3);
}
.search-palette-item-title {
  font-size: var(--font-size-base);
  color: var(--color-text-1);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}
.search-palette-item-subtitle {
  font-size: var(--font-size-sm);
  color: var(--color-text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 1 auto;
  min-width: 0;
}
.search-palette-enter-active {
  transition: opacity var(--transition-normal);
}
.search-palette-enter-active .search-palette {
  transition:
    opacity var(--transition-normal),
    transform var(--transition-spring);
}
.search-palette-leave-active,
.search-palette-leave-active .search-palette {
  transition: opacity var(--transition-fast);
}
.search-palette-enter-from,
.search-palette-leave-to {
  opacity: 0;
}
.search-palette-enter-from .search-palette {
  opacity: 0;
  transform: scale(0.96) translateY(-8px);
}
</style>
