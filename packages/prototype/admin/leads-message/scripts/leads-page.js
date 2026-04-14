/**
 * Leads list page — init, scope, filters, bulk selection, row click, toast.
 * Depends on: data/leads-config.js (window.LeadsConfig)
 */
(function () {
  'use strict';

  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

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

  window.__leadsPage = { showToast: showToast, updateBulkBar: null };

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
  var paginationInfo = document.getElementById('leadsPaginationInfo');
  var paginationBar = document.getElementById('leadsPaginationBar');
  var tableWrapper = document.querySelector('[data-section="table"] .overflow-x-auto');
  var emptyState = document.getElementById('leadsEmptyState');

  function parseFollowUpDate(row) {
    var raw = row.getAttribute('data-next-follow-up') || '';
    return raw || null;
  }

  function filterRows() {
    var rows = document.querySelectorAll('#leadsTableBody tr[data-lead-id]');
    var sv = filterStatus ? filterStatus.value : '';
    var ov = filterOwner ? filterOwner.value : '';
    var gv = filterGroup ? filterGroup.value : '';
    var bv = filterBiz ? filterBiz.value : '';
    var q  = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var df = dateFrom ? dateFrom.value : '';
    var dt = dateTo ? dateTo.value : '';
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
      if (show && (df || dt)) {
        var rowDate = parseFollowUpDate(row);
        if (rowDate) {
          if (df && rowDate < df) show = false;
          if (dt && rowDate > dt) show = false;
        } else if (df || dt) {
          show = false;
        }
      }
      row.style.display = show ? '' : 'none';
      if (show) visibleCount++;
    });

    if (paginationInfo) {
      paginationInfo.textContent = visibleCount === rows.length
        ? '显示 1 - ' + rows.length + ' 条，共 ' + rows.length + ' 条'
        : '显示 ' + visibleCount + ' 条（已筛选），共 ' + rows.length + ' 条';
    }

    var showEmpty = visibleCount === 0;
    if (emptyState) emptyState.classList.toggle('hidden', !showEmpty);
    if (tableWrapper) tableWrapper.classList.toggle('hidden', showEmpty);
    if (paginationBar) paginationBar.classList.toggle('hidden', showEmpty);

    clearStaleSelections();
    updateBulkBar();
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

  if (dateFrom) dateFrom.addEventListener('change', filterRows);
  if (dateTo) dateTo.addEventListener('change', filterRows);

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
      var t = cfg.TOASTS.resetFilters;
      showToast(t.title, t.desc);
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
      var sampleKey = row.getAttribute('data-sample-key');
      var nextUrl = 'detail.html?id=' + encodeURIComponent(id);
      if (sampleKey) nextUrl += '&sample=' + encodeURIComponent(sampleKey);
      window.location.href = nextUrl;
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

  function clearStaleSelections() {
    document.querySelectorAll('[data-lead-select]').forEach(function (c) {
      if (c.closest('tr').style.display === 'none') c.checked = false;
    });
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

  if (window.__leadsPage) window.__leadsPage.updateBulkBar = updateBulkBar;

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

  function clearAllSelections() {
    document.querySelectorAll('[data-lead-select]').forEach(function (c) { c.checked = false; });
    if (selectAll) { selectAll.checked = false; selectAll.indeterminate = false; }
    updateBulkBar();
  }

  /* ---- Bulk action apply buttons ---- */
  function bulkApplyHandler(selectId, toastKey) {
    var applyBtnId = selectId.replace('Select', 'ApplyBtn').replace('Input', 'ApplyBtn');
    var btn = document.getElementById(applyBtnId);
    var control = document.getElementById(selectId);
    if (!btn || !control) return;
    btn.addEventListener('click', function () {
      var value = '';
      if (control.tagName === 'SELECT') {
        if (!control.value) return;
        value = control.options[control.selectedIndex] ? control.options[control.selectedIndex].text : '';
      } else {
        value = control.value || '';
        if (!value) return;
      }
      var count = selectedCount ? selectedCount.textContent : '0';
      var preset = cfg.TOASTS[toastKey];
      if (preset) {
        showToast(preset.title, preset.desc.replace('{count}', count).replace('{value}', value));
      }
      clearAllSelections();
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
  }

  document.addEventListener('prototype:fragments-ready', init);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    init();
  }
})();
