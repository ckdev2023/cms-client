/**
 * settings-group-list.js
 *
 * Renders and filters the Group management list table dynamically.
 * Reads from window.SettingsDemoData.DEMO_GROUPS, applies the status
 * filter from #groupStatusFilter, and re-renders rows into #groupTableBody.
 *
 * Data source: window.SettingsDemoData.DEMO_GROUPS
 * Config source: window.SettingsConfig.STATUS_BADGE_MAP
 *
 * DOM hooks:
 *   #groupTableBody    — <tbody> for dynamic rows
 *   #groupEmptyState   — empty-state placeholder (shown when no groups match)
 *   #groupStatusFilter — <select> for status filter
 *
 * Cross-script API (via window.__settingsPage):
 *   refreshGroupList()   — re-render the list with the current filter
 *   onGroupCreated(name) — append a new demo Group and refresh
 *
 * Contract ref: P0-CONTRACT §2 Group 管理列表
 * Production target: features/settings/model/useGroupListViewModel
 */
(function () {
  'use strict';

  var _tableBody;
  var _tableEl;
  var _emptyState;
  var _filterSelect;

  function getGroups() {
    var data = window.SettingsDemoData;
    return (data && Array.isArray(data.DEMO_GROUPS)) ? data.DEMO_GROUPS : [];
  }

  function getStatusBadge(status) {
    var cfg = window.SettingsConfig || {};
    var map = cfg.STATUS_BADGE_MAP || {};
    return map[status] || { label: status, cls: 'badge' };
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(str)));
    return div.innerHTML;
  }

  function renderList() {
    if (!_tableBody || !_emptyState) return;

    var groups = getGroups();
    var filterValue = _filterSelect ? _filterSelect.value : '';

    var filtered = [];
    for (var i = 0; i < groups.length; i++) {
      if (!filterValue || groups[i].status === filterValue) {
        filtered.push(groups[i]);
      }
    }

    if (filtered.length === 0) {
      _tableBody.innerHTML = '';
      if (_tableEl) _tableEl.classList.add('hidden');
      _emptyState.classList.remove('hidden');
      return;
    }

    if (_tableEl) _tableEl.classList.remove('hidden');
    _emptyState.classList.add('hidden');

    var html = '';
    for (var j = 0; j < filtered.length; j++) {
      var g = filtered[j];
      var badge = getStatusBadge(g.status);
      html +=
        '<tr data-group-row data-group-id="' + escapeHtml(g.id) + '" class="cursor-pointer">' +
          '<td><div class="font-medium text-[var(--text)]">' + escapeHtml(g.name) + '</div></td>' +
          '<td><span class="' + badge.cls + '">' + escapeHtml(badge.label) + '</span></td>' +
          '<td class="hidden md:table-cell text-sm text-[var(--muted-2)]">' + escapeHtml(g.createdAt || '—') + '</td>' +
          '<td class="hidden sm:table-cell text-center text-sm">' + (g.activeCases != null ? g.activeCases : '—') + '</td>' +
          '<td class="hidden sm:table-cell text-center text-sm">' + (g.memberCount != null ? g.memberCount : '—') + '</td>' +
        '</tr>';
    }
    _tableBody.innerHTML = html;
  }

  function onGroupCreated(name) {
    var data = window.SettingsDemoData;
    if (!data || !Array.isArray(data.DEMO_GROUPS)) return;

    var idx = data.DEMO_GROUPS.length + 1;
    var newId = 'grp-' + String(idx).padStart(3, '0');
    var now = new Date();
    var dateStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');

    data.DEMO_GROUPS.push({
      id: newId,
      name: name,
      status: 'active',
      createdAt: dateStr,
      activeCases: 0,
      memberCount: 0,
      relatedCustomers: 0,
      relatedCases: 0,
    });

    renderList();
  }

  function init() {
    _tableBody = document.getElementById('groupTableBody');
    _emptyState = document.getElementById('groupEmptyState');
    _filterSelect = document.getElementById('groupStatusFilter');
    _tableEl = _tableBody ? _tableBody.closest('table') : null;

    if (_filterSelect) {
      _filterSelect.addEventListener('change', renderList);
    }

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.refreshGroupList = renderList;
    window.__settingsPage.onGroupCreated = onGroupCreated;

    renderList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
