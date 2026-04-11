(function () {
  'use strict';

  var app = (window.CustomerDetailPage = window.CustomerDetailPage || {});

  app.state = {
    activeTab: 'basic',
    caseFilter: 'all',
    customerId: '',
    store: null,
    isEditing: false,
    editSnapshot: null,
    relationsSelected: {},
    relationsSearch: '',
    commFilter: 'all',
    logFilter: 'all',
    logPage: 1,
    logPageSize: 8,
    lastFocusEl: null,
    pendingConfirm: null,
    editingRelationId: null,
    editingCommId: null,
    casePopoverApi: null,
    isInitialized: false,
  };

  app.initializers = [];

  app.registerInit = function (initializer) {
    if (typeof initializer === 'function') {
      app.initializers.push(initializer);
    }
  };

  app.runInitializers = function () {
    app.initializers.forEach(function (initializer) {
      initializer();
    });
  };

  app.$$ = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };

  app.$ = function (selector) {
    return document.querySelector(selector);
  };

  app.safeJsonParse = function (value, fallback) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  };

  app.clone = function (value) {
    return app.safeJsonParse(JSON.stringify(value || null), null);
  };

  app.setText = function (selector, value) {
    app.$$(selector).forEach(function (element) {
      element.textContent = value;
    });
  };

  app.setValue = function (id, value) {
    var element = document.getElementById(id);
    if (!element) return;
    element.value = value == null ? '' : String(value);
  };

  app.getValue = function (id) {
    var element = document.getElementById(id);
    if (!element) return '';
    return String(element.value || '');
  };

  app.setDisabled = function (element, disabled) {
    if (!element) return;
    if (disabled) {
      element.setAttribute('disabled', 'true');
      element.setAttribute('aria-disabled', 'true');
      element.classList.add('opacity-60', 'cursor-not-allowed');
      return;
    }
    element.removeAttribute('disabled');
    element.setAttribute('aria-disabled', 'false');
    element.classList.remove('opacity-60', 'cursor-not-allowed');
  };

  app.setVisible = function (element, isVisible) {
    if (!element) return;
    element.classList.toggle('hidden', !isVisible);
  };

  app.showToast = function (opts) {
    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');
    if (!toastEl || !toastTitle || !toastDesc) return;

    toastTitle.textContent = String((opts && opts.title) || '操作已完成');
    toastDesc.textContent = String((opts && opts.desc) || '');
    toastEl.classList.remove('hidden');

    window.clearTimeout(app.showToast._timer);
    app.showToast._timer = window.setTimeout(function () {
      toastEl.classList.add('hidden');
    }, 2200);
  };

  app.openBackdropModal = function (modalEl, triggerEl) {
    if (!modalEl) return;
    app.state.lastFocusEl = triggerEl || document.activeElement;
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    window.setTimeout(function () {
      var first = modalEl.querySelector('input, select, textarea, button');
      if (first && typeof first.focus === 'function') first.focus();
    }, 0);
  };

  app.closeBackdropModal = function (modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    var last = app.state.lastFocusEl;
    app.state.lastFocusEl = null;
    if (last && typeof last.focus === 'function') last.focus();
  };

  app.setupModalDismiss = function (modalEl, closeBtnIds) {
    if (!modalEl) return;

    (closeBtnIds || []).forEach(function (id) {
      var button = document.getElementById(id);
      if (!button) return;
      button.addEventListener('click', function () {
        app.closeBackdropModal(modalEl);
      });
    });

    modalEl.addEventListener('click', function (event) {
      if (event.target === modalEl) app.closeBackdropModal(modalEl);
    });

    document.addEventListener('keydown', function (event) {
      if (!modalEl.classList.contains('show')) return;
      if (event.key === 'Escape') app.closeBackdropModal(modalEl);
    });
  };

  app.setActiveTab = function (key) {
    app.state.activeTab = key;

    app.$$('[data-customer-tab]').forEach(function (tab) {
      var isActive = tab.getAttribute('data-customer-tab') === key;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
      tab.classList.toggle('border-[var(--apple-blue)]', isActive);
      tab.classList.toggle('border-transparent', !isActive);
      tab.classList.toggle('text-[var(--apple-text-main)]', isActive);
      tab.classList.toggle('text-[var(--muted-2)]', !isActive);
    });

    app.$$('[data-customer-panel]').forEach(function (panel) {
      var isActive = panel.getAttribute('data-customer-panel') === key;
      panel.classList.toggle('hidden', !isActive);
    });
  };

  app.getConfig = function () {
    return window.CustomerConfig || {};
  };

  app.getDetailConfig = function () {
    var config = app.getConfig();
    return config.DETAIL || {};
  };

  app.findCustomerById = function (customerId) {
    var config = app.getConfig();
    var customers = Array.isArray(config.CUSTOMERS) ? config.CUSTOMERS : [];
    return (
      customers.find(function (customer) {
        return String(customer && customer.id) === String(customerId || '');
      }) || null
    );
  };

  app.getGroupLabel = function (value) {
    var map = app.getConfig().GROUP_LABEL_MAP || {};
    return String(map && map[value] ? map[value] : value || '—');
  };

  app.getOwnerLabel = function (value) {
    var owners = Array.isArray(app.getConfig().OWNERS) ? app.getConfig().OWNERS : [];
    var owner = owners.find(function (item) {
      return String(item && item.value) === String(value || '');
    });
    return owner ? String(owner.label || value) : value ? String(value) : '未指派';
  };

  app.getOwnerInitials = function (value) {
    var owners = Array.isArray(app.getConfig().OWNERS) ? app.getConfig().OWNERS : [];
    var owner = owners.find(function (item) {
      return String(item && item.value) === String(value || '');
    });
    return owner ? String(owner.initials || '') : '';
  };

  app.getOwnerColorClass = function (value) {
    var owners = Array.isArray(app.getConfig().OWNERS) ? app.getConfig().OWNERS : [];
    var owner = owners.find(function (item) {
      return String(item && item.value) === String(value || '');
    });
    if (!owner) return { bg: 'bg-[var(--surface)]', text: 'text-[var(--text)]' };
    return {
      bg: owner.bg ? String(owner.bg) : 'bg-[var(--surface)]',
      text: owner.text ? String(owner.text) : 'text-[var(--text)]',
    };
  };

  app.getRelationTypeLabel = function (value) {
    var options = Array.isArray(app.getDetailConfig().relationTypes) ? app.getDetailConfig().relationTypes : [];
    var found = options.find(function (option) {
      return String(option.value) === String(value || '');
    });
    return found ? String(found.label || value) : String(value || '—');
  };

  app.getCommTypeLabel = function (value) {
    var options = Array.isArray(app.getDetailConfig().commTypes) ? app.getDetailConfig().commTypes : [];
    var found = options.find(function (option) {
      return String(option.value) === String(value || '');
    });
    return found ? String(found.label || value) : String(value || '—');
  };

  app.getVisibilityLabel = function (value) {
    var options = Array.isArray(app.getDetailConfig().visibilityOptions) ? app.getDetailConfig().visibilityOptions : [];
    var found = options.find(function (option) {
      return String(option.value) === String(value || '');
    });
    return found ? String(found.label || value) : String(value || '—');
  };

  app.parseTags = function (value) {
    var raw = String(value || '').trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map(function (tag) {
        return String(tag || '').trim();
      })
      .filter(Boolean);
  };

  app.uniq = function (values) {
    var seen = {};
    var output = [];

    (values || []).forEach(function (value) {
      var key = String(value || '').trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      output.push(key);
    });

    return output;
  };

  app.formatContact = function (contact) {
    if (!contact) return '—';
    var date = contact.date ? String(contact.date) : '';
    var channel = contact.channel ? String(contact.channel) : '';
    if (!date && !channel) return '—';
    if (date && channel) return date + ' · ' + channel;
    return date || channel;
  };

  app.formatDateTime = function (iso) {
    var value = String(iso || '').trim();
    if (!value) return '—';
    return value.replace('T', ' ');
  };

  app.toDateOnly = function (isoOrDate) {
    var value = String(isoOrDate || '').trim();
    if (!value) return '';
    var index = value.indexOf('T');
    return index >= 0 ? value.slice(0, index) : value;
  };

  app.buildDefaultCases = function (customer) {
    if (!customer) return [];

    var tags = customer.cases && Array.isArray(customer.cases.tags) ? customer.cases.tags : [];
    var total = customer.cases && typeof customer.cases.total === 'number' ? customer.cases.total : tags.length;
    var active = customer.cases && typeof customer.cases.active === 'number' ? customer.cases.active : Math.min(total, 1);
    if (!total) return [];

    var activeStages = ['资料收集中', '提交前确认', '办理中', '补正处理中'];
    var owners = ['山田', '佐藤', '鈴木'];
    var cases = [];

    for (var index = 0; index < total; index += 1) {
      var status = index < active ? 'active' : 'archived';
      var name = tags[index] ? String(tags[index]) : '案件 ' + String(index + 1);
      var id = 'C-2026-' + String(100 + index);
      var updatedAt = '2026-03-' + String(30 - index).padStart(2, '0');

      cases.push({
        id: id,
        name: name,
        status: status,
        stage: status === 'active' ? activeStages[index % activeStages.length] : '已归档',
        owner: owners[index % owners.length],
        createdAt: updatedAt,
        updatedAt: updatedAt,
      });
    }

    return cases;
  };

  app.readAllStored = function () {
    var raw = window.localStorage ? window.localStorage.getItem('gyosei_os_customer_detail_store_v1') : '';
    var data = app.safeJsonParse(raw || '{}', {});
    if (!data || typeof data !== 'object') return {};
    return data;
  };

  app.writeAllStored = function (all) {
    if (!window.localStorage) return;
    try {
      window.localStorage.setItem('gyosei_os_customer_detail_store_v1', JSON.stringify(all || {}));
    } catch (error) {
      return;
    }
  };

  app.loadStore = function (customerId) {
    var base = customerId ? app.findCustomerById(customerId) : null;
    var detail = app.getDetailConfig();
    var seedCustomer = base ? app.clone(base) : null;
    var seedCases = seedCustomer ? app.buildDefaultCases(seedCustomer) : [];
    var seedRelations = [];
    var seedComms = [];
    var seedLogs = [];

    if (seedCustomer && detail && typeof detail === 'object') {
      var casesByCustomerId = detail.casesByCustomerId || {};
      var relationsByCustomerId = detail.relationsByCustomerId || {};
      var commsByCustomerId = detail.commsByCustomerId || {};
      var logsByCustomerId = detail.logsByCustomerId || {};

      if (Array.isArray(casesByCustomerId[customerId])) seedCases = app.clone(casesByCustomerId[customerId]) || [];
      if (Array.isArray(relationsByCustomerId[customerId])) seedRelations = app.clone(relationsByCustomerId[customerId]) || [];
      if (Array.isArray(commsByCustomerId[customerId])) seedComms = app.clone(commsByCustomerId[customerId]) || [];
      if (Array.isArray(logsByCustomerId[customerId])) seedLogs = app.clone(logsByCustomerId[customerId]) || [];
    }

    var storedAll = app.readAllStored();
    var stored = storedAll && storedAll[customerId] ? storedAll[customerId] : null;
    var store = {
      customer: seedCustomer,
      cases: seedCases,
      relations: seedRelations,
      comms: seedComms,
      logs: seedLogs,
    };

    if (stored && typeof stored === 'object') {
      if (stored.customer && typeof stored.customer === 'object') store.customer = stored.customer;
      if (Array.isArray(stored.cases)) store.cases = stored.cases;
      if (Array.isArray(stored.relations)) store.relations = stored.relations;
      if (Array.isArray(stored.comms)) store.comms = stored.comms;
      if (Array.isArray(stored.logs)) store.logs = stored.logs;
    }

    return store;
  };

  app.persistStore = function () {
    if (!app.state.customerId || !app.state.store) return;
    var storedAll = app.readAllStored();
    storedAll[app.state.customerId] = app.state.store;
    app.writeAllStored(storedAll);
  };

  app.addLogEntry = function (entry) {
    if (!app.state.store) return;

    var nextEntry = app.clone(entry) || {};
    if (!nextEntry.id) nextEntry.id = 'LOG-' + String(Date.now());
    if (!nextEntry.at) nextEntry.at = new Date().toISOString().slice(0, 16);
    if (!nextEntry.type) nextEntry.type = 'info';
    if (!nextEntry.actor) nextEntry.actor = 'Admin';
    if (!nextEntry.message) nextEntry.message = '操作已记录';

    app.state.store.logs = [nextEntry].concat(app.state.store.logs || []);
    app.persistStore();
  };

  app.openConfirm = function (opts) {
    var modalEl = document.getElementById('customerConfirmDialog');
    if (!modalEl) return;

    app.state.pendingConfirm = opts || null;

    var titleEl = document.getElementById('customerConfirmTitle');
    var descEl = document.getElementById('customerConfirmDesc');
    var okBtn = document.getElementById('customerConfirmOkBtn');
    var cancelBtn = document.getElementById('customerConfirmCancelBtn');

    if (titleEl) titleEl.textContent = String((opts && opts.title) || '确认操作');
    if (descEl) descEl.textContent = String((opts && opts.desc) || '请确认是否继续。');
    if (okBtn) okBtn.textContent = String((opts && opts.okText) || '确认');
    if (cancelBtn) cancelBtn.textContent = String((opts && opts.cancelText) || '取消');

    app.openBackdropModal(modalEl, opts && opts.triggerEl);
  };

  app.closeConfirm = function () {
    app.closeBackdropModal(document.getElementById('customerConfirmDialog'));
    app.state.pendingConfirm = null;
  };

  app.requestTabChange = function (nextTabKey, triggerEl) {
    if (app.state.activeTab === nextTabKey) return;

    if (!app.state.isEditing || !app.isBasicFormDirty || !app.isBasicFormDirty()) {
      app.setActiveTab(nextTabKey);
      return;
    }

    app.openConfirm({
      title: '放弃未保存的修改？',
      desc: '你正在编辑基础信息。切换页面会丢失当前修改。',
      okText: '放弃并切换',
      cancelText: '继续编辑',
      triggerEl: triggerEl,
      onOk: function () {
        if (app.state.store && app.state.store.customer && app.fillBasicForm) {
          app.fillBasicForm(app.state.store.customer);
        }
        if (app.setFormEditing) {
          app.setFormEditing(false);
        }
        app.setActiveTab(nextTabKey);
        app.closeConfirm();
      },
    });
  };

  app.populateSelectOptions = function (selectId, options, placeholder) {
    var select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '';

    var placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder || '请选择';
    select.appendChild(placeholderOption);

    (options || []).forEach(function (option) {
      var element = document.createElement('option');
      element.value = String(option.value || '');
      element.textContent = String(option.label || option.value || '');
      select.appendChild(element);
    });
  };

  app.populateDetailSelects = function () {
    var detail = app.getDetailConfig();
    app.populateSelectOptions(
      'customerRelationFieldType',
      Array.isArray(detail.relationTypes) ? detail.relationTypes : [],
      '请选择关系'
    );
    app.populateSelectOptions(
      'customerCommFieldType',
      Array.isArray(detail.commTypes) ? detail.commTypes : [],
      '请选择渠道'
    );
    app.populateSelectOptions(
      'customerCommFieldVisibility',
      Array.isArray(detail.visibilityOptions) ? detail.visibilityOptions : [],
      '请选择可见范围'
    );
  };

  app.initConfirmDialog = function () {
    var modalEl = document.getElementById('customerConfirmDialog');
    if (!modalEl) return;

    app.setupModalDismiss(modalEl, ['customerConfirmCloseBtn', 'customerConfirmCancelBtn']);

    var okBtn = document.getElementById('customerConfirmOkBtn');
    if (!okBtn) return;

    okBtn.addEventListener('click', function () {
      var pending = app.state.pendingConfirm;
      if (pending && typeof pending.onOk === 'function') pending.onOk();
      else app.closeConfirm();
    });
  };

  app.init = function () {
    if (app.state.isInitialized) return;
    app.state.isInitialized = true;

    var params = new URLSearchParams(window.location.search || '');
    var id = params.get('id');

    app.state.customerId = String(id || '').trim();
    app.state.store = app.state.customerId ? app.loadStore(app.state.customerId) : null;

    var config = app.getConfig();
    app.populateSelectOptions('customerFieldGroup', Array.isArray(config.GROUPS) ? config.GROUPS : [], '请选择 Group');
    app.populateSelectOptions('customerFieldOwner', Array.isArray(config.OWNERS) ? config.OWNERS : [], '请选择负责人');
    app.populateDetailSelects();
    app.initConfirmDialog();
    app.runInitializers();
    app.setActiveTab(app.state.activeTab);
  };
})();
