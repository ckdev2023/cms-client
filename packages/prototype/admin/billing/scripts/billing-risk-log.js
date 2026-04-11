var BillingRiskLog = (function () {
  'use strict';

  var ns = {};
  var panel;

  function init() {
    panel = document.getElementById('riskAckPanel');
    if (!panel) return;

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="close-risk-ack"]')) {
        ns.hidePanel();
      }
      if (e.target.closest('[data-action="view-risk-ack"]')) {
        ns.showPanel();
      }
    });
  }

  ns.showPanel = function () {
    if (!panel) return;
    var demoRisk = typeof BillingDemoData !== 'undefined' ? BillingDemoData.DEMO_RISK_ACK : null;
    var demoAudit = typeof BillingDemoData !== 'undefined' ? BillingDemoData.DEMO_AUDIT_LOG : [];

    if (demoRisk) renderRiskRecord(demoRisk);
    renderAuditLog(demoAudit);

    panel.classList.remove('hidden');
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  ns.hidePanel = function () {
    if (panel) panel.classList.add('hidden');
  };

  ns.isVisible = function () {
    return panel && !panel.classList.contains('hidden');
  };

  function renderRiskRecord(record) {
    setText('riskAckBy', record.confirmedBy);
    setText('riskAckAt', record.confirmedAt);
    setText('riskAckCase', (record.caseName || '') + ' ' + (record.caseNo || ''));
    setText('riskAckAmount', '¥ ' + (record.amount || 0).toLocaleString());
    setText('riskAckReason', record.reasonCode);
    setText('riskAckNote', record.reasonNote || '');
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text || '—';
  }

  var ACTION_META = {
    'risk-acknowledged':  { color: '#991b1b',        symbol: '⚠' },
    'payment-logged':     { color: '#166534',         symbol: '✓' },
    'payment-voided':     { color: '#991b1b',         symbol: '✕' },
    'payment-reversed':   { color: '#92400e',         symbol: '↺' },
    'collection-created': { color: 'var(--primary)',   symbol: '▸' },
    // P0-CONTRACT §7.4: 收费计划变更事件
    'plan-created':       { color: '#1d4ed8',         symbol: '＋' },
    'plan-edited':        { color: '#6d28d9',         symbol: '✎' },
    'plan-deleted':       { color: '#991b1b',         symbol: '✕' },
  };

  function renderAuditLog(entries) {
    var container = document.getElementById('riskAckAuditLog');
    if (!container) return;

    var relevant = entries.filter(function (e) {
      return ACTION_META.hasOwnProperty(e.action);
    });

    if (relevant.length === 0) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted)] font-semibold">暂无审计记录</div>';
      return;
    }

    var html = '';
    relevant.forEach(function (entry) {
      var meta = ACTION_META[entry.action] || { color: 'var(--muted)', symbol: '•' };
      html +=
        '<div class="flex items-start gap-2 text-[13px] py-1">' +
          '<span class="flex-shrink-0 w-5 text-center font-extrabold" style="color:' + meta.color + '">' + meta.symbol + '</span>' +
          '<div class="flex-1">' +
            '<div class="font-semibold text-[var(--text)]">' + escapeHtml(entry.detail) + '</div>' +
            '<div class="text-[11px] text-[var(--muted-2)] mt-0.5">' + escapeHtml(entry.actor) + ' · ' + escapeHtml(entry.timestamp) + '</div>' +
          '</div>' +
        '</div>';
    });
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
