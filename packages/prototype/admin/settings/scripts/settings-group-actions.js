/**
 * settings-group-actions.js
 *
 * Handles Group CRUD actions: create, rename, disable.
 * Manages the name modal (shared for create/rename), disable confirmation modal,
 * and delegates toast feedback to the page orchestrator via
 * window.__settingsPage.showToast.
 *
 * Does NOT handle detail panel rendering or list refresh —
 * those are delegated via window.__settingsPage hooks
 * (onGroupCreated, onGroupRenamed, onGroupDisabled).
 *
 * DOM hooks:
 *   #groupNameModal, #groupNameModalTitle, #groupNameInput, #groupNameError,
 *   #groupNameHint, #btnConfirmGroupName
 *   #groupDisableModal, #disableModalGroupName, #disableModalRefDetail,
 *   #disableModalRefCount, #disableModalSimpleMsg, #btnConfirmDisable
 *   [data-action="create-group"], [data-action="rename-group"],
 *   [data-action="disable-group"]
 *
 * Contract ref: P0-CONTRACT §4 (关键动作), §4.1-4.3, §9 (Toast)
 * Production target: features/settings/model/useGroupActions
 */
(function () {
  'use strict';

  var _nameModal;
  var _nameTitle;
  var _nameInput;
  var _nameError;
  var _nameHint;
  var _nameConfirmBtn;

  var _disableModal;
  var _disableGroupName;
  var _disableRefDetail;
  var _disableRefCount;
  var _disableSimpleMsg;
  var _disableConfirmBtn;

  var _mode = 'create';
  var _renameGroupId = null;
  var _renameOldName = '';
  var _disableGroupId = null;

  function toast(key, vars) {
    var cfg = (window.SettingsConfig && window.SettingsConfig.TOAST) || {};
    var t = cfg[key];
    var title = t ? t.title : key;
    var desc = t ? t.desc : '';
    if (vars) {
      for (var k in vars) {
        if (Object.prototype.hasOwnProperty.call(vars, k)) {
          title = title.replace('{' + k + '}', vars[k]);
          desc = desc.replace('{' + k + '}', vars[k]);
        }
      }
    }
    var page = window.__settingsPage;
    if (page && page.showToast) page.showToast(title, desc);
  }

  function refreshList() {
    var page = window.__settingsPage;
    if (page && page.refreshGroupList) page.refreshGroupList();
  }

  // ── Name modal (create / rename) ──

  function openNameModal(mode, groupId, currentName) {
    _mode = mode;
    _renameGroupId = mode === 'rename' ? groupId : null;
    _renameOldName = currentName || '';

    if (mode === 'create') {
      _nameTitle.textContent = '新建 Group';
      _nameInput.value = '';
      _nameHint.textContent = '编号由系统自动生成，创建后状态为启用。';
      _nameConfirmBtn.textContent = '创建';
    } else {
      _nameTitle.textContent = '重命名 Group';
      _nameInput.value = currentName || '';
      _nameHint.textContent = '仅修改显示名称，编号不变。重命名会留痕。';
      _nameConfirmBtn.textContent = '保存';
    }

    _nameError.classList.add('hidden');
    _nameModal.style.display = '';
    requestAnimationFrame(function () {
      _nameModal.classList.add('show');
      _nameInput.focus();
    });
  }

  function closeNameModal() {
    _nameModal.classList.remove('show');
    setTimeout(function () {
      _nameModal.style.display = 'none';
      _nameInput.value = '';
      _nameError.classList.add('hidden');
    }, 300);
  }

  function confirmNameAction() {
    var name = _nameInput.value.trim();
    if (!name) {
      _nameError.classList.remove('hidden');
      _nameInput.focus();
      return;
    }
    _nameError.classList.add('hidden');

    var page = window.__settingsPage;

    if (_mode === 'create') {
      if (page && page.onGroupCreated) page.onGroupCreated(name);
      toast('groupCreated', { name: name });
    } else {
      if (page && page.onGroupRenamed) page.onGroupRenamed(_renameGroupId, name);
      refreshList();
      toast('groupRenamed', { oldName: _renameOldName, newName: name });
    }
    closeNameModal();
  }

  // ── Disable modal ──

  function openDisableModal(groupId, groupName, relatedCustomers, relatedCases) {
    _disableGroupId = groupId;
    _disableGroupName.textContent = groupName;

    var hasRefs = (relatedCustomers > 0 || relatedCases > 0);

    if (hasRefs) {
      _disableRefDetail.classList.remove('hidden');
      _disableSimpleMsg.classList.add('hidden');
      _disableRefCount.textContent =
        '该 Group 已被 ' + relatedCustomers + ' 个客户 / ' + relatedCases + ' 个案件引用。';
    } else {
      _disableRefDetail.classList.add('hidden');
      _disableSimpleMsg.classList.remove('hidden');
    }

    _disableModal.style.display = '';
    requestAnimationFrame(function () {
      _disableModal.classList.add('show');
    });
  }

  function closeDisableModal() {
    _disableModal.classList.remove('show');
    setTimeout(function () {
      _disableModal.style.display = 'none';
    }, 300);
  }

  function confirmDisable() {
    var name = _disableGroupName.textContent;
    var page = window.__settingsPage;

    if (page && page.onGroupDisabled) page.onGroupDisabled(_disableGroupId);
    refreshList();
    toast('groupDisabled', { name: name });
    closeDisableModal();
  }

  // ── Keyboard ──

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (_nameModal && _nameModal.classList.contains('show')) {
        closeNameModal();
      }
      if (_disableModal && _disableModal.classList.contains('show')) {
        closeDisableModal();
      }
    }
  }

  // ── Initialise ──

  function init() {
    _nameModal = document.getElementById('groupNameModal');
    _nameTitle = document.getElementById('groupNameModalTitle');
    _nameInput = document.getElementById('groupNameInput');
    _nameError = document.getElementById('groupNameError');
    _nameHint = document.getElementById('groupNameHint');
    _nameConfirmBtn = document.getElementById('btnConfirmGroupName');

    _disableModal = document.getElementById('groupDisableModal');
    _disableGroupName = document.getElementById('disableModalGroupName');
    _disableRefDetail = document.getElementById('disableModalRefDetail');
    _disableRefCount = document.getElementById('disableModalRefCount');
    _disableSimpleMsg = document.getElementById('disableModalSimpleMsg');
    _disableConfirmBtn = document.getElementById('btnConfirmDisable');

    if (_nameConfirmBtn) {
      _nameConfirmBtn.addEventListener('click', confirmNameAction);
    }
    if (_nameInput) {
      _nameInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmNameAction();
        }
      });
      _nameInput.addEventListener('input', function () {
        if (_nameInput.value.trim()) {
          _nameError.classList.add('hidden');
        }
      });
    }
    document.querySelectorAll('[data-action="close-group-name-modal"]').forEach(function (btn) {
      btn.addEventListener('click', closeNameModal);
    });

    if (_disableConfirmBtn) {
      _disableConfirmBtn.addEventListener('click', confirmDisable);
    }
    document.querySelectorAll('[data-action="close-disable-modal"]').forEach(function (btn) {
      btn.addEventListener('click', closeDisableModal);
    });

    document.querySelectorAll('[data-action="create-group"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        openNameModal('create');
      });
    });

    document.addEventListener('click', function (e) {
      var renameBtn = e.target.closest('[data-action="rename-group"]');
      if (renameBtn) {
        var id = renameBtn.getAttribute('data-group-id');
        var name = renameBtn.getAttribute('data-group-name') || '';
        openNameModal('rename', id, name);
        return;
      }

      var disableBtn = e.target.closest('[data-action="disable-group"]');
      if (disableBtn) {
        var gid = disableBtn.getAttribute('data-group-id');
        var gname = disableBtn.getAttribute('data-group-name') || '';
        var customers = parseInt(disableBtn.getAttribute('data-related-customers') || '0', 10);
        var cases = parseInt(disableBtn.getAttribute('data-related-cases') || '0', 10);
        openDisableModal(gid, gname, customers, cases);
      }
    });

    if (_nameModal) {
      _nameModal.addEventListener('click', function (e) {
        if (e.target === _nameModal) closeNameModal();
      });
    }
    if (_disableModal) {
      _disableModal.addEventListener('click', function (e) {
        if (e.target === _disableModal) closeDisableModal();
      });
    }

    document.addEventListener('keydown', handleKeyDown);

    window.__settingsPage = window.__settingsPage || {};
    window.__settingsPage.openCreateGroupModal = function () {
      openNameModal('create');
    };
    window.__settingsPage.openRenameGroupModal = function (groupId, currentName) {
      openNameModal('rename', groupId, currentName);
    };
    window.__settingsPage.openDisableGroupModal = function (groupId, groupName, relatedCustomers, relatedCases) {
      openDisableModal(groupId, groupName, relatedCustomers, relatedCases);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
