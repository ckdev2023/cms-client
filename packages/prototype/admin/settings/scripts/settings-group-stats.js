/**
 * settings-group-stats.js
 *
 * Renders the Group-level related statistics (customer count, active case count).
 * Called by settings-group-detail.js via window.__settingsPage.renderStats(groupId).
 * Kept separate from group-members to avoid coupling per plan §12 / §3.3.
 *
 * Data source: window.SettingsDemoData.DEMO_GROUP_STATS
 *
 * DOM hooks:
 *   #groupStatsPanel     — outer wrapper
 *   #statCustomerCount   — customer count value
 *   #statCaseCount       — case count value
 *
 * Cross-script API (via window.__settingsPage):
 *   renderStats(groupId) — populate stats for the given Group
 *
 * Contract ref: P0-CONTRACT §3.3 关联统计
 * Production target: features/settings/model/useGroupStats
 */
(function () {
  'use strict';

  var _customerCount;
  var _caseCount;

  function getStats(groupId) {
    var data = window.SettingsDemoData;
    if (!data || !data.DEMO_GROUP_STATS) return null;
    return data.DEMO_GROUP_STATS[groupId] || null;
  }

  function renderStats(groupId) {
    if (!_customerCount || !_caseCount) return;

    var stats = getStats(groupId);
    if (!stats) {
      _customerCount.textContent = '—';
      _caseCount.textContent = '—';
      return;
    }

    _customerCount.textContent = String(stats.customers);
    _caseCount.textContent = String(stats.cases);
  }

  function init() {
    _customerCount = document.getElementById('statCustomerCount');
    _caseCount = document.getElementById('statCaseCount');

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.renderStats = renderStats;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
