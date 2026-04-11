(function () {
  'use strict';

  var config = window.TasksConfig;
  var ns = (window.TasksFilters = {});

  ns.setup = function () {
    var filtersContainer = document.getElementById('filtersToolbar');
    var searchInput = document.getElementById('taskSearchInput');
    var filterSelects = filtersContainer
      ? Array.from(filtersContainer.querySelectorAll('select[data-filter]'))
      : [];

    ns.getFilterValues = function () {
      var values = {};
      filterSelects.forEach(function (sel) {
        values[sel.getAttribute('data-filter')] = sel.value;
      });
      values.search = searchInput ? searchInput.value.trim() : '';
      return values;
    };

    ns.applyViewPreset = function (viewId) {
      var views = config.WORKBENCH_VIEWS;
      var view = views.find(function (v) { return v.id === viewId; });
      if (!view || !view.filterPreset) return;

      ns.resetFilters(true);

      var preset = view.filterPreset;
      filterSelects.forEach(function (sel) {
        var key = sel.getAttribute('data-filter');
        if (preset[key] && typeof preset[key] === 'string') {
          sel.value = preset[key];
        }
      });
    };

    ns.resetFilters = function (silent) {
      filterSelects.forEach(function (sel) {
        sel.selectedIndex = 0;
      });
      if (searchInput) searchInput.value = '';
    };

    filterSelects.forEach(function (sel) {
      sel.addEventListener('change', function () {
        // demo-only: in production this triggers a list reload
      });
    });

    var debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(function () {
          // demo-only: in production this triggers a debounced list reload
        }, 300);
      });
    }

    if (filtersContainer) {
      filtersContainer.addEventListener('click', function (e) {
        var resetBtn = e.target.closest('[data-action="reset-filters"]');
        if (!resetBtn) return;
        ns.resetFilters();
      });
    }
  };
})();
