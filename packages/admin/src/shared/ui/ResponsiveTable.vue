<script setup lang="ts">
import { ref, onUnmounted } from "vue";

/** 响应式表格列定义。 */
export interface ResponsiveColumn {
  /** 列标识符，对应行数据字段名。 */
  key: string;
  /** 表头显示文本。 */
  label: string;
  /** 在指定断点以下隐藏该列。 */
  hideAt?: "sm" | "md" | "lg";
  /** 列宽度（CSS 值）。 */
  width?: string;
  /** 对齐方式。 */
  align?: "left" | "center" | "right";
}

/** 响应式表格：桌面渲染 table，移动端渲染 stacked 卡片，切换阈值由 mobileBreakpoint 控制。 */
const props = withDefaults(
  defineProps<{
    columns: ResponsiveColumn[];
    rows: unknown[];
    rowKey: (row: unknown) => string | number;
    mobileBreakpoint?: "sm" | "md";
  }>(),
  { mobileBreakpoint: "md" },
);

const BP_PX: Record<string, number> = { sm: 640, md: 768 };

const isMobile = ref(false);
let mql: MediaQueryList | null = null;

/**
 * 媒体查询变更回调。
 *
 * @param e 媒体查询变更事件
 */
function handleChange(e: MediaQueryListEvent) {
  isMobile.value = e.matches;
}

if (typeof window !== "undefined" && window.matchMedia) {
  const px = BP_PX[props.mobileBreakpoint] ?? 768;
  mql = window.matchMedia(`(max-width: ${px - 1}px)`);
  isMobile.value = mql.matches;
  mql.addEventListener("change", handleChange);
}

onUnmounted(() => {
  mql?.removeEventListener("change", handleChange);
});

defineExpose({ isMobile });
</script>

<template>
  <div class="responsive-table" :data-h5-mode="isMobile ? 'card' : 'table'">
    <template v-if="!isMobile">
      <slot />
    </template>

    <template v-else>
      <slot name="mobile-prepend" />

      <div v-if="rows.length > 0" class="responsive-table__cards">
        <div
          v-for="row in rows"
          :key="rowKey(row)"
          class="responsive-table__card"
        >
          <slot name="mobile-card" :row="row as any">
            <dl class="responsive-table__dl">
              <template v-for="col in columns" :key="col.key">
                <dt class="responsive-table__dt">{{ col.label }}</dt>
                <dd class="responsive-table__dd">
                  <slot
                    :name="`cell-${col.key}`"
                    :row="row as any"
                    :value="(row as any)[col.key]"
                    :column="col"
                  >
                    {{ (row as any)[col.key] ?? "—" }}
                  </slot>
                </dd>
              </template>
            </dl>
          </slot>
        </div>
      </div>

      <slot name="empty" />
    </template>
  </div>
</template>

<style scoped>
.responsive-table__cards {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.responsive-table__card {
  border: 1px solid var(--color-border-1);
  border-radius: var(--radius-lg, 12px);
  padding: 12px 16px;
  background: var(--color-bg-1, #fff);
}

.responsive-table__dl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  margin: 0;
}

.responsive-table__dt {
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-bold, 700);
  color: var(--color-text-3, #86909c);
  line-height: var(--leading-sm, 1.4);
}

.responsive-table__dd {
  margin: 0;
  font-size: var(--font-size-sm, 13px);
  color: var(--color-text-1, #1d2129);
  line-height: var(--leading-sm, 1.4);
  min-width: 0;
  overflow-wrap: break-word;
}
</style>
