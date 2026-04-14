<script lang="ts">
/**
 * 页面头部面包屑项。
 */
export interface Breadcrumb {
  /** 面包屑显示文案。 */
  label: string;
  /** 可选的跳转地址；缺省时渲染为当前页。 */
  href?: string;
}
</script>

<script setup lang="ts">
/**
 * 通用页面头部组件，负责标题、副标题、面包屑和操作区布局。
 */
defineProps<{
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
}>();
</script>

<template>
  <header class="ui-page-header">
    <nav
      v-if="breadcrumbs?.length"
      class="ui-page-header__breadcrumbs"
      aria-label="パンくずリスト"
    >
      <template v-for="(crumb, i) in breadcrumbs" :key="i">
        <span v-if="i > 0" class="ui-page-header__sep" aria-hidden="true">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
        </span>
        <a
          v-if="crumb.href"
          :href="crumb.href"
          class="ui-page-header__crumb ui-page-header__crumb--link"
        >
          {{ crumb.label }}
        </a>
        <span v-else class="ui-page-header__crumb" aria-current="page">
          {{ crumb.label }}
        </span>
      </template>
    </nav>

    <div class="ui-page-header__row">
      <div class="ui-page-header__left">
        <div class="ui-page-header__title-row">
          <h1 class="ui-page-header__title">{{ title }}</h1>
          <slot name="badge" />
        </div>
        <p v-if="subtitle" class="ui-page-header__subtitle">{{ subtitle }}</p>
        <slot name="meta" />
      </div>
      <div v-if="$slots.actions" class="ui-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped>
.ui-page-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 24px;
}

.ui-page-header__breadcrumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-3);
}

.ui-page-header__sep {
  display: inline-flex;
  color: var(--color-text-3);
}

.ui-page-header__crumb--link {
  color: var(--color-primary-6);
  text-decoration: none;
}

.ui-page-header__crumb--link:hover {
  text-decoration: underline;
}

.ui-page-header__crumb[aria-current="page"] {
  color: var(--color-text-1);
  font-weight: var(--font-weight-semibold);
}

.ui-page-header__row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.ui-page-header__left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.ui-page-header__title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.ui-page-header__title {
  margin: 0;
  font-size: 28px;
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-1);
  letter-spacing: var(--letter-spacing-tight);
  line-height: 1.2;
}

.ui-page-header__subtitle {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-3);
  line-height: 1.5;
}

.ui-page-header__actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
