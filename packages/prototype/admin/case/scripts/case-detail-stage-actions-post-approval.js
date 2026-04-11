/**
 * Case Detail — Post-approval and S7/S8 business actions.
 *
 * Owns supplement loops, immigration result registration,
 * COE flow, residence-period recording, renewal reminders,
 * archive transitions, and tab-wired action bridges.
 *
 * Depends on: case-detail-stage-actions.js (shared helpers on ns),
 *   case-detail-runtime.js (ns.liveState, ns.esc, ns.showToast, ns.syncToListStore),
 *   case-detail-tabs.js (ns.setActiveTab),
 *   case-detail-renderers.js (ns.applyCorrectionPackage, ns.applySubmissionPackages,
 *   ns.applyRiskConfirmationRecord, ns.applyImmigrationResultContent,
 *   ns.applyResidencePeriodContent, ns.applyTasks)
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function _registerSupplementNotice() {
    if (ns.liveState.stageCode !== 'S7') return;
    ns.liveState.supplementCount = (ns.liveState.supplementCount || 0) + 1;
    ns.liveState.supplementOpen = true;
    var count = ns.liveState.supplementCount;

    ns.liveState.supplementDeadline = ns._estimateSupplementDeadline();

    var relatedSub = ns.liveState.submissionPackages.length
      ? ns.liveState.submissionPackages[ns.liveState.submissionPackages.length - 1].id
      : '—';
    var corrId = 'COR-' + String(Date.now()).slice(-3);
    ns.liveState.correctionPackage = {
      id: corrId,
      status: '补正处理中',
      submission_kind: 'supplement',
      related_submission_id: relatedSub,
      noticeDate: new Date().toLocaleDateString('zh-CN'),
      relatedSub: relatedSub,
      corrDeadline: ns.liveState.supplementDeadline,
      items: '入管局要求补充材料（第 ' + count + ' 次）',
      note: 'P0 冻结口径：补正在 S7 内闭环，不回退至 S4/S5/S6。完成后需重新经过 Gate-B→Gate-C 生成 submission_kind=supplement 的新提交包，关联原 ' + relatedSub + '。',
    };
    ns.applyCorrectionPackage(ns.liveState.correctionPackage);

    ns.liveState.tasks.unshift({
      label: '【补正 #' + count + '】准备补正材料 · 截止 ' + ns.liveState.supplementDeadline,
      done: false,
      due: ns.liveState.supplementDeadline.slice(5).replace('-', '/'),
      assignee: 'U',
      color: 'warning',
      dueColor: 'danger',
      source_type: 'supplement',
      source_key: corrId,
    });
    ns.applyTasks(ns.liveState.tasks);

    ns._addStageLog('status', '收到入管补正通知（第 ' + count + ' 次）· 阶段保持 S7（不回退至 S2–S6） · 截止 ' + ns.liveState.supplementDeadline, 'orange', 'supplement', corrId);
    ns._addStageLog('operation', '补正任务已创建（第 ' + count + ' 次）：准备补正材料 · 截止 ' + ns.liveState.supplementDeadline + ' · 完成后需重新经过 Gate-B→Gate-C', 'orange', 'supplement', corrId);
    ns._updateHeaderDisplay();
    ns.liveState.stageMeta = 'S7 补正中 · 第 ' + count + ' 次 · 截止 ' + ns.liveState.supplementDeadline;
    ns.setText('overviewStageMeta', ns.liveState.stageMeta);
    ns.syncToListStore();
    ns.showToast('补正通知已登记', 'S7 内补正循环 · 第 ' + count + ' 次 · 截止 ' + ns.liveState.supplementDeadline);
    ns._refreshActionLabel();
    ns.applyImmigrationResultContent();
  }

  function _registerImmigrationResult(outcome) {
    if (ns.liveState.stageCode !== 'S7') return;

    if (outcome === 'need_supplement') {
      _registerSupplementNotice();
      return;
    }
    if (outcome !== 'approved' && outcome !== 'rejected') return;

    ns.liveState.stageCode = 'S8';
    ns.liveState.stage = DETAIL_STAGES.S8.label;
    ns.liveState.statusBadge = DETAIL_STAGES.S8.badge;
    ns.liveState.resultOutcome = outcome;
    ns.liveState.supplementOpen = false;
    ns.liveState.supplementDeadline = null;
    ns.liveState.correctionPackage = null;
    ns.applyCorrectionPackage(null);

    if (outcome === 'approved' && ns.liveState.applicationFlowType === 'coe_overseas') {
      ns.liveState.postApprovalStage = 'waiting_final_payment';
    } else {
      ns.liveState.postApprovalStage = null;
    }

    var outcomeLabel = outcome === 'approved' ? '许可' : '拒否';
    ns._addStageLog('status', '入管结果登记：<b>' + outcomeLabel + '</b> → S7→S8', outcome === 'approved' ? 'green' : 'red', 'immigration_result', outcome);
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('入管结果已登记', outcomeLabel + ' · 案件进入 S8');
    ns._refreshActionLabel();
    ns.applyImmigrationResultContent();
  }

  function _submitSupplement() {
    if (ns.liveState.stageCode !== 'S7') return;

    var blocking = (ns.liveState.validation && ns.liveState.validation.blocking) || [];
    if (blocking.length > 0) {
      ns.showToast('⚠️ 补正 Gate-B 未通过', blocking.length + ' 个阻断项未修复，不能提交补正包');
      return;
    }

    var hasDebt = ns.liveState.billing &&
      parseInt(String(ns.liveState.billing.outstanding || '0').replace(/[^0-9]/g, ''), 10) > 0;
    if (hasDebt && !ns.liveState.riskConfirmationRecord) {
      ns.showToast('⚠️ 欠款风险未确认', '补正提交前需完成欠款风险确认');
      return;
    }

    var pkgId = 'SUB-' + String(Date.now()).slice(-3);
    var relatedSub = ns.liveState.correctionPackage
      ? ns.liveState.correctionPackage.relatedSub
      : (ns.liveState.submissionPackages.length
        ? ns.liveState.submissionPackages[0].id
        : null);

    ns._addStageLog('operation', '补正校验：Gate-B 在 S7 内重新执行 → ValidationRun(gate_b) 通过', 'green', 'gate_validation', 'gate_b_supplement');
    ns._addStageLog('operation', '补正校验：Gate-C 在 S7 内重新执行 → ValidationRun(gate_c) 通过 → 允许生成 SubmissionPackage', 'green', 'gate_validation', 'gate_c_supplement');

    ns.liveState.submissionPackages.push({
      id: pkgId,
      status: '已提交（补正）',
      locked: true,
      date: new Date().toLocaleDateString('zh-CN'),
      summary: '补正包第 ' + ns.liveState.supplementCount + ' 次 · Gate-B/C 通过 · submission_kind=supplement',
      submission_kind: 'supplement',
      related_submission_id: relatedSub,
    });
    ns.applySubmissionPackages(ns.liveState.submissionPackages);

    if (ns.liveState.correctionPackage) {
      ns.liveState.correctionPackage.status = '补正已提交';
      ns.applyCorrectionPackage(ns.liveState.correctionPackage);
    }

    var corrKey = ns.liveState.correctionPackage ? ns.liveState.correctionPackage.id : null;
    ns.liveState.tasks.forEach(function (task) {
      if (!task.done && task.source_type === 'supplement' && (!corrKey || task.source_key === corrKey)) {
        task.done = true;
      }
    });
    ns.applyTasks(ns.liveState.tasks);

    ns.liveState.supplementOpen = false;
    ns.liveState.supplementDeadline = null;

    ns._addStageLog('operation', '补正包 <b>' + pkgId + '</b> 已生成并锁定（第 ' + ns.liveState.supplementCount + ' 次 · submission_kind=supplement · related=' + (relatedSub || '—') + '） · 阶段保持 S7', 'blue', 'submission', pkgId);
    ns.liveState.stageMeta = '补正包已提交 · 阶段保持 S7 · 等待入管回执';
    ns.setText('overviewStageMeta', ns.liveState.stageMeta);
    ns.syncToListStore();
    ns.showToast('补正包已提交', pkgId + ' · Gate-B/C 通过 · 阶段保持 S7');
    ns._refreshActionLabel();
  }

  function _sendCoe(riskOverride) {
    if (ns.liveState.stageCode !== 'S8' || ns.liveState.postApprovalStage !== 'waiting_final_payment') return;

    if (!ns.liveState.finalPaymentPaid && !riskOverride) {
      ns.showToast('⚠️ 尾款未收', '请先在「收费」Tab 登记尾款，或选择「风险确认 · 尾款未收」继续');
      return;
    }

    if (!ns.liveState.finalPaymentPaid && riskOverride) {
      _openCoeRiskModal();
      return;
    }

    _executeCoeDispatch(false);
  }

  function _openCoeRiskModal() {
    var coeRiskModal = document.getElementById('coeRiskConfirmModal');
    if (!coeRiskModal) {
      ns.showToast('⚠️ 风险确认弹窗不可用', '请刷新页面后重试');
      return;
    }
    var amountEl = document.getElementById('coeRiskOutstandingAmount');
    if (amountEl) {
      amountEl.textContent = ns.liveState.billing ? ns.liveState.billing.outstanding : '—';
    }
    var reasonEl = document.getElementById('coeRiskReason');
    if (reasonEl) reasonEl.value = '';
    var personEl = document.getElementById('coeRiskPerson');
    if (personEl) personEl.value = '';
    var evidenceEl = document.getElementById('coeRiskEvidence');
    if (evidenceEl) evidenceEl.value = '';
    coeRiskModal.classList.add('show');
  }

  function _executeCoeDispatch(withRiskRecord) {
    if (withRiskRecord) {
      var reasonEl = document.getElementById('coeRiskReason');
      var personEl = document.getElementById('coeRiskPerson');
      var evidenceEl = document.getElementById('coeRiskEvidence');
      var reason = (reasonEl && reasonEl.value.trim())
        ? reasonEl.value.trim()
        : '经确认，尾款未收风险可接受，同意发送 COE';
      var confirmer = (personEl && personEl.value.trim())
        ? personEl.value.trim()
        : '当前操作人';
      var evidence = (evidenceEl && evidenceEl.value.trim())
        ? evidenceEl.value.trim()
        : null;
      var outstanding = ns.liveState.billing ? ns.liveState.billing.outstanding : '—';

      ns.liveState.riskConfirmedForCoeSend = true;
      ns.liveState.riskConfirmationRecord = {
        confirmedBy: confirmer,
        reason: reason,
        evidence: evidence,
        time: new Date().toLocaleString('zh-CN'),
        amount: outstanding,
        context: 'sendCoe',
      };
      ns.applyRiskConfirmationRecord(ns.liveState.riskConfirmationRecord);
      ns._addStageLog(
        'review',
        '风险确认留痕（COE 发送）：尾款未收 <b>' + ns.esc(outstanding) +
          '</b> · 确认人：' + ns.esc(confirmer) +
          (evidence ? ' · 凭证：' + ns.esc(evidence) : '') +
          ' · 原因：' + ns.esc(reason),
        'orange',
        'risk_confirmation',
        'coe_send'
      );
    }

    ns.liveState.postApprovalStage = 'coe_sent';
    ns.liveState.coeSentAt = new Date().toISOString();
    ns._addStageLog(
      'status',
      'COE 已发送给客户 → postApprovalStage=coe_sent' +
        (ns.liveState.riskConfirmedForCoeSend ? '（含风险确认留痕）' : ''),
      'green',
      'coe_send',
      'coe_sent'
    );
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('COE 已发送', '等待客户海外返签' +
      (ns.liveState.riskConfirmedForCoeSend ? '（已留痕风险确认）' : ''));
    ns._refreshActionLabel();
    ns.applyImmigrationResultContent();
  }

  function _startOverseasVisa() {
    if (ns.liveState.postApprovalStage !== 'coe_sent') return;
    ns.liveState.postApprovalStage = 'overseas_visa_applying';
    ns.liveState.overseasVisaStartAt = new Date().toISOString();
    ns._addStageLog('status', '海外返签已启动 → postApprovalStage=overseas_visa_applying', 'blue', 'overseas_visa', 'start');
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('海外返签已启动', '等待客户入境确认');
    ns._refreshActionLabel();
  }

  function _confirmEntry() {
    if (ns.liveState.postApprovalStage !== 'overseas_visa_applying') return;
    ns.liveState.postApprovalStage = 'entry_success';
    ns.liveState.entryConfirmedAt = new Date().toISOString();
    ns.liveState.residencePeriodRecorded = false;
    ns.liveState.renewalRemindersCreated = false;
    ns._addStageLog('status', '客户入境成功 → postApprovalStage=entry_success', 'green', 'entry_confirmation', 'entry_success');
    ns._updateHeaderDisplay();
    ns.syncToListStore();
    ns.showToast('入境已确认', '请在「在留期间」Tab 录入在留期间信息');
    ns._refreshActionLabel();
    ns.applyResidencePeriodContent();
  }

  function _submitSupplementFromTab() {
    if (ns.liveState.stageCode !== 'S7') {
      ns.showToast('当前不在 S7', '补正提交仅在 S7 补正处理中可用');
      return;
    }
    if (!ns.liveState.supplementOpen) {
      ns.showToast('无待处理补正', '请先登记补正通知后再提交补正包');
      return;
    }
    _submitSupplement();
    ns._refreshActionLabel();
  }

  function _saveImmigrationResultFromTab() {
    if (ns.liveState.stageCode !== 'S7') {
      ns.showToast('当前不在 S7', '入管结果登记仅在 S7 可用');
      return;
    }
    var outcomeBtn = document.querySelector('#imm-result-btns button.ring-2, #imm-result-btns button[aria-selected="true"]');
    var outcome = outcomeBtn ? outcomeBtn.getAttribute('data-outcome') : null;
    if (!outcome) {
      ns.showToast('请先选择结果', '入管结果仅有「许可」和「拒签」两种（补正通过「登记补正通知」处理）');
      return;
    }
    if (outcome !== 'approved' && outcome !== 'rejected') {
      ns.showToast('⚠️ 无效的入管结果', '入管结果仅接受 approved / rejected，补正请使用「登记补正通知」');
      return;
    }
    _registerImmigrationResult(outcome);
  }

  function _registerSupplementNoticeFromTab() {
    if (ns.liveState.stageCode !== 'S7') {
      ns.showToast('当前不在 S7', '补正通知登记仅在 S7 已提交审理中可用');
      return;
    }
    _registerSupplementNotice();
  }

  ns._confirmEntry = _confirmEntry;
  ns._executeCoeDispatch = _executeCoeDispatch;
  ns._openCoeRiskModal = _openCoeRiskModal;
  ns._registerImmigrationResult = _registerImmigrationResult;
  ns._registerSupplementNotice = _registerSupplementNotice;
  ns._registerSupplementNoticeFromTab = _registerSupplementNoticeFromTab;
  ns._saveImmigrationResultFromTab = _saveImmigrationResultFromTab;
  ns._sendCoe = _sendCoe;
  ns._startOverseasVisa = _startOverseasVisa;
  ns._submitSupplement = _submitSupplement;
  ns._submitSupplementFromTab = _submitSupplementFromTab;
})();
