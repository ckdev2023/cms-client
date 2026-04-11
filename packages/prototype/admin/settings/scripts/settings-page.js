/**
 * settings-page.js
 *
 * Page-level orchestrator for the settings module.
 * Owns sub-navigation panel switching, default panel activation,
 * and the centralised toast display used by all settings scripts.
 *
 * DOM hooks:
 *   [data-subnav-id]  — sub-navigation buttons
 *   [data-panel]      — content panels toggled by subnav
 *   #toast, #toastTitle, #toastDesc — toast notification element
 *
 * Cross-script API (via window.__settingsPage):
 *   showToast(title, desc)  — display a timed toast notification
 *   switchPanel(panelId)    — programmatically activate a subnav panel
 *
 * Contract ref: P0-CONTRACT §1 子导航结构, §10 Toast 通知
 * Production target: features/settings/model/useSettingsViewModel
 */
(function () {
  'use strict';

  var cfg = window.SettingsConfig || {};
  var DURATION = cfg.TOAST_DURATION_MS || 2400;
  var DEFAULT_PANEL = cfg.DEFAULT_PANEL || 'group-management';

  var _subnavBtns;
  var _panels;
  var _toast;
  var _toastTitle;
  var _toastDesc;
  var _toastTimer;

  function switchPanel(panelId) {
    for (var i = 0; i < _subnavBtns.length; i++) {
      var btn = _subnavBtns[i];
      if (btn.getAttribute('data-subnav-id') === panelId) {
        btn.classList.add('is-active');
      } else {
        btn.classList.remove('is-active');
      }
    }
    for (var j = 0; j < _panels.length; j++) {
      var p = _panels[j];
      if (p.getAttribute('data-panel') === panelId) {
        p.classList.remove('hidden');
      } else {
        p.classList.add('hidden');
      }
    }
  }

  function showToast(title, desc) {
    if (!_toast) return;
    _toastTitle.textContent = title || '';
    _toastDesc.textContent = desc || '';
    _toast.classList.remove('hidden');
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function () {
      _toast.classList.add('hidden');
    }, DURATION);
  }

  function init() {
    _subnavBtns = document.querySelectorAll('[data-subnav-id]');
    _panels = document.querySelectorAll('[data-panel]');
    _toast = document.getElementById('toast');
    _toastTitle = document.getElementById('toastTitle');
    _toastDesc = document.getElementById('toastDesc');

    for (var i = 0; i < _subnavBtns.length; i++) {
      (function (btn) {
        btn.addEventListener('click', function () {
          switchPanel(btn.getAttribute('data-subnav-id'));
        });
      })(_subnavBtns[i]);
    }

    switchPanel(DEFAULT_PANEL);

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.showToast = showToast;
    window.__settingsPage.switchPanel = switchPanel;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
