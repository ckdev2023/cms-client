/**
 * Case Detail — Residence period, reminders, and archive actions.
 *
 * Owns post-entry residence recording, reminder generation,
 * overseas visa rejection, archive checks, and related tab bridges.
 *
 * Depends on: case-detail-stage-actions.js (shared helpers on ns)
 * Depends on: case-detail-runtime.js (ns.liveState, ns.esc, ns.showToast, ns.syncToListStore)
 * Depends on: case-detail-tabs.js (ns.setActiveTab)
 * Depends on: case-detail-renderers.js (ns.applyResidencePeriodContent, ns.applyTasks)
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function _saveResidencePeriod() {
    if (ns.liveState.postApprovalStage !== 'entry_success') return;
    if (ns.liveState.residencePeriodRecorded) {
      ns.showToast('在留期间已录入', '无需重复操作');
      return;
    }
    ns.setActiveTab('residence-period');
    ns.applyResidencePeriodContent();
    _saveResidencePeriodFromForm();
  }

  function _getFormVal(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return (el.value || '').trim();
  }

  function _saveResidencePeriodFromForm() {
    if (ns.liveState.residencePeriodRecorded) {
      ns.showToast('在留期间已录入', '无需重复操作');
      return;
    }

    var rpStatus = _getFormVal('rpResidenceStatus');
    var rpStart = _getFormVal('rpStartDate');
    var rpEnd = _getFormVal('rpEndDate');
    var rpEntry = _getFormVal('rpEntryDate');
    var rpCard = _getFormVal('rpZairyuCard');
    var rpAddr = _getFormVal('rpAddress');
    var rpNote = _getFormVal('rpNote');

    var missing = [];
    if (!rpStatus) missing.push('在留資格');
    if (!rpStart) missing.push('在留期間開始日');
    if (!rpEnd) missing.push('在留期間終了日');

    if (missing.length > 0) {
      ns.showToast('⚠️ 必填字段缺失', missing.join('、') + ' 为必填项');
      return;
    }

    if (rpStart && rpEnd && rpStart >= rpEnd) {
      ns.showToast('⚠️ 日期校验失败', '在留期間終了日必须晚于開始日');
      return;
    }

    var startD = new Date(rpStart);
    var endD = new Date(rpEnd);
    var diffMs = endD - startD;
    var diffDays = Math.round(diffMs / 86400000);
    var periodLabel = diffDays >= 365 ? Math.round(diffDays / 365) + '年' : diffDays + '日';

    ns.liveState.residencePeriod = {
      recorded: true,
      entryDate: rpEntry || null,
      startDate: rpStart,
      endDate: rpEnd,
      period: periodLabel,
      residenceStatus: rpStatus,
      zairyuCardNumber: rpCard || null,
      addressInJapan: rpAddr || null,
      note: rpNote || null,
    };
    ns.liveState.residencePeriodRecorded = true;

    ns._addStageLog('operation', '在留期间已录入：' + ns.esc(rpStart) + ' – ' + ns.esc(rpEnd) +
      '（' + ns.esc(periodLabel) + '）· 在留資格=' + ns.esc(rpStatus), 'green', 'residence_period', 'save');
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('在留期间已保存', rpStart + ' – ' + rpEnd + '（' + periodLabel + '）· 正在创建续签提醒…');
    ns._refreshActionLabel();
    ns.applyResidencePeriodContent();

    _createRenewalReminders();
  }

  function _rejectOverseasVisa() {
    if (ns.liveState.postApprovalStage !== 'overseas_visa_applying') return;
    ns.liveState.postApprovalStage = 'overseas_visa_rejected';
    ns.liveState.resultOutcome = 'rejected';
    ns._addStageLog('status', '海外返签拒签 → postApprovalStage=overseas_visa_rejected', 'red', 'overseas_visa', 'rejected');
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('海外返签拒签', '可执行失败归档');
    ns._refreshActionLabel();
  }

  function _createRenewalReminders() {
    if (!ns.liveState.residencePeriodRecorded) {
      ns.showToast('⚠️ 请先录入在留期间', '在留期间未保存，无法创建续签提醒');
      return;
    }
    if (ns.liveState.renewalRemindersCreated) {
      ns.showToast('续签提醒已创建', '无需重复操作');
      return;
    }

    var rp = ns.liveState.residencePeriod;
    if (!rp || !rp.endDate) {
      ns.showToast('⚠️ 在留期間終了日缺失', '请先在「在留期间」Tab 完善信息');
      return;
    }

    try {
      var endDate = new Date(rp.endDate);
      if (isNaN(endDate.getTime())) {
        throw new Error('在留期間終了日不是有效日期：' + rp.endDate);
      }

      var tiers = [
        { daysBefore: 180, label: '续签预警（6 个月前）' },
        { daysBefore: 90, label: '续签催办（3 个月前）' },
        { daysBefore: 30, label: '续签紧急提醒（1 个月前）' },
      ];

      var reminders = tiers.map(function (tier, idx) {
        var triggerDate = new Date(endDate);
        triggerDate.setDate(triggerDate.getDate() - tier.daysBefore);
        if (isNaN(triggerDate.getTime())) {
          throw new Error('无法计算触发日期（daysBefore=' + tier.daysBefore + '）');
        }
        var triggerStr = triggerDate.toISOString().slice(0, 10);
        var taskId = 'TASK-RNW-' + String(Date.now()).slice(-3) + '-' + idx;
        return {
          daysBefore: tier.daysBefore,
          label: tier.label,
          status: 'scheduled',
          triggerDate: triggerStr,
          taskId: taskId,
        };
      });

      ns.liveState.renewalReminders = reminders;
      ns.liveState.renewalRemindersCreated = true;
      ns.liveState.renewalRemindersFailed = false;

      reminders.forEach(function (reminder) {
        ns.liveState.tasks.push({
          label: reminder.label + '（' + reminder.triggerDate + '）',
          done: false,
          due: reminder.triggerDate.slice(5).replace('-', '/'),
          assignee: 'SYS',
          color: 'primary',
          dueColor: 'muted',
          source_type: 'renewal_reminder',
          source_key: reminder.taskId,
        });
      });
      ns.applyTasks(ns.liveState.tasks);

      ns._addStageLog('operation', '续签提醒已创建（180/90/30 天三档）· 在留到期日 ' +
        ns.esc(rp.endDate) + ' · 触发日 ' +
        reminders.map(function (reminder) { return reminder.triggerDate; }).join(' / '), 'green', 'renewal_reminder', 'create');
      ns.syncToListStore();
      ns.showToast('续签提醒已创建', '180/90/30 天三档：' +
        reminders.map(function (reminder) { return reminder.triggerDate; }).join('、'));
    } catch (err) {
      ns.liveState.renewalRemindersCreated = false;
      ns.liveState.renewalRemindersFailed = true;
      ns.liveState.renewalReminders = [];

      ns._addStageLog(
        'operation',
        '⚠️ 续签提醒创建失败：' + ns.esc(err.message || String(err)) +
          ' · renewalRemindersCreated=false · S8→S9 归档已阻断',
        'red',
        'renewal_reminder',
        'create_failed'
      );
      ns.syncToListStore();
      ns.showToast('⚠️ 续签提醒创建失败', '请检查在留期间数据后重试。成功归档要求三档提醒已创建。');
    }

    ns._refreshActionLabel();
    ns.applyResidencePeriodContent();
  }

  function _createRenewalRemindersFromTab() {
    _createRenewalReminders();
  }

  function _archiveCase(mode) {
    if (ns.liveState.stageCode !== 'S8') return;

    var isMgmtCoe = ns.isMgmtCase() && ns.liveState.applicationFlowType === 'coe_overseas';
    if (mode === 'success' && isMgmtCoe) {
      if (!ns.liveState.residencePeriodRecorded) {
        ns.showToast('⚠️ 在留期间未录入', '成功归档要求：在留期间已登记 → 续签提醒已创建 → 方可归档');
        return;
      }
      if (!ns.liveState.renewalRemindersCreated) {
        var failHint = ns.liveState.renewalRemindersFailed
          ? '提醒创建曾失败，请在「在留期间」Tab 重试。'
          : '请先创建三档续签提醒（180/90/30 天）。';
        ns.showToast('⚠️ 续签提醒未创建 · S8→S9 已阻断', failHint);
        return;
      }
    }

    ns.liveState.resultOutcome = mode === 'success' ? 'approved' : 'rejected';

    var closeReason = mode === 'success' ? 'approved' : 'rejected';
    if (mode !== 'success' && ns.liveState.postApprovalStage === 'overseas_visa_rejected') {
      closeReason = 'overseas_visa_rejected';
    }

    var closedTaskCount = 0;
    if (ns.liveState.tasks && ns.liveState.tasks.length) {
      ns.liveState.tasks.forEach(function (task) {
        if (!task.done && task.source_type !== 'renewal_reminder') {
          task.done = true;
          closedTaskCount++;
        }
      });
      if (closedTaskCount > 0) {
        ns.applyTasks(ns.liveState.tasks);
      }
    }

    var archiveLabel = mode === 'success' ? '成功归档' : '失败归档';
    var logDetail = archiveLabel + ' → S9 · resultOutcome=' + ns.liveState.resultOutcome +
      ' · close_reason=' + closeReason;
    if (closedTaskCount > 0) {
      logDetail += ' · 关闭 ' + closedTaskCount + ' 个未完成任务';
    }
    ns._addStageLog('status', logDetail, mode === 'success' ? 'green' : 'red', 'archive', mode);
    ns._advanceMainStage('S9');
    ns.syncToListStore();
    ns._refreshActionLabel();
  }

  ns._archiveCase = _archiveCase;
  ns._createRenewalReminders = _createRenewalReminders;
  ns._createRenewalRemindersFromTab = _createRenewalRemindersFromTab;
  ns._rejectOverseasVisa = _rejectOverseasVisa;
  ns._saveResidencePeriod = _saveResidencePeriod;
  ns._saveResidencePeriodFromForm = _saveResidencePeriodFromForm;
})();
