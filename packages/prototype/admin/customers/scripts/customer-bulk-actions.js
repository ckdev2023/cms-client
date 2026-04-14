(function () {
  'use strict';

  var config = window.CustomerConfig;
  var ns = (window.CustomerBulkActions = {});

  ns.setup = (showToast) => {
    const bulkActionBar = document.getElementById('bulkActionBar');
    const selectedCountEl = document.getElementById('selectedCount');
    const selectAllCustomers = document.getElementById('selectAllCustomers');
    const bulkClearBtn = document.getElementById('bulkClearBtn');
    const customersTbody = document.querySelector('table.apple-table tbody');

    const isRowVisible = (row) => {
      return Boolean(row) && !row.hidden && !row.classList.contains('hidden');
    };

    const getSelectableCustomerCheckboxes = () => {
      const boxes = Array.from(document.querySelectorAll('input[data-customer-select]'));
      return boxes.filter((el) => !el.disabled && isRowVisible(el.closest('tr')));
    };

    ns.updateBulkState = () => {
      const boxes = getSelectableCustomerCheckboxes();
      const selected = boxes.filter((el) => el.checked);
      const selectedCount = selected.length;
      if (selectedCountEl) selectedCountEl.textContent = String(selectedCount);
      if (bulkActionBar) bulkActionBar.classList.toggle('hidden', selectedCount === 0);

      if (selectAllCustomers) {
        const total = boxes.length;
        const allSelected = total > 0 && selectedCount === total;
        selectAllCustomers.checked = allSelected;
        selectAllCustomers.indeterminate = selectedCount > 0 && selectedCount < total;
      }
    };

    const getSelectedIds = () => {
      return getSelectableCustomerCheckboxes()
        .filter((el) => el.checked)
        .map((el) => el.value)
        .filter(Boolean);
    };

    if (selectAllCustomers) {
      selectAllCustomers.addEventListener('change', () => {
        const boxes = getSelectableCustomerCheckboxes();
        boxes.forEach((el) => {
          el.checked = selectAllCustomers.checked;
        });
        ns.updateBulkState();
      });
    }

    if (customersTbody) {
      customersTbody.addEventListener('change', (e) => {
        if (!e.target || e.target.getAttribute('data-customer-select') == null) return;
        ns.updateBulkState();
      });
    }

    if (bulkClearBtn) {
      bulkClearBtn.addEventListener('click', () => {
        const boxes = getSelectableCustomerCheckboxes();
        boxes.forEach((el) => {
          el.checked = false;
        });
        ns.updateBulkState();
      });
    }

    config.BULK_ACTIONS.forEach((action) => {
      const selectEl = document.getElementById(action.selectId);
      const applyBtn = document.getElementById(action.applyBtnId);
      if (!applyBtn) return;

      applyBtn.addEventListener('click', () => {
        const ids = getSelectedIds();
        const value = String(selectEl?.value ?? '').trim();
        if (!value || ids.length === 0) return;
        const desc = action.toastDescTpl
          .replace('{count}', String(ids.length))
          .replace('{value}', value);
        showToast({ title: action.toastTitle, desc: desc });
        if (selectEl) selectEl.value = '';
      });
    });
  };
})();
