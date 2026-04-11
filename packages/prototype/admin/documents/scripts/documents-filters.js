var DocumentsFilters = (function () {
  'use strict';

  var ns = {};
  var _activeCardFilter = null;

  function init() {
    var filtersContainer = document.getElementById('filtersToolbar');
    var searchInput = document.getElementById('docSearchInput');
    var filterSelects = filtersContainer
      ? Array.from(filtersContainer.querySelectorAll('select[data-filter]'))
      : [];
    var resetBtn = filtersContainer
      ? filtersContainer.querySelector('[data-action="reset-filters"]')
      : null;

    ns.getFilterValues = function () {
      var values = {};
      filterSelects.forEach(function (sel) {
        values[sel.getAttribute('data-filter')] = sel.value;
      });
      values.search = searchInput ? searchInput.value.trim().toLowerCase() : '';
      return values;
    };

    ns.setCardFilter = function (cardStatus) {
      _activeCardFilter = cardStatus;
      filterSelects.forEach(function (sel) { sel.selectedIndex = 0; });
      if (searchInput) searchInput.value = '';
      ns.applyFilters();
    };

    ns.applyFilters = function () {
      var vals = ns.getFilterValues();
      var normalize = window.DocumentsConfig && window.DocumentsConfig.normalizeDocStatus;
      var nFilterStatus = vals.status && normalize ? normalize(vals.status) : vals.status;
      var rows = Array.from(document.querySelectorAll('#docTableBody tr[data-doc-id]'));
      var visibleCount = 0;

      rows.forEach(function (row) {
        var docStatus = row.getAttribute('data-doc-status');
        var matchStatus;

        if (_activeCardFilter) {
          if (_activeCardFilter === 'missing') {
            matchStatus = docStatus === 'not_sent' || docStatus === 'waiting_upload' || docStatus === 'revision_required';
          } else {
            matchStatus = docStatus === _activeCardFilter;
          }
        } else {
          matchStatus = !nFilterStatus || docStatus === nFilterStatus;
        }

        var matchCase = !vals['case'] || row.getAttribute('data-doc-case') === vals['case'];
        var matchProvider = !vals.provider || row.getAttribute('data-doc-provider') === vals.provider;

        var matchSearch = true;
        if (vals.search) {
          var text = row.textContent.toLowerCase();
          matchSearch = text.indexOf(vals.search) !== -1;
        }

        var visible = matchStatus && matchCase && matchProvider && matchSearch;
        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      var filterEmpty = document.getElementById('docFilterEmptyState');
      var dataEmpty = document.getElementById('docEmptyState');
      var table = document.querySelector('#docTableCard table');
      var pagination = document.getElementById('docPagination');
      var paginationInfo = document.getElementById('docPaginationInfo');
      var tableCount = document.getElementById('docTableCount');

      var totalRows = rows.length;
      var isFiltered = _activeCardFilter || vals.status || vals['case'] || vals.provider || vals.search;

      if (table) table.style.display = visibleCount > 0 ? '' : 'none';
      if (pagination) pagination.style.display = visibleCount > 0 ? '' : 'none';
      if (filterEmpty) filterEmpty.classList.toggle('hidden', !isFiltered || visibleCount > 0);
      if (dataEmpty) dataEmpty.classList.toggle('hidden', totalRows > 0);

      if (paginationInfo) {
        paginationInfo.textContent = '显示 1 - ' + visibleCount + ' 条，共 ' + visibleCount + ' 条';
      }
      if (tableCount) {
        tableCount.textContent = String(visibleCount);
      }

      if (window.DocumentsBulkActions && window.DocumentsBulkActions.clearSelection) {
        window.DocumentsBulkActions.clearSelection();
      }
    };

    ns.resetFilters = function () {
      _activeCardFilter = null;
      filterSelects.forEach(function (sel) { sel.selectedIndex = 0; });
      if (searchInput) searchInput.value = '';
      if (window.DocumentsPage && window.DocumentsPage.setActiveSummaryCard) {
        window.DocumentsPage.setActiveSummaryCard(null);
      }
      ns.applyFilters();
    };

    filterSelects.forEach(function (sel) {
      sel.addEventListener('change', function () {
        _activeCardFilter = null;
        if (window.DocumentsPage && window.DocumentsPage.setActiveSummaryCard) {
          window.DocumentsPage.setActiveSummaryCard(null);
        }
        ns.applyFilters();
      });
    });

    var debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _activeCardFilter = null;
        if (window.DocumentsPage && window.DocumentsPage.setActiveSummaryCard) {
          window.DocumentsPage.setActiveSummaryCard(null);
        }
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          ns.applyFilters();
        }, 250);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        ns.resetFilters();
        if (window.DocumentsPage && window.DocumentsPage.setActiveSummaryCard) {
          window.DocumentsPage.setActiveSummaryCard(null);
        }
      });
    }
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
