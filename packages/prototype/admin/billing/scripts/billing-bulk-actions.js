var BillingBulkActions = (function () {
  'use strict';

  var ns = {};

  function init() {
    var selectAll = document.getElementById('selectAllBilling');
    var clearBtn = document.getElementById('bulkClearBtn');
    var collectionBtn = document.getElementById('bulkCollectionBtn');
    var tableBody = document.getElementById('billingTableBody');
    var resultPanel = document.getElementById('collectionResultPanel');

    function getSelectableCheckboxes() {
      return Array.from(document.querySelectorAll('[data-billing-select]:not(:disabled)'))
        .filter(function (cb) {
          var row = cb.closest('tr');
          return row && row.style.display !== 'none';
        });
    }

    function getSelectedIds() {
      return getSelectableCheckboxes()
        .filter(function (cb) { return cb.checked; })
        .map(function (cb) { return cb.value; })
        .filter(Boolean);
    }

    function updateBulkState() {
      var checked = getSelectableCheckboxes().filter(function (cb) { return cb.checked; });
      var bar = document.getElementById('bulkActionBar');
      var count = document.getElementById('selectedCount');

      if (count) count.textContent = checked.length;
      if (bar) bar.classList.toggle('hidden', checked.length === 0);

      if (selectAll) {
        var all = getSelectableCheckboxes();
        selectAll.checked = all.length > 0 && checked.length === all.length;
        selectAll.indeterminate = checked.length > 0 && checked.length < all.length;
      }
    }

    ns.clearSelection = function () {
      if (selectAll) selectAll.checked = false;
      getSelectableCheckboxes().forEach(function (cb) { cb.checked = false; });
      updateBulkState();
    };

    if (selectAll) {
      selectAll.addEventListener('change', function () {
        var checked = selectAll.checked;
        getSelectableCheckboxes().forEach(function (cb) { cb.checked = checked; });
        updateBulkState();
      });
    }

    if (tableBody) {
      tableBody.addEventListener('change', function (e) {
        if (!e.target || e.target.getAttribute('data-billing-select') == null) return;
        updateBulkState();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ns.clearSelection();
      });
    }

    function buildCollectionResult(selectedIds) {
      var demoResult = BillingDemoData.DEMO_COLLECTION_RESULT;
      var skipReasons = BillingConfig.COLLECTION_SKIP_REASONS;
      var rows = BillingDemoData.DEMO_BILLING_ROWS;

      var results = [];
      var reasonCounts = {};

      selectedIds.forEach(function (id) {
        var row = rows.find(function (r) { return r.id === id; });
        if (!row) return;

        var detail = demoResult.details.find(function (d) { return d.caseNo === row.caseNo; });

        if (detail) {
          results.push({
            caseNo: row.caseNo,
            caseName: row.caseName,
            result: detail.result,
            reason: detail.reason || null,
            taskId: detail.taskId || null,
          });
          if (detail.result === 'skipped' && detail.reason) {
            reasonCounts[detail.reason] = (reasonCounts[detail.reason] || 0) + 1;
          }
        } else if (row.status === 'overdue') {
          results.push({
            caseNo: row.caseNo,
            caseName: row.caseName,
            result: 'success',
            taskId: 'TSK-' + Math.floor(Math.random() * 9000 + 1000),
          });
        } else {
          var reason = 'not-overdue';
          results.push({
            caseNo: row.caseNo,
            caseName: row.caseName,
            result: 'skipped',
            reason: reason,
          });
          reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
        }
      });

      var successCount = results.filter(function (r) { return r.result === 'success'; }).length;
      var skipCount = results.filter(function (r) { return r.result === 'skipped'; }).length;
      var failCount = results.filter(function (r) { return r.result === 'failed'; }).length;

      return {
        success: successCount,
        skipped: skipCount,
        failed: failCount,
        details: results,
        reasonCounts: reasonCounts,
        skipReasons: skipReasons,
      };
    }

    function renderResultPanel(result) {
      var successEl = document.getElementById('collectionSuccessCount');
      var skipEl = document.getElementById('collectionSkipCount');
      var failEl = document.getElementById('collectionFailCount');
      var detailsEl = document.getElementById('collectionResultDetails');
      var reasonsWrap = document.getElementById('collectionSkipReasons');
      var reasonsList = document.getElementById('collectionSkipReasonList');

      if (successEl) successEl.textContent = result.success;
      if (skipEl) skipEl.textContent = result.skipped;
      if (failEl) failEl.textContent = result.failed;

      if (detailsEl) {
        var html = '';
        result.details.forEach(function (d) {
          var icon = '';
          var color = '';
          var label = '';
          if (d.result === 'success') {
            icon = '<svg class="w-4 h-4 text-[#166534] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
            color = 'text-[#166534]';
            label = '已创建 ' + (d.taskId || '');
          } else if (d.result === 'skipped') {
            icon = '<svg class="w-4 h-4 text-[#92400e] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01"></path></svg>';
            color = 'text-[#92400e]';
            var reasonObj = result.skipReasons.find(function (r) { return r.value === d.reason; });
            label = '跳过：' + (reasonObj ? reasonObj.label : d.reason);
          } else {
            icon = '<svg class="w-4 h-4 text-[#991b1b] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
            color = 'text-[#991b1b]';
            label = '失败';
          }
          html += '<div class="flex items-start gap-2 text-[13px]">' +
            icon +
            '<div>' +
              '<span class="font-extrabold text-[var(--text)]">' + d.caseName + '</span>' +
              '<span class="text-[var(--muted-2)] ml-1">' + d.caseNo + '</span>' +
              '<div class="' + color + ' font-semibold mt-0.5">' + label + '</div>' +
            '</div>' +
          '</div>';
        });
        detailsEl.innerHTML = html;
      }

      var hasSkips = result.skipped > 0 && Object.keys(result.reasonCounts).length > 0;
      if (reasonsWrap) reasonsWrap.classList.toggle('hidden', !hasSkips);

      if (reasonsList && hasSkips) {
        var rhtml = '';
        var keys = Object.keys(result.reasonCounts);
        keys.forEach(function (key) {
          var reasonObj = result.skipReasons.find(function (r) { return r.value === key; });
          var label = reasonObj ? reasonObj.label : key;
          rhtml += '<div class="flex justify-between text-[13px]">' +
            '<span class="text-[var(--muted)] font-semibold">' + label + '</span>' +
            '<span class="font-extrabold text-[#92400e]">' + result.reasonCounts[key] + '</span>' +
          '</div>';
        });
        reasonsList.innerHTML = rhtml;
      }

      if (resultPanel) resultPanel.classList.remove('hidden');
    }

    function closeResultPanel() {
      if (resultPanel) resultPanel.classList.add('hidden');
    }

    document.addEventListener('click', function (e) {
      if (e.target.closest('[data-action="close-collection-result"]')) {
        closeResultPanel();
      }
    });

    if (collectionBtn) {
      collectionBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;

        var result = buildCollectionResult(ids);
        renderResultPanel(result);

        var toast = window.__billingPage && window.__billingPage.showToast;
        if (toast) {
          var t = BillingConfig.TOAST.collectionBulk;
          toast(
            t.title,
            t.desc.replace('{s}', result.success).replace('{k}', result.skipped).replace('{f}', result.failed)
          );
        }

        ns.clearSelection();
      });
    }
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
