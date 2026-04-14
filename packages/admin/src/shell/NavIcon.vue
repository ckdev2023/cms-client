<script setup lang="ts">
import type { NavIconName } from "./nav-config";

/**
 * 导航图标组件，根据名称输出对应的内联 SVG。
 */
defineProps<{ name: NavIconName }>();
</script>

<template>
  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <template v-if="name === 'dashboard'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M3 10h7V3H3v7zm0 11h7v-9H3v9zm11 0h7V14h-7v7zm0-18v9h7V3h-7z"
      />
    </template>
    <template v-else-if="name === 'message'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </template>
    <template v-else-if="name === 'users'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </template>
    <template v-else-if="name === 'file-text'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </template>
    <template v-else-if="name === 'clipboard'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </template>
    <template v-else-if="name === 'folder'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </template>
    <template v-else-if="name === 'edit'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </template>
    <template v-else-if="name === 'wallet'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m10-6h2a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m10-4H9m8 0a2 2 0 00-2-2H9a2 2 0 00-2 2m10 0V9"
      />
    </template>
    <template v-else-if="name === 'bar-chart'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-4 0h4m-9 0h2m10 0h2m-7 4h4a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v12a2 2 0 002 2h4"
      />
    </template>
    <template v-else-if="name === 'settings'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0a1.724 1.724 0 002.573 1.066c.815-.47 1.87.585 1.4 1.4a1.724 1.724 0 001.065 2.573c.921.3.921 1.603 0 1.902a1.724 1.724 0 00-1.066 2.573c.47.815-.585 1.87-1.4 1.4a1.724 1.724 0 00-2.573 1.065c-.3.921-1.603.921-1.902 0a1.724 1.724 0 00-2.573-1.066c-.815.47-1.87-.585-1.4-1.4a1.724 1.724 0 00-1.065-2.573c-.921-.3-.921-1.603 0-1.902a1.724 1.724 0 001.066-2.573c-.47-.815.585-1.87 1.4-1.4a1.724 1.724 0 002.573-1.065z"
      />
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </template>
    <template v-else-if="name === 'search'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </template>
    <template v-else-if="name === 'menu'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 6h16M4 12h16M4 18h16"
      />
    </template>
    <template v-else-if="name === 'close'">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M6 18L18 6M6 6l12 12"
      />
    </template>
  </svg>
</template>
