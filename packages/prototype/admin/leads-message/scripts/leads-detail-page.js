/**
 * Leads Detail Page bootstrap.
 * Runtime logic is split across core / render / actions modules.
 */
(function () {
  'use strict';

  function boot() {
    if (!window.LeadsDetailPage || typeof window.LeadsDetailPage.init !== 'function') {
      return;
    }
    window.LeadsDetailPage.init();
  }

  document.addEventListener('prototype:fragments-ready', boot);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    boot();
  }
})();
