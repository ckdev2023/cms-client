/**
 * settings-group-members.js
 *
 * Renders the Group member list (read-only for P0).
 * Called by settings-group-detail.js when a Group is selected.
 * Displays member name, role chip, and join date.
 * Handles the empty-state toggle when a Group has no members.
 *
 * Data source: window.SettingsDemoData.DEMO_GROUP_MEMBERS
 * Config source: window.SettingsConfig.ROLE_CHIP_STYLES
 *
 * DOM hooks:
 *   #groupMembersPanel  — outer wrapper
 *   #memberListBody     — table wrapper (hidden when empty)
 *   #memberTableBody    — <tbody> for dynamic rows
 *   #memberEmptyState   — empty-state placeholder
 *
 * Cross-script API (via window.__settingsPage):
 *   renderMembers(groupId)  — populate member table for the given Group
 *
 * Contract ref: P0-CONTRACT §3.2 成员列表
 * Production target: features/settings/model/useGroupMembers
 */
(function () {
  'use strict';

  var _tableBody;
  var _listBody;
  var _emptyState;

  function getMembers(groupId) {
    var data = window.SettingsDemoData;
    if (!data || !data.DEMO_GROUP_MEMBERS) return [];
    return data.DEMO_GROUP_MEMBERS[groupId] || [];
  }

  function getRoleChipStyle(role) {
    var cfg = window.SettingsConfig || {};
    var styles = cfg.ROLE_CHIP_STYLES || {};
    return styles[role] || 'bg-gray-50 text-gray-600 border-gray-200';
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function renderMembers(groupId) {
    if (!_tableBody || !_listBody || !_emptyState) return;

    var members = getMembers(groupId);

    if (members.length === 0) {
      _listBody.classList.add('hidden');
      _emptyState.classList.remove('hidden');
      return;
    }

    _listBody.classList.remove('hidden');
    _emptyState.classList.add('hidden');

    var html = '';
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var chipCls = getRoleChipStyle(m.role);
      html +=
        '<tr>' +
          '<td>' +
            '<span class="text-[14px] font-medium text-[var(--text)]">' +
              escapeHtml(m.name) +
            '</span>' +
          '</td>' +
          '<td>' +
            '<span class="inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold border ' + chipCls + '">' +
              escapeHtml(m.role) +
            '</span>' +
          '</td>' +
          '<td class="hidden sm:table-cell text-sm text-[var(--muted-2)]">' +
            escapeHtml(m.joinedAt) +
          '</td>' +
        '</tr>';
    }
    _tableBody.innerHTML = html;
  }

  function init() {
    _tableBody = document.getElementById('memberTableBody');
    _listBody = document.getElementById('memberListBody');
    _emptyState = document.getElementById('memberEmptyState');

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.renderMembers = renderMembers;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
