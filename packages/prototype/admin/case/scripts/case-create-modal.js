(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var modal = document.getElementById('caseCustomerModal');
    if (!modal) return;

    var form = document.getElementById('caseCustomerModalForm');
    var saveButton = document.getElementById('caseCustomerModalSave');
    var errorBox = document.getElementById('caseCustomerModalError');
    var modeInput = document.getElementById('caseCustomerModalMode');
    var roleInput = document.getElementById('newCaseCustomerRole');

    function openModal(mode, defaultRole) {
      if (modeInput) modeInput.value = mode || 'primary';
      if (roleInput && defaultRole) roleInput.value = defaultRole;
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      window.setTimeout(function () {
        var firstInput = form && form.querySelector('input, select, textarea');
        if (firstInput && typeof firstInput.focus === 'function') firstInput.focus();
      }, 0);
    }

    function closeModal() {
      modal.classList.remove('show');
      document.body.style.overflow = '';
      if (form) form.reset();
      if (errorBox) errorBox.textContent = '';
    }

    function readFormData() {
      var groupSelect = document.getElementById('newCaseCustomerGroup');
      var groupOption = groupSelect ? groupSelect.options[groupSelect.selectedIndex] : null;
      var name = document.getElementById('newCaseCustomerName').value.trim();
      var phone = document.getElementById('newCaseCustomerPhone').value.trim();
      var email = document.getElementById('newCaseCustomerEmail').value.trim();

      return {
        id: 'draft-' + Date.now(),
        mode: modeInput ? modeInput.value : 'primary',
        name: name,
        role: roleInput ? roleInput.value : '关联人',
        group: groupSelect ? groupSelect.value : '',
        groupLabel: groupOption ? groupOption.textContent : '',
        contact: [email, phone].filter(Boolean).join(' / ') || '未填写联系方式',
        note: document.getElementById('newCaseCustomerNote').value.trim(),
        initials: name.replace(/\s+/g, '').slice(0, 2).toUpperCase() || '新',
      };
    }

    function validate(data) {
      if (!data.name) return '请填写客户姓名。';
      if (!data.group) return '请选择所属 Group。';
      if (!data.phone && !data.email) return '电话或邮箱至少填写一项。';
      return '';
    }

    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-open-customer-modal]');
      if (trigger) {
        openModal(
          trigger.getAttribute('data-open-customer-modal') || 'primary',
          trigger.getAttribute('data-default-role') || '关联人'
        );
        return;
      }

      if (event.target.closest('[data-close-customer-modal]')) {
        closeModal();
      }
    });

    modal.addEventListener('click', function (event) {
      if (event.target === modal) closeModal();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });

    saveButton.addEventListener('click', function () {
      var data = readFormData();
      var error = validate(data);
      if (error) {
        if (errorBox) errorBox.textContent = error;
        return;
      }

      if (window.CaseCreatePageApi && typeof window.CaseCreatePageApi.addCustomer === 'function') {
        window.CaseCreatePageApi.addCustomer(data);
      }
      closeModal();
    });
  });
})();
