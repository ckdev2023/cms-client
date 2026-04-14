(function () {
  'use strict';

  var root = typeof window !== 'undefined' ? window : globalThis;
  var didBoot = false;

  function toText(value) {
    return String(value == null ? '' : value).trim();
  }

  function normalizeText(value) {
    return toText(value).toLowerCase();
  }

  function toNumber(value) {
    var next = Number(value);
    return Number.isFinite(next) ? next : 0;
  }

  function getBmvProfile(customer) {
    var profile = customer && customer.bmvProfile;
    return profile && typeof profile === 'object' ? profile : null;
  }

  function resolveBmvIntakeStage(profile) {
    var item = profile || {};
    if (String(item.signStatus || '') === 'signed') return 'ready';
    if (String(item.quoteStatus || '') === 'generated' || String(item.quoteStatus || '') === 'confirmed') return 'contract_pending';
    if (String(item.questionnaireStatus || '') === 'returned') return 'quote_pending';
    return 'questionnaire_pending';
  }

  function getBmvIntakeLabel(profile) {
    var stage = resolveBmvIntakeStage(profile);
    if (stage === 'ready') return '可建案';
    if (stage === 'contract_pending') return '待签约';
    if (stage === 'quote_pending') return '报价待确认';
    return '问卷准备中';
  }

  var utils = {
    buildCreateCaseUrl: function (customer, mode) {
      var item = customer || {};
      var customerId = toText(item.id);
      if (!customerId) return '../case/create.html';

      var url = '../case/create.html?customer_id=' + encodeURIComponent(customerId);
      if (item.group) url += '&group=' + encodeURIComponent(toText(item.group));
      url += '&mode=' + encodeURIComponent(toText(mode) || 'single');
      return url;
    },
    canCreateCaseFromCustomer: function (customer) {
      return Boolean(customer) && (!getBmvProfile(customer) || String(getBmvProfile(customer).signStatus || '') === 'signed');
    },
    getCreateCaseBlockedMessage: function (customer) {
      if (!customer) return '请先选择客户';
      return utils.canCreateCaseFromCustomer(customer) ? '' : '经营管理签需先完成签约';
    },
    buildBmvListTags: function (customer) {
      var profile = getBmvProfile(customer);
      if (!profile) return [];
      return ['经营管理签', getBmvIntakeLabel(profile)];
    },
    buildCustomerSearchText: function (customer, groupLabel) {
      return [
        customer && customer.displayName,
        customer && customer.legalName,
        customer && customer.kana,
        customer && customer.phone,
        customer && customer.email,
        customer && customer.referrer,
        groupLabel,
      ]
        .concat(utils.buildBmvListTags(customer))
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
    },
    buildFilterState: function (input) {
      var state = input || {};
      return {
        scope: toText(state.scope) || 'mine',
        search: normalizeText(state.search),
        group: toText(state.group),
        owner: toText(state.owner),
        activeCases: toText(state.activeCases),
      };
    },
    buildViewer: function (viewer) {
      var next = viewer || {};
      return {
        role: toText(next.role) || 'owner',
        owner: toText(next.owner),
        group: toText(next.group),
        label: toText(next.label),
      };
    },
    buildRowMeta: function (input) {
      var row = input || {};
      return {
        kind: toText(row.rowKind || row.kind) || 'customer',
        id: toText(row.customerId || row.id),
        group: toText(row.customerGroup || row.group),
        owner: toText(row.customerOwner || row.owner),
        activeCases: toNumber(row.activeCases),
        search: normalizeText(row.customerSearch || row.search),
      };
    },
    matchesFilters: function (meta, filters, viewer) {
      var row = utils.buildRowMeta(meta);
      var state = utils.buildFilterState(filters);
      var currentViewer = utils.buildViewer(viewer);

      if (state.scope === 'mine' && currentViewer.owner && row.owner !== currentViewer.owner) return false;
      if (state.scope === 'group' && currentViewer.group && row.group !== currentViewer.group) return false;
      if (state.group && row.group !== state.group) return false;
      if (state.owner && row.owner !== state.owner) return false;
      if (state.activeCases === 'has' && row.activeCases < 1) return false;
      if (state.activeCases === 'none' && row.activeCases > 0) return false;
      if (state.search && row.search.indexOf(state.search) === -1) return false;

      return true;
    },
    deriveOverviewStats: function (rows, viewer) {
      var currentViewer = utils.buildViewer(viewer);
      return (rows || []).reduce(
        function (acc, item) {
          var row = utils.buildRowMeta(item);
          if (row.kind !== 'customer') return acc;
          acc.total += 1;
          if (currentViewer.owner && row.owner === currentViewer.owner) acc.mine += 1;
          if (currentViewer.group && row.group === currentViewer.group) acc.group += 1;
          if (row.activeCases > 0) acc.active += 1;
          else acc.noActive += 1;
          return acc;
        },
        { total: 0, mine: 0, group: 0, active: 0, noActive: 0 },
      );
    },
    readStoredCustomers: function (storage, storageKey) {
      if (!storage || typeof storage.getItem !== 'function') return {};
      try {
        var raw = storage.getItem(storageKey || 'gyosei_os_customer_detail_store_v1');
        var parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        return {};
      }
    },
  };

  root.CustomerPageUtils = utils;

  function boot() {
    if (didBoot) return;
    var config = root.CustomerConfig;
    var modal = root.CustomerModal;
    var drafts = root.CustomerDrafts;
    var bulk = root.CustomerBulkActions;

    if (!config || !modal || !drafts || !bulk) {
      return;
    }

    didBoot = true;

    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');

    var showToast = ({ title, desc }) => {
      toastTitle.textContent = title;
      toastDesc.textContent = desc;
      toastEl.classList.remove('hidden');
      window.clearTimeout(showToast._t);
      showToast._t = window.setTimeout(() => toastEl.classList.add('hidden'), 2200);
    };

    modal.setup();
    bulk.setup(showToast);

    var createBtn = document.getElementById('createCustomerBtn');
    var saveDraftBtn = document.getElementById('saveDraftBtn');
    var customersTbody = document.querySelector('table.apple-table tbody');
    var searchInput = document.getElementById('customerSearchInput');
    var groupFilter = document.getElementById('customerGroupFilter');
    var ownerFilter = document.getElementById('customerOwnerFilter');
    var activeCasesFilter = document.getElementById('customerActiveCasesFilter');
    var filterSummary = document.getElementById('customerFilterSummary');
    var paginationSummary = document.getElementById('customerPaginationSummary');
    var emptyStateRow = document.getElementById('customerEmptyState');
    var customerMineCount = document.getElementById('customerMineCount');
    var customerGroupCount = document.getElementById('customerGroupCount');
    var customerActiveCount = document.getElementById('customerActiveCount'), customerNoActiveCount = document.getElementById('customerNoActiveCount');
    var scopeBtns = Array.from(document.querySelectorAll('[data-scope-btn]'));
    var viewer = utils.buildViewer(config.CURRENT_VIEWER);
    var filterState = utils.buildFilterState({ scope: 'mine' });

    var setScope = function (scope) {
      filterState.scope = toText(scope) || 'mine';
      scopeBtns.forEach(function (btn) {
        var isActive = btn.getAttribute('data-scope-btn') === filterState.scope;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
      });
    };

    var getAllRows = function () {
      return Array.from(document.querySelectorAll('[data-customer-row]'));
    };

    var setText = function (row, selector, value) {
      var el = row.querySelector(selector);
      if (el) el.textContent = value;
    };

    var getCustomerDisplayName = function (customer) {
      return toText(customer && (customer.displayName || customer.legalName || customer.id));
    };

    var mergeCustomer = function (base, override) {
      if (!base && !override) return null;
      var next = Object.assign({}, base || {}, override || {});
      next.cases = Object.assign({}, (base && base.cases) || {}, (override && override.cases) || {});
      next.lastContact = Object.assign({}, (base && base.lastContact) || {}, (override && override.lastContact) || {});
      if ((base && base.bmvProfile) || (override && override.bmvProfile)) {
        next.bmvProfile = Object.assign({}, (base && base.bmvProfile) || {}, (override && override.bmvProfile) || {});
      }
      return next;
    };

    var getStoredCustomers = function () {
      return utils.readStoredCustomers(root.localStorage, config.DETAIL_STORAGE_KEY);
    };

    var getCreateCaseUrl = function (customer) {
      return utils.buildCreateCaseUrl(customer, 'single');
    };

    var syncCustomerRow = function (row, customer) {
      if (!row || !customer) return;

      var searchText = utils.buildCustomerSearchText(customer, config.GROUP_LABEL_MAP[customer.group] || customer.group);
      var bmvTags = utils.buildBmvListTags(customer);

      row.dataset.customerGroup = toText(customer.group);
      row.dataset.customerOwner = toText(customer.owner);
      row.dataset.activeCases = String(toNumber(customer.cases && customer.cases.active));
      row.dataset.customerSearch = searchText;

      setText(row, '[data-customer-display-name]', getCustomerDisplayName(customer));
      setText(row, '[data-customer-meta]', toText(customer.id) + ' · ' + toText(customer.nationality || '—'));
      setText(row, '[data-customer-contact]', toText(customer.phone || '—') + ' · ' + toText(customer.email || '—'));
      setText(
        row,
        '[data-customer-cases-summary]',
        '累计 ' + String(toNumber(customer.cases && customer.cases.total)) + ' · 活跃 ' + String(toNumber(customer.cases && customer.cases.active)),
      );
      setText(row, '[data-customer-last-contact-date]', toText(customer.lastContact && customer.lastContact.date) || '—');
      setText(row, '[data-customer-last-contact-channel]', toText(customer.lastContact && customer.lastContact.channel) || '—');
      setText(row, '[data-customer-referrer]', toText(customer.referrer) || '—');
      setText(row, '[data-customer-group-label]', config.GROUP_LABEL_MAP[customer.group] || toText(customer.group) || '—');

      var bmvWrap = row.querySelector('[data-customer-bmv-tags]');
      if (bmvWrap) {
        bmvWrap.innerHTML = '';
        bmvTags.forEach(function (tag, index) {
          var chip = document.createElement('span');
          chip.className = index === 0 ? 'chip bg-[rgba(0,113,227,0.08)] border-[rgba(0,113,227,0.18)] text-[var(--apple-blue)]' : 'chip';
          chip.textContent = tag;
          bmvWrap.appendChild(chip);
        });
        bmvWrap.classList.toggle('hidden', bmvTags.length === 0);
      }

      var createBtn = row.querySelector('[data-action="quick-create-case"]');
      if (createBtn) {
        var blocked = utils.getCreateCaseBlockedMessage(customer);
        createBtn.dataset.customerId = toText(customer.id);
        createBtn.dataset.customerGroup = toText(customer.group);
        createBtn.dataset.navigate = blocked ? '' : getCreateCaseUrl(customer);
        createBtn.dataset.disabledReason = blocked;
        createBtn.setAttribute('aria-disabled', blocked ? 'true' : 'false');
        createBtn.classList.toggle('opacity-40', Boolean(blocked));
        createBtn.classList.toggle('cursor-not-allowed', Boolean(blocked));
        createBtn.title = blocked || '从该客户开始办案';
        createBtn.setAttribute('aria-label', blocked || '从该客户开始办案');
      }
    };

    var syncRowsFromStore = function () {
      var storedCustomers = getStoredCustomers();
      var baseMap = {};
      (config.CUSTOMERS || []).forEach(function (customer) {
        baseMap[customer.id] = customer;
      });

      getAllRows().forEach(function (row) {
        if (row.dataset.rowKind !== 'customer') return;
        var customerId = row.dataset.customerId;
        var storedStore = customerId && storedCustomers[customerId] ? storedCustomers[customerId] : null;
        var mergedCustomer = mergeCustomer(baseMap[customerId], storedStore && storedStore.customer);
        syncCustomerRow(row, mergedCustomer);
      });
    };

    var updateCounters = function (rows) {
      var stats = utils.deriveOverviewStats(rows.map(function (row) { return utils.buildRowMeta(row.dataset); }), viewer);
      if (customerMineCount) customerMineCount.textContent = String(stats.mine);
      if (customerGroupCount) customerGroupCount.textContent = String(stats.group);
      if (customerActiveCount) customerActiveCount.textContent = String(stats.active);
      if (customerNoActiveCount) customerNoActiveCount.textContent = String(stats.noActive);
    };

    var updateSummary = function (visibleRows, allRows) {
      var scopeLabels = { mine: '我的', group: '本组', all: '全所' };
      var total = visibleRows.length;
      var totalAll = allRows.length;
      var parts = ['当前查看：' + (scopeLabels[filterState.scope] || '我的') + '客户', total + ' 位'];
      if (filterState.search) parts.push('搜索结果');
      if (filterSummary) filterSummary.textContent = parts.join(' · ');
      if (paginationSummary) {
        paginationSummary.textContent = total === 0 ? '显示 0 条，共 ' + String(totalAll) + ' 条' : '显示 1 - ' + String(total) + ' 条，共 ' + String(totalAll) + ' 条';
      }
      if (emptyStateRow) emptyStateRow.classList.toggle('hidden', total > 0);
    };

    var clearHiddenSelections = function () {
      Array.from(document.querySelectorAll('input[data-customer-select]')).forEach(function (box) {
        var row = box.closest('tr');
        if (row && (row.hidden || row.classList.contains('hidden'))) box.checked = false;
      });
    };

    var applyFilters = function () {
      syncRowsFromStore();

      filterState.search = normalizeText(searchInput && searchInput.value);
      filterState.group = toText(groupFilter && groupFilter.value);
      filterState.owner = toText(ownerFilter && ownerFilter.value);
      filterState.activeCases = toText(activeCasesFilter && activeCasesFilter.value);

      var allRows = getAllRows();
      var visibleRows = [];

      allRows.forEach(function (row) {
        var isVisible = utils.matchesFilters(row.dataset, filterState, viewer);
        row.hidden = !isVisible;
        if (isVisible) visibleRows.push(row);
      });

      clearHiddenSelections();
      updateCounters(allRows.filter(function (row) { return row.dataset.rowKind === 'customer'; }));
      updateSummary(visibleRows, allRows);
      bulk.updateBulkState();
    };

    createBtn.addEventListener('click', () => {
      if (modal.currentDraftId) {
        drafts.removeDraft(modal.currentDraftId);
        var row = document.getElementById(`${config.DRAFT_ROW_ID_PREFIX}${modal.currentDraftId}`);
        if (row) row.remove();
        modal.currentDraftId = null;
      }
      showToast(config.TOAST.customerCreated);
      modal.closeModal();
      applyFilters();
    });

    saveDraftBtn.addEventListener('click', () => {
      var state = modal.serializeState();
      var draftId = modal.currentDraftId ?? `d_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      var name = state.legalName?.trim() || '未命名';
      var contact = state.phone?.trim() || state.email?.trim() || '—';
      var draft = {
        id: draftId,
        status: '草稿',
        updatedAt: Date.now(),
        updatedAtLabel: drafts.getNowLabel(),
        displayName: name,
        displayContact: contact,
        state,
      };
      drafts.upsertDraft(draft);
      drafts.renderDraftRow(draft);
      modal.currentDraftId = draftId;
      showToast(config.TOAST.draftSaved);
      modal.closeModal();
      applyFilters();
    });

    if (customersTbody) {
      customersTbody.addEventListener('click', (e) => {
        var btn = e.target.closest('[data-action="resume-draft"]');
        if (btn) {
          var draftId = btn.getAttribute('data-draft-id');
          if (!draftId) return;
          var draft = drafts.getDrafts().find((d) => d.id === draftId);
          if (!draft) return;
          modal.currentDraftId = draftId;
          modal.applyState(draft.state);
          modal.openModal();
          showToast(config.TOAST.draftLoaded);
          return;
        }

        var quickCreateBtn = e.target.closest('[data-action="quick-create-case"]');
        if (quickCreateBtn) {
          if (quickCreateBtn.getAttribute('aria-disabled') === 'true') {
            showToast({ title: '无法建案', desc: quickCreateBtn.getAttribute('data-disabled-reason') || '经营管理签需先完成签约' });
            return;
          }
          var url = quickCreateBtn.getAttribute('data-navigate');
          if (url) {
            root.location.href = url;
          }
          return;
        }

        var caseToggle = e.target.closest('[data-case-tags-toggle]');
        if (!caseToggle) return;
        var container = caseToggle.parentElement;
        var extraTags = container?.querySelector('[data-case-tags-extra]');
        if (!extraTags) return;

        var isExpanded = caseToggle.getAttribute('aria-expanded') === 'true';
        extraTags.classList.toggle('hidden', isExpanded);
        extraTags.classList.toggle('flex', !isExpanded);
        caseToggle.setAttribute('aria-expanded', String(!isExpanded));
        caseToggle.textContent = isExpanded ? `+${caseToggle.getAttribute('data-more-count') || '0'}` : '收起';
      });
    }

    if (root.location.hash === '#new') {
      modal.currentDraftId = null;
      modal.resetForm();
      modal.openModal();
    }

    scopeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        setScope(btn.getAttribute('data-scope-btn'));
        applyFilters();
      });
    });

    [searchInput, groupFilter, ownerFilter, activeCasesFilter].forEach(function (field) {
      if (!field) return;
      field.addEventListener('input', applyFilters);
      field.addEventListener('change', applyFilters);
    });

    document.addEventListener('click', (e) => {
      var resetBtn = e.target.closest('[data-action="reset-filters"]');
      if (!resetBtn) return;
      var filtersContainer = resetBtn.closest('.flex.flex-col');
      if (!filtersContainer) return;
      filtersContainer
        .querySelectorAll('select')
        .forEach((sel) => { sel.selectedIndex = 0; });
      var searchInput = filtersContainer.querySelector('.search-input');
      if (searchInput) searchInput.value = '';
      setScope('mine');
      applyFilters();
    });

    modal.updateCreateEnabled();
    drafts.renderAllDrafts();
    setScope('mine');
    syncRowsFromStore();
    applyFilters();
    bulk.updateBulkState();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('prototype:fragments-ready', boot);

    if (root.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
      boot();
    }
  }
})();
