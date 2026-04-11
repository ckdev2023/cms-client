(function () {
  'use strict';

  var config = window.TasksConfig;
  var ns = (window.TasksBulkActions = {});

  ns.setup = function (showToast) {
    var bulkActionBar = document.getElementById('bulkActionBar');
    var selectedCountEl = document.getElementById('selectedCount');
    var selectAllTasks = document.getElementById('selectAllTasks');
    var bulkClearBtn = document.getElementById('bulkClearBtn');
    var taskTableBody = document.getElementById('taskTableBody');

    var getSelectableCheckboxes = function () {
      var boxes = Array.from(document.querySelectorAll('input[data-task-select]'));
      return boxes.filter(function (el) { return !el.disabled; });
    };

    ns.updateBulkState = function () {
      var boxes = getSelectableCheckboxes();
      var selected = boxes.filter(function (el) { return el.checked; });
      var selectedCount = selected.length;

      if (selectedCountEl) selectedCountEl.textContent = String(selectedCount);
      if (bulkActionBar) bulkActionBar.classList.toggle('hidden', selectedCount === 0);

      if (selectAllTasks) {
        var total = boxes.length;
        var allSelected = total > 0 && selectedCount === total;
        selectAllTasks.checked = allSelected;
        selectAllTasks.indeterminate = selectedCount > 0 && selectedCount < total;
      }
    };

    var getSelectedIds = function () {
      return getSelectableCheckboxes()
        .filter(function (el) { return el.checked; })
        .map(function (el) { return el.value; })
        .filter(Boolean);
    };

    if (selectAllTasks) {
      selectAllTasks.addEventListener('change', function () {
        var boxes = getSelectableCheckboxes();
        boxes.forEach(function (el) {
          el.checked = selectAllTasks.checked;
        });
        ns.updateBulkState();
      });
    }

    if (taskTableBody) {
      taskTableBody.addEventListener('change', function (e) {
        if (!e.target || e.target.getAttribute('data-task-select') == null) return;
        ns.updateBulkState();
      });
    }

    if (bulkClearBtn) {
      bulkClearBtn.addEventListener('click', function () {
        var boxes = getSelectableCheckboxes();
        boxes.forEach(function (el) { el.checked = false; });
        ns.updateBulkState();
      });
    }

    var toastCfg = config.TOAST;

    // Bulk assign
    var bulkAssignApplyBtn = document.getElementById('bulkAssignApplyBtn');
    var bulkAssignSelect = document.getElementById('bulkAssignSelect');
    if (bulkAssignApplyBtn) {
      bulkAssignApplyBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        var value = bulkAssignSelect ? bulkAssignSelect.value.trim() : '';
        if (!value || ids.length === 0) return;
        var ownerLabel = bulkAssignSelect.options[bulkAssignSelect.selectedIndex].text;
        var ownerUpdater = window.__tasksPage && window.__tasksPage.updateTaskRowOwner;
        ids.forEach(function (id) { if (ownerUpdater) ownerUpdater(id, value, ownerLabel); });
        showToast({
          title: toastCfg.bulkAssign.title,
          desc: toastCfg.bulkAssign.desc.replace('{count}', String(ids.length)).replace('{value}', ownerLabel),
        });
        bulkAssignSelect.value = '';
      });
    }

    // Bulk deadline
    var bulkDeadlineApplyBtn = document.getElementById('bulkDeadlineApplyBtn');
    var bulkDeadlineInput = document.getElementById('bulkDeadlineInput');
    if (bulkDeadlineApplyBtn) {
      bulkDeadlineApplyBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        var value = bulkDeadlineInput ? bulkDeadlineInput.value.trim() : '';
        if (!value || ids.length === 0) return;
        var deadlineUpdater = window.__tasksPage && window.__tasksPage.updateTaskRowDeadline;
        ids.forEach(function (id) { if (deadlineUpdater) deadlineUpdater(id, value); });
        showToast({
          title: toastCfg.bulkDeadline.title,
          desc: toastCfg.bulkDeadline.desc.replace('{count}', String(ids.length)).replace('{value}', value),
        });
        bulkDeadlineInput.value = '';
      });
    }

    // Bulk complete
    var bulkCompleteBtn = document.getElementById('bulkCompleteBtn');
    if (bulkCompleteBtn) {
      bulkCompleteBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        var updater = window.__tasksPage && window.__tasksPage.updateTaskRowStatus;
        ids.forEach(function (id) { if (updater) updater(id, 'done'); });
        showToast({
          title: toastCfg.bulkComplete.title,
          desc: toastCfg.bulkComplete.desc.replace('{count}', String(ids.length)),
        });
        ns.updateBulkState();
      });
    }

    // Bulk cancel — opens cancel-reason dialog
    var bulkCancelBtn = document.getElementById('bulkCancelBtn');
    var cancelReasonDialog = document.getElementById('cancelReasonDialog');
    var cancelReasonSelect = document.getElementById('cancelReasonSelect');
    var cancelReasonNote = document.getElementById('cancelReasonNote');
    var cancelReasonNoteWrap = document.getElementById('cancelReasonNoteWrap');
    var cancelReasonConfirmBtn = document.getElementById('cancelReasonConfirmBtn');
    var cancelReasonBackBtn = document.getElementById('cancelReasonBackBtn');

    var cancelDialogSource = null;

    var openCancelDialog = function (source) {
      cancelDialogSource = source;
      if (cancelReasonSelect) cancelReasonSelect.value = '';
      if (cancelReasonNote) cancelReasonNote.value = '';
      if (cancelReasonNoteWrap) cancelReasonNoteWrap.classList.add('hidden');
      if (cancelReasonConfirmBtn) cancelReasonConfirmBtn.disabled = true;
      if (cancelReasonDialog) cancelReasonDialog.classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    var closeCancelDialog = function () {
      if (cancelReasonDialog) cancelReasonDialog.classList.remove('show');
      document.body.style.overflow = '';
      cancelDialogSource = null;
    };

    if (cancelReasonSelect) {
      cancelReasonSelect.addEventListener('change', function () {
        var val = cancelReasonSelect.value;
        var needsNote = val === 'other';
        if (cancelReasonNoteWrap) cancelReasonNoteWrap.classList.toggle('hidden', !needsNote);
        if (cancelReasonConfirmBtn) cancelReasonConfirmBtn.disabled = !val;
      });
    }

    var cancelReasonCancelBtn = document.getElementById('cancelReasonCancelBtn');

    if (cancelReasonBackBtn) {
      cancelReasonBackBtn.addEventListener('click', closeCancelDialog);
    }
    if (cancelReasonCancelBtn) {
      cancelReasonCancelBtn.addEventListener('click', closeCancelDialog);
    }
    if (cancelReasonDialog) {
      cancelReasonDialog.addEventListener('click', function (e) {
        if (e.target === cancelReasonDialog) closeCancelDialog();
      });
    }

    if (cancelReasonConfirmBtn) {
      cancelReasonConfirmBtn.addEventListener('click', function () {
        var val = cancelReasonSelect ? cancelReasonSelect.value : '';
        if (!val) return;
        if (val === 'other') {
          var note = cancelReasonNote ? cancelReasonNote.value.trim() : '';
          if (!note) return;
        }
        var cancelReasonVal = val;
        var cancelNoteVal = (val === 'other' && cancelReasonNote) ? cancelReasonNote.value.trim() : null;
        var tp = window.__tasksPage || {};
        var updater = tp.updateTaskRowStatus;
        var DATA = window.TasksDemoData;
        closeCancelDialog();

        var applyCancelFields = function (taskId) {
          if (updater) updater(taskId, 'canceled');
          if (DATA && DATA.DEMO_TASKS) {
            var t = DATA.DEMO_TASKS.find(function (d) { return d.id === taskId; });
            if (t) { t.cancelReason = cancelReasonVal; t.cancelNote = cancelNoteVal; }
          }
          try {
            var TASK_OVERRIDES_KEY = 'prototype.taskOverrides';
            var raw = sessionStorage.getItem(TASK_OVERRIDES_KEY);
            var all = raw ? JSON.parse(raw) : {};
            var prev = all[taskId] || {};
            prev.cancelReason = cancelReasonVal;
            prev.cancelNote = cancelNoteVal;
            all[taskId] = prev;
            sessionStorage.setItem(TASK_OVERRIDES_KEY, JSON.stringify(all));
          } catch (_e) { /* noop */ }
        };

        if (cancelDialogSource === 'bulk') {
          var ids = getSelectedIds();
          ids.forEach(applyCancelFields);
          showToast({
            title: toastCfg.bulkCancel.title,
            desc: toastCfg.bulkCancel.desc.replace('{count}', String(ids.length)),
          });
          ns.updateBulkState();
        } else {
          var activeId = tp.getActiveTaskId ? tp.getActiveTaskId() : null;
          if (activeId) applyCancelFields(activeId);
          showToast(toastCfg.cancel);
          ns.updateBulkState();
        }
      });
    }

    ns.openCancelDialog = openCancelDialog;

    if (bulkCancelBtn) {
      bulkCancelBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        openCancelDialog('bulk');
      });
    }
  };
})();
