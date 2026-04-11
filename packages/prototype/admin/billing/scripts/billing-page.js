var BillingPage = (function () {
  'use strict';

  var PLAN_STATUS_TAG;
  var _activeBillingId = null;

  function init() {
    PLAN_STATUS_TAG = BillingConfig.NODE_STATUS_TAG_MAP;

    initToast();
    initSegmentedView();
    initPaymentLogRefLinks();
    initPaymentCorrections();
    initBillingPlanPanel();
  }

  /* ------------------------------------------------------------------ */
  /*  Toast                                                              */
  /* ------------------------------------------------------------------ */

  function initToast() {
    var toast = document.getElementById('toast');
    if (!toast) return;

    window.__billingPage = window.__billingPage || {};
    window.__billingPage.showToast = function (title, desc) {
      var titleEl = document.getElementById('toastTitle');
      var descEl = document.getElementById('toastDesc');
      if (titleEl) titleEl.textContent = title;
      if (descEl) descEl.textContent = desc;
      toast.classList.remove('hidden');
      clearTimeout(window.__billingPage._toastTimer);
      window.__billingPage._toastTimer = setTimeout(function () {
        toast.classList.add('hidden');
      }, 3000);
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Segmented View                                                     */
  /* ------------------------------------------------------------------ */

  function initSegmentedView() {
    var buttons = document.querySelectorAll('[data-segment]');
    var billingView = document.getElementById('billingTableCard');
    var paymentLogView = document.getElementById('paymentLogTableCard');

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var segment = btn.getAttribute('data-segment');
        buttons.forEach(function (b) {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        if (billingView) billingView.classList.toggle('hidden', segment !== 'billing-list');
        if (paymentLogView) paymentLogView.classList.toggle('hidden', segment !== 'payment-log');
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Payment Log Ref Links                                              */
  /* ------------------------------------------------------------------ */

  function initPaymentLogRefLinks() {
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-ref-link]');
      if (!link) return;
      var refId = link.getAttribute('data-ref-link');
      var targetRow = document.querySelector('[data-payment-id="' + refId + '"]');
      if (!targetRow) return;
      targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      targetRow.classList.add('ring-2', 'ring-[var(--primary)]', 'ring-offset-1');
      setTimeout(function () {
        targetRow.classList.remove('ring-2', 'ring-[var(--primary)]', 'ring-offset-1');
      }, 2000);
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Payment Void / Reverse Actions  (P0-CONTRACT §11, §19)            */
  /* ------------------------------------------------------------------ */

  function initPaymentCorrections() {
    document.addEventListener('click', function (e) {
      var voidBtn = e.target.closest('[data-action="void-payment"]');
      var revBtn  = e.target.closest('[data-action="reverse-payment"]');
      if (!voidBtn && !revBtn) return;

      var btn    = voidBtn || revBtn;
      var action = btn.getAttribute('data-action');
      var payId  = btn.getAttribute('data-payment-id');
      var amount = btn.getAttribute('data-payment-amount');

      // Update row status visually
      var row = btn.closest('tr');
      if (row) {
        // Disable both buttons on this row
        row.querySelectorAll('[data-action="void-payment"],[data-action="reverse-payment"]').forEach(function (b) {
          b.disabled = true;
          b.classList.add('opacity-40', 'cursor-not-allowed');
        });
      }

      // Toast feedback (P0-CONTRACT §19: paymentCorrected)
      var toastCfg = BillingConfig.TOAST.paymentCorrected;
      var actionLabel = action === 'void-payment' ? '作废' : '冲正';
      showToast({
        title: toastCfg.title,
        desc: toastCfg.desc.replace('{action}', actionLabel) + ' (' + payId + ' ¥' + amount + ')',
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /*  Billing Plan Panel                                                 */
  /* ------------------------------------------------------------------ */

  function initBillingPlanPanel() {
    var panel = document.getElementById('billingPlanPanel');
    if (!panel) return;

    document.querySelectorAll('[data-billing-id]').forEach(function (row) {
      row.style.cursor = 'pointer';
      row.addEventListener('click', function (e) {
        if (e.target.closest('input[type="checkbox"]') || e.target.closest('a')) return;
        var billingId = row.getAttribute('data-billing-id');
        showBillingPlan(billingId);
      });
    });

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="close-billing-plan"]') ||
          e.target.closest('[data-action="close-billing-plan-empty"]') ||
          e.target.closest('[data-action="close-billing-plan-settled"]')) {
        hideAllPlanPanels();
      }

      if (e.target.closest('[data-action="configure-billing-plan"]') ||
          e.target.closest('[data-action="edit-billing-plan"]')) {
        showToast(BillingConfig.TOAST.planConfigured);
      }

      if (e.target.closest('[data-action="register-payment-from-plan"]')) {
        if (window.BillingPaymentModal && window.BillingPaymentModal.openModal) {
          window.BillingPaymentModal.openModal(_activeBillingId);
        }
      }

      if (e.target.closest('[data-action="create-collection-from-plan"]')) {
        var plans = typeof BillingDemoData !== 'undefined' ? BillingDemoData.DEMO_BILLING_PLANS : {};
        var plan = _activeBillingId ? plans[_activeBillingId] : null;
        var caseName = plan ? plan.caseName : '当前案件';
        showToast({
          title: BillingConfig.TOAST.collectionSingle.title,
          desc: BillingConfig.TOAST.collectionSingle.desc.replace('{caseName}', caseName),
        });
      }

      // 财务备注编辑（演示，规格 §3 财务备注内部区域）
      if (e.target.closest('[data-action="edit-financial-note"]')) {
        showToast({ title: '财务备注已保存（示例）', desc: '备注已更新，变更已写入审计日志' });
      }
    });
  }

  function showToast(preset) {
    if (window.__billingPage && window.__billingPage.showToast) {
      window.__billingPage.showToast(preset.title, preset.desc);
    }
  }

  function hideAllPlanPanels() {
    _activeBillingId = null;
    var ids = ['billingPlanPanel', 'billingPlanEmptyState', 'billingPlanSettledState'];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.classList.add('hidden');
    });
    document.querySelectorAll('[data-billing-id]').forEach(function (r) {
      r.classList.remove('ring-2', 'ring-[var(--primary)]', 'ring-offset-1');
    });
  }

  function showBillingPlan(billingId) {
    var plans = typeof BillingDemoData !== 'undefined' ? BillingDemoData.DEMO_BILLING_PLANS : {};
    var plan = plans[billingId];

    hideAllPlanPanels();
    _activeBillingId = billingId;

    document.querySelectorAll('[data-billing-id]').forEach(function (r) {
      var isTarget = r.getAttribute('data-billing-id') === billingId;
      r.classList.toggle('ring-2', isTarget);
      r.classList.toggle('ring-[var(--primary)]', isTarget);
      r.classList.toggle('ring-offset-1', isTarget);
    });

    if (!plan) {
      showEmptyPlanState(billingId);
      return;
    }

    var allPaid = plan.nodes.every(function (n) { return n.status === 'paid'; });
    if (allPaid) {
      showSettledPlanState(plan);
    } else {
      showNormalPlanState(plan);
    }
  }

  function showEmptyPlanState(billingId) {
    var el = document.getElementById('billingPlanEmptyState');
    var nameEl = document.getElementById('billingPlanEmptyCaseName');
    if (!el) return;
    if (nameEl) nameEl.textContent = billingId;
    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showSettledPlanState(plan) {
    var el = document.getElementById('billingPlanSettledState');
    if (!el) return;

    var caseNoEl = document.getElementById('billingPlanSettledCaseNo');
    var caseNameEl = document.getElementById('billingPlanSettledCaseName');
    if (caseNoEl) caseNoEl.textContent = plan.caseNo;
    if (caseNameEl) caseNameEl.textContent = plan.caseName;

    var dueEl = el.querySelector('[data-settled-summary="totalDue"]');
    var recvEl = el.querySelector('[data-settled-summary="totalReceived"]');
    if (dueEl) dueEl.textContent = '¥ ' + plan.totalDue.toLocaleString();
    if (recvEl) recvEl.textContent = '¥ ' + plan.totalReceived.toLocaleString();

    var tbody = document.getElementById('billingPlanSettledTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      plan.nodes.forEach(function (node) {
        var st = PLAN_STATUS_TAG[node.status] || PLAN_STATUS_TAG.due;
        var tr = document.createElement('tr');
        tr.setAttribute('data-plan-node', node.id);
        tr.setAttribute('data-plan-status', node.status);
        tr.innerHTML =
          '<td><div class="text-sm font-extrabold text-[var(--text)]">' + escapeHtml(node.name) + '</div></td>' +
          '<td class="text-right font-medium">' + node.amount.toLocaleString() + '</td>' +
          '<td class="hidden md:table-cell text-sm text-[var(--muted)] font-semibold">' + escapeHtml(node.dueDate) + '</td>' +
          '<td><span class="tag ' + st.cls + '">' + st.label + '</span></td>';
        tbody.appendChild(tr);
      });
    }

    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function showNormalPlanState(plan) {
    var el = document.getElementById('billingPlanPanel');
    if (!el) return;

    var caseNoEl = document.getElementById('billingPlanCaseNo');
    var caseNameEl = document.getElementById('billingPlanCaseName');
    if (caseNoEl) caseNoEl.textContent = plan.caseNo;
    if (caseNameEl) caseNameEl.textContent = plan.caseName;

    var dueEl = el.querySelector('[data-plan-summary="totalDue"]');
    var recvEl = el.querySelector('[data-plan-summary="totalReceived"]');
    var outEl = el.querySelector('[data-plan-summary="totalOutstanding"]');
    if (dueEl) dueEl.textContent = '¥ ' + plan.totalDue.toLocaleString();
    if (recvEl) recvEl.textContent = '¥ ' + plan.totalReceived.toLocaleString();
    if (outEl) outEl.textContent = '¥ ' + plan.totalOutstanding.toLocaleString();

    var nextNodeEl = document.getElementById('billingPlanNextNode');
    var nextNodeDueDateEl = document.getElementById('billingPlanNextNodeDueDate');
    if (nextNodeEl && plan.nextNode) {
      nextNodeEl.textContent = plan.nextNode.name;
      if (nextNodeDueDateEl) nextNodeDueDateEl.textContent = plan.nextNode.dueDate;
    } else if (nextNodeEl) {
      nextNodeEl.textContent = BillingConfig.EMPTY_STATES.allSettled.nextNodeLabel;
      if (nextNodeDueDateEl) nextNodeDueDateEl.textContent = '';
    }

    var firstUnsettled = null;
    plan.nodes.forEach(function (n) {
      if (!firstUnsettled && n.status !== 'paid') firstUnsettled = n.id;
    });

    var tbody = document.getElementById('billingPlanTableBody');
    if (tbody) {
      tbody.innerHTML = '';
      plan.nodes.forEach(function (node) {
        var st = PLAN_STATUS_TAG[node.status] || PLAN_STATUS_TAG.due;
        var isNext = node.id === firstUnsettled;
        var isOverdue = node.status === 'overdue';
        var tr = document.createElement('tr');
        tr.setAttribute('data-plan-node', node.id);
        tr.setAttribute('data-plan-status', node.status);

        if (isNext) tr.className = 'bg-[rgba(3,105,161,0.04)]';
        if (isOverdue) tr.className = 'bg-[rgba(220,38,38,0.04)]';

        var nameHtml;
        if (isNext) {
          nameHtml =
            '<td>' +
            '<div class="flex items-center gap-1.5">' +
            '<svg class="w-3.5 h-3.5 text-[var(--primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>' +
            '<div class="text-sm font-extrabold text-[var(--primary)]">' + escapeHtml(node.name) + '</div>' +
            '</div>' +
            '<div class="text-[11px] text-[var(--primary)] font-semibold mt-0.5 ml-5">← 下一收款节点</div>' +
            '</td>';
        } else if (isOverdue) {
          nameHtml =
            '<td><div class="text-sm font-extrabold text-[#991b1b]">' + escapeHtml(node.name) + '</div></td>';
        } else {
          nameHtml =
            '<td><div class="text-sm font-extrabold text-[var(--text)]">' + escapeHtml(node.name) + '</div></td>';
        }

        var dueDateCls = isOverdue ? 'text-[#991b1b]' : 'text-[var(--muted)]';

        tr.innerHTML =
          nameHtml +
          '<td class="text-right font-medium">' + node.amount.toLocaleString() + '</td>' +
          '<td class="hidden md:table-cell text-sm ' + dueDateCls + ' font-semibold">' + escapeHtml(node.dueDate) + '</td>' +
          '<td><span class="tag ' + st.cls + '">' + st.label + '</span></td>';

        tbody.appendChild(tr);
      });
    }

    updatePlanFooterActions(plan);

    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function updatePlanFooterActions(plan) {
    var hasOverdue = plan.nodes.some(function (n) { return n.status === 'overdue'; });
    var riskBtn = document.getElementById('planRiskAckLink');
    var collectionBtn = document.querySelector('[data-action="create-collection-from-plan"]');
    var container = collectionBtn ? collectionBtn.parentElement : null;

    if (hasOverdue && container) {
      if (!riskBtn) {
        var sep = document.createElement('span');
        sep.className = 'text-[var(--border)]';
        sep.id = 'planRiskAckSep';
        sep.textContent = '|';
        var btn = document.createElement('button');
        btn.id = 'planRiskAckLink';
        btn.className = 'text-[#991b1b] text-[13px] font-extrabold hover:underline';
        btn.type = 'button';
        btn.setAttribute('data-action', 'view-risk-ack');
        btn.textContent = '查看风险确认';
        container.appendChild(sep);
        container.appendChild(btn);
      } else {
        riskBtn.style.display = '';
        var sep = document.getElementById('planRiskAckSep');
        if (sep) sep.style.display = '';
      }
    } else if (riskBtn) {
      riskBtn.style.display = 'none';
      var sep = document.getElementById('planRiskAckSep');
      if (sep) sep.style.display = 'none';
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  document.addEventListener('DOMContentLoaded', init);

  return { init: init };
})();
