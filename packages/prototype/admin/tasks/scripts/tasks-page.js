(function () {
  'use strict';

  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

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

    var escapeHtml = function (value) {
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
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
          var guidance = getTaskExecutionCopy(newTask);
          var tr = document.createElement('tr');
          tr.setAttribute('data-task-id', newId);
          tr.setAttribute('data-task-select-row', '');
          tr.innerHTML =
            '<td class="text-center"><input type="checkbox" class="accent-[var(--primary)] table-checkbox" data-task-select value="' + newId + '" aria-label="选择 ' + taskName.replace(/"/g, '&quot;') + '" /></td>' +
            '<td><div class="font-medium text-[var(--text)]">' + taskName.replace(/</g, '&lt;') + '</div><div class="mt-1 space-y-0.5" data-task-guidance><div class="text-[11px] text-[var(--muted-2)]">当前卡点：<span class="text-[var(--text)]">' + escapeHtml(guidance.blocker) + '</span></div><div class="text-[11px] font-semibold text-[var(--text)]">下一步：' + escapeHtml(guidance.nextAction) + '</div></div></td>' +
            '<td class="hidden md:table-cell"><span class="text-sm text-[var(--muted-2)]">—</span></td>' +
            '<td class="hidden lg:table-cell"><span class="chip">' + (groupLabel || '—') + '</span></td>' +
            '<td class="hidden md:table-cell"><div class="flex items-center text-sm"><div class="w-5 h-5 rounded-full ' + (ownerInfo ? ownerInfo.bg : 'bg-gray-200') + ' ' + (ownerInfo ? ownerInfo.text : '') + ' text-xs flex items-center justify-center mr-2 flex-shrink-0">' + ownerObj.initials + '</div>' + ownerObj.name + '</div></td>' +
            '<td class="text-center"><span class="badge ' + priorityBadge + '">' + priorityLabel + '</span></td>' +
            '<td class="hidden md:table-cell"><div class="text-sm text-[var(--text)]">' + deadlineDisplay + '</div></td>' +
            '<td><span class="badge badge-gray">' + (config.STATUS_LABEL_MAP.todo || '待跟进') + '</span></td>' +
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
      renderTaskDetail(taskId);
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

    var findTaskById = function (taskId) {
      if (!DATA || !DATA.DEMO_TASKS) return null;
      for (var i = 0; i < DATA.DEMO_TASKS.length; i++) {
        if (DATA.DEMO_TASKS[i].id === taskId) return DATA.DEMO_TASKS[i];
      }
      return null;
    };

    var formatDateTime = function (value) {
      if (!value) return '—';
      return String(value).replace('T', ' ').slice(0, 16);
    };

    var getTodayIso = function () {
      return new Date().toISOString().slice(0, 10);
    };

    var getDeadlineMeta = function (task, todayIso) {
      var deadline = task && task.deadline ? String(task.deadline) : '';
      var dateOnly = deadline ? deadline.slice(0, 10) : '';
      var today = todayIso || getTodayIso();
      var isTerminal = task && (task.status === 'done' || task.status === 'canceled');

      return {
        hasDeadline: !!deadline,
        display: formatDateTime(deadline),
        isOverdue: !!(deadline && !isTerminal && dateOnly < today),
        isToday: !!(deadline && !isTerminal && dateOnly === today),
      };
    };

    var getTaskExecutionCopy = function (task, todayIso) {
      if (!task) {
        return {
          blocker: '还没拿到任务详情。',
          nextAction: '先回到列表重新打开任务。',
        };
      }

      var deadlineMeta = getDeadlineMeta(task, todayIso);

      if (task.status === 'done') {
        return {
          blocker: '这项任务已经处理完成。',
          nextAction: '如无后续事项，回看关联案件记录即可。',
        };
      }

      if (task.status === 'canceled') {
        return {
          blocker: '这项任务已取消，不再继续执行。',
          nextAction: '保留取消原因，并确认是否需要改由其他流程承接。',
        };
      }

      if (task.source === 'validation-fail') {
        return {
          blocker: '提交前校验还没通过，案件暂时不能继续提交。',
          nextAction: '先修正申请书与附件清单，再重新做一次提交前确认。',
        };
      }

      if (task.source === 'billing') {
        return {
          blocker: '收费节点还没确认，案件推进可能会卡在这里。',
          nextAction: '今天先确认到账状态，并决定是否继续安排后续办理。',
        };
      }

      if (task.source === 'correction') {
        return {
          blocker: '补正事项还没处理完，案件无法顺利回到提交流程。',
          nextAction: '先核对补正要求，把要补的资料和文书一次整理清楚。',
        };
      }

      if (task.source === 'renewal') {
        return {
          blocker: deadlineMeta.isOverdue
            ? '提醒节点已经超期，可能会影响续签或 COE 时效。'
            : '提醒节点已到，需要确认通知是否已经送达。',
          nextAction: deadlineMeta.isToday || deadlineMeta.isOverdue
            ? '今天先发出提醒并登记发送结果，避免后续没人接手。'
            : '到点前先确认提醒对象和发送内容是否准备好。',
        };
      }

      if (task.source === 'reminder') {
        return {
          blocker: deadlineMeta.isOverdue
            ? '对方还没回应，任务已经逾期。'
            : '还在等对方回传资料，所以这项任务暂时卡住。',
          nextAction: deadlineMeta.isToday || deadlineMeta.isOverdue
            ? '今天先继续催办，并确认对方最晚什么时候提交。'
            : '先发出下一次催办，并约定明确的回传时间。',
        };
      }

      if (deadlineMeta.isOverdue) {
        return {
          blocker: '任务已经逾期，还没有正式收口。',
          nextAction: '今天优先把这项做完，或立刻重新分派与改截止日。',
        };
      }

      if (deadlineMeta.isToday) {
        return {
          blocker: '这项任务今天必须收口，否则会继续堆到明天。',
          nextAction: '今天先完成交付或确认结果，处理完再切回其他任务。',
        };
      }

      if (task.status === 'doing') {
        return {
          blocker: '任务已经开始处理，但目前还没完成最后收口。',
          nextAction: '继续把当前这一步做完，并及时更新结果给相关同事。',
        };
      }

      if (task.source === 'template') {
        return {
          blocker: '模板任务还没开始落地到当前案件。',
          nextAction: '先按模板核对必备材料，再补齐本案的个别差异项。',
        };
      }

      return {
        blocker: '这项任务还没开始推进。',
        nextAction: '先把第一步动作做掉，并明确谁来收口。',
      };
    };

    var renderAuditLog = function (task) {
      var detailAuditLog = document.getElementById('detailAuditLog');
      if (!detailAuditLog || !task) return;

      var events = [
        {
          title: '任务已登记',
          meta: '系统 · ' + (task.caseId || '未关联案件'),
          tone: 'primary',
        },
      ];

      if (task.owner && task.owner.name) {
        events.push({
          title: '责任人：' + task.owner.name,
          meta: '当前指派',
          tone: 'primary',
        });
      }

      if (task.status === 'done') {
        events.push({
          title: '任务已收口',
          meta: task.completedAt ? '完成时间 · ' + formatDateTime(task.completedAt) : '当前状态 · 已完成',
          tone: 'success',
        });
      } else if (task.status === 'canceled') {
        events.push({
          title: '任务已取消',
          meta: task.cancelReason ? '原因 · ' + task.cancelReason : '当前状态 · 已取消',
          tone: 'warning',
        });
      } else {
        events.push({
          title: task.status === 'doing' ? '任务处理中' : '等待执行',
          meta: task.deadline ? '截止 · ' + formatDateTime(task.deadline) : '尚未设置截止日',
          tone: task.status === 'doing' ? 'primary' : 'warning',
        });
      }

      if (DATA && Array.isArray(DATA.DEMO_REMINDER_LOGS)) {
        DATA.DEMO_REMINDER_LOGS.forEach(function (log) {
          if (!log || log.taskId !== task.id) return;
          events.push({
            title: log.status === 'failed' ? '提醒发送失败' : '已发送提醒',
            meta: (log.recipient || '系统') + ' · ' + formatDateTime(log.sentAt) + (log.failReason ? ' · ' + log.failReason : ''),
            tone: log.status === 'failed' ? 'warning' : 'primary',
          });
        });
      }

      detailAuditLog.innerHTML = events.slice(0, 4).map(function (event) {
        var dotColor = 'bg-[var(--primary)]';
        if (event.tone === 'success') dotColor = 'bg-green-500';
        if (event.tone === 'warning') dotColor = 'bg-[var(--warning)]';
        return '<div class="flex gap-3"><div class="w-2 h-2 rounded-full ' + dotColor + ' mt-1.5 flex-shrink-0"></div><div><div class="text-sm text-[var(--text)]">' + escapeHtml(event.title) + '</div><div class="text-[12px] text-[var(--muted-2)]">' + escapeHtml(event.meta) + '</div></div></div>';
      }).join('');
    };

    var updateTaskGuidance = function (row, task) {
      if (!row || !task || !row.cells || !row.cells[1]) return;
      var guidanceHost = row.cells[1].querySelector('[data-task-guidance]');
      if (!guidanceHost) {
        guidanceHost = document.createElement('div');
        guidanceHost.setAttribute('data-task-guidance', '');
        guidanceHost.className = 'mt-1 space-y-0.5';
        row.cells[1].appendChild(guidanceHost);
      }
      var guidance = getTaskExecutionCopy(task);
      guidanceHost.innerHTML = '<div class="text-[11px] text-[var(--muted-2)]">当前卡点：<span class="text-[var(--text)]">' + escapeHtml(guidance.blocker) + '</span></div><div class="text-[11px] font-semibold text-[var(--text)]">下一步：' + escapeHtml(guidance.nextAction) + '</div>';
    };

    var syncTaskRow = function (row, task) {
      if (!row || !task) return;
      var isTerminal = task.status === 'done' || task.status === 'canceled';
      var statusCell = row.cells[7];
      var sourceCell = row.cells[8];
      var titleEl = row.cells[1] && row.cells[1].querySelector('.font-medium');
      var statusEl = statusCell && statusCell.querySelector('.badge');
      var sourceEl = sourceCell && sourceCell.querySelector('.text-sm');
      var checkbox = row.querySelector('input[data-task-select]');

      if (statusEl) {
        statusEl.className = 'badge ' + (config.STATUS_BADGE_MAP[task.status] || 'badge-gray');
        statusEl.textContent = config.STATUS_LABEL_MAP[task.status] || task.status;
      }
      if (sourceEl) sourceEl.textContent = config.SOURCE_LABEL_MAP[task.source] || task.source || '—';
      if (titleEl) titleEl.classList.toggle('line-through', isTerminal);
      if (checkbox) checkbox.disabled = isTerminal;
      row.classList.toggle('opacity-60', isTerminal);
      updateTaskGuidance(row, task);
    };

    var renderTaskDetail = function (taskId) {
      var task = typeof taskId === 'string' ? findTaskById(taskId) : taskId;
      if (!task) task = DATA && DATA.DEMO_TASK_DETAIL ? DATA.DEMO_TASK_DETAIL : null;
      if (!task) return;

      var detailTaskName = document.getElementById('detailTaskName');
      var detailDescription = document.getElementById('detailDescription');
      var detailCaseLink = document.getElementById('detailCaseLink');
      var detailOwner = document.getElementById('detailOwner');
      var detailDeadline = document.getElementById('detailDeadline');
      var detailStatus = document.getElementById('detailStatus');
      var detailPriority = document.getElementById('detailPriority');
      var detailGroup = document.getElementById('detailGroup');
      var detailSource = document.getElementById('detailSource');
      var detailBlocker = document.getElementById('detailBlocker');
      var detailNextAction = document.getElementById('detailNextAction');
      var deadlineMeta = getDeadlineMeta(task);
      var executionCopy = getTaskExecutionCopy(task);
      var ownerInfo = config.OWNERS.find(function (o) { return o.value === ((task.owner && task.owner.id) || task.owner); });
      var ownerName = task.owner && task.owner.name ? task.owner.name : (ownerInfo ? ownerInfo.label : '未指派');
      var ownerInitials = task.owner && task.owner.initials ? task.owner.initials : (ownerInfo ? ownerInfo.initials : '—');
      var ownerBg = ownerInfo ? ownerInfo.bg : 'bg-gray-200';
      var ownerText = ownerInfo ? ownerInfo.text : '';

      if (detailTaskName) detailTaskName.textContent = task.taskName || '未命名任务';
      if (detailDescription) detailDescription.textContent = task.description || '暂无任务说明。';
      if (detailCaseLink) {
        detailCaseLink.textContent = task.caseLabel || task.caseId || '未关联案件';
        detailCaseLink.href = task.caseId ? '../case/detail.html?id=' + encodeURIComponent(task.caseId) : '../case/detail.html';
      }
      if (detailOwner) {
        detailOwner.innerHTML = '<div class="w-5 h-5 rounded-full ' + ownerBg + ' ' + ownerText + ' text-xs flex items-center justify-center mr-2 flex-shrink-0">' + escapeHtml(ownerInitials) + '</div>' + escapeHtml(ownerName);
      }
      if (detailDeadline) {
        var headlineCls = 'text-sm text-[var(--text)]';
        var headlineText = deadlineMeta.hasDeadline ? '按计划推进' : '尚未设置截止日';
        if (deadlineMeta.isOverdue) {
          headlineCls = 'text-sm text-[var(--danger)] font-semibold';
          headlineText = '已逾期，今天要优先收口';
        } else if (deadlineMeta.isToday) {
          headlineCls = 'text-sm text-[#b45309] font-semibold';
          headlineText = '今天必须收口';
        } else if (task.status === 'done') {
          headlineCls = 'text-sm text-green-600 font-semibold';
          headlineText = '已处理完成';
        } else if (task.status === 'canceled') {
          headlineCls = 'text-sm text-[var(--muted)] font-semibold';
          headlineText = '任务已取消';
        }
        detailDeadline.innerHTML = '<div class="' + headlineCls + '">' + escapeHtml(headlineText) + '</div><div class="text-[12px] text-[var(--muted-2)]">' + escapeHtml(deadlineMeta.display) + '</div>';
      }
      if (detailStatus) {
        detailStatus.className = 'badge ' + (config.STATUS_BADGE_MAP[task.status] || 'badge-gray');
        detailStatus.textContent = config.STATUS_LABEL_MAP[task.status] || task.status;
      }
      if (detailPriority) {
        detailPriority.className = 'badge ' + (config.PRIORITY_BADGE_MAP[task.priority] || '');
        detailPriority.textContent = config.PRIORITY_LABEL_MAP[task.priority] || task.priority || '—';
      }
      if (detailGroup) detailGroup.textContent = config.GROUP_LABEL_MAP[task.group] || task.group || '未分组';
      if (detailSource) detailSource.textContent = config.SOURCE_LABEL_MAP[task.source] || task.source || '—';
      if (detailBlocker) detailBlocker.textContent = executionCopy.blocker;
      if (detailNextAction) detailNextAction.textContent = executionCopy.nextAction;

      renderAuditLog(task);
    };

    var syncExistingTaskRows = function () {
      if (!DATA || !DATA.DEMO_TASKS) return;
      DATA.DEMO_TASKS.forEach(function (task) {
        var row = document.querySelector('tr[data-task-id="' + task.id + '"]');
        if (!row) return;
        syncTaskRow(row, task);
      });
    };

    /**
     * Update a task row's status badge, visual state, and backing data.
     * @param {string} taskId
     * @param {string} newStatus - one of 'todo','doing','done','canceled'
     */
    var updateTaskRowStatus = function (taskId, newStatus) {
      var row = document.querySelector('tr[data-task-id="' + taskId + '"]');
      if (!row) return;
      var task = null;
      if (DATA && DATA.DEMO_TASKS) {
        task = DATA.DEMO_TASKS.find(function (t) { return t.id === taskId; });
        if (task) {
          task.status = newStatus;
          if (newStatus === 'done') task.completedAt = new Date().toISOString();
        }
      }

      if (!task) task = { id: taskId, status: newStatus };
      syncTaskRow(row, task);
      if (_activeTaskId === taskId) renderTaskDetail(taskId);

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
          syncTaskRow(row, task);
          if (_activeTaskId === taskId) renderTaskDetail(taskId);
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
          updateTaskGuidance(row, task);
          if (_activeTaskId === taskId) renderTaskDetail(taskId);
        }
      }

      persistTaskPatch(taskId, { deadline: newDeadline });
    };

    window.__tasksPage = {
      updateTaskRowStatus: updateTaskRowStatus,
      updateTaskRowOwner: updateTaskRowOwner,
      updateTaskRowDeadline: updateTaskRowDeadline,
      getActiveTaskId: function () { return _activeTaskId; },
      getTaskExecutionCopy: getTaskExecutionCopy,
      renderTaskDetail: renderTaskDetail,
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
      var statusLabel = config.STATUS_LABEL_MAP[t.status] || '待跟进';
      var statusBadge = config.STATUS_BADGE_MAP[t.status] || 'badge-gray';
      var isTerminal = t.status === 'done' || t.status === 'canceled';
      var name = (t.taskName || '').replace(/</g, '&lt;').replace(/"/g, '&quot;');
      var guidance = getTaskExecutionCopy(t);

      return '<td class="text-center"><input type="checkbox" class="accent-[var(--primary)] table-checkbox" data-task-select value="' + t.id + '" aria-label="选择 ' + name + '"' + (isTerminal ? ' disabled' : '') + ' /></td>' +
        '<td><div class="font-medium text-[var(--text)]' + (isTerminal ? ' line-through' : '') + '">' + name + '</div><div class="mt-1 space-y-0.5" data-task-guidance><div class="text-[11px] text-[var(--muted-2)]">当前卡点：<span class="text-[var(--text)]">' + escapeHtml(guidance.blocker) + '</span></div><div class="text-[11px] font-semibold text-[var(--text)]">下一步：' + escapeHtml(guidance.nextAction) + '</div></div></td>' +
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

      syncExistingTaskRows();
    })();

    // Initial state
    modal.updateSubmitEnabled();
    bulk.updateBulkState();
  }

  document.addEventListener('prototype:fragments-ready', init);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    init();
  }
})();
