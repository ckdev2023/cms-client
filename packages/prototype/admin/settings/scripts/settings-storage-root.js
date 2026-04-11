/**
 * settings-storage-root.js
 *
 * Manages the local document root directory configuration panel:
 * - Live path preview as root path input changes
 * - Save action with timestamp + toast feedback
 * - Not-configured warning state (shown when both fields are empty)
 *
 * DOM hooks:
 *   #storageNotConfiguredHint — warning banner (hidden when configured)
 *   #inputRootName            — root directory display name input
 *   #inputRootPath            — UNC path / mount point input
 *   #pathPreview              — live path preview output
 *   #lastUpdatedBy            — last editor display
 *   #lastUpdatedAt            — last update timestamp display
 *   #btnSaveStorageRoot       — save button
 *   #storageRootSaveStatus    — last-saved timestamp display
 *
 * Contract ref: P0-CONTRACT §6 本地资料根目录配置
 * Production target: features/settings/model/useStorageRootViewModel
 */
(function () {
  'use strict';

  var DEMO_CONFIG = {
    rootName: '案件資料総盤',
    rootPath: '\\\\fileserver\\gyosei-docs',
    lastUpdatedBy: 'Admin',
    lastUpdatedAt: '2025-03-20 14:30',
  };

  var _inputName;
  var _inputPath;
  var _pathPreview;
  var _lastUpdatedBy;
  var _lastUpdatedAt;
  var _btnSave;
  var _saveStatus;
  var _notConfiguredHint;

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function updatePathPreview() {
    if (!_pathPreview || !_inputPath) return;

    var root = _inputPath.value.trim();
    if (!root) {
      _pathPreview.innerHTML =
        '<span class="text-[var(--muted-2)]">（请输入根目录路径）</span>/' +
        '<span class="text-blue-600">{relative_path}</span>';
      return;
    }

    var separator = root.charAt(root.length - 1) === '/' || root.charAt(root.length - 1) === '\\' ? '' : '/';
    _pathPreview.innerHTML =
      escapeHtml(root) + separator +
      '<span class="text-blue-600">{relative_path}</span>';
  }

  function updateNotConfiguredState() {
    if (!_notConfiguredHint) return;

    var nameEmpty = !_inputName || !_inputName.value.trim();
    var pathEmpty = !_inputPath || !_inputPath.value.trim();

    if (nameEmpty && pathEmpty) {
      _notConfiguredHint.classList.remove('hidden');
    } else {
      _notConfiguredHint.classList.add('hidden');
    }
  }

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
    var name = _inputName ? _inputName.value.trim() : '';
    var path = _inputPath ? _inputPath.value.trim() : '';

    if (!name || !path) {
      showToast('保存失败', '根目录名称和路径均为必填项');
      return;
    }

    var ts = formatTimestamp();

    DEMO_CONFIG.rootName = name;
    DEMO_CONFIG.rootPath = path;
    DEMO_CONFIG.lastUpdatedBy = 'Admin';
    DEMO_CONFIG.lastUpdatedAt = ts;

    if (_lastUpdatedBy) _lastUpdatedBy.textContent = 'Admin';
    if (_lastUpdatedAt) _lastUpdatedAt.textContent = ts;
    if (_saveStatus) _saveStatus.textContent = '上次保存：' + ts;

    updateNotConfiguredState();
    showToast('根目录配置已保存', '路径策略已更新');
  }

  function init() {
    _inputName = document.getElementById('inputRootName');
    _inputPath = document.getElementById('inputRootPath');
    _pathPreview = document.getElementById('pathPreview');
    _lastUpdatedBy = document.getElementById('lastUpdatedBy');
    _lastUpdatedAt = document.getElementById('lastUpdatedAt');
    _btnSave = document.getElementById('btnSaveStorageRoot');
    _saveStatus = document.getElementById('storageRootSaveStatus');
    _notConfiguredHint = document.getElementById('storageNotConfiguredHint');

    if (_inputPath) {
      _inputPath.addEventListener('input', function () {
        updatePathPreview();
        updateNotConfiguredState();
      });
    }
    if (_inputName) {
      _inputName.addEventListener('input', updateNotConfiguredState);
    }

    if (_btnSave) {
      _btnSave.addEventListener('click', handleSave);
    }

    updatePathPreview();
    updateNotConfiguredState();

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.showToast = window.__settingsPage.showToast || function (title, desc) {
      showToast(title, desc);
    };
    window.__settingsPage.getStorageRootState = function () {
      return {
        rootName: _inputName ? _inputName.value.trim() : '',
        rootPath: _inputPath ? _inputPath.value.trim() : '',
        isConfigured: !!((_inputName && _inputName.value.trim()) && (_inputPath && _inputPath.value.trim())),
      };
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
