(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  function getCustomer() {
    return app.state.store ? app.state.store.customer : null;
  }

  app.getBasicFormSnapshot = function () {
    return {
      displayName: app.getValue('customerFieldDisplayName'),
      legalName: app.getValue('customerFieldLegalName'),
      kana: app.getValue('customerFieldKana'),
      gender: app.getValue('customerFieldGender'),
      birthDate: app.getValue('customerFieldBirthDate'),
      nationality: app.getValue('customerFieldNationality'),
      phone: app.getValue('customerFieldPhone'),
      email: app.getValue('customerFieldEmail'),
      referrer: app.getValue('customerFieldReferrer'),
      group: app.getValue('customerFieldGroup'),
      owner: app.getValue('customerFieldOwner'),
      note: app.getValue('customerFieldNote'),
    };
  };

  app.validateBasicForm = function (values) {
    var next = values || {};
    var legalName = String(next.legalName || '').trim();
    var nationality = String(next.nationality || '').trim();
    var phone = String(next.phone || '').trim();
    var email = String(next.email || '').trim();
    var group = String(next.group || '').trim();

    if (!legalName) return { ok: false, message: '请填写姓名（法定）', focusId: 'customerFieldLegalName' };
    if (!nationality) return { ok: false, message: '请填写国籍', focusId: 'customerFieldNationality' };
    if (!phone && !email) return { ok: false, message: '电话/邮箱至少填写一项', focusId: 'customerFieldPhone' };
    if (!group) return { ok: false, message: '请选择所属 Group', focusId: 'customerFieldGroup' };
    return { ok: true };
  };

  app.fillBasicForm = function (customer) {
    if (!customer) return;
    app.setValue('customerFieldDisplayName', customer.displayName || '');
    app.setValue('customerFieldLegalName', customer.legalName || customer.displayName || '');
    app.setValue('customerFieldKana', customer.kana || '');
    app.setValue('customerFieldGender', customer.gender || '');
    app.setValue('customerFieldBirthDate', customer.birthDate || '');
    app.setValue('customerFieldNationality', customer.nationality || '');
    app.setValue('customerFieldPhone', customer.phone || '');
    app.setValue('customerFieldEmail', customer.email || '');
    app.setValue('customerFieldReferrer', customer.referrer || '');
    app.setValue('customerFieldGroup', customer.group || '');
    app.setValue('customerFieldOwner', customer.owner || '');
    app.setValue('customerFieldNote', customer.note || '');
  };

  app.setFormEditing = function (isEditing) {
    app.state.isEditing = isEditing;

    [
      'customerFieldDisplayName',
      'customerFieldLegalName',
      'customerFieldKana',
      'customerFieldGender',
      'customerFieldBirthDate',
      'customerFieldNationality',
      'customerFieldPhone',
      'customerFieldEmail',
      'customerFieldReferrer',
      'customerFieldAvatar',
      'customerFieldGroup',
      'customerFieldOwner',
      'customerFieldNote',
    ].forEach(function (id) {
      var element = document.getElementById(id);
      if (!element) return;
      element.disabled = !isEditing;
      element.setAttribute('aria-disabled', isEditing ? 'false' : 'true');
      element.classList.toggle('bg-[var(--surface-2)]', !isEditing);
    });

    var editBtn = document.getElementById('customerEditToggleBtn');
    var saveBtn = document.getElementById('customerSaveBtn');
    var cancelBtn = document.getElementById('customerCancelBtn');
    var hint = document.getElementById('customerSaveHint');

    if (hint) hint.classList.add('hidden');
    if (editBtn) editBtn.classList.toggle('hidden', isEditing);
    if (saveBtn) saveBtn.classList.toggle('hidden', !isEditing);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !isEditing);

    app.state.editSnapshot = isEditing ? app.getBasicFormSnapshot() : null;
  };

  app.isBasicFormDirty = function () {
    if (!app.state.isEditing || !app.state.editSnapshot) return false;
    return JSON.stringify(app.getBasicFormSnapshot()) !== JSON.stringify(app.state.editSnapshot);
  };

  app.applyHeader = function (customer) {
    var titleEl = document.getElementById('customerTitle');
    if (titleEl) titleEl.textContent = customer ? String(customer.displayName || '客户详情') : '客户详情';

    app.setText('[data-customer-id]', customer ? String(customer.id || '—') : '—');
    app.setText('[data-customer-name]', customer ? String(customer.displayName || '—') : '—');
    app.setText('[data-customer-group]', customer ? app.getGroupLabel(customer.group) : '—');
    app.setText('[data-customer-owner]', customer ? app.getOwnerLabel(customer.owner) : '未指派');
    app.setText('[data-customer-last-contact]', customer ? app.formatContact(customer.lastContact) : '—');

    var groupChip = app.$('[data-customer-group-chip]');
    if (groupChip) groupChip.textContent = customer ? app.getGroupLabel(customer.group) : '—';

    var ownerChip = app.$('[data-customer-owner-chip]');
    if (ownerChip) ownerChip.textContent = customer ? app.getOwnerLabel(customer.owner) : '未指派';

    var ownerBadge = document.getElementById('customerOwnerBadge');
    if (ownerBadge) {
      var initials = customer ? app.getOwnerInitials(customer.owner) : '';
      var color = customer ? app.getOwnerColorClass(customer.owner) : { bg: 'bg-[var(--surface)]', text: 'text-[var(--text)]' };
      ownerBadge.className =
        'w-9 h-9 rounded-full border border-[var(--border)] flex items-center justify-center text-[13px] font-extrabold ' +
        String(color.bg) +
        ' ' +
        String(color.text);
      ownerBadge.textContent = initials || '—';
    }

    var avatarEl = document.getElementById('customerAvatar');
    if (avatarEl) {
      var avatar = customer && customer.avatar ? customer.avatar : null;
      var initials2 =
        avatar && avatar.initials
          ? String(avatar.initials)
          : customer && customer.displayName
            ? String(customer.displayName).slice(0, 1)
            : '客';
      var bg = avatar && avatar.bg ? String(avatar.bg) : 'bg-[var(--surface-2)]';
      var text = avatar && avatar.text ? String(avatar.text) : 'text-[var(--primary)]';
      avatarEl.className =
        'w-12 h-12 rounded-full flex items-center justify-center font-extrabold flex-shrink-0 border border-[var(--border)] ' +
        bg +
        ' ' +
        text;
      avatarEl.textContent = initials2;
    }

    var breadcrumbName = app.$('[data-customer-breadcrumb]');
    if (breadcrumbName) breadcrumbName.textContent = customer ? String(customer.displayName || '客户详情') : '客户详情';
  };

  app.buildCreateCaseUrl = function (customer, mode) {
    var customerId = customer ? String(customer.id || '') : '';
    if (!customerId) return '../case/create.html';

    var url = '../case/create.html?customer_id=' + encodeURIComponent(customerId);
    if (customer && customer.group) url += '&group=' + encodeURIComponent(String(customer.group));
    if (mode) url += '&mode=' + encodeURIComponent(String(mode));
    return url;
  };

  app.renderOverview = function () {
    var store = app.state.store;
    var cases = store && Array.isArray(store.cases) ? store.cases : [];
    var total = cases.length;
    var active = cases.filter(function (item) {
      return String(item.status) === 'active';
    }).length;
    var archived = cases.filter(function (item) {
      return String(item.status) === 'archived';
    }).length;

    app.setText('[data-cases-total]', String(total));
    app.setText('[data-cases-active]', String(active));
    app.setText('[data-cases-archived]', String(archived));
    app.setText('[data-cases-last-created]', total ? String(cases[0].updatedAt || cases[0].createdAt || '—') : '—');

    var summaryLink = app.$('[data-case-summary-link]');
    var moreToggle = app.$('[data-case-more-toggle]');
    if (!summaryLink) return;

    if (total === 0) {
      summaryLink.textContent = '—';
      summaryLink.setAttribute('aria-disabled', 'true');
      summaryLink.setAttribute('disabled', 'true');
      summaryLink.onclick = null;
      if (moreToggle) {
        moreToggle.textContent = '+0';
        moreToggle.setAttribute('disabled', 'true');
      }
      return;
    }

    summaryLink.textContent = cases[0].name;
    summaryLink.removeAttribute('aria-disabled');
    summaryLink.removeAttribute('disabled');
    summaryLink.onclick = function () {
      if (app.navigateToCase) app.navigateToCase(cases[0].id);
    };

    if (moreToggle) {
      var remaining = Math.max(0, total - 1);
      moreToggle.textContent = '+' + String(remaining);
      if (remaining === 0) moreToggle.setAttribute('disabled', 'true');
      else moreToggle.removeAttribute('disabled');
    }
  };

  app.initTabs = function () {
    var tabs = app.$$('[data-customer-tab]');

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        app.requestTabChange(tab.getAttribute('data-customer-tab'), tab);
      });
    });

    var tablist = app.$('[role="tablist"][aria-label="客户详情 Tabs"]');
    if (!tablist) return;

    tablist.addEventListener('keydown', function (event) {
      var current = document.activeElement;
      if (!current || current.getAttribute('role') !== 'tab') return;
      if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].indexOf(event.key) === -1) return;

      event.preventDefault();

      var index = tabs.indexOf(current);
      if (index < 0) index = 0;

      if (event.key === 'ArrowLeft') index = Math.max(0, index - 1);
      if (event.key === 'ArrowRight') index = Math.min(tabs.length - 1, index + 1);
      if (event.key === 'Home') index = 0;
      if (event.key === 'End') index = tabs.length - 1;

      var next = tabs[index];
      if (!next) return;
      next.focus();
      app.requestTabChange(next.getAttribute('data-customer-tab'), next);
    });
  };

  app.initActions = function () {
    var createBtns = [document.getElementById('customerCreateCaseBtn')].concat(app.$$('[data-create-case]')).filter(Boolean);
    var batchBtns = [document.getElementById('customerBatchCreateBtn')].concat(app.$$('[data-batch-case]')).filter(Boolean);
    var editBtn = document.getElementById('customerEditToggleBtn');
    var saveBtn = document.getElementById('customerSaveBtn');
    var cancelBtn = document.getElementById('customerCancelBtn');
    var addRelationBtn = document.getElementById('customerAddRelationBtn');
    var batchRelBtn = document.getElementById('customerRelationsBatchCreateBtn');
    var addCommBtn = document.getElementById('customerAddCommBtn');
    var hasCustomer = Boolean(getCustomer());

    createBtns.forEach(function (button) {
      app.setDisabled(button, !hasCustomer);
      button.onclick = function () {
        var customer = getCustomer();
        if (!customer) return;
        window.location.href = app.buildCreateCaseUrl(customer, 'single');
      };
    });

    batchBtns.forEach(function (button) {
      app.setDisabled(button, !hasCustomer);
      button.onclick = function () {
        var customer = getCustomer();
        if (!customer) return;
        window.location.href = app.buildCreateCaseUrl(customer, 'batch');
      };
    });

    app.setDisabled(editBtn, !hasCustomer);
    app.setDisabled(addRelationBtn, !hasCustomer);
    app.setDisabled(addCommBtn, !hasCustomer);

    if (editBtn) {
      editBtn.onclick = function () {
        if (!getCustomer()) return;
        app.setFormEditing(true);
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = function () {
        var customer = getCustomer();
        if (!customer) return;
        app.fillBasicForm(customer);
        app.setFormEditing(false);
      };
    }

    if (saveBtn) {
      saveBtn.onclick = function () {
        if (!app.state.store) return;

        var customer = getCustomer();
        var values = app.getBasicFormSnapshot();
        var validation = app.validateBasicForm(values);

        if (!validation.ok) {
          app.showToast({ title: '无法保存', desc: validation.message });
          if (validation.focusId) {
            var focusEl = document.getElementById(validation.focusId);
            if (focusEl && typeof focusEl.focus === 'function') focusEl.focus();
          }
          return;
        }

        var previous = app.clone(customer) || {};
        var nextCustomer = Object.assign({}, customer || {}, values);

        app.state.store.customer = nextCustomer;
        app.persistStore();
        app.applyHeader(nextCustomer);
        app.setFormEditing(false);

        var changed = [];
        if (String(previous.owner || '') !== String(values.owner || '')) changed.push('负责人');
        if (String(previous.group || '') !== String(values.group || '')) changed.push('分组');
        if (String(previous.phone || '') !== String(values.phone || '')) changed.push('电话');
        if (String(previous.email || '') !== String(values.email || '')) changed.push('邮箱');
        if (String(previous.displayName || '') !== String(values.displayName || '')) changed.push('识别名');
        if (String(previous.legalName || '') !== String(values.legalName || '')) changed.push('姓名');
        if (String(previous.nationality || '') !== String(values.nationality || '')) changed.push('国籍');

        app.addLogEntry({
          type: 'info',
          actor: 'Admin',
          message: changed.length ? '更新基础信息：' + changed.join('、') : '更新基础信息：无字段变化',
          at: new Date().toISOString().slice(0, 16),
        });

        var hint = document.getElementById('customerSaveHint');
        if (hint) hint.classList.remove('hidden');

        app.showToast({ title: '已保存', desc: '基础信息已更新，并写入操作日志（示例）' });
        app.renderOverview();
        if (app.renderLogs) app.renderLogs();
      };
    }

    if (addRelationBtn) {
      addRelationBtn.addEventListener('click', function () {
        if (!getCustomer() || !app.openRelationModal) return;
        app.openRelationModal('', addRelationBtn);
      });
    }

    if (batchRelBtn) {
      batchRelBtn.addEventListener('click', function () {
        var selectedIds = Object.keys(app.state.relationsSelected || {}).filter(function (key) {
          return Boolean(app.state.relationsSelected[key]);
        });
        if (!selectedIds.length) return;
        app.showToast({ title: '批量建案（示例）', desc: '已选择 ' + String(selectedIds.length) + ' 位关联人' });
      });
    }

    if (addCommBtn) {
      addCommBtn.addEventListener('click', function () {
        if (!getCustomer() || !app.openCommModal) return;
        app.openCommModal('', addCommBtn);
      });
    }
  };

  app.registerInit(function () {
    var customer = getCustomer();
    app.applyHeader(customer);
    if (customer) app.fillBasicForm(customer);
    app.setFormEditing(false);
    app.renderOverview();
    app.initTabs();
    app.initActions();
  });
})();
