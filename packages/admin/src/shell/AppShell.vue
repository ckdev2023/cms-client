<script setup lang="ts">
import {
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  useSlots,
  watch,
  type AsyncComponentLoader,
  type Component,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, type RouteLocationNormalized } from "vue-router";
import SideNav from "./SideNav.vue";
import TopBar from "./TopBar.vue";
import GlobalSearchPalette from "./GlobalSearchPalette.vue";
import { useGlobalSearch } from "./useGlobalSearch";
import { getDefaultPermissionsStore } from "../shared/model/PermissionsStore";
import { useSearchRepository } from "../shared/model/useSearchRepository";

/**
 * 后台通用应用外壳，负责组合顶栏、侧边栏与移动端导航遮罩。
 */
defineProps<{
  userEmail?: string;
  userInitials?: string;
  userName?: string;
}>();

const slots = useSlots();
const isMobileNavOpen = ref(false);
const router = useRouter();
const { t } = useI18n();
const mainContentRef = ref<HTMLElement | null>(null);
const isSkipLinkVisible = ref(false);
const currentView = shallowRef<Component | null>(null);

const searchRepo = useSearchRepository();
const search = useGlobalSearch({ repo: searchRepo, router });

const permStore = getDefaultPermissionsStore();
if (!permStore.loaded.value && !permStore.loading.value) {
  permStore.load().catch(() => undefined);
}

/**
 * 根据路由生成主区域 `:key`。默认忽略 query-only 变更，以便列表筛选、Tab 切换等
 * `router.replace(query)` 不抢焦点不重挂载。
 *
 * 例外：`/cases/create` 的步骤向导依赖 `route.query` 与 `#family-bulk`，若仅在同一
 * matched 记录下变更 query/hash 而不重挂载，`CaseCreateView` 内 `parseCaseCreateQuery`
 * 只会在首次挂载时生效，会继续沿用上一条入口的客户与家族批量上下文。
 *
 * @param to - 目标路由位置
 * @returns 用于 `<component :is>` 的渲染 key 字符串
 */
function viewKeyOf(to: RouteLocationNormalized): string {
  const matchedName = to.matched.at(-1)?.name;
  const name =
    typeof matchedName === "string"
      ? matchedName
      : typeof matchedName === "symbol"
        ? matchedName.toString()
        : "";
  if (to.path === "/cases/create") {
    return `case-create|${to.fullPath}|${to.hash}`;
  }
  return `${name || to.path}|${JSON.stringify(to.params)}`;
}

const currentViewKey = ref(viewKeyOf(router.currentRoute.value));
const asyncRouteComponentCache = new WeakMap<
  AsyncComponentLoader<Component>,
  Component
>();

/**
 * 解析当前路由记录上的视图组件；若为懒加载组件则包装成可渲染的异步组件。
 *
 * @param rawComponent 路由记录上声明的原始组件或懒加载函数
 * @returns 可直接交给 `<component :is>` 渲染的组件；未命中时返回 `null`
 */
function resolveRouteComponent(rawComponent: unknown): Component | null {
  if (!rawComponent) return null;
  if (typeof rawComponent !== "function") return rawComponent as Component;

  const loader = rawComponent as AsyncComponentLoader<Component>;
  const cached = asyncRouteComponentCache.get(loader);
  if (cached) return cached;

  const resolved = defineAsyncComponent(loader);
  asyncRouteComponentCache.set(loader, resolved);
  return resolved;
}

/**
 * 打开移动端侧边导航面板。
 */
function openMobileNav(): void {
  isMobileNavOpen.value = true;
}

/**
 * 关闭移动端侧边导航面板。
 */
function closeMobileNav(): void {
  isMobileNavOpen.value = false;
}

/**
 * 路由切换后将页面与主内容区滚动回顶部。
 */
function scrollToTop(): void {
  const scrollOptions: ScrollToOptions = {
    top: 0,
    left: 0,
    behavior: "auto",
  };

  const canUseWindowScrollTo =
    typeof window.scrollTo === "function" &&
    (Reflect.has(window.scrollTo, "mock") ||
      /\[native code\]/.test(String(window.scrollTo)));

  if (canUseWindowScrollTo) {
    window.scrollTo(scrollOptions);
  }

  mainContentRef.value?.scrollTo?.(scrollOptions);
}

/**
 * 根据当前路由同步主区域渲染的页面组件与渲染 key。
 * key 通常为路由名 + params；query-only 变化不触发重挂载（`/cases/create` 除外）。
 * @param to - 目标路由位置，默认为当前路由
 */
function syncRouteView(
  to: RouteLocationNormalized = router.currentRoute.value,
): void {
  const matched = to.matched ?? [];
  const activeRecord = matched[matched.length - 1];
  currentView.value = resolveRouteComponent(activeRecord?.components?.default);
  currentViewKey.value = viewKeyOf(to);
}

syncRouteView();

const stopRouteSync = router.afterEach(async (to, from) => {
  search.closePalette();
  syncRouteView(to);
  closeMobileNav();
  // 仅在「视图 key」变化时才把焦点重置到主内容区；列表筛选等 query-only
  // 跳转保留焦点。`/cases/create` 的 query/hash 变化会触发重挂载，也需聚焦主区。
  const viewChanged = viewKeyOf(to) !== viewKeyOf(from);
  if (!viewChanged) return;
  await nextTick();
  mainContentRef.value?.focus({ preventScroll: true });
  scrollToTop();
  window.requestAnimationFrame(() => {
    scrollToTop();
  });
});

/**
 * 全局键盘快捷键处理：⌘K / Ctrl+K 打开搜索面板，IME 输入中忽略。
 * @param e - 键盘事件
 */
function handleGlobalKeydown(e: KeyboardEvent): void {
  if (e.isComposing) return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    search.openPalette();
  }
}

onMounted(() => {
  document.addEventListener("keydown", handleGlobalKeydown);
});

watch(isMobileNavOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onBeforeUnmount(() => {
  if (typeof stopRouteSync === "function") {
    stopRouteSync();
  }
  document.removeEventListener("keydown", handleGlobalKeydown);
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="app-shell">
    <a
      class="skip-link"
      :class="{ 'skip-link--visible': isSkipLinkVisible }"
      href="#main-content"
      @focus="isSkipLinkVisible = true"
      @blur="isSkipLinkVisible = false"
    >
      {{ t("shell.skipToContent") }}
    </a>
    <TopBar
      :user-email="userEmail"
      :user-initials="userInitials"
      :user-name="userName"
      @toggle-menu="openMobileNav"
      @open-search-palette="search.openPalette"
    >
      <template v-if="slots['topbar-actions']" #actions>
        <slot name="topbar-actions" />
      </template>
    </TopBar>
    <SideNav />
    <div
      v-if="isMobileNavOpen"
      class="mobile-nav"
      aria-hidden="false"
      @keydown.esc="closeMobileNav"
    >
      <button
        class="mobile-nav-backdrop"
        type="button"
        :aria-label="t('shell.nav.closeBackdrop')"
        @click="closeMobileNav"
      />
      <div class="mobile-nav-panel">
        <SideNav
          variant="mobile"
          @navigate="closeMobileNav"
          @close="closeMobileNav"
        />
      </div>
    </div>
    <main id="main-content" ref="mainContentRef" class="content" tabindex="-1">
      <div class="content-inner">
        <component :is="currentView" v-if="currentView" :key="currentViewKey" />
      </div>
    </main>

    <GlobalSearchPalette
      :open="search.open.value"
      :groups="search.groups.value"
      :flat-hits="search.hits.value"
      :highlighted-index="search.highlightedIndex.value"
      :loading="search.loading.value"
      :query="search.query.value"
      :error="search.error.value"
      @update:open="(v) => (v ? search.openPalette() : search.closePalette())"
      @update:query="(v) => (search.query.value = v)"
      @move-highlight="search.moveHighlight"
      @select="search.selectHit"
    />
  </div>
</template>
