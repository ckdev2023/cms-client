(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var config = window.TasksConfig;
    var modal = window.TasksModal;
    var filters = window.TasksFilters;
    var bulk = window.TasksBulkActions;
    var reminderLog = window.TasksReminderLog;

    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');

    var showToast = function (opts) {
      if (toastTitle) toastTitle.textContent = opts.title;
      if (toastDesc) toastDesc.textContent = opts.desc;
      if (toastEl) toastEl.classList.remove('hidden');
      clearTimeout(showToast._t);
      showToast._t = setTimeout(function () {
        if (toastEl) toastEl.classList.add('hidden');
      }, 2200);
    };

    /* ================================================================ */
    /*  SESSION STORAGE — persist task changes across navigation         */
    /* ================================================================ */

    var TASK_OVERRIDES_KEY = 'prototype.taskOverrides';
    var TASK_CREATED_KEY = 'prototype.taskCreated';
    var CASE_DETAIL_STATES_KEY = 'prototype.caseDetailStates';

    var _readJson = function (key) {
      try { var r = sessionStorage.getItem(key); return r ? JSON.parse(r) : null; }
      catch (_e) { return null; }
    };
    var _writeJson = function (key, val) {
      try { sessionStorage.setItem(key, JSON.stringify(val)); }
      catch (_e) { /* noop */ }
    };

    var persistTaskPatch = function (taskId, patch) {
      var all = _readJson(TASK_OVERRIDES_KEY) || {};
      var prev = all[taskId] || {};
      for (var k in patch) {
        if (patch.hasOwnProperty(k)) prev[k] = patch[k];
      }
      all[taskId] = prev;
      _writeJson(TASK_OVERRIDES_KEY, all);
    };

    var persistCreatedTask = function (taskData) {
      var list = _readJson(TASK_CREATED_KEY) || [];
      list.push(taskData);
      _writeJson(TASK_CREATED_KEY, list);
    };

    var upsertDemoTask = function (taskData, insertAtFront) {
      if (!taskData || !taskData.id || !DATA || !DATA.DEMO_TASKS) return;
      var i;
      for (i = 0; i < DATA.DEMO_TASKS.length; i++) {
        if (DATA.DEMO_TASKS[i].id === taskData.id) {
          DATA.DEMO_TASKS[i] = taskData;
          return;
        }
      }
      if (insertAtFront) DATA.DEMO_TASKS.unshift(taskData);
      else DATA.DEMO_TASKS.push(taskData);
    };

    modal.setup();
    filters.setup();
    bulk.setup(showToast);
    reminderLog.setup({
      onClose: function () { setActiveView('my-todo'); },
      onNavigateTask: function (taskId) { openDetailPanel(taskId); },
    });

    // Submit task (create or edit)
    var submitBtn = document.getElementById('submitTaskBtn');
    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        var nameEl = document.getElementById('fieldTaskName');
        var groupEl = document.getElementById('fieldGroup');
        var ownerEl = document.getElementById('fieldOwner');
        var deadlineEl = document.getElementById('fieldDeadline');
        var priorityEl = document.getElementById('fieldPriority');
        var sourceEl = document.getElementById('fieldSource');
        var descEl = document.getElementById('fieldDescription');

        var taskName = nameEl ? nameEl.value.trim() : '';
        var groupId = groupEl ? groupEl.value : '';
        var ownerId = ownerEl ? ownerEl.value : '';
        var deadline = deadlineEl ? deadlineEl.value : '';
        var priority = priorityEl ? priorityEl.value : 'medium';
        var source = sourceEl ? sourceEl.value : 'manual';
        var description = descEl ? descEl.value.trim() : '';

        if (!taskName) { showToast(config.TOAST.create); modal.closeModal(); return; }

        var newId = 'task-' + String(Date.now()).slice(-6);
        var ownerInfo = config.OWNERS.find(function (o) { return o.value === ownerId; });
        var ownerObj = ownerInfo
          ? { id: ownerInfo.value, name: ownerInfo.label, initials: ownerInfo.initials }
          : { id: ownerId || 'admin', name: ownerId || 'Admin', initials: (ownerId || 'A').charAt(0).toUpperCase() };

        var newTask = {
          id: newId,
          taskName: taskName,
          caseId: '',
          caseLabel: '',
          group: groupId,
          owner: ownerObj,
          priority: priority,
          deadline: deadline ? deadline + (deadline.indexOf('T') === -1 ? 'T18:00:00' : '') : '',
          status: 'todo',
          source: source,
          description: description,
        };

        if (DATA && DATA.DEMO_TASKS) DATA.DEMO_TASKS.push(newTask);
        persistCreatedTask(newTask);

        var tbody = document.getElementById('taskTableBody');
        if (tbody) {
          var groupLabel = config.GROUP_LABEL_MAP[groupId] || groupId;
          var priorityBadge = config.PRIORITY_BADGE_MAP[priority] || '';
          var priorityLabel = config.PRIORITY_LABEL_MAP[priority] || priority;
          var sourceLabel = config.SOURCE_LABEL_MAP[source] || source;
          var deadlineDisplay = deadline ? deadline.replace('T', ' ') : '—';
          var tr = document.createElement('tr');
          tr.setAttribute('data-task-id', newId);
          tr.setAttribute('data-task-select-row', '');
          tr.innerHTML =
            '<td class="text-center"><input type="checkbox" class="accent-[var(--primary)] table-checkbox" data-task-select value="' + newId + '" aria-label="选择 ' + taskName.replace(/"/g, '&quot;') + '" /></td>' +
            '<td><div class="font-medium text-[var(--text)]">' + taskName.replace(/</g, '&lt;') + '</div></td>' +
            '<td class="hidden md:table-cell"><span class="text-sm text-[var(--muted-2)]">—</span></td>' +
            '<td class="hidden lg:table-cell"><span class="chip">' + (groupLabel || '—') + '</span></td>' +
            '<td class="hidden md:table-cell"><div class="flex items-center text-sm"><div class="w-5 h-5 rounded-full ' + (ownerInfo ? ownerInfo.bg : 'bg-gray-200') + ' ' + (ownerInfo ? ownerInfo.text : '') + ' text-xs flex items-center justify-center mr-2 flex-shrink-0">' + ownerObj.initials + '</div>' + ownerObj.name + '</div></td>' +
            '<td class="text-center"><span class="badge ' + priorityBadge + '">' + priorityLabel + '</span></td>' +
            '<td class="hidden md:table-cell"><div class="text-sm text-[var(--text)]">' + deadlineDisplay + '</div></td>' +
            '<td><span class="badge badge-gray">待处理</span></td>' +
            '<td class="hidden lg:table-cell"><span class="text-sm text-[var(--muted-2)]">' + sourceLabel + '</span></td>';
          tbody.insertBefore(tr, tbody.firstChild);
        }

        showToast(config.TOAST.create);
        modal.closeModal();
      });
    }

    // Workbench sidebar view switching
    var sidebar = document.getElementById('workbenchSidebar');
    var activeViewId = 'my-todo';

    var setActiveView = function (viewId) {
      activeViewId = viewId;
      if (!sidebar) return;
      var links = sidebar.querySelectorAll('[data-view-id]');
      links.forEach(function (link) {
        var isActive = link.getAttribute('data-view-id') === viewId;
        link.setAttribute('aria-current', String(isActive));
        link.classList.toggle('is-active', isActive);
        link.classList.toggle('is-inactive', !isActive);
      });

      var targetView = config.WORKBENCH_VIEWS.find(function (v) { return v.id === viewId; });
      if (targetView && targetView.switchPanel) {
        reminderLog.showLogPanel();
      } else {
        reminderLog.hideLogPanel();
        filters.applyViewPreset(viewId);
      }
    };

    if (sidebar) {
      sidebar.addEventListener('click', function (e) {
        var link = e.target.closest('[data-view-id]');
        if (!link) return;
        e.preventDefault();
        setActiveView(link.getAttribute('data-view-id'));
      });
    }

    // Task detail panel
    var detailPanel = document.getElementById('taskDetailPanel');
    var closeDetailBtn = document.getElementById('closeDetailBtn');
    var _activeTaskId = null;

    var openDetailPanel = function (taskId) {
      _activeTaskId = taskId;
      if (detailPanel) {
        detailPanel.classList.remove('translate-x-full');
      }
    };

    var closeDetailPanel = function () {
      if (detailPanel) {
        detailPanel.classList.add('translate-x-full');
      }
    };

    if (closeDetailBtn) closeDetailBtn.addEventListener('click', closeDetailPanel);

    var DATA = window.TasksDemoData;

    /**
     * Update a task row's status badge, visual state, and backing data.
     * @param {string} taskId
     * @param {string} newStatus - one of 'todo','doing','done','canceled'
     */
    var updateTaskRowStatus = function (taskId, newStatus) {
      var row = document.querySelector('tr[data-task-id="' + taskId + '"]');
      if (!row) return;
      var statusLabel = config.STATUS_LABEL_MAP[newStatus] || newStatus;
      var badgeClass = config.STATUS_BADGE_MAP[newStatus] || 'badge-gray';
      var badges = row.querySelectorAll('.badge');
      for (var i = 0; i < badges.length; i++) {
        var text = badges[i].textContent.trim();
        if (config.STATUS_LABEL_MAP.todo === text ||
            config.STATUS_LABEL_MAP.doing === text ||
            config.STATUS_LABEL_MAP.done === text ||
            config.STATUS_LABEL_MAP.canceled === text) {
          badges[i].className = 'badge ' + badgeClass;
          badges[i].textContent = statusLabel;
          break;
        }
      }
      var isTerminal = newStatus === 'done' || newStatus === 'canceled';
      row.classList.toggle('opacity-60', isTerminal);
      var cb = row.querySelector('input[data-task-select]');
      if (cb) cb.disabled = isTerminal;

      var detailStatus = document.getElementById('detailStatus');
      if (detailStatus && _activeTaskId === taskId) {
        detailStatus.className = 'badge ' + badgeClass;
        detailStatus.textContent = statusLabel;
      }

      if (DATA && DATA.DEMO_TASKS) {
        var task = DATA.DEMO_TASKS.find(function (t) { return t.id === taskId; });
        if (task) {
          task.status = newStatus;
          if (newStatus === 'done') task.completedAt = new Date().toISOString();
        }
      }

      var statusPatch = { status: newStatus };
      if (newStatus === 'done') statusPatch.completedAt = new Date().toISOString();
      persistTaskPatch(taskId, statusPatch);
    };

    /**
     * Update a task row's owner display and backing data.
     * @param {string} taskId
     * @param {string} ownerId
     * @param {string} ownerLabel
     */
    var updateTaskRowOwner = function (taskId, ownerId, ownerLabel) {
      var row = document.querySelector('tr[data-task-id="' + taskId + '"]');
      if (!row) return;
      var ownerInfo = config.OWNERS.find(function (o) { return o.value === ownerId; });
      var initials = ownerInfo ? ownerInfo.initials : ownerId.charAt(0).toUpperCase();
      var bgCls = ownerInfo ? ownerInfo.bg : 'bg-gray-200';
      var textCls = ownerInfo ? ownerInfo.text : '';
      var ownerCells = row.querySelectorAll('td');
      for (var i = 0; i < ownerCells.length; i++) {
        var avatar = ownerCells[i].querySelector('.rounded-full');
        if (avatar && avatar.parentElement) {
          avatar.className = 'w-5 h-5 rounded-full ' + bgCls + ' ' + textCls + ' text-xs flex items-center justify-center mr-2 flex-shrink-0';
          avatar.textContent = initials;
          var textNode = avatar.parentElement.lastChild;
          if (textNode && textNode.nodeType === 3) {
            textNode.textContent = ownerLabel;
          }
          break;
        }
      }
      if (DATA && DATA.DEMO_TASKS) {
        var task = DATA.DEMO_TASKS.find(function (t) { return t.id === taskId; });
        if (task) {
          task.owner = { id: ownerId, name: ownerLabel, initials: initials };
        }
      }

      persistTaskPatch(taskId, { owner: ownerId, ownerLabel: ownerLabel });
    };

    /**
     * Update a task row's deadline display and backing data.
     * @param {string} taskId
     * @param {string} newDeadline - ISO date string or 'YYYY-MM-DD' or datetime
     */
    var updateTaskRowDeadline = function (taskId, newDeadline) {
      var row = document.querySelector('tr[data-task-id="' + taskId + '"]');
      if (!row) return;
      var dateStr = newDeadline.length > 10
        ? newDeadline.replace('T', ' ').slice(0, 16)
        : newDeadline + ' 18:00';

      var deadlineCell = row.cells[6];
      if (deadlineCell) {
        var subDate = deadlineCell.querySelector('.text-\\[12px\\]');
        if (subDate) {
          subDate.textContent = dateStr;
          var statusDiv = subDate.previousElementSibling;
          if (statusDiv) {
            statusDiv.textContent = dateStr.slice(0, 10);
            statusDiv.className = 'text-sm text-[var(--text)]';
          }
        } else {
          var inner = deadlineCell.querySelector('div');
          if (inner) {
            inner.textContent = dateStr;
            inner.className = 'text-sm text-[var(--text)]';
          } else {
            deadlineCell.innerHTML = '<div class="text-sm text-[var(--text)]">' + dateStr + '</div>';
          }
        }
      }
      if (DATA && DATA.DEMO_TASKS) {
        var task = DATA.DEMO_TASKS.find(function (t) { return t.id === taskId; });
        if (task) {
          task.deadline = newDeadline.length > 10 ? newDeadline : newDeadline + 'T18:00:00';
        }
      }

      persistTaskPatch(taskId, { deadline: newDeadline });
    };

    window.__tasksPage = {
      updateTaskRowStatus: updateTaskRowStatus,
      updateTaskRowOwner: updateTaskRowOwner,
      updateTaskRowDeadline: updateTaskRowDeadline,
      getActiveTaskId: function () { return _activeTaskId; },
    };

    // Detail panel actions
    var detailCompleteBtn = document.getElementById('detailCompleteBtn');
    var detailCancelBtn = document.getElementById('detailCancelBtn');
    var detailEditBtn = document.getElementById('detailEditBtn');

    if (detailCompleteBtn) {
      detailCompleteBtn.addEventListener('click', function () {
        if (_activeTaskId) updateTaskRowStatus(_activeTaskId, 'done');
        showToast(config.TOAST.complete);
        closeDetailPanel();
        bulk.updateBulkState();
      });
    }

    if (detailCancelBtn) {
      detailCancelBtn.addEventListener('click', function () {
        closeDetailPanel();
        bulk.openCancelDialog('single');
      });
    }

    if (detailEditBtn) {
      detailEditBtn.addEventListener('click', function () {
        closeDetailPanel();
        modal.openModal('edit');
      });
    }

    // Task row click → open detail
    var taskTableBody = document.getElementById('taskTableBody');
    if (taskTableBody) {
      taskTableBody.addEventListener('click', function (e) {
        if (e.target.closest('input[data-task-select]')) return;
        if (e.target.closest('a')) return;
        var row = e.target.closest('tr[data-task-id]');
        if (!row) return;
        var taskId = row.getAttribute('data-task-id');
        openDetailPanel(taskId);
      });
    }

    // #new hash → open create modal
    if (window.location.hash === '#new') {
      modal.resetForm();
      modal.openModal('create');
    }

    /* ================================================================ */
    /*  RESTORE PERSISTED STATE — created tasks + field overrides        */
    /* ================================================================ */

    var _buildRowHtml = function (t) {
      var ownerInfo = config.OWNERS.find(function (o) { return o.value === (t.owner && t.owner.id || t.owner); });
      var ownerObj = t.owner && t.owner.name ? t.owner : (ownerInfo
        ? { id: ownerInfo.value, name: ownerInfo.label, initials: ownerInfo.initials }
        : { id: 'admin', name: 'Admin', initials: 'AD' });
      var groupLabel = config.GROUP_LABEL_MAP[t.group] || t.group || '—';
      var priorityBadge = config.PRIORITY_BADGE_MAP[t.priority] || '';
      var priorityLabel = config.PRIORITY_LABEL_MAP[t.priority] || t.priority || '中';
      var sourceLabel = config.SOURCE_LABEL_MAP[t.source] || t.source || '手动';
      var deadlineDisplay = t.deadline ? String(t.deadline).replace('T', ' ').slice(0, 16) : '—';
      var statusLabel = config.STATUS_LABEL_MAP[t.status] || '待处理';
      var statusBadge = config.STATUS_BADGE_MAP[t.status] || 'badge-gray';
      var isTerminal = t.status === 'done' || t.status === 'canceled';
      var name = (t.taskName || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');

      return '<td class="text-center"><input type="checkbox" class="accent-[var(--primary)] table-checkbox" data-task-select value="' + t.id + '" aria-label="选择 ' + name + '"' + (isTerminal ? ' disabled' : '') + ' /></td>' +
        '<td><div class="font-medium text-[var(--text)]">' + name + '</div></td>' +
        '<td class="hidden md:table-cell"><span class="text-sm text-[var(--muted-2)]">' + (t.caseLabel || t.caseId || '—') + '</span></td>' +
        '<td class="hidden lg:table-cell"><span class="chip">' + groupLabel + '</span></td>' +
        '<td class="hidden md:table-cell"><div class="flex items-center text-sm"><div class="w-5 h-5 rounded-full ' + (ownerInfo ? ownerInfo.bg : 'bg-gray-200') + ' ' + (ownerInfo ? ownerInfo.text : '') + ' text-xs flex items-center justify-center mr-2 flex-shrink-0">' + ownerObj.initials + '</div>' + ownerObj.name + '</div></td>' +
        '<td class="text-center"><span class="badge ' + priorityBadge + '">' + priorityLabel + '</span></td>' +
        '<td class="hidden md:table-cell"><div class="text-sm text-[var(--text)]">' + deadlineDisplay + '</div></td>' +
        '<td><span class="badge ' + statusBadge + '">' + statusLabel + '</span></td>' +
        '<td class="hidden lg:table-cell"><span class="text-sm text-[var(--muted-2)]">' + sourceLabel + '</span></td>';
    };

    var _insertTaskRowIfMissing = function (t, tbody, insertAtFront) {
      if (!t || !t.id || !tbody) return;
      if (document.querySelector('tr[data-task-id="' + t.id + '"]')) return;
      var tr = document.createElement('tr');
      tr.setAttribute('data-task-id', t.id);
      tr.setAttribute('data-task-select-row', '');
      if (t.status === 'done' || t.status === 'canceled') tr.classList.add('opacity-60');
      tr.innerHTML = _buildRowHtml(t);
      if (insertAtFront && tbody.firstChild) tbody.insertBefore(tr, tbody.firstChild);
      else tbody.appendChild(tr);
    };

    var _priorityFromReminder = function (daysBefore) {
      if (daysBefore <= 30) return 'high';
      if (daysBefore <= 90) return 'medium';
      return 'low';
    };

    var _buildCaseReminderTask = function (detailState, taskItem, reminderMeta) {
      if (!taskItem || !taskItem.source_key) return null;

      var triggerDate = reminderMeta && reminderMeta.triggerDate
        ? reminderMeta.triggerDate
        : '';
      var daysBefore = reminderMeta && reminderMeta.daysBefore
        ? reminderMeta.daysBefore
        : 90;
      var taskName = taskItem.label || (reminderMeta && reminderMeta.label) || '续签提醒';
      var caseTitle = detailState && detailState.title ? detailState.title : '';

      return {
        id: taskItem.source_key,
        taskName: taskName,
        caseId: detailState && detailState.id ? detailState.id : '',
        caseLabel: detailState && detailState.id
          ? detailState.id + (caseTitle ? ' ' + caseTitle : '')
          : caseTitle,
        group: '',
        owner: { id: 'admin', name: 'Admin', initials: 'AD' },
        priority: _priorityFromReminder(daysBefore),
        deadline: triggerDate ? triggerDate + 'T09:00:00' : '',
        status: taskItem.done ? 'done' : 'todo',
        source: 'renewal',
        description: '由案件详情的在留期间登记自动生成的续签提醒任务。',
      };
    };

    var _restoreCaseReminderTasks = function (tbody) {
      var states = _readJson(CASE_DETAIL_STATES_KEY) || {};
      var caseIds = Object.keys(states);

      caseIds.forEach(function (caseId) {
        var detailState = states[caseId];
        if (!detailState || !Array.isArray(detailState.tasks)) return;

        var reminderMap = {};
        (detailState.renewalReminders || []).forEach(function (reminder) {
          if (reminder && reminder.taskId) reminderMap[reminder.taskId] = reminder;
        });

        detailState.tasks.forEach(function (taskItem) {
          if (!taskItem || taskItem.source_type !== 'renewal_reminder' || !taskItem.source_key) return;
          var taskData = _buildCaseReminderTask(detailState, taskItem, reminderMap[taskItem.source_key]);
          if (!taskData) return;
          upsertDemoTask(taskData, true);
          _insertTaskRowIfMissing(taskData, tbody, true);
        });
      });
    };

    (function restorePersistedTasks() {
      var created = _readJson(TASK_CREATED_KEY) || [];
      var tbody = document.getElementById('taskTableBody');
      created.forEach(function (t) {
        if (!t || !t.id) return;
        upsertDemoTask(t);
        _insertTaskRowIfMissing(t, tbody, true);
      });

      _restoreCaseReminderTasks(tbody);

      var overrides = _readJson(TASK_OVERRIDES_KEY) || {};
      for (var taskId in overrides) {
        if (!overrides.hasOwnProperty(taskId)) continue;
        var ov = overrides[taskId];
        if (ov.status) updateTaskRowStatus(taskId, ov.status);
        if (ov.owner) updateTaskRowOwner(taskId, ov.owner, ov.ownerLabel || ov.owner);
        if (ov.deadline) updateTaskRowDeadline(taskId, ov.deadline);
      }
    })();

    // Initial state
    modal.updateSubmitEnabled();
    bulk.updateBulkState();
  });
})();
