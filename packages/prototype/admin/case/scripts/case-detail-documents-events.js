/**
 * Case Detail — Documents event delegation.
 * Owns row expand/collapse, inline action routing, bulk actions, and reuse toasts.
 *
 * Depends on: case-detail-runtime.js (ns.showToast),
 *             case-detail-documents-actions.js (ns.docActionModal)
 * Namespace: window.CaseDetailPage
 */
(function () {
  'use strict';
  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  document.addEventListener('click', function (e) {
    var waiveBtn = e.target.closest('[data-waive-item]');
    if (!waiveBtn) return;
    var itemName = waiveBtn.getAttribute('data-waive-item');
    ns.docActionModal.openWaive(itemName);
  });

  document.addEventListener('click', function (e) {
    var row = e.target.closest('.doc-item[data-expandable="1"]');
    if (!row) return;
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
    var panel = row.nextElementSibling;
    if (!panel || !panel.classList.contains('doc-detail-panel')) return;
    var isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : '';
    row.classList.toggle('is-expanded', !isOpen);
    var chevron = row.querySelector('.doc-expand-chevron');
    if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
  });

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var docName = btn.getAttribute('data-doc');
    if (!action || !docName) return;

    if (action === 'register') {
      ns.docActionModal.openRegister(docName);
      return;
    }
    if (action === 'approve') {
      ns.docActionModal.openApprove(docName);
      return;
    }
    if (action === 'reject') {
      ns.docActionModal.openReject(docName);
      return;
    }
    if (action === 'waive') {
      ns.docActionModal.openWaive(docName);
      return;
    }
    if (action === 'reference') {
      ns.docActionModal.openReference(docName);
      return;
    }
    if (action === 'remind') {
      ns.docActionModal.doRemind(docName);
    }
  });

  document.addEventListener('change', function (e) {
    var selectAll = e.target.closest('#docsSelectAll');
    if (!selectAll) return;
    var container = document.getElementById('documentsByProvider');
    if (!container) return;
    var checkboxes = container.querySelectorAll('.doc-item-check');
    checkboxes.forEach(function (cb) {
      cb.checked = selectAll.checked;
    });
    var countEl = document.getElementById('docsSelectedCount');
    if (countEl) {
      var n = selectAll.checked ? checkboxes.length : 0;
      countEl.textContent = '已选 ' + n + ' 项';
      countEl.classList.toggle('hidden', n === 0);
    }
  });

  document.addEventListener('click', function (e) {
    var bulkTask = e.target.closest('#docsBulkTaskBtn');
    if (bulkTask) {
      ns.showToast('催办任务已生成（示例）', '已为选中资料项生成跟进任务');
      return;
    }
    var bulkExport = e.target.closest('#docsBulkExportBtn');
    if (bulkExport) {
      ns.showToast('导出清单（示例）', '资料清单已导出为 CSV');
    }
  });

  document.addEventListener('click', function (e) {
    var reuseGroup = e.target.closest('.doc-reuse-group-btn');
    if (reuseGroup) {
      var groupName = reuseGroup.getAttribute('data-reuse-group') || '此组';
      ns.showToast('资料复用（示例）', '将从关联案件中复用「' + groupName + '」的历史资料，请在弹窗中确认选择');
      return;
    }
    var reuseItem = e.target.closest('.doc-reuse-item-btn');
    if (reuseItem) {
      var itemName = reuseItem.getAttribute('data-reuse-item') || '该资料';
      ns.showToast('资料复用（示例）', '已复用「' + itemName + '」，可在详情中确认版本');
    }
  });
})();
