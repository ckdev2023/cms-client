<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import { useAdminSession } from "../auth/model/adminSession";
import { brandTitle, isExternalItem, getVisibleNavGroups } from "./nav-config";
import NavIcon from "./NavIcon.vue";

/**
 * 应用侧边导航，根据桌面端或移动端模式渲染导航分组与入口。
 */
const props = withDefaults(
  defineProps<{
    variant?: "desktop" | "mobile";
  }>(),
  {
    variant: "desktop",
  },
);

const emit = defineEmits<{
  navigate: [];
  close: [];
}>();

const isMobile = computed(() => props.variant === "mobile");
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { isAdmin } = useAdminSession();
const visibleNavGroups = computed(() => getVisibleNavGroups(isAdmin.value));

/**
 * 读取当前路由对应的导航 key。
 *
 * @returns 当前路由声明的导航 key；未声明时返回 `null`
 */
function resolveActiveNavKey(): string | null {
  const navKey = route.meta.navKey;
  return typeof navKey === "string" ? navKey : null;
}

const activeNavKey = ref<string | null>(resolveActiveNavKey());

const stopActiveNavSync = router.afterEach((to) => {
  const navKey = to.meta.navKey;
  activeNavKey.value = typeof navKey === "string" ? navKey : null;
});

onBeforeUnmount(() => {
  if (typeof stopActiveNavSync === "function") {
    stopActiveNavSync();
  }
});

/**
 * 判断侧边栏条目是否应处于激活状态。
 *
 * @param itemKey 导航条目的稳定 key
 * @returns 当前路由归属到该条目时返回 `true`
 */
function isActiveNavItem(itemKey: string): boolean {
  return activeNavKey.value === itemKey;
}
</script>

<template>
  <aside
    :class="['sidenav', `sidenav--${variant}`]"
    :aria-label="t('shell.nav.asideLabel')"
  >
    <div class="sidenav-inner">
      <div class="sidenav-brand">
        <RouterLink to="/" class="sidenav-brand-title">
          {{ brandTitle }}
        </RouterLink>
        <div class="sidenav-brand-meta">
          <span class="sidenav-chip">{{ t("shell.nav.brandChip") }}</span>
          <button
            v-if="isMobile"
            class="sidenav-close-btn"
            type="button"
            :aria-label="t('shell.nav.closeNavigation')"
            @click="emit('close')"
          >
            <NavIcon name="close" />
          </button>
        </div>
      </div>

      <nav :aria-label="t('shell.nav.mainLabel')">
        <template v-for="group in visibleNavGroups" :key="group.key">
          <div class="nav-group-title">
            {{ t(`shell.nav.groups.${group.key}`) }}
          </div>
          <template v-for="item in group.items" :key="item.key">
            <a
              v-if="isExternalItem(item)"
              :href="item.href"
              class="nav-item"
              target="_blank"
              rel="noreferrer"
              @click="emit('navigate')"
            >
              <NavIcon v-if="item.icon" :name="item.icon" />
              {{ t(`shell.nav.items.${item.key}`) }}
            </a>
            <RouterLink
              v-else
              :to="item.to!"
              :class="[
                'nav-item',
                { 'nav-item--active': isActiveNavItem(item.key) },
              ]"
              :aria-current="isActiveNavItem(item.key) ? 'page' : undefined"
              @click="emit('navigate')"
            >
              <NavIcon v-if="item.icon" :name="item.icon" />
              {{ t(`shell.nav.items.${item.key}`) }}
            </RouterLink>
          </template>
        </template>
      </nav>
    </div>
  </aside>
</template>
