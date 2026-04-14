<script setup lang="ts">
import {
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  useSlots,
  watch,
  type AsyncComponentLoader,
  type Component,
} from "vue";
import { useRouter } from "vue-router";
import SideNav from "./SideNav.vue";
import TopBar from "./TopBar.vue";

/**
 * 后台通用应用外壳，负责组合顶栏、侧边栏与移动端导航遮罩。
 */
defineProps<{
  userInitials?: string;
}>();

const slots = useSlots();
const isMobileNavOpen = ref(false);
const router = useRouter();
const mainContentRef = ref<HTMLElement | null>(null);
const currentView = shallowRef<Component | null>(null);
const currentViewKey = ref(router.currentRoute.value.fullPath);
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
 * 根据当前路由同步主区域渲染的页面组件与渲染 key。
 *
 * @param path 当前路由的完整路径，用作强制刷新视图的稳定 key
 */
function syncRouteView(path = router.currentRoute.value.fullPath): void {
  const matched = router.currentRoute.value.matched ?? [];
  const activeRecord = matched[matched.length - 1];
  currentView.value = resolveRouteComponent(activeRecord?.components?.default);
  currentViewKey.value = path;
}

syncRouteView();

const stopRouteSync = router.afterEach(async (to) => {
  syncRouteView(to.fullPath);
  closeMobileNav();
  await nextTick();
  mainContentRef.value?.focus();
});

watch(isMobileNavOpen, (open) => {
  document.body.style.overflow = open ? "hidden" : "";
});

onBeforeUnmount(() => {
  if (typeof stopRouteSync === "function") {
    stopRouteSync();
  }
  document.body.style.overflow = "";
});
</script>

<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到内容</a>
    <TopBar :user-initials="userInitials" @toggle-menu="openMobileNav">
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
        aria-label="关闭导航遮罩"
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
  </div>
</template>
