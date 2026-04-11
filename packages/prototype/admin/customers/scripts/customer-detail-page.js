(function () {
  'use strict';

  function boot() {
    if (!window.CustomerDetailPage || typeof window.CustomerDetailPage.init !== 'function') {
      return;
    }
    window.CustomerDetailPage.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
