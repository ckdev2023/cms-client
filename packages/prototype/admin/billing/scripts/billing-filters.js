var BillingFilters = (function () {
  'use strict';

  var ns = {};

  function init() {
    var filtersContainer = document.getElementById('filtersToolbar');
    var searchInput = document.getElementById('billingSearchInput');
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

    ns.applyFilters = function () {
      var vals = ns.getFilterValues();
      var rows = Array.from(document.querySelectorAll('#billingTableBody tr[data-billing-select-row]'));
      var visibleCount = 0;

      rows.forEach(function (row) {
        var matchStatus = !vals.status || row.getAttribute('data-billing-status') === vals.status;
        var matchGroup = !vals.group || row.getAttribute('data-billing-group') === vals.group;
        var matchOwner = !vals.owner || row.getAttribute('data-billing-owner') === vals.owner;

        var matchSearch = true;
        if (vals.search) {
          var text = row.textContent.toLowerCase();
          matchSearch = text.indexOf(vals.search) !== -1;
        }

        var visible = matchStatus && matchGroup && matchOwner && matchSearch;
        row.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
      });

      var emptyState = document.getElementById('billingFilterEmptyState');
      var dataEmptyState = document.getElementById('billingEmptyState');
      var table = document.querySelector('#billingTableCard table');
      var pagination = document.getElementById('billingPagination');
      var paginationInfo = document.getElementById('billingPaginationInfo');

      var hasAnyData = rows.length > 0;
      var hasVisibleRows = visibleCount > 0;
      var isFiltered = vals.status || vals.group || vals.owner || vals.search;

      if (table) table.style.display = hasVisibleRows ? '' : 'none';
      if (pagination) pagination.style.display = hasVisibleRows ? '' : 'none';
      if (emptyState) emptyState.classList.toggle('hidden', !isFiltered || hasVisibleRows);
      if (dataEmptyState) dataEmptyState.classList.toggle('hidden', hasAnyData);

      if (paginationInfo) {
        paginationInfo.textContent = '显示 1 - ' + visibleCount + ' 条，共 ' + visibleCount + ' 条';
      }

      if (window.BillingBulkActions && window.BillingBulkActions.clearSelection) {
        window.BillingBulkActions.clearSelection();
      }
    };

    ns.resetFilters = function () {
      filterSelects.forEach(function (sel) { sel.selectedIndex = 0; });
      if (searchInput) searchInput.value = '';
      ns.applyFilters();
    };

    filterSelects.forEach(function (sel) {
      sel.addEventListener('change', function () {
        ns.applyFilters();
      });
    });

    var debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          ns.applyFilters();
        }, 250);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        ns.resetFilters();
      });
    }
  }

  ns.init = init;
  document.addEventListener('DOMContentLoaded', init);

  return ns;
})();
