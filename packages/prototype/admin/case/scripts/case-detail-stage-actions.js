/**
 * Case Detail — Stage Actions core resolver and shared helpers.
 *
 * Keeps the original ACT namespace surface while splitting the old
 * monolith into:
 *   - case-detail-stage-actions.js (core)
 *   - case-detail-stage-actions-post-approval.js
 *   - case-detail-stage-actions-events.js
 *
 * Depends on: case-detail-runtime.js (ns.liveState, ns.setText, ns.esc,
 *   ns.showToast, ns.syncToListStore, ns.isMgmtCase)
 * Depends on: case-detail-tabs.js (ns.setActiveTab)
 * Depends on: case-detail-renderers.js (ns.applyLogEntries,
 *   ns.applySubmissionPackages, ns.applyReadonly)
 *
 * Reads DETAIL_STAGES and POST_APPROVAL_STAGES from data/case-detail-config.js.
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};
  var _mgmtMenuEl = null;

  function _advanceMainStage(nextCode) {
    var fromStage = DETAIL_STAGES[ns.liveState.stageCode];
    var nextStage = DETAIL_STAGES[nextCode];
    if (!fromStage || !nextStage) return;

    var fromCode = fromStage.code;
    var fromLabel = fromStage.code + ' ' + fromStage.label;
    var toLabel = nextStage.code + ' ' + nextStage.label;

    ns.liveState.stageCode = nextCode;
    ns.liveState.stage = nextStage.label;
    ns.liveState.stageMeta = '刚刚推进';
    ns.liveState.statusBadge = nextStage.badge;

    ns.setText('caseStatusText', nextStage.label);
    ns.setText('overviewStageText', nextStage.label);
    ns.setText('overviewStageMeta', '刚刚推进');
    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + nextStage.badge;

    ns.liveState.logEntries.unshift({
      type: 'status',
      avatar: 'U',
      avatarStyle: 'primary',
      text: '案件阶段变更：<b>' + fromLabel + ' → ' + toLabel + '</b>',
      category: '状态变更',
      categoryChip: 'blue',
      objectType: '当前操作',
      time: '刚刚',
      dotColor: 'warning',
      source_type: 'stage_advance',
      source_key: fromCode + '_to_' + nextCode,
    });
    ns.applyLogEntries(ns.liveState.logEntries);
    ns.syncToListStore();
    _refreshActionLabel();

    if (nextCode === 'S7') {
      var pkgId = 'SUB-' + String(Date.now()).slice(-3);
      ns.liveState.submissionPackages.push({
        id: pkgId,
        submission_kind: 'initial',
        status: '已提交',
        locked: true,
        date: new Date().toLocaleDateString('zh-CN'),
        summary: '校验通过 · 已提交至入管局',
      });
      ns.applySubmissionPackages(ns.liveState.submissionPackages);
      ns.liveState.logEntries.unshift({
        type: 'operation',
        avatar: 'SYS',
        avatarStyle: 'surface',
        text: '提交包 <b>' + pkgId + '</b> 已生成并锁定',
        category: '操作日志',
        categoryChip: '',
        objectType: '提交包',
        time: '刚刚',
        dotColor: 'success',
        source_type: 'submission',
        source_key: pkgId,
      });
      ns.applyLogEntries(ns.liveState.logEntries);
    }

    if (nextCode === 'S9') {
      ns.liveState.readonly = true;
      ns.applyReadonly(true);
      ns.showToast('案件已归档', '案件进入 S9 已归档，全量字段已锁定');
    } else {
      ns.showToast('阶段已推进', fromLabel + ' → ' + toLabel);
    }
  }

  function _requestMaterials() {
    if (ns.liveState.stageCode !== 'S1') return;
    _addLog('operation', '资料收集清单已发送 → requestMaterials', 'green', 'stage_advance', 'S1_to_S2');
    _advanceMainStage('S2');
  }

  function _startReview() {
    if (ns.liveState.stageCode !== 'S2') return;
    _addLog('operation', '资料审核已启动 → startReview', 'blue', 'stage_advance', 'S2_to_S3');
    _advanceMainStage('S3');
  }

  function _runGateA() {
    if (ns.liveState.stageCode !== 'S3') return;
    var blocking = (ns.liveState.validation && ns.liveState.validation.blocking)
      ? ns.liveState.validation.blocking.filter(function (b) { return b.gate === 'A'; })
      : [];
    if (blocking.length > 0) {
      ns.showToast('⚠️ Gate-A 未通过', blocking.length + ' 个硬性阻断项需修复后再推进');
      return;
    }
    _addLog('operation', 'Gate-A 校验通过 → ValidationRun(gate_a)', 'green', 'gate_validation', 'gate_a');
    _advanceMainStage('S4');
  }

  function _enterValidation() {
    if (ns.liveState.stageCode !== 'S4') return;
    _addLog('operation', '进入校验与提交工作区 → enterValidation', 'blue', 'stage_advance', 'S4_to_S5');
    _advanceMainStage('S5');
  }

  function _runGateB() {
    if (ns.liveState.stageCode !== 'S5') return;
    var blocking = (ns.liveState.validation && ns.liveState.validation.blocking) || [];
    if (blocking.length > 0) {
      ns.showToast('⚠️ Gate-B 未通过', blocking.length + ' 个阻断项需修复后再推进');
      return;
    }
    _addLog('operation', 'Gate-B 校验通过 → ValidationRun(gate_b)', 'green', 'gate_validation', 'gate_b');
    _advanceMainStage('S6');
  }

  function _submitInitial() {
    if (ns.liveState.stageCode !== 'S6') return;

    var blocking = (ns.liveState.validation && ns.liveState.validation.blocking) || [];
    if (blocking.length > 0) {
      ns.showToast('⚠️ Gate-C 未通过', blocking.length + ' 个阻断项未修复，不能提交');
      return;
    }

    var hasDebt = ns.liveState.billing &&
      parseInt(String(ns.liveState.billing.outstanding || '0').replace(/[^0-9]/g, ''), 10) > 0;
    if (hasDebt && !ns.liveState.riskConfirmationRecord) {
      ns.showToast('⚠️ 欠款风险未确认', '存在未收款项，请在「校验与提交」Tab 完成风险确认后再提交');
      return;
    }

    _addLog('operation', 'Gate-C 校验通过 → ValidationRun(gate_c) → SubmissionPackage(submission_kind=initial)', 'green', 'gate_validation', 'gate_c');
    _advanceMainStage('S7');
  }

  function _callNs(name, arg) {
    return function () {
      if (typeof ns[name] !== 'function') return;
      if (typeof arg === 'undefined') {
        ns[name]();
      } else {
        ns[name](arg);
      }
    };
  }

  function _refreshActionLabel() {
    var btn = document.getElementById('btnAdvanceStage');
    if (!btn) return;
    var code = ns.liveState.stageCode;

    var earlyStageLabels = {
      S1: '发送资料收集清单',
      S2: '开始审核',
      S3: '执行 Gate-A',
      S4: '进入校验工作区',
      S5: '执行 Gate-B',
      S6: '提交至入管局',
    };
    if (earlyStageLabels[code]) {
      btn.textContent = earlyStageLabels[code];
      btn.disabled = false;
      return;
    }

    if (code === 'S9') {
      btn.textContent = '已归档';
      btn.disabled = true;
      return;
    }

    if (!ns.isMgmtCase()) {
      if (code === 'S7') {
        btn.textContent = ns.liveState.supplementOpen
          ? 'S7 补正操作 ▾'
          : 'S7 审理中操作 ▾';
      } else if (code === 'S8') {
        var nonMgmtOut = ns.liveState.resultOutcome;
        if (nonMgmtOut === 'approved') {
          btn.textContent = '成功归档';
        } else if (nonMgmtOut === 'rejected') {
          btn.textContent = '失败归档';
        } else {
          btn.textContent = '归档案件 ▾';
        }
      } else {
        btn.textContent = '状态流转';
      }
      btn.disabled = false;
      return;
    }

    btn.disabled = false;
    if (code === 'S7') {
      btn.textContent = ns.liveState.supplementOpen
        ? 'S7 补正操作 ▾'
        : 'S7 审理中操作 ▾';
    } else if (code === 'S8' && ns.liveState.resultOutcome) {
      var pa = ns.liveState.postApprovalStage;
      var map = {
        waiting_final_payment: '发送 COE ▾',
        coe_sent: '启动海外返签 ▾',
        overseas_visa_applying: '确认入境 / 拒签 ▾',
        entry_success: ns.liveState.residencePeriodRecorded
          ? (ns.liveState.renewalRemindersCreated
            ? '成功归档'
            : (ns.liveState.renewalRemindersFailed ? '⚠️ 重试续签提醒' : '创建续签提醒'))
          : '录入在留期间',
        overseas_visa_rejected: '失败归档',
      };
      if (!pa && ns.liveState.resultOutcome === 'rejected') {
        btn.textContent = '失败归档';
      } else {
        btn.textContent = (pa && map[pa]) || '归档 ▾';
      }
    } else {
      btn.textContent = '状态流转';
    }
  }

  function _showActionMenu(actions) {
    if (_mgmtMenuEl) {
      _mgmtMenuEl.remove();
      _mgmtMenuEl = null;
      return;
    }
    if (!actions || !actions.length) return;

    var menu = document.createElement('div');
    menu.className = 'absolute right-0 top-full mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50 min-w-[260px]';
    actions.forEach(function (action) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2 ' +
        (action.danger ? 'text-red-600' : 'text-[var(--fg)]');
      item.innerHTML = '<span>' + action.icon + '</span><span>' + action.label + '</span>';
      item.addEventListener('click', function () {
        menu.remove();
        _mgmtMenuEl = null;
        action.handler();
      });
      menu.appendChild(item);
    });

    var wrapper = document.getElementById('btnAdvanceStage');
    if (wrapper && wrapper.parentElement) {
      wrapper.parentElement.style.position = 'relative';
      wrapper.parentElement.appendChild(menu);
    }
    _mgmtMenuEl = menu;

    setTimeout(function () {
      function dismiss(e) {
        if (_mgmtMenuEl && !_mgmtMenuEl.contains(e.target)) {
          _mgmtMenuEl.remove();
          _mgmtMenuEl = null;
          document.removeEventListener('click', dismiss);
        }
      }
      document.addEventListener('click', dismiss);
    }, 50);
  }

  function _getStageActions() {
    var code = ns.liveState.stageCode;
    var pa = ns.liveState.postApprovalStage;
    var out = ns.liveState.resultOutcome;
    var actions = [];

    if (code === 'S1') {
      actions.push({ icon: '📋', label: '发送资料收集清单 (requestMaterials)', handler: _requestMaterials });
      return actions;
    }
    if (code === 'S2') {
      actions.push({ icon: '🔍', label: '开始审核 (startReview)', handler: _startReview });
      return actions;
    }
    if (code === 'S3') {
      actions.push({ icon: '🛡️', label: '执行 Gate-A 校验 (runGateA)', handler: _runGateA });
      return actions;
    }
    if (code === 'S4') {
      actions.push({ icon: '📝', label: '进入校验工作区 (enterValidation)', handler: _enterValidation });
      return actions;
    }
    if (code === 'S5') {
      actions.push({ icon: '🛡️', label: '执行 Gate-B 校验 (runGateB)', handler: _runGateB });
      return actions;
    }
    if (code === 'S6') {
      actions.push({ icon: '📤', label: '提交至入管局 (submitInitial)', handler: _submitInitial });
      return actions;
    }

    if (ns.isMgmtCase()) {
      if (code === 'S7') {
        if (ns.liveState.supplementOpen) {
          actions.push({ icon: '📦', label: '提交补正包（Gate-B→Gate-C→生成 supplement 包）', handler: _callNs('_submitSupplement') });
        }
        actions.push({ icon: '📩', label: '登记补正通知（S7 内补正循环）', handler: _callNs('_registerSupplementNotice') });
        actions.push({ icon: '✅', label: '登记入管结果：许可 (approved)', handler: _callNs('_registerImmigrationResult', 'approved') });
        actions.push({ icon: '❌', label: '登记入管结果：拒签 (rejected)', handler: _callNs('_registerImmigrationResult', 'rejected'), danger: true });
        return actions;
      }

      if (code === 'S8') {
        if (out === 'rejected' && !pa) {
          actions.push({ icon: '🗄️', label: '失败归档 (archiveCase)', handler: _callNs('_archiveCase', 'failure'), danger: true });
          return actions;
        }
        if (pa === 'waiting_final_payment') {
          actions.push({ icon: '📮', label: '发送 COE（尾款已收）', handler: _callNs('_sendCoe', false) });
          actions.push({ icon: '⚠️', label: '发送 COE（风险确认 · 尾款未收）', handler: _callNs('_sendCoe', true), danger: true });
          return actions;
        }
        if (pa === 'coe_sent') {
          actions.push({ icon: '✈️', label: '启动海外返签 (startOverseasVisa)', handler: _callNs('_startOverseasVisa') });
          return actions;
        }
        if (pa === 'overseas_visa_applying') {
          actions.push({ icon: '🎉', label: '确认入境成功 (confirmEntry)', handler: _callNs('_confirmEntry') });
          actions.push({ icon: '❌', label: '海外返签拒签 (rejectOverseasVisa)', handler: _callNs('_rejectOverseasVisa'), danger: true });
          return actions;
        }
        if (pa === 'overseas_visa_rejected') {
          actions.push({ icon: '🗄️', label: '失败归档 (archiveCase)', handler: _callNs('_archiveCase', 'failure'), danger: true });
          return actions;
        }
        if (pa === 'entry_success') {
          if (!ns.liveState.residencePeriodRecorded) {
            actions.push({ icon: '📋', label: '录入在留期间 (saveResidencePeriod)', handler: _callNs('_saveResidencePeriod') });
          } else if (!ns.liveState.renewalRemindersCreated) {
            var retryLabel = ns.liveState.renewalRemindersFailed
              ? '⚠️ 重试创建续签提醒（180/90/30）'
              : '创建续签提醒（180/90/30）';
            actions.push({
              icon: '🔔',
              label: retryLabel,
              handler: _callNs('_createRenewalReminders'),
              danger: !!ns.liveState.renewalRemindersFailed,
            });
          } else {
            actions.push({ icon: '🏁', label: '成功归档 (archiveCase)', handler: _callNs('_archiveCase', 'success') });
          }
          return actions;
        }
      }
      return actions;
    }

    if (code === 'S7') {
      if (ns.liveState.supplementOpen) {
        actions.push({ icon: '📦', label: '提交补正包（Gate-B→Gate-C→生成 supplement 包）', handler: _callNs('_submitSupplement') });
      }
      actions.push({ icon: '📩', label: '登记补正通知（S7 内补正循环）', handler: _callNs('_registerSupplementNotice') });
      actions.push({ icon: '✅', label: '登记入管结果：许可 (approved)', handler: _callNs('_registerImmigrationResult', 'approved') });
      actions.push({ icon: '❌', label: '登记入管结果：拒签 (rejected)', handler: _callNs('_registerImmigrationResult', 'rejected'), danger: true });
      return actions;
    }
    if (code === 'S8') {
      if (out === 'approved') {
        actions.push({ icon: '🏁', label: '成功归档 (archiveCase)', handler: _callNs('_archiveCase', 'success') });
      } else if (out === 'rejected') {
        actions.push({ icon: '🗄️', label: '失败归档 (archiveCase)', handler: _callNs('_archiveCase', 'failure'), danger: true });
      } else {
        actions.push({ icon: '🏁', label: '成功归档', handler: _callNs('_archiveCase', 'success') });
        actions.push({ icon: '🗄️', label: '失败归档', handler: _callNs('_archiveCase', 'failure'), danger: true });
      }
      return actions;
    }

    return actions;
  }

  function _estimateSupplementDeadline() {
    var d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  }

  function _addLog(type, html, chipColor, sourceType, sourceKey) {
    var typeMap = { review: 'review', status: 'status' };
    var entry = {
      type: typeMap[type] || 'operation',
      avatar: 'U',
      avatarStyle: chipColor === 'red' ? 'danger' : 'primary',
      text: html,
      category: type === 'status' ? '状态变更' : (type === 'review' ? '审核日志' : '操作日志'),
      categoryChip: chipColor || '',
      objectType: '当前操作',
      time: '刚刚',
      dotColor: chipColor === 'red' ? 'danger' : (chipColor === 'green' ? 'success' : 'warning'),
    };
    if (sourceType) entry.source_type = sourceType;
    if (sourceKey) entry.source_key = sourceKey;
    ns.liveState.logEntries.unshift(entry);
    ns.applyLogEntries(ns.liveState.logEntries);
  }

  function _updateHeaderDisplay() {
    var stageObj = DETAIL_STAGES[ns.liveState.stageCode];
    if (!stageObj) return;
    var displayLabel = stageObj.label;
    var displayBadge = stageObj.badge;
    var metaText = ns.liveState.stageMeta || '';

    if (ns.liveState.stageCode === 'S7' && ns.liveState.supplementOpen) {
      displayBadge = 'badge-orange';
      var suppCount = ns.liveState.supplementCount || 0;
      var suppDeadline = ns.liveState.supplementDeadline || '';
      if (!metaText || metaText === stageObj.label) {
        metaText = '补正第 ' + suppCount + ' 次 · 截止 ' + suppDeadline;
      }
    }

    if (ns.liveState.postApprovalStage && typeof POST_APPROVAL_STAGES !== 'undefined') {
      var pas = POST_APPROVAL_STAGES[ns.liveState.postApprovalStage];
      if (pas) {
        metaText = pas.label;
      }
    }

    var mgmtBadge = document.getElementById('mgmtPostApprovalBadge');
    if (mgmtBadge) {
      if (ns.liveState.postApprovalStage && typeof POST_APPROVAL_STAGES !== 'undefined') {
        var pasInfo = POST_APPROVAL_STAGES[ns.liveState.postApprovalStage];
        if (pasInfo) {
          mgmtBadge.textContent = pasInfo.label;
          mgmtBadge.className = 'status-badge text-[11px] ml-2 ' + pasInfo.badge;
          mgmtBadge.style.display = '';
        }
      } else {
        mgmtBadge.style.display = 'none';
      }
    }

    ns.setText('caseStatusText', displayLabel);
    ns.setText('overviewStageText', displayLabel);
    ns.setText('overviewStageMeta', metaText);
    var badge = document.getElementById('caseStatusBadge');
    if (badge) badge.className = 'status-badge text-[13px] ' + displayBadge;
  }

  ns._addStageLog = _addLog;
  ns._advanceMainStage = _advanceMainStage;
  ns._estimateSupplementDeadline = _estimateSupplementDeadline;
  ns._getStageActions = _getStageActions;
  ns._refreshActionLabel = _refreshActionLabel;
  ns._showActionMenu = _showActionMenu;
  ns._updateHeaderDisplay = _updateHeaderDisplay;
})();
