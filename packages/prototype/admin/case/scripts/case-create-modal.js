(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var helpers = window.CaseCreateHelpers || {};
    var modal = document.getElementById('caseCustomerModal');
    if (!modal) return;

    var form = document.getElementById('caseCustomerModalForm');
    var saveButton = document.getElementById('caseCustomerModalSave');
    var errorBox = document.getElementById('caseCustomerModalError');
    var modeInput = document.getElementById('caseCustomerModalMode');
    var roleInput = document.getElementById('newCaseCustomerRole');
    var duplicateBox = document.getElementById('caseCustomerDuplicateBox');
    var duplicateMatches = document.getElementById('caseCustomerDuplicateMatches');
    var duplicateReason = document.getElementById('caseCustomerDuplicateReason');
    var pendingDuplicateConfirmation = false;

    function openModal(mode, defaultRole) {
      if (modeInput) modeInput.value = mode || 'primary';
      if (roleInput && defaultRole) roleInput.value = defaultRole;
      pendingDuplicateConfirmation = false;
      if (duplicateBox) duplicateBox.classList.add('hidden');
      if (duplicateMatches) duplicateMatches.innerHTML = '';
      if (duplicateReason) duplicateReason.value = '';
      if (saveButton) saveButton.textContent = '保存并回填';
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
      pendingDuplicateConfirmation = false;
      if (duplicateBox) duplicateBox.classList.add('hidden');
      if (duplicateMatches) duplicateMatches.innerHTML = '';
      if (duplicateReason) duplicateReason.value = '';
      if (saveButton) saveButton.textContent = '保存并回填';
    }

    function findDuplicateMatches(data) {
      var customers = (window.CaseCreateConfig && window.CaseCreateConfig.customers) || [];
      if (typeof helpers.findDuplicateCustomers === 'function') {
        return helpers.findDuplicateCustomers(customers, data);
      }
      return customers.filter(function (customer) {
        var contact = customer.contact || '';
        var phoneMatched = data.phone && contact.indexOf(data.phone) >= 0;
        var emailMatched = data.email && contact.indexOf(data.email) >= 0;
        return phoneMatched || emailMatched;
      });
    }

    function renderDuplicateMatches(matches) {
      if (!duplicateBox || !duplicateMatches) return;
      duplicateBox.classList.remove('hidden');
      duplicateMatches.innerHTML = matches.map(function (match) {
        return [
          '<div class="rounded-2xl border border-amber-200 bg-white/80 px-3 py-3">',
          '  <div class="font-extrabold text-[13px] text-[var(--text)]">' + match.name + '（' + match.id + '）</div>',
          '  <div class="meta-text mt-1">' + match.groupLabel + ' · ' + (match.roleHint || '既有客户') + '</div>',
          '  <div class="meta-text mt-1">' + (match.contact || '未记录联系方式') + '</div>',
          '</div>'
        ].join('');
      }).join('');
      if (saveButton) saveButton.textContent = '确认继续创建并留痕';
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
        phone: phone,
        email: email,
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

      var matches = findDuplicateMatches(data);
      if (matches.length && !pendingDuplicateConfirmation) {
        pendingDuplicateConfirmation = true;
        renderDuplicateMatches(matches);
        if (errorBox) errorBox.textContent = '检测到可能重复的客户，请填写继续创建原因后再次确认。';
        return;
      }

      if (pendingDuplicateConfirmation) {
        if (!duplicateReason || !duplicateReason.value.trim()) {
          if (errorBox) errorBox.textContent = '请填写继续创建原因。';
          return;
        }
        data.duplicateDecision = {
          matchedIds: matches.map(function (item) { return item.id; }),
          confirmedBy: '当前演示操作者',
          confirmedAt: new Date().toISOString(),
          continueReason: duplicateReason.value.trim(),
        };
      }

      if (errorBox) errorBox.textContent = '';

      if (window.CaseCreatePageApi && typeof window.CaseCreatePageApi.addCustomer === 'function') {
        window.CaseCreatePageApi.addCustomer(data);
      }
      closeModal();
    });
  });
})();
