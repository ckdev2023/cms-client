/**
 * Leads list page — init, scope, filters, bulk selection, row click, toast.
 * Depends on: data/leads-config.js (window.LeadsConfig)
 */
(function () {
  'use strict';

  var cfg = window.LeadsConfig;
  if (!cfg) return;

  var toast = document.getElementById('toast');
  var toastTitle = document.getElementById('toastTitle');
  var toastDesc = document.getElementById('toastDesc');

  function showToast(title, desc) {
    if (!toast) return;
    toastTitle.textContent = title;
    toastDesc.textContent = desc;
    toast.classList.remove('hidden');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.add('hidden');
    }, 2200);
  }

  window.__leadsPage = { showToast: showToast };

  /* ---- Hash #new → open create modal ---- */
  if (window.location.hash === '#new') {
    var openBtn = document.getElementById('btnAddLead');
    if (openBtn) {
      setTimeout(function () { openBtn.click(); }, 100);
    }
    history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---- Scope segmented control ---- */
  document.querySelectorAll('[data-scope-btn]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('[data-scope-btn]').forEach(function (b) {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });

  /* ---- Client-side filter logic ---- */
  var filterStatus = document.getElementById('filterStatus');
  var filterOwner = document.getElementById('filterOwner');
  var filterGroup = document.getElementById('filterGroup');
  var filterBiz = document.getElementById('filterBusinessType');
  var searchInput = document.getElementById('leadSearch');
  var dateFrom = document.getElementById('filterDateFrom');
  var dateTo = document.getElementById('filterDateTo');
  var paginationInfo = document.querySelector('.apple-card .px-6.py-4.border-t .text-sm.text-gray-500');

  function filterRows() {
    var rows = document.querySelectorAll('#leadsTableBody tr[data-lead-id]');
    var sv = filterStatus ? filterStatus.value : '';
    var ov = filterOwner ? filterOwner.value : '';
    var gv = filterGroup ? filterGroup.value : '';
    var bv = filterBiz ? filterBiz.value : '';
    var q  = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var visibleCount = 0;

    rows.forEach(function (row) {
      var show = true;
      if (sv && row.getAttribute('data-status') !== sv) show = false;
      if (ov && row.getAttribute('data-owner') !== ov) show = false;
      if (gv && row.getAttribute('data-group') !== gv) show = false;
      if (bv && row.getAttribute('data-business-type') !== bv) show = false;
      if (q) {
        var text = row.textContent.toLowerCase();
        if (text.indexOf(q) === -1) show = false;
      }
      row.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (paginationInfo) {
      paginationInfo.textContent = visibleCount === rows.length
        ? '显示 1 - ' + rows.length + ' 条，共 ' + rows.length + ' 条'
        : '显示 ' + visibleCount + ' 条（已筛选），共 ' + rows.length + ' 条';
    }
  }

  [filterStatus, filterOwner, filterGroup, filterBiz].forEach(function (sel) {
    if (sel) sel.addEventListener('change', filterRows);
  });

  if (searchInput) {
    var searchTimer;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(filterRows, 200);
    });
  }

  /* ---- Filter reset ---- */
  var resetBtn = document.querySelector('[data-action="reset-filters"]');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      document.querySelectorAll('.leads-filter-select').forEach(function (sel) {
        sel.selectedIndex = 0;
      });
      if (searchInput) searchInput.value = '';
      if (dateFrom) dateFrom.value = '';
      if (dateTo) dateTo.value = '';
      filterRows();
      showToast('已重置', '所有筛选条件已恢复默认');
    });
  }

  /* ---- Table row click → detail page ---- */
  var tbody = document.getElementById('leadsTableBody');
  if (tbody) {
    tbody.addEventListener('click', function (e) {
      if (e.target.closest('input[type="checkbox"]')) return;
      var row = e.target.closest('tr[data-lead-id]');
      if (!row) return;
      var id = row.getAttribute('data-lead-id');
      window.location.href = 'detail.html?id=' + encodeURIComponent(id);
    });
  }

  /* ---- Bulk selection ---- */
  var selectAll = document.getElementById('selectAllLeads');
  var bulkBar = document.getElementById('bulkActionBar');
  var selectedCount = document.getElementById('selectedCount');
  var bulkClearBtn = document.getElementById('bulkClearBtn');

  function visibleChecks() {
    return Array.prototype.filter.call(
      document.querySelectorAll('[data-lead-select]'),
      function (c) { return c.closest('tr').style.display !== 'none'; }
    );
  }

  function updateBulkBar() {
    var checks = visibleChecks();
    var checkedCount = 0;
    checks.forEach(function (c) { if (c.checked) checkedCount++; });
    if (selectedCount) selectedCount.textContent = String(checkedCount);
    if (bulkBar) {
      bulkBar.classList.toggle('hidden', checkedCount === 0);
    }
    if (selectAll) {
      selectAll.checked = checkedCount === checks.length && checkedCount > 0;
      selectAll.indeterminate = checkedCount > 0 && checkedCount < checks.length;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', function () {
      visibleChecks().forEach(function (c) { c.checked = selectAll.checked; });
      updateBulkBar();
    });
  }

  document.querySelectorAll('[data-lead-select]').forEach(function (c) {
    c.addEventListener('change', updateBulkBar);
  });

  if (bulkClearBtn) {
    bulkClearBtn.addEventListener('click', function () {
      document.querySelectorAll('[data-lead-select]').forEach(function (c) { c.checked = false; });
      if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
      updateBulkBar();
    });
  }

  /* ---- Bulk action apply buttons ---- */
  function bulkApplyHandler(selectId, toastKey, labelFn) {
    var btn = document.getElementById(selectId.replace('Select', 'ApplyBtn').replace('Input', 'ApplyBtn'));
    var control = document.getElementById(selectId);
    if (!btn || !control) return;
    btn.addEventListener('click', function () {
      var count = selectedCount ? selectedCount.textContent : '0';
      var value = '';
      if (control.tagName === 'SELECT') {
        value = control.options[control.selectedIndex] ? control.options[control.selectedIndex].text : '';
      } else {
        value = control.value || '';
      }
      var preset = cfg.TOASTS[toastKey];
      if (preset) {
        showToast(preset.title, preset.desc.replace('{count}', count).replace('{value}', value));
      }
    });
  }

  bulkApplyHandler('bulkAssignSelect', 'bulkAssign');
  bulkApplyHandler('bulkFollowUpInput', 'bulkFollowUp');
  bulkApplyHandler('bulkStatusSelect', 'bulkStatus');

  /* ---- Empty state CTA ---- */
  var emptyCTA = document.querySelector('[data-action="open-create-modal"]');
  if (emptyCTA) {
    emptyCTA.addEventListener('click', function () {
      var btn = document.getElementById('btnAddLead');
      if (btn) btn.click();
    });
  }

  /* ---- Topbar "新建线索" button ---- */
  var topbarAdd = document.getElementById('topbarAddLead');
  if (topbarAdd) {
    topbarAdd.addEventListener('click', function () {
      var btn = document.getElementById('btnAddLead');
      if (btn) btn.click();
    });
  }
})();
