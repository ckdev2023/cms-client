/**
 * settings-visibility.js
 *
 * Manages the two P0 visibility toggle switches and the save action.
 * Only handles cross-group case creation and cross-group collaboration
 * viewing — no advanced permission configuration in P0.
 *
 * DOM hooks:
 *   #toggleCrossGroupCase  — checkbox: allow cross-group case creation
 *   #toggleCrossGroupView  — checkbox: allow viewing non-own-group collab cases
 *   #btnSaveVisibility     — save button
 *   #visibilitySaveStatus  — last-saved timestamp display
 *
 * Cross-script API (via window.__settingsPage):
 *   showToast(title, desc)  — from settings-group-actions.js (shared toast)
 *
 * Contract ref: P0-CONTRACT §5 可见性基础配置
 * Production target: features/settings/model/useVisibilityConfigViewModel
 */
(function () {
  'use strict';

  var DEMO_STATE = {
    crossGroupCase: false,
    crossGroupView: false,
  };

  var _toggleCase;
  var _toggleView;
  var _btnSave;
  var _saveStatus;

  function formatTimestamp() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : String(n); };
    return (
      d.getFullYear() + '-' +
      pad(d.getMonth() + 1) + '-' +
      pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' +
      pad(d.getMinutes())
    );
  }

  function showToast(title, desc) {
    if (window.__settingsPage && window.__settingsPage.showToast) {
      window.__settingsPage.showToast(title, desc);
      return;
    }
    var toast = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');
    if (!toast || !toastTitle || !toastDesc) return;
    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toast.classList.remove('hidden');
    setTimeout(function () { toast.classList.add('hidden'); }, 2400);
  }

  function handleSave() {
    DEMO_STATE.crossGroupCase = _toggleCase.checked;
    DEMO_STATE.crossGroupView = _toggleView.checked;

    var ts = formatTimestamp();
    if (_saveStatus) {
      _saveStatus.textContent = '上次保存：' + ts;
    }

    showToast('可见性配置已保存', '变更不回溯影响既有协作关系');
  }

  function init() {
    _toggleCase = document.getElementById('toggleCrossGroupCase');
    _toggleView = document.getElementById('toggleCrossGroupView');
    _btnSave = document.getElementById('btnSaveVisibility');
    _saveStatus = document.getElementById('visibilitySaveStatus');

    if (!_toggleCase || !_toggleView) return;

    _toggleCase.checked = DEMO_STATE.crossGroupCase;
    _toggleView.checked = DEMO_STATE.crossGroupView;

    if (_btnSave) {
      _btnSave.addEventListener('click', handleSave);
    }

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.getVisibilityState = function () {
      return {
        crossGroupCase: _toggleCase.checked,
        crossGroupView: _toggleView.checked,
      };
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
