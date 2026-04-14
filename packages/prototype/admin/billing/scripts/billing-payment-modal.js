var BillingPaymentModal = (function () {
  'use strict';

  var ns = {};
  var _contextBillingId = null;

  var modal, closeBtn, cancelBtn, submitBtn, backdrop;
  var amountInput, dateInput, planSelect, receiptInput, noteInput;
  var amountWarning, planSelectWarning;

  function init() {
    modal = document.getElementById('paymentModal');
    closeBtn = document.getElementById('closeModalBtn');
    cancelBtn = document.getElementById('cancelModalBtn');
    submitBtn = document.getElementById('submitPaymentBtn');

    amountInput = document.getElementById('fieldAmount');
    dateInput = document.getElementById('fieldDate');
    planSelect = document.getElementById('fieldBillingPlanId');
    receiptInput = document.getElementById('fieldReceipt');
    noteInput = document.getElementById('fieldNote');
    amountWarning = document.getElementById('amountWarning');
    planSelectWarning = document.getElementById('planSelectWarning');

    var openBtn = document.querySelector('[data-action="open-payment-modal"]');
    if (openBtn) openBtn.addEventListener('click', function () { ns.openModal(null); });
    if (closeBtn) closeBtn.addEventListener('click', ns.closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', ns.closeModal);

    if (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) ns.closeModal();
      });
    }

    if (amountInput) {
      amountInput.addEventListener('input', function () {
        validateAmount();
        updateSubmitEnabled();
      });
    }
    if (dateInput) {
      dateInput.addEventListener('input', updateSubmitEnabled);
      dateInput.addEventListener('change', updateSubmitEnabled);
    }
    if (planSelect) {
      planSelect.addEventListener('change', function () {
        validateAmount();
        validatePlanSelection();
        updateSubmitEnabled();
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', function () {
        if (!validatePlanSelection()) return;
        var amount = amountInput ? amountInput.value : '0';
        var caseName = getSelectedCaseName() || '案件';
        var toast = window.__billingPage && window.__billingPage.showToast;
        if (toast) {
          var t = BillingConfig.TOAST.paymentLogged;
          toast(
            t.title,
            t.desc.replace('{amount}', Number(amount).toLocaleString()).replace('{caseName}', caseName)
          );
        }
        ns.closeModal();
      });
    }
  }

  ns.openModal = function (billingId) {
    _contextBillingId = billingId || null;
    resetForm();
    populatePlanSelector(billingId);
    if (modal) modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  };

  ns.closeModal = function () {
    if (modal) modal.classList.remove('show');
    document.body.style.overflow = '';
    _contextBillingId = null;
  };

  function resetForm() {
    if (amountInput) amountInput.value = '';
    if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
    if (planSelect) planSelect.selectedIndex = 0;
    if (receiptInput) receiptInput.value = '';
    if (noteInput) noteInput.value = '';
    if (amountWarning) amountWarning.classList.add('hidden');
    if (planSelectWarning) planSelectWarning.classList.add('hidden');
    updateSubmitEnabled();
  }

  function populatePlanSelector(billingId) {
    if (!planSelect) return;
    planSelect.innerHTML = '<option value="">请选择收费节点</option>';

    var plans = typeof BillingDemoData !== 'undefined' ? BillingDemoData.DEMO_BILLING_PLANS : {};

    if (billingId && plans[billingId]) {
      appendNodesFromPlan(plans[billingId]);
    } else {
      Object.keys(plans).forEach(function (key) {
        appendNodesFromPlan(plans[key]);
      });
    }

    var optionCount = planSelect.options.length - 1;
    if (optionCount === 1) planSelect.selectedIndex = 1;
  }

  function appendNodesFromPlan(plan) {
    if (!plan || !plan.nodes) return;
    plan.nodes.forEach(function (node) {
      if (node.status === 'paid') return;
      var opt = document.createElement('option');
      opt.value = node.id;
      // P0-CONTRACT §9.2: 选择器每项须显示 节点名 | 到期日 | 应收金额 | 未收金额
      var amountDue = node.amount || 0;
      // outstanding = amount for non-paid nodes (demo data does not track partial amounts per node)
      var amountOutstanding = amountDue;
      opt.textContent = plan.caseName + ' — ' + node.name +
        ' | 到期日: ' + (node.dueDate || '—') +
        ' | 应收 ¥' + amountDue.toLocaleString() +
        ' | 未收 ¥' + amountOutstanding.toLocaleString();
      opt.setAttribute('data-node-amount', amountDue);
      opt.setAttribute('data-case-name', plan.caseName);
      planSelect.appendChild(opt);
    });
  }

  function getSelectedNodeAmount() {
    if (!planSelect || planSelect.selectedIndex < 1) return null;
    var val = planSelect.options[planSelect.selectedIndex].getAttribute('data-node-amount');
    return val ? parseInt(val, 10) : null;
  }

  function getSelectedCaseName() {
    if (!planSelect || planSelect.selectedIndex < 1) return '';
    return planSelect.options[planSelect.selectedIndex].getAttribute('data-case-name') || '';
  }

  function validateAmount() {
    if (!amountInput || !amountWarning) return;
    var amount = parseInt(amountInput.value, 10);
    var nodeAmount = getSelectedNodeAmount();
    amountWarning.classList.toggle('hidden', !(amount && nodeAmount && amount > nodeAmount));
  }

  function validatePlanSelection() {
    if (!planSelect || !planSelectWarning) return true;
    var optionCount = planSelect.options.length - 1;
    if (optionCount > 1 && !planSelect.value) {
      planSelectWarning.classList.remove('hidden');
      return false;
    }
    planSelectWarning.classList.add('hidden');
    return true;
  }

  function updateSubmitEnabled() {
    if (!submitBtn) return;
    var hasAmount = amountInput && amountInput.value && parseInt(amountInput.value, 10) > 0;
    var hasDate = dateInput && dateInput.value;
    var hasPlanSelection = true;
    if (planSelect) {
      var optionCount = planSelect.options.length - 1;
      hasPlanSelection = optionCount <= 1 || !!planSelect.value;
    }
    submitBtn.disabled = !(hasAmount && hasDate && hasPlanSelection);
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
