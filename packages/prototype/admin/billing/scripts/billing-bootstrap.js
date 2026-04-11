(function () {
  'use strict';

  var SECTION_MOUNTS = [
    { id: 'billingSectionPageHeader', src: 'sections/page-header.html' },
    { id: 'billingSectionSummaryCards', src: 'sections/summary-cards.html' },
    { id: 'billingSectionFiltersToolbar', src: 'sections/filters-toolbar.html' },
    { id: 'billingSectionBillingTable', src: 'sections/billing-table.html' },
    { id: 'billingSectionPaymentLogTable', src: 'sections/payment-log-table.html' },
    { id: 'billingSectionBillingPlanPanel', src: 'sections/billing-plan-panel.html' },
    { id: 'billingSectionRiskAckPanel', src: 'sections/risk-ack-panel.html' },
    { id: 'billingSectionPaymentModal', src: 'sections/payment-modal.html' },
    { id: 'billingSectionCollectionResult', src: 'sections/collection-result-toast.html' },
  ];

  var SCRIPT_SOURCES = [
    'data/billing-config.js',
    'data/billing-demo-data.js',
    '../shared/scripts/navigate.js',
    '../shared/scripts/mobile-nav.js',
    'scripts/billing-page.js',
    'scripts/billing-filters.js',
    'scripts/billing-bulk-actions.js',
    'scripts/billing-payment-modal.js',
    'scripts/billing-risk-log.js',
  ];

  var INIT_MODULES = [
    'BillingPage',
    'BillingFilters',
    'BillingBulkActions',
    'BillingPaymentModal',
    'BillingRiskLog',
  ];

  var started = false;

  function loadFragment(mount) {
    var el = document.getElementById(mount.id);
    if (!el) return Promise.resolve();

    return fetch(mount.src, { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to load ' + mount.src + ' (' + response.status + ')');
        }
        return response.text();
      })
      .then(function (html) {
        el.innerHTML = html;
      })
      .catch(function (error) {
        console.error('[billing-bootstrap]', error);
        el.innerHTML =
          '<div class="apple-card p-4 text-[13px] text-[#991b1b] font-semibold">' +
          '区块加载失败：' + escapeHtml(mount.src) +
          '</div>';
      });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = function () {
        reject(new Error('Failed to load script: ' + src));
      };
      document.body.appendChild(script);
    });
  }

  function initModules() {
    INIT_MODULES.forEach(function (name) {
      var mod = window[name];
      if (mod && typeof mod.init === 'function') {
        mod.init();
      }
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  async function bootstrap() {
    var i;
    if (started) return;
    started = true;

    await Promise.all(SECTION_MOUNTS.map(loadFragment));

    for (i = 0; i < SCRIPT_SOURCES.length; i += 1) {
      await loadScript(SCRIPT_SOURCES[i]);
    }

    initModules();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
