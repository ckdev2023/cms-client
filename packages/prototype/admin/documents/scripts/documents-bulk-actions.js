var DocumentsBulkActions = (function () {
  'use strict';

  var ns = {};

  function init() {
    var selectAll = document.getElementById('selectAllDocs');
    var clearBtn = document.getElementById('bulkClearBtn');
    var remindBtn = document.getElementById('bulkRemindBtn');
    var approveBtn = document.getElementById('bulkApproveBtn');
    var waiveBtn = document.getElementById('bulkWaiveBtn');
    var tableBody = document.getElementById('docTableBody');

    function getSelectableCheckboxes() {
      return Array.from(document.querySelectorAll('[data-doc-select]:not(:disabled)'))
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

      if (count) count.textContent = String(checked.length);
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

    ns.updateBulkState = updateBulkState;

    if (selectAll) {
      selectAll.addEventListener('change', function () {
        var checked = selectAll.checked;
        getSelectableCheckboxes().forEach(function (cb) { cb.checked = checked; });
        updateBulkState();
      });
    }

    if (tableBody) {
      tableBody.addEventListener('change', function (e) {
        if (!e.target || e.target.getAttribute('data-doc-select') == null) return;
        updateBulkState();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', function () {
        ns.clearSelection();
      });
    }

    function toast(key, replacements) {
      var fn = window.__docsPage && window.__docsPage.showToastPreset;
      if (fn) fn(key, replacements);
    }

    function findDocById(id) {
      if (window.DocumentsPage && window.DocumentsPage.findDoc) {
        return window.DocumentsPage.findDoc(id);
      }
      return null;
    }

    function refreshPage() {
      if (window.DocumentsPage && window.DocumentsPage.refreshTable) {
        window.DocumentsPage.refreshTable();
      }
    }

    if (remindBtn) {
      remindBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        var now = new Date().toISOString();
        ids.forEach(function (id) {
          var doc = findDocById(id);
          if (doc) {
            doc.lastReminder = now.split('T')[0];
            if (!doc.reminderRecords) doc.reminderRecords = [];
            doc.reminderRecords.unshift({
              sentAt: now,
              sentBy: 'Admin',
              method: 'in-app',
              target: doc.provider,
            });
          }
        });
        toast('bulkRemind', { n: ids.length });
        ns.clearSelection();
        refreshPage();
      });
    }

    if (approveBtn) {
      approveBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        var now = new Date().toISOString();
        ids.forEach(function (id) {
          var doc = findDocById(id);
          if (doc) {
            doc.status = 'approved';
            if (!doc.reviewRecords) doc.reviewRecords = [];
            doc.reviewRecords.unshift({
              action: 'approved',
              actor: 'Admin',
              timestamp: now,
              note: '',
            });
          }
        });
        toast('bulkApprove', { n: ids.length });
        ns.clearSelection();
        refreshPage();
      });
    }

    if (waiveBtn) {
      waiveBtn.addEventListener('click', function () {
        var ids = getSelectedIds();
        if (ids.length === 0) return;
        if (window.DocumentsReview && window.DocumentsReview.openBulkWaive) {
          window.DocumentsReview.openBulkWaive(ids);
        }
      });
    }
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
