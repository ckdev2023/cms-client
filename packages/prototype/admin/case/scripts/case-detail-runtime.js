/**
 * Case Detail — shared helpers.
 *
 * Loaded first among the active case-detail scripts.
 */
(function () {
  'use strict';

  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value != null ? value : '';
  }

  function setHtml(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html != null ? html : '';
  }

  function esc(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function severityColor(severity) {
    if (severity === 'danger') return 'var(--danger)';
    if (severity === 'warning') return 'var(--warning)';
    if (severity === 'primary') return 'var(--primary)';
    return 'var(--muted-2)';
  }

  function severityBgClass(severity) {
    if (severity === 'danger') return 'bg-red-50';
    if (severity === 'warning') return 'bg-amber-50';
    if (severity === 'primary') return 'bg-blue-50';
    return 'bg-[var(--surface-2)]';
  }

  function chipClass(color) {
    if (color === 'green') return 'bg-green-50 text-green-700 border-green-200';
    if (color === 'red') return 'bg-red-50 text-red-700 border-red-200';
    if (color === 'blue') return 'bg-blue-50 text-[var(--primary)] border-blue-200';
    return '';
  }

  function billingBadge(status) {
    var badge = BILLING_STATUS[status];
    return badge ? badge.badge : '';
  }

  function showToast(title, desc) {
    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');

    if (!toastEl) return;

    if (toastTitle) toastTitle.textContent = title;
    if (toastDesc) toastDesc.textContent = desc;

    toastEl.classList.remove('hidden');
    window.clearTimeout(showToast._timer);
    showToast._timer = setTimeout(function () {
      toastEl.classList.add('hidden');
    }, 3000);
  }

  ns.setText = setText;
  ns.setHtml = setHtml;
  ns.esc = esc;
  ns.severityColor = severityColor;
  ns.severityBgClass = severityBgClass;
  ns.chipClass = chipClass;
  ns.billingBadge = billingBadge;
  ns.showToast = showToast;
})();
