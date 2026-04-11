/**
 * Case Detail — Stage action DOM wiring and event delegation.
 *
 * Owns modal open/close bindings, action button events,
 * legacy submission interactions, billing quick actions,
 * receipt handlers, and residence-period form buttons.
 *
 * Depends on: case-detail-stage-actions.js (ns._getStageActions,
 *   ns._showActionMenu, ns._refreshActionLabel)
 * Depends on: case-detail-stage-actions-post-approval.js
 *   (ns._executeCoeDispatch, ns._saveResidencePeriodFromForm,
 *   ns._createRenewalReminders)
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};
  var riskModal = document.getElementById('riskConfirmModal');
  var coeRiskModal = document.getElementById('coeRiskConfirmModal');

  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close-risk-modal]') && riskModal) {
      riskModal.classList.remove('show');
    }
    if (e.target.closest('[data-close-coe-risk-modal]') && coeRiskModal) {
      coeRiskModal.classList.remove('show');
    }
  });

  function rebindRiskTrigger() {
    var btn = document.getElementById('triggerRiskConfirm');
    if (!btn || !riskModal || btn.getAttribute('data-risk-trigger-bound') === '1') return;
    btn.setAttribute('data-risk-trigger-bound', '1');
    btn.addEventListener('click', function () {
      riskModal.classList.add('show');
    });
  }

  rebindRiskTrigger();

  var coeRiskSubmitBtn = document.getElementById('coeRiskConfirmSubmit');
  if (coeRiskSubmitBtn && coeRiskModal) {
    coeRiskSubmitBtn.addEventListener('click', function () {
      var reasonEl = document.getElementById('coeRiskReason');
      if (!reasonEl || !reasonEl.value.trim()) {
        ns.showToast('⚠️ 请填写确认原因', '风险确认原因为必填项');
        return;
      }
      coeRiskModal.classList.remove('show');
      ns._executeCoeDispatch(true);
    });
  }

  var exportBtn = document.getElementById('btnExportZip');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var toast = DETAIL_TOASTS.exportZip;
      ns.showToast(toast.title, toast.desc);
    });
  }

  var advanceBtn = document.getElementById('btnAdvanceStage');
  if (advanceBtn) {
    advanceBtn.addEventListener('click', function () {
      if (!ns.liveState.stageCode) return;
      var actions = ns._getStageActions();
      if (actions.length === 0) return;
      if (actions.length === 1) {
        actions[0].handler();
        return;
      }
      ns._showActionMenu(actions);
    });
  }

  var editBtn = document.getElementById('btnEditInfo');
  if (editBtn) {
    editBtn.addEventListener('click', function () {
      ns.setActiveTab('info');
    });
  }

  var riskSubmitBtn = document.getElementById('riskConfirmSubmit');
  if (riskSubmitBtn && riskModal) {
    riskSubmitBtn.addEventListener('click', function () {
      riskModal.classList.remove('show');
      var reasonEl = document.getElementById('riskConfirmReason');
      var reason = (reasonEl && reasonEl.value.trim())
        ? reasonEl.value.trim()
        : '经确认，欠款风险可接受，同意继续提交';

      ns.liveState.riskConfirmationRecord = {
        confirmedBy: '当前操作人',
        reason: reason,
        time: new Date().toLocaleString('zh-CN'),
        amount: ns.liveState.billing ? ns.liveState.billing.outstanding : '—',
      };
      ns.applyRiskConfirmationRecord(ns.liveState.riskConfirmationRecord);

      ns.liveState.logEntries.unshift({
        type: 'review',
        avatar: 'U',
        avatarStyle: 'warning',
        text: '风险确认通过：<b>欠款继续提交</b>',
        category: '审核日志',
        categoryChip: 'green',
        objectType: '当前操作',
        time: '刚刚',
        dotColor: 'success',
        source_type: 'risk_confirmation',
        source_key: 'billing',
      });
      ns.applyLogEntries(ns.liveState.logEntries);
      ns.syncToListStore();
      ns.showToast('风险确认已留痕', '欠款继续提交已记录确认人与原因');
    });
  }

  var sub001ViewContent = document.getElementById('sub001ViewContent');
  var sub001VersionPanel = document.getElementById('sub001VersionPanel');
  if (sub001ViewContent && sub001VersionPanel) {
    sub001ViewContent.addEventListener('click', function () {
      var visible = sub001VersionPanel.style.display !== 'none';
      sub001VersionPanel.style.display = visible ? 'none' : 'block';
      sub001ViewContent.textContent = visible ? '查看版本清单' : '收起版本清单';
    });
  }

  var sub001SaveAcceptanceNo = document.getElementById('sub001SaveAcceptanceNo');
  if (sub001SaveAcceptanceNo) {
    sub001SaveAcceptanceNo.addEventListener('click', function () {
      var input = document.getElementById('sub001AcceptanceNo');
      var val = input ? input.value.trim() : '';
      if (!val) {
        ns.showToast('请先填写受理番号', '受理番号不能为空', 'warning');
        return;
      }
      if (ns.liveState.submissionPackages && ns.liveState.submissionPackages.length > 0) {
        ns.liveState.submissionPackages[0].receiptNumber = val;
        ns.applySubmissionPackages(ns.liveState.submissionPackages);
      }
      ns.liveState.logEntries.unshift({
        type: 'operation',
        avatar: 'U',
        avatarStyle: 'primary',
        text: '受理番号保存：<b>' + ns.esc(val) + '</b> → 提交包 SUB-001',
        category: '操作日志',
        categoryChip: '',
        objectType: '提交包',
        time: '刚刚',
        dotColor: 'success',
        source_type: 'submission',
        source_key: 'SUB-001',
      });
      ns.applyLogEntries(ns.liveState.logEntries);
      ns.syncToListStore();
      ns.showToast('受理番号已保存', '「' + val + '」已关联到提交包 SUB-001。');
    });
  }

  document.addEventListener('click', function (e) {
    var quickActionBtn = e.target.closest('.row-quick-action');
    if (!quickActionBtn || quickActionBtn.textContent.trim() !== '登记回款') return;
    var row = quickActionBtn.closest('tr');
    if (!row) return;
    var tbody = row.parentElement;
    if (!tbody) return;
    var rowIndex = Array.prototype.indexOf.call(tbody.children, row);
    if (!ns.liveState.billing || !ns.liveState.billing.payments || !ns.liveState.billing.payments[rowIndex]) return;

    var payment = ns.liveState.billing.payments[rowIndex];
    payment.status = 'paid';
    payment.statusLabel = '已结清';

    var totalReceived = 0;
    var totalOutstanding = 0;
    ns.liveState.billing.payments.forEach(function (item) {
      var amount = parseInt(String(item.amount).replace(/[^0-9]/g, ''), 10) || 0;
      if (item.status === 'paid') {
        totalReceived += amount;
      } else {
        totalOutstanding += amount;
      }
    });
    ns.liveState.billing.received = '¥' + totalReceived.toLocaleString();
    ns.liveState.billing.outstanding = '¥' + totalOutstanding.toLocaleString();

    ns.applyBillingSummary(ns.liveState.billing);
    ns.applyBillingTable(ns.liveState.billing);

    var isFinalPayment = /尾款|成功酬金/.test(payment.type);
    if (isFinalPayment || totalOutstanding <= 0) {
      ns.liveState.finalPaymentPaid = true;
    }

    ns.liveState.logEntries.unshift({
      type: 'operation',
      avatar: 'U',
      avatarStyle: 'primary',
      text: '登记回款：<b>' + ns.esc(payment.amount) + '</b> 已到账' +
        (isFinalPayment ? ' → finalPaymentPaid=true' : ''),
      category: '操作日志',
      categoryChip: '',
      objectType: '收费',
      time: '刚刚',
      dotColor: 'success',
      source_type: 'billing',
      source_key: isFinalPayment ? 'final_payment' : 'payment',
    });
    ns.applyLogEntries(ns.liveState.logEntries);
    ns.setText('overviewBillingAmount', ns.liveState.billing.outstanding);
    ns.setText('overviewBillingMeta', totalOutstanding > 0 ? '未收 ¥' + totalOutstanding.toLocaleString() : '已结清');
    ns.showToast('回款已登记', payment.amount + ' 已记录到收费节点');
    ns.syncToListStore();
    ns._refreshActionLabel();
    ns.applyImmigrationResultContent();
  });

  document.addEventListener('click', function (e) {
    var receiptBtn = e.target.closest('[data-receipt-idx]');
    if (!receiptBtn) return;
    var idx = parseInt(receiptBtn.getAttribute('data-receipt-idx'), 10);
    if (isNaN(idx) || !ns.liveState.submissionPackages || !ns.liveState.submissionPackages[idx]) return;

    var pkg = ns.liveState.submissionPackages[idx];
    pkg.receiptDate = new Date().toLocaleDateString('zh-CN');
    ns.applySubmissionPackages(ns.liveState.submissionPackages);

    ns.liveState.logEntries.unshift({
      type: 'operation',
      avatar: 'U',
      avatarStyle: 'primary',
      text: '提交包 <b>' + ns.esc(pkg.id) + '</b> 已登记回执',
      category: '操作日志',
      categoryChip: '',
      objectType: '提交包',
      time: '刚刚',
      dotColor: 'success',
      source_type: 'submission',
      source_key: pkg.id,
    });
    ns.applyLogEntries(ns.liveState.logEntries);
    ns.syncToListStore();
    ns.showToast('回执已登记', pkg.id + ' 回执信息已记录');
  });

  document.addEventListener('click', function (e) {
    var saveBtn = e.target.closest('[data-save-receipt-idx]');
    if (saveBtn) {
      var pkgIdx = parseInt(saveBtn.getAttribute('data-save-receipt-idx'), 10);
      if (isNaN(pkgIdx) || !ns.liveState.submissionPackages || !ns.liveState.submissionPackages[pkgIdx]) return;
      var pkg = ns.liveState.submissionPackages[pkgIdx];
      var container = saveBtn.closest('div');
      var inputs = container ? container.querySelectorAll('[data-receipt-field]') : [];
      inputs.forEach(function (input) {
        var field = input.getAttribute('data-receipt-field');
        if (field && input.value.trim()) pkg[field] = input.value.trim();
      });
      ns.applySubmissionPackages(ns.liveState.submissionPackages);
      ns.liveState.logEntries.unshift({
        type: 'operation',
        avatar: 'U',
        avatarStyle: 'primary',
        text: '提交包 <b>' + ns.esc(pkg.id) + '</b> 补录受理番号：<b>' + ns.esc(pkg.receiptNumber || '—') + '</b>',
        category: '操作日志',
        categoryChip: '',
        objectType: '提交包',
        time: '刚刚',
        dotColor: 'success',
        source_type: 'submission',
        source_key: pkg.id,
      });
      ns.applyLogEntries(ns.liveState.logEntries);
      ns.syncToListStore();
      ns.showToast('回执信息已保存', '受理番号 ' + (pkg.receiptNumber || '') + ' 已关联至 ' + pkg.id);
      return;
    }

    var diffBtn = e.target.closest('[data-diff-idx]');
    if (!diffBtn) return;
    var diffIdx = parseInt(diffBtn.getAttribute('data-diff-idx'), 10);
    if (isNaN(diffIdx) || !ns.liveState.submissionPackages) return;
    var current = ns.liveState.submissionPackages[diffIdx];
    var previous = ns.liveState.submissionPackages[diffIdx - 1];
    if (!current || !previous) return;
    ns.showToast('版本对比（示例）', previous.id + ' → ' + current.id + '：摘要「' + (current.summary || '') + '」 vs 「' + (previous.summary || '') + '」');
  });

  var rpSaveBtn = document.getElementById('rpSaveBtn');
  if (rpSaveBtn) {
    rpSaveBtn.addEventListener('click', function () {
      if (ns.liveState.postApprovalStage !== 'entry_success') {
        ns.showToast('当前不在入境确认阶段', '仅 postApprovalStage=entry_success 可保存');
        return;
      }
      ns._saveResidencePeriodFromForm();
    });
  }

  var rpCreateRemindersBtn = document.getElementById('rpCreateRemindersBtn');
  if (rpCreateRemindersBtn) {
    rpCreateRemindersBtn.addEventListener('click', function () {
      ns._createRenewalReminders();
    });
  }

  ns.rebindRiskTrigger = rebindRiskTrigger;
})();
