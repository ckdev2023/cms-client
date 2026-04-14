(function () {
  'use strict';

  var didBoot = false;

  function boot() {
    if (didBoot) return;
    if (!window.CustomerDetailPage || typeof window.CustomerDetailPage.init !== 'function') {
      return;
    }
    didBoot = true;
    window.CustomerDetailPage.init();
  }

  document.addEventListener('prototype:fragments-ready', boot);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    boot();
  }
})();
