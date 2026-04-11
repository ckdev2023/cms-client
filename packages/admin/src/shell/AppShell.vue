<template>
  <div class="app-shell">
    <a class="skip-link" href="#main-content">跳到内容</a>
    <header class="topbar" role="banner">
      <div class="topbar-inner">
        <slot name="topbar" />
      </div>
    </header>
    <nav class="sidenav" aria-label="主导航">
      <slot name="sidenav" />
    </nav>
    <main id="main-content" class="content" tabindex="-1">
      <slot />
    </main>
  </div>
</template>
