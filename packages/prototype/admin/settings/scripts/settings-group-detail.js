/**
 * settings-group-detail.js
 *
 * Manages the Group detail panel: toggling between list view and detail view,
 * populating metadata (name, code, status), and keeping action button data-attrs
 * in sync. Does NOT handle rename/disable modal logic — that lives in
 * settings-group-actions.js.
 *
 * Data source: window.SettingsDemoData.DEMO_GROUPS (single source of truth)
 * Config source: window.SettingsConfig.STATUS_BADGE_MAP
 *
 * DOM hooks:
 *   #groupListPanel        — list panel (hide when detail shown)
 *   #groupDetailPanel      — detail wrapper (show/hide)
 *   #detailGroupName       — h2 heading
 *   #detailGroupNameField  — name value in metadata grid
 *   #detailGroupCode       — code value
 *   #detailGroupStatus     — status badge container
 *   #detailActions         — action buttons wrapper
 *   [data-group-row]       — clickable rows in the list
 *   [data-action="back-to-list"]  — back button
 *
 * Contract ref: P0-CONTRACT §3.1 元数据
 * Production target: features/settings/model/useGroupDetailViewModel
 */
(function () {
  'use strict';

  var _listPanel;
  var _detailPanel;
  var _detailName;
  var _detailNameField;
  var _detailCode;
  var _detailStatus;
  var _renameBtn;
  var _disableBtn;
  var _currentGroupId = null;

  function getGroups() {
    var data = window.SettingsDemoData;
    return (data && Array.isArray(data.DEMO_GROUPS)) ? data.DEMO_GROUPS : [];
  }

  function getStatusBadge(status) {
    var cfg = window.SettingsConfig || {};
    var map = cfg.STATUS_BADGE_MAP || {};
    return map[status] || { label: status, cls: 'badge' };
  }

  function findGroup(id) {
    var groups = getGroups();
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].id === id) return groups[i];
    }
    return null;
  }

  function populateDetail(group) {
    if (!group) return;
    _currentGroupId = group.id;

    _detailName.textContent = group.name;
    _detailNameField.textContent = group.name;
    _detailCode.textContent = group.id;

    var badge = getStatusBadge(group.status);
    _detailStatus.innerHTML = '<span class="' + badge.cls + '">' + badge.label + '</span>';

    _renameBtn.setAttribute('data-group-id', group.id);
    _renameBtn.setAttribute('data-group-name', group.name);

    if (group.status === 'disabled') {
      _disableBtn.classList.add('hidden');
    } else {
      _disableBtn.classList.remove('hidden');
      _disableBtn.setAttribute('data-group-id', group.id);
      _disableBtn.setAttribute('data-group-name', group.name);
      _disableBtn.setAttribute('data-related-customers', String(group.relatedCustomers || 0));
      _disableBtn.setAttribute('data-related-cases', String(group.relatedCases || 0));
    }
  }

  function showDetail(groupId) {
    var group = findGroup(groupId);
    if (!group) return;

    populateDetail(group);
    _listPanel.classList.add('hidden');
    _detailPanel.classList.remove('hidden');

    if (window.__settingsPage && window.__settingsPage.renderMembers) {
      window.__settingsPage.renderMembers(groupId);
    }
    if (window.__settingsPage && window.__settingsPage.renderStats) {
      window.__settingsPage.renderStats(groupId);
    }
  }

  function showList() {
    _detailPanel.classList.add('hidden');
    _listPanel.classList.remove('hidden');
    _currentGroupId = null;
  }

  function init() {
    _listPanel = document.getElementById('groupListPanel');
    _detailPanel = document.getElementById('groupDetailPanel');
    _detailName = document.getElementById('detailGroupName');
    _detailNameField = document.getElementById('detailGroupNameField');
    _detailCode = document.getElementById('detailGroupCode');
    _detailStatus = document.getElementById('detailGroupStatus');
    _renameBtn = _detailPanel ? _detailPanel.querySelector('[data-action="rename-group"]') : null;
    _disableBtn = document.getElementById('btnDisableGroup');

    if (!_listPanel || !_detailPanel) return;

    document.addEventListener('click', function (e) {
      var row = e.target.closest('[data-group-row]');
      if (row) {
        var id = row.getAttribute('data-group-id');
        if (id) showDetail(id);
      }
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="back-to-list"]')) {
        showList();
      }
    });

    window.__settingsPage = window.__settingsPage || {};

    window.__settingsPage.onGroupRenamed = function (groupId, newName) {
      var group = findGroup(groupId);
      if (group) group.name = newName;
      if (_currentGroupId === groupId) populateDetail(group);
      if (window.__settingsPage.refreshGroupList) window.__settingsPage.refreshGroupList();
    };

    window.__settingsPage.onGroupDisabled = function (groupId) {
      var group = findGroup(groupId);
      if (group) {
        group.status = 'disabled';
        group.activeCases = 0;
      }
      if (_currentGroupId === groupId) populateDetail(group);
      if (window.__settingsPage.refreshGroupList) window.__settingsPage.refreshGroupList();
    };

    window.__settingsPage.showGroupDetail = showDetail;
    window.__settingsPage.showGroupList = showList;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
