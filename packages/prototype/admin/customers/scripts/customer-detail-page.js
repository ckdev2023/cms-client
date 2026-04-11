(function () {
  'use strict';

  var STORAGE_KEY = 'gyosei_os_customer_detail_store_v1';

  var state = {
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
  };

  function $$(sel) {
    return Array.prototype.slice.call(document.querySelectorAll(sel));
  }

  function $(sel) {
    return document.querySelector(sel);
  }

  function safeJsonParse(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (e) {
      return fallback;
    }
  }

  function clone(value) {
    return safeJsonParse(JSON.stringify(value || null), null);
  }

  function setText(sel, value) {
    var els = $$(sel);
    els.forEach(function (el) {
      el.textContent = value;
    });
  }

  function setValue(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.value = value == null ? '' : String(value);
  }

  function getValue(id) {
    var el = document.getElementById(id);
    if (!el) return '';
    return String(el.value || '');
  }

  function setDisabled(el, disabled) {
    if (!el) return;
    if (disabled) {
      el.setAttribute('disabled', 'true');
      el.setAttribute('aria-disabled', 'true');
      el.classList.add('opacity-60', 'cursor-not-allowed');
    } else {
      el.removeAttribute('disabled');
      el.setAttribute('aria-disabled', 'false');
      el.classList.remove('opacity-60', 'cursor-not-allowed');
    }
  }

  function setVisible(el, isVisible) {
    if (!el) return;
    el.classList.toggle('hidden', !isVisible);
  }

  function showToast(opts) {
    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');
    if (!toastEl || !toastTitle || !toastDesc) return;
    toastTitle.textContent = String((opts && opts.title) || '操作已完成');
    toastDesc.textContent = String((opts && opts.desc) || '');
    toastEl.classList.remove('hidden');
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(function () {
      toastEl.classList.add('hidden');
    }, 2200);
  }

  function openBackdropModal(modalEl, triggerEl) {
    if (!modalEl) return;
    state.lastFocusEl = triggerEl || document.activeElement;
    modalEl.classList.add('show');
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    window.setTimeout(function () {
      var first = modalEl.querySelector('input, select, textarea, button');
      if (first && typeof first.focus === 'function') first.focus();
    }, 0);
  }

  function closeBackdropModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove('show');
    modalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    var last = state.lastFocusEl;
    state.lastFocusEl = null;
    if (last && typeof last.focus === 'function') last.focus();
  }

  function setupModalDismiss(modalEl, closeBtnIds) {
    if (!modalEl) return;
    (closeBtnIds || []).forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        closeBackdropModal(modalEl);
      });
    });
    modalEl.addEventListener('click', function (e) {
      if (e.target === modalEl) closeBackdropModal(modalEl);
    });
    document.addEventListener('keydown', function (e) {
      if (!modalEl.classList.contains('show')) return;
      if (e.key === 'Escape') closeBackdropModal(modalEl);
    });
  }

  function setActiveTab(key) {
    state.activeTab = key;
    var tabs = $$('[data-customer-tab]');
    var panels = $$('[data-customer-panel]');

    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-customer-tab') === key;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
      tab.classList.toggle('border-[var(--apple-blue)]', isActive);
      tab.classList.toggle('border-transparent', !isActive);
      tab.classList.toggle('text-[var(--apple-text-main)]', isActive);
      tab.classList.toggle('text-[var(--muted-2)]', !isActive);
    });

    panels.forEach(function (panel) {
      var isPanelActive = panel.getAttribute('data-customer-panel') === key;
      panel.classList.toggle('hidden', !isPanelActive);
    });
  }

  function getConfig() {
    return window.CustomerConfig || {};
  }

  function findCustomerById(customerId) {
    var config = getConfig();
    var customers = Array.isArray(config.CUSTOMERS) ? config.CUSTOMERS : [];
    return (
      customers.find(function (c) {
        return String(c && c.id) === String(customerId || '');
      }) || null
    );
  }

  function getGroupLabel(value) {
    var config = getConfig();
    var map = config.GROUP_LABEL_MAP || {};
    return String(map && map[value] ? map[value] : value || '—');
  }

  function getOwnerLabel(value) {
    var config = getConfig();
    var owners = Array.isArray(config.OWNERS) ? config.OWNERS : [];
    var owner = owners.find(function (o) {
      return String(o && o.value) === String(value || '');
    });
    return owner ? String(owner.label || value) : value ? String(value) : '未指派';
  }

  function getOwnerInitials(value) {
    var config = getConfig();
    var owners = Array.isArray(config.OWNERS) ? config.OWNERS : [];
    var owner = owners.find(function (o) {
      return String(o && o.value) === String(value || '');
    });
    return owner ? String(owner.initials || '') : '';
  }

  function getOwnerColorClass(value) {
    var config = getConfig();
    var owners = Array.isArray(config.OWNERS) ? config.OWNERS : [];
    var owner = owners.find(function (o) {
      return String(o && o.value) === String(value || '');
    });
    if (!owner) return { bg: 'bg-[var(--surface)]', text: 'text-[var(--text)]' };
    return { bg: owner.bg ? String(owner.bg) : 'bg-[var(--surface)]', text: owner.text ? String(owner.text) : 'text-[var(--text)]' };
  }

  function getDetailConfig() {
    var config = getConfig();
    return config.DETAIL || {};
  }

  function getRelationTypeLabel(value) {
    var detail = getDetailConfig();
    var options = Array.isArray(detail.relationTypes) ? detail.relationTypes : [];
    var found = options.find(function (o) { return String(o.value) === String(value || ''); });
    return found ? String(found.label || value) : String(value || '—');
  }

  function getCommTypeLabel(value) {
    var detail = getDetailConfig();
    var options = Array.isArray(detail.commTypes) ? detail.commTypes : [];
    var found = options.find(function (o) { return String(o.value) === String(value || ''); });
    return found ? String(found.label || value) : String(value || '—');
  }

  function getVisibilityLabel(value) {
    var detail = getDetailConfig();
    var options = Array.isArray(detail.visibilityOptions) ? detail.visibilityOptions : [];
    var found = options.find(function (o) { return String(o.value) === String(value || ''); });
    return found ? String(found.label || value) : String(value || '—');
  }

  function parseTags(value) {
    var raw = String(value || '').trim();
    if (!raw) return [];
    return raw
      .split(',')
      .map(function (t) { return String(t || '').trim(); })
      .filter(function (t) { return Boolean(t); });
  }

  function uniq(arr) {
    var map = {};
    var out = [];
    (arr || []).forEach(function (x) {
      var key = String(x || '').trim();
      if (!key) return;
      if (map[key]) return;
      map[key] = true;
      out.push(key);
    });
    return out;
  }

  function formatContact(contact) {
    if (!contact) return '—';
    var date = contact.date ? String(contact.date) : '';
    var channel = contact.channel ? String(contact.channel) : '';
    if (!date && !channel) return '—';
    if (date && channel) return date + ' · ' + channel;
    return date || channel;
  }

  function formatDateTime(iso) {
    var v = String(iso || '').trim();
    if (!v) return '—';
    return v.replace('T', ' ');
  }

  function toDateOnly(isoOrDate) {
    var v = String(isoOrDate || '').trim();
    if (!v) return '';
    var idx = v.indexOf('T');
    return idx >= 0 ? v.slice(0, idx) : v;
  }

  function buildDefaultCases(customer) {
    if (!customer) return [];
    var tags = customer.cases && Array.isArray(customer.cases.tags) ? customer.cases.tags : [];
    var total = customer.cases && typeof customer.cases.total === 'number' ? customer.cases.total : tags.length;
    var active = customer.cases && typeof customer.cases.active === 'number' ? customer.cases.active : Math.min(total, 1);
    if (!total) return [];

    var stageActive = ['资料收集中', '提交前确认', '办理中', '补正处理中'];
    var owners = ['山田', '佐藤', '鈴木'];

    var cases = [];
    for (var i = 0; i < total; i += 1) {
      var status = i < active ? 'active' : 'archived';
      var name = tags[i] ? String(tags[i]) : '案件 ' + String(i + 1);
      var id = 'C-2026-' + String(100 + i);
      var stage = status === 'active' ? stageActive[i % stageActive.length] : '已归档';
      var owner = owners[i % owners.length];
      var updatedAt = '2026-03-' + String(30 - i).padStart(2, '0');
      cases.push({ id: id, name: name, status: status, stage: stage, owner: owner, createdAt: updatedAt, updatedAt: updatedAt });
    }
    return cases;
  }

  function readAllStored() {
    var raw = window.localStorage ? window.localStorage.getItem(STORAGE_KEY) : '';
    var data = safeJsonParse(raw || '{}', {});
    if (!data || typeof data !== 'object') return {};
    return data;
  }

  function writeAllStored(all) {
    if (!window.localStorage) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all || {}));
    } catch (e) {
      return;
    }
  }

  function loadStore(customerId) {
    var base = customerId ? findCustomerById(customerId) : null;
    var detail = getDetailConfig();

    var seedCustomer = base ? clone(base) : null;
    var seedCases = seedCustomer ? buildDefaultCases(seedCustomer) : [];
    var seedRelations = [];
    var seedComms = [];
    var seedLogs = [];

    if (seedCustomer && detail && typeof detail === 'object') {
      var casesByCustomerId = detail.casesByCustomerId || {};
      var relationsByCustomerId = detail.relationsByCustomerId || {};
      var commsByCustomerId = detail.commsByCustomerId || {};
      var logsByCustomerId = detail.logsByCustomerId || {};
      if (Array.isArray(casesByCustomerId[customerId])) seedCases = clone(casesByCustomerId[customerId]) || [];
      if (Array.isArray(relationsByCustomerId[customerId])) seedRelations = clone(relationsByCustomerId[customerId]) || [];
      if (Array.isArray(commsByCustomerId[customerId])) seedComms = clone(commsByCustomerId[customerId]) || [];
      if (Array.isArray(logsByCustomerId[customerId])) seedLogs = clone(logsByCustomerId[customerId]) || [];
    }

    var storedAll = readAllStored();
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
  }

  function persistStore() {
    if (!state.customerId || !state.store) return;
    var storedAll = readAllStored();
    storedAll[state.customerId] = state.store;
    writeAllStored(storedAll);
  }

  function addLogEntry(entry) {
    if (!state.store) return;
    var e = clone(entry) || {};
    if (!e.id) e.id = 'LOG-' + String(Date.now());
    if (!e.at) e.at = new Date().toISOString().slice(0, 16);
    if (!e.type) e.type = 'info';
    if (!e.actor) e.actor = 'Admin';
    if (!e.message) e.message = '操作已记录';
    state.store.logs = [e].concat(state.store.logs || []);
    persistStore();
  }

  function isBasicFormDirty() {
    if (!state.isEditing) return false;
    if (!state.editSnapshot) return false;
    var current = getBasicFormSnapshot();
    return JSON.stringify(current) !== JSON.stringify(state.editSnapshot);
  }

  function openConfirm(opts) {
    var modalEl = document.getElementById('customerConfirmDialog');
    if (!modalEl) return;
    state.pendingConfirm = opts || null;

    var titleEl = document.getElementById('customerConfirmTitle');
    var descEl = document.getElementById('customerConfirmDesc');
    var okBtn = document.getElementById('customerConfirmOkBtn');
    var cancelBtn = document.getElementById('customerConfirmCancelBtn');

    if (titleEl) titleEl.textContent = String((opts && opts.title) || '确认操作');
    if (descEl) descEl.textContent = String((opts && opts.desc) || '请确认是否继续。');
    if (okBtn) okBtn.textContent = String((opts && opts.okText) || '确认');
    if (cancelBtn) cancelBtn.textContent = String((opts && opts.cancelText) || '取消');

    openBackdropModal(modalEl, opts && opts.triggerEl);
  }

  function closeConfirm() {
    var modalEl = document.getElementById('customerConfirmDialog');
    closeBackdropModal(modalEl);
    state.pendingConfirm = null;
  }

  function requestTabChange(nextTabKey, triggerEl) {
    if (state.activeTab === nextTabKey) return;
    if (!state.isEditing || !isBasicFormDirty()) {
      setActiveTab(nextTabKey);
      return;
    }

    openConfirm({
      title: '放弃未保存的修改？',
      desc: '你正在编辑基础信息。切换页面会丢失当前修改。',
      okText: '放弃并切换',
      cancelText: '继续编辑',
      triggerEl: triggerEl,
      onOk: function () {
        if (!state.store || !state.store.customer) {
          setActiveTab(nextTabKey);
          closeConfirm();
          return;
        }
        fillBasicForm(state.store.customer);
        setFormEditing(false);
        setActiveTab(nextTabKey);
        closeConfirm();
      },
    });
  }

  function getCaseAnchorId(caseId) {
    return 'case-row-' + String(caseId || '').replace(/[^a-zA-Z0-9_-]/g, '');
  }

  function focusAndHighlight(el) {
    if (!el) return;
    var prefersReducedMotion = false;
    try {
      prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
      prefersReducedMotion = false;
    }
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-[var(--apple-blue)]', 'bg-[#eef2ff]');
    window.setTimeout(function () {
      el.classList.remove('ring-2', 'ring-[var(--apple-blue)]', 'bg-[#eef2ff]');
    }, 1400);
  }

  function navigateToCase(caseId) {
    requestTabChange('cases');
    window.setTimeout(function () {
      var row = document.getElementById(getCaseAnchorId(caseId));
      if (row) focusAndHighlight(row);
    }, 0);
  }

  function renderOverview() {
    var store = state.store;
    var cases = store && Array.isArray(store.cases) ? store.cases : [];
    var total = cases.length;
    var active = cases.filter(function (c) { return String(c.status) === 'active'; }).length;
    var archived = cases.filter(function (c) { return String(c.status) === 'archived'; }).length;

    setText('[data-cases-total]', String(total));
    setText('[data-cases-active]', String(active));
    setText('[data-cases-archived]', String(archived));

    var lastCaseAt = total ? (cases[0].updatedAt || cases[0].createdAt || '—') : '—';
    setText('[data-cases-last-created]', String(lastCaseAt));

    var summaryLink = $('[data-case-summary-link]');
    var moreToggle = $('[data-case-more-toggle]');

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
      navigateToCase(cases[0].id);
    };

    var remaining = Math.max(0, total - 1);
    if (moreToggle) {
      moreToggle.textContent = '+' + String(remaining);
      if (remaining === 0) {
        moreToggle.setAttribute('disabled', 'true');
      } else {
        moreToggle.removeAttribute('disabled');
      }
    }
  }

  function getFilteredCases() {
    var cases = state.store && Array.isArray(state.store.cases) ? state.store.cases : [];
    if (state.caseFilter === 'active') return cases.filter(function (c) { return String(c.status) === 'active'; });
    if (state.caseFilter === 'archived') return cases.filter(function (c) { return String(c.status) === 'archived'; });
    return cases.slice();
  }

  function renderCasesTable() {
    var tbody = $('[data-cases-table-body]');
    if (!tbody) return;

    tbody.innerHTML = '';

    var cases = getFilteredCases();
    if (!cases.length) {
      var trEmpty = document.createElement('tr');
      var tdEmpty = document.createElement('td');
      tdEmpty.colSpan = 6;
      tdEmpty.className = 'px-6 py-10 text-center text-[13px] text-[var(--muted-2)] font-semibold';
      tdEmpty.textContent = state.caseFilter === 'active' ? '暂无活跃案件' : state.caseFilter === 'archived' ? '暂无已归档案件' : '暂无关联案件';
      trEmpty.appendChild(tdEmpty);
      tbody.appendChild(trEmpty);
      return;
    }

    cases.forEach(function (caseItem) {
      var tr = document.createElement('tr');
      tr.id = getCaseAnchorId(caseItem.id);
      tr.setAttribute('data-case-id', caseItem.id);
      tr.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var tdId = document.createElement('td');
      tdId.className = 'px-4 py-3 font-extrabold text-[var(--apple-text-main)] whitespace-nowrap';
      tdId.textContent = caseItem.id;

      var tdName = document.createElement('td');
      tdName.className = 'px-4 py-3';
      var nameBtn = document.createElement('button');
      nameBtn.type = 'button';
      nameBtn.className = 'text-left font-extrabold text-[var(--apple-blue)] hover:underline';
      nameBtn.textContent = caseItem.name;
      nameBtn.addEventListener('click', function () {
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(caseItem.id);
      });
      tdName.appendChild(nameBtn);

      var tdType = document.createElement('td');
      tdType.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap hidden md:table-cell';
      tdType.textContent = caseItem.type || '—';

      var tdStage = document.createElement('td');
      tdStage.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      tdStage.innerHTML = '';
      var stageLine = document.createElement('div');
      stageLine.textContent = caseItem.stage || '—';
      var ownerLine = document.createElement('div');
      ownerLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      ownerLine.textContent = '主办：' + String(caseItem.owner || '—');
      tdStage.appendChild(stageLine);
      tdStage.appendChild(ownerLine);

      var tdStatus = document.createElement('td');
      tdStatus.className = 'px-4 py-3';
      var statusChip = document.createElement('span');
      statusChip.className = 'chip';
      statusChip.textContent = caseItem.status === 'active' ? '活跃' : '归档';
      tdStatus.appendChild(statusChip);

      var tdAction = document.createElement('td');
      tdAction.className = 'px-4 py-3';
      var actions = document.createElement('div');
      actions.className = 'table-actions';

      var openBtn = document.createElement('button');
      openBtn.type = 'button';
      openBtn.className = 'table-icon-btn row-quick-action';
      openBtn.setAttribute('aria-label', '打开案件');
      openBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8L13 15m-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h10a2 2 0 012 2v6"></path></svg>';
      openBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(String(caseItem.id || ''));
      });

      var toggleBtn = document.createElement('button');
      toggleBtn.type = 'button';
      toggleBtn.className = 'table-icon-btn row-quick-action';
      toggleBtn.setAttribute('aria-label', caseItem.status === 'active' ? '归档' : '恢复');
      toggleBtn.innerHTML =
        caseItem.status === 'active'
          ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7m16 0h-5m-6 0H4"></path></svg>'
          : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v16h16M8 16l3-3 2 2 5-5"></path></svg>';
      toggleBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var nextStatus = caseItem.status === 'active' ? 'archived' : 'active';
        openConfirm({
          title: nextStatus === 'archived' ? '归档案件？' : '恢复案件？',
          desc: '该操作仅为原型演示，会写入本地记录。',
          okText: nextStatus === 'archived' ? '归档' : '恢复',
          cancelText: '取消',
          triggerEl: toggleBtn,
          onOk: function () {
            if (!state.store) return;
            var id = String(caseItem.id || '');
            state.store.cases = (state.store.cases || []).map(function (c) {
              if (String(c.id) !== id) return c;
              var next = clone(c) || c;
              next.status = nextStatus;
              next.stage = nextStatus === 'archived' ? '已归档' : String(next.stage || '办理中').replace('已归档', '办理中');
              next.updatedAt = new Date().toISOString().slice(0, 10);
              return next;
            });
            persistStore();
            addLogEntry({
              type: 'case',
              actor: 'Admin',
              message: (nextStatus === 'archived' ? '归档案件：' : '恢复案件：') + String(caseItem.name || '') + '（' + String(caseItem.id || '') + '）',
              at: new Date().toISOString().slice(0, 16),
            });
            renderOverview();
            renderCasesTable();
            renderCasePopover();
            renderLogs();
            closeConfirm();
            showToast({ title: '已更新（示例）', desc: nextStatus === 'archived' ? '案件已归档' : '案件已恢复' });
          },
        });
      });

      actions.appendChild(openBtn);
      actions.appendChild(toggleBtn);
      tdAction.appendChild(actions);

      tr.addEventListener('click', function () {
        window.location.href = '../case/detail.html?id=' + encodeURIComponent(String(caseItem.id || ''));
      });

      var tdUpdatedAt2 = document.createElement('td');
      tdUpdatedAt2.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap hidden lg:table-cell';
      tdUpdatedAt2.textContent = caseItem.updatedAt || '—';

      tr.appendChild(tdId);
      tr.appendChild(tdName);
      tr.appendChild(tdType);
      tr.appendChild(tdStage);
      tr.appendChild(tdStatus);
      tr.appendChild(tdUpdatedAt2);
      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  function initCasePopover() {
    var store = state.store;
    var cases = store && Array.isArray(store.cases) ? store.cases : [];
    var moreToggle = $('[data-case-more-toggle]');
    var popover = document.getElementById('caseNamePopover');
    var backdrop = $('[data-case-more-backdrop]');
    var closeBtn = $('[data-case-more-close]');
    var list = $('[data-case-list]');
    var title = $('[data-case-popover-title]');

    if (!moreToggle || !popover || !backdrop || !closeBtn || !list) return;

    function isOpen() {
      return !popover.classList.contains('hidden');
    }

    function positionPopover() {
      var rect = moreToggle.getBoundingClientRect();
      var vw = window.innerWidth || document.documentElement.clientWidth;
      var vh = window.innerHeight || document.documentElement.clientHeight;

      popover.style.left = '16px';
      popover.style.top = '16px';

      var popoverWidth = popover.offsetWidth;
      var popoverHeight = popover.offsetHeight;

      var left = Math.min(Math.max(16, rect.left), vw - popoverWidth - 16);
      var top = rect.bottom + 8;
      if (top + popoverHeight > vh - 16) {
        top = rect.top - popoverHeight - 8;
      }
      top = Math.max(16, top);

      popover.style.left = left + 'px';
      popover.style.top = top + 'px';
    }

    function closePopover() {
      if (!isOpen()) return;
      setVisible(backdrop, false);
      setVisible(popover, false);
      moreToggle.setAttribute('aria-expanded', 'false');
      popover.setAttribute('aria-hidden', 'true');
      if (state.lastFocusEl && typeof state.lastFocusEl.focus === 'function') state.lastFocusEl.focus();
      state.lastFocusEl = null;
    }

    function openPopover() {
      if (isOpen()) return;
      state.lastFocusEl = document.activeElement;
      setVisible(backdrop, true);
      setVisible(popover, true);
      moreToggle.setAttribute('aria-expanded', 'true');
      popover.setAttribute('aria-hidden', 'false');
      positionPopover();
      var firstFocusable = popover.querySelector('button[data-case-jump]');
      if (firstFocusable) firstFocusable.focus();
    }

    function togglePopover() {
      if (isOpen()) closePopover();
      else openPopover();
    }

    state.casePopoverApi = {
      moreToggle: moreToggle,
      popover: popover,
      backdrop: backdrop,
      closeBtn: closeBtn,
      list: list,
      title: title,
      open: openPopover,
      close: closePopover,
      isOpen: isOpen,
      position: positionPopover,
    };

    moreToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      togglePopover();
    });

    closeBtn.addEventListener('click', function () {
      closePopover();
    });

    backdrop.addEventListener('click', function () {
      closePopover();
    });

    window.addEventListener('resize', function () {
      if (isOpen()) positionPopover();
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') closePopover();
    });

    document.addEventListener('click', function (e) {
      if (!isOpen()) return;
      var target = e.target;
      if (popover.contains(target)) return;
      if (target === moreToggle) return;
      closePopover();
    });

    renderCasePopover();
  }

  function renderCasePopover() {
    var api = state.casePopoverApi;
    if (!api) return;
    var cases = state.store && Array.isArray(state.store.cases) ? state.store.cases : [];
    if (api.title) api.title.textContent = '全部案件（' + String(cases.length) + '）';
    api.list.innerHTML = '';

    cases.forEach(function (caseItem) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'w-full text-left px-2 py-2 rounded-xl hover:bg-[var(--surface)] flex items-start justify-between gap-3';
      btn.setAttribute('data-case-jump', 'true');
      btn.setAttribute('data-case-id', String(caseItem.id || ''));

      var left = document.createElement('div');
      left.className = 'min-w-0';
      var name = document.createElement('div');
      name.className = 'text-[13px] font-extrabold text-[var(--apple-text-main)] truncate';
      name.textContent = String(caseItem.name || '—');
      var idLine = document.createElement('div');
      idLine.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      idLine.textContent = String(caseItem.id || '—');
      left.appendChild(name);
      left.appendChild(idLine);

      var right = document.createElement('div');
      right.className = 'shrink-0';
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = String(caseItem.status) === 'active' ? '活跃' : '归档';
      right.appendChild(chip);

      btn.appendChild(left);
      btn.appendChild(right);

      btn.addEventListener('click', function () {
        api.close();
        navigateToCase(caseItem.id);
      });

      api.list.appendChild(btn);
    });

    if (api.isOpen && api.isOpen()) api.position();
  }

  function syncCaseFilterUI() {
    var buttons = $$('[data-case-filter]');
    buttons.forEach(function (btn) {
      var key = btn.getAttribute('data-case-filter');
      var isActive = key === state.caseFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setCaseFilter(filter) {
    state.caseFilter = filter;
    syncCaseFilterUI();
    renderCasesTable();
  }

  function populateSelectOptions(selectId, options, placeholder) {
    var el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '';
    var placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = placeholder || '请选择';
    el.appendChild(placeholderOpt);

    (options || []).forEach(function (opt) {
      var o = document.createElement('option');
      o.value = String(opt.value || '');
      o.textContent = String(opt.label || opt.value || '');
      el.appendChild(o);
    });
  }

  function populateDetailSelects() {
    var detail = getDetailConfig();
    populateSelectOptions('customerRelationFieldType', Array.isArray(detail.relationTypes) ? detail.relationTypes : [], '请选择关系');
    populateSelectOptions('customerCommFieldType', Array.isArray(detail.commTypes) ? detail.commTypes : [], '请选择渠道');
    populateSelectOptions('customerCommFieldVisibility', Array.isArray(detail.visibilityOptions) ? detail.visibilityOptions : [], '请选择可见范围');
  }

  function setFormEditing(isEditing) {
    state.isEditing = isEditing;
    var ids = [
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
    ];
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.disabled = !isEditing;
      el.setAttribute('aria-disabled', isEditing ? 'false' : 'true');
      el.classList.toggle('bg-[var(--surface-2)]', !isEditing);
    });

    var editBtn = document.getElementById('customerEditToggleBtn');
    var saveBtn = document.getElementById('customerSaveBtn');
    var cancelBtn = document.getElementById('customerCancelBtn');
    var hint = document.getElementById('customerSaveHint');
    if (hint) hint.classList.add('hidden');
    if (editBtn) editBtn.classList.toggle('hidden', isEditing);
    if (saveBtn) saveBtn.classList.toggle('hidden', !isEditing);
    if (cancelBtn) cancelBtn.classList.toggle('hidden', !isEditing);

    if (isEditing) state.editSnapshot = getBasicFormSnapshot();
    else state.editSnapshot = null;
  }

  function fillBasicForm(customer) {
    if (!customer) return;
    setValue('customerFieldDisplayName', customer.displayName || '');
    setValue('customerFieldLegalName', customer.legalName || customer.displayName || '');
    setValue('customerFieldKana', customer.kana || '');
    setValue('customerFieldGender', customer.gender || '');
    setValue('customerFieldBirthDate', customer.birthDate || '');
    setValue('customerFieldNationality', customer.nationality || '');
    setValue('customerFieldPhone', customer.phone || '');
    setValue('customerFieldEmail', customer.email || '');
    setValue('customerFieldReferrer', customer.referrer || '');
    setValue('customerFieldGroup', customer.group || '');
    setValue('customerFieldOwner', customer.owner || '');
    setValue('customerFieldNote', customer.note || '');
  }

  function getBasicFormSnapshot() {
    return {
      displayName: getValue('customerFieldDisplayName'),
      legalName: getValue('customerFieldLegalName'),
      kana: getValue('customerFieldKana'),
      gender: getValue('customerFieldGender'),
      birthDate: getValue('customerFieldBirthDate'),
      nationality: getValue('customerFieldNationality'),
      phone: getValue('customerFieldPhone'),
      email: getValue('customerFieldEmail'),
      referrer: getValue('customerFieldReferrer'),
      group: getValue('customerFieldGroup'),
      owner: getValue('customerFieldOwner'),
      note: getValue('customerFieldNote'),
    };
  }

  function validateBasicForm(values) {
    var v = values || {};
    var legalName = String(v.legalName || '').trim();
    var nationality = String(v.nationality || '').trim();
    var phone = String(v.phone || '').trim();
    var email = String(v.email || '').trim();
    var group = String(v.group || '').trim();

    if (!legalName) return { ok: false, message: '请填写姓名（法定）', focusId: 'customerFieldLegalName' };
    if (!nationality) return { ok: false, message: '请填写国籍', focusId: 'customerFieldNationality' };
    if (!phone && !email) return { ok: false, message: '电话/邮箱至少填写一项', focusId: 'customerFieldPhone' };
    if (!group) return { ok: false, message: '请选择所属 Group', focusId: 'customerFieldGroup' };
    return { ok: true };
  }

  function applyHeader(customer) {
    var titleEl = document.getElementById('customerTitle');
    if (titleEl) titleEl.textContent = customer ? String(customer.displayName || '客户详情') : '客户详情';

    setText('[data-customer-id]', customer ? String(customer.id || '—') : '—');
    setText('[data-customer-name]', customer ? String(customer.displayName || '—') : '—');
    setText('[data-customer-group]', customer ? getGroupLabel(customer.group) : '—');
    setText('[data-customer-owner]', customer ? getOwnerLabel(customer.owner) : '未指派');
    setText('[data-customer-last-contact]', customer ? formatContact(customer.lastContact) : '—');

    var groupChip = $('[data-customer-group-chip]');
    if (groupChip) groupChip.textContent = customer ? getGroupLabel(customer.group) : '—';

    var ownerChip = $('[data-customer-owner-chip]');
    if (ownerChip) ownerChip.textContent = customer ? getOwnerLabel(customer.owner) : '未指派';

    var ownerBadge = document.getElementById('customerOwnerBadge');
    if (ownerBadge) {
      var initials = customer ? getOwnerInitials(customer.owner) : '';
      var color = customer ? getOwnerColorClass(customer.owner) : { bg: 'bg-[var(--surface)]', text: 'text-[var(--text)]' };
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
      var initials2 = avatar && avatar.initials ? String(avatar.initials) : customer && customer.displayName ? String(customer.displayName).slice(0, 1) : '客';
      var bg = avatar && avatar.bg ? String(avatar.bg) : 'bg-[var(--surface-2)]';
      var text = avatar && avatar.text ? String(avatar.text) : 'text-[var(--primary)]';
      avatarEl.className = 'w-12 h-12 rounded-full flex items-center justify-center font-extrabold flex-shrink-0 border border-[var(--border)] ' + bg + ' ' + text;
      avatarEl.textContent = initials2;
    }

    var breadcrumbName = $('[data-customer-breadcrumb]');
    if (breadcrumbName) breadcrumbName.textContent = customer ? String(customer.displayName || '客户详情') : '客户详情';
  }

  function buildCreateCaseUrl(customer, mode) {
    var customerId = customer ? String(customer.id || '') : '';
    if (!customerId) return '../case/create.html';
    var url = '../case/create.html?customer_id=' + encodeURIComponent(customerId);
    if (customer && customer.group) url += '&group=' + encodeURIComponent(String(customer.group));
    if (mode) url += '&mode=' + encodeURIComponent(String(mode));
    return url;
  }

  function renderRelationsTable() {
    var tbody = $('[data-customer-relations-body]');
    if (!tbody) return;

    tbody.innerHTML = '';

    var relations = state.store && Array.isArray(state.store.relations) ? state.store.relations : [];
    var q = String(state.relationsSearch || '').trim().toLowerCase();
    var filtered = relations.filter(function (r) {
      if (!q) return true;
      var hay = [
        r.name,
        r.kana,
        r.phone,
        r.email,
        (Array.isArray(r.tags) ? r.tags.join(' ') : ''),
        r.note,
      ]
        .join(' ')
        .toLowerCase();
      return hay.indexOf(q) >= 0;
    });

    setText('[data-relations-count]', String(filtered.length));

    var selectAll = document.getElementById('customerSelectAllRelations');
    if (selectAll) {
      if (!filtered.length) {
        selectAll.checked = false;
        selectAll.indeterminate = false;
        setDisabled(selectAll, true);
      } else {
        setDisabled(selectAll, false);
        var selectedCount = filtered.filter(function (r) { return Boolean(state.relationsSelected[String(r.id)]); }).length;
        selectAll.checked = selectedCount > 0 && selectedCount === filtered.length;
        selectAll.indeterminate = selectedCount > 0 && selectedCount < filtered.length;
      }
    }

    var batchBtn = document.getElementById('customerRelationsBatchCreateBtn');
    var anySelected = filtered.some(function (r) { return Boolean(state.relationsSelected[String(r.id)]); });
    setDisabled(batchBtn, !anySelected);

    if (!filtered.length) {
      var trEmpty = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 6;
      td.className = 'px-6 py-10';
      var wrap = document.createElement('div');
      wrap.className = 'flex flex-col items-center text-center';
      var icon = document.createElement('div');
      icon.className = 'w-14 h-14 rounded-2xl bg-[#fbfbfd] border border-[var(--border)] flex items-center justify-center text-[var(--muted-2)]';
      icon.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>';
      var t1 = document.createElement('div');
      t1.className = 'mt-4 text-[17px] font-semibold text-[var(--apple-text-main)]';
      t1.textContent = q ? '未找到匹配的关联人' : '暂无关联人';
      var t2 = document.createElement('div');
      t2.className = 'mt-2 text-[13px] text-[var(--apple-text-tert)] font-semibold max-w-md';
      t2.textContent = q ? '尝试更换关键词，或新增关联人。' : '先添加关键关系人，后续可基于选中关联人快速建案（示例）。';
      wrap.appendChild(icon);
      wrap.appendChild(t1);
      wrap.appendChild(t2);
      td.appendChild(wrap);
      trEmpty.appendChild(td);
      tbody.appendChild(trEmpty);
      return;
    }

    filtered.forEach(function (rel) {
      var tr = document.createElement('tr');
      tr.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var tdSel = document.createElement('td');
      tdSel.className = 'px-4 py-3';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'table-checkbox';
      cb.checked = Boolean(state.relationsSelected[String(rel.id)]);
      cb.setAttribute('aria-label', '选择关联人');
      cb.addEventListener('change', function () {
        state.relationsSelected[String(rel.id)] = cb.checked;
        renderRelationsTable();
      });
      tdSel.appendChild(cb);

      var tdName = document.createElement('td');
      tdName.className = 'px-4 py-3';
      var nameLine = document.createElement('div');
      nameLine.className = 'font-extrabold text-[var(--apple-text-main)]';
      nameLine.textContent = String(rel.name || '—');
      var sub = document.createElement('div');
      sub.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      sub.textContent = rel.kana ? String(rel.kana) : '—';
      tdName.appendChild(nameLine);
      tdName.appendChild(sub);

      var tdType = document.createElement('td');
      tdType.className = 'px-4 py-3 text-[var(--muted)] font-semibold';
      tdType.textContent = getRelationTypeLabel(rel.relationType);

      var tdContact = document.createElement('td');
      tdContact.className = 'px-4 py-3 text-[var(--muted)] font-semibold hidden md:table-cell';
      tdContact.innerHTML = '';
      var p = document.createElement('div');
      p.textContent = rel.phone ? String(rel.phone) : '—';
      var e = document.createElement('div');
      e.className = 'mt-0.5 text-[12px] text-[var(--apple-text-tert)] font-semibold';
      e.textContent = rel.email ? String(rel.email) : '—';
      tdContact.appendChild(p);
      tdContact.appendChild(e);

      var tdTags = document.createElement('td');
      tdTags.className = 'px-4 py-3 hidden lg:table-cell';
      var tags = Array.isArray(rel.tags) ? rel.tags : [];
      if (!tags.length) {
        var dash = document.createElement('div');
        dash.className = 'text-[12px] text-[var(--apple-text-tert)] font-semibold';
        dash.textContent = '—';
        tdTags.appendChild(dash);
      } else {
        var tagWrap = document.createElement('div');
        tagWrap.className = 'flex flex-wrap gap-1.5';
        tags.slice(0, 4).forEach(function (t) {
          var chip = document.createElement('span');
          chip.className = 'chip';
          chip.textContent = String(t);
          tagWrap.appendChild(chip);
        });
        if (tags.length > 4) {
          var more = document.createElement('span');
          more.className = 'chip';
          more.textContent = '+' + String(tags.length - 4);
          tagWrap.appendChild(more);
        }
        tdTags.appendChild(tagWrap);
      }

      var tdNote = document.createElement('td');
      tdNote.className = 'px-4 py-3 text-[var(--muted)] font-semibold hidden lg:table-cell';
      tdNote.textContent = rel.note ? String(rel.note) : '—';

      var tdActions = document.createElement('td');
      tdActions.className = 'px-4 py-3';
      var actions = document.createElement('div');
      actions.className = 'table-actions';

      var editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'table-icon-btn row-quick-action';
      editBtn.setAttribute('aria-label', '编辑');
      editBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>';
      editBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openRelationModal(rel.id, editBtn);
      });

      var delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'table-icon-btn row-quick-action';
      delBtn.setAttribute('aria-label', '解绑');
      delBtn.innerHTML =
        '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7h6m2 0H7m3-3h4a1 1 0 011 1v2H9V5a1 1 0 011-1z"></path></svg>';
      delBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        openConfirm({
          title: '解绑关联人？',
          desc: '解绑后不会删除该人的历史沟通记录（示例）。',
          okText: '解绑',
          cancelText: '取消',
          triggerEl: delBtn,
          onOk: function () {
            if (!state.store) return;
            var id = String(rel.id || '');
            state.store.relations = (state.store.relations || []).filter(function (x) { return String(x.id) !== id; });
            state.relationsSelected[id] = false;
            persistStore();
            addLogEntry({
              type: 'relation',
              actor: 'Admin',
              message: '解绑关联人：' + String(rel.name || '') + '（' + String(id) + '）',
              at: new Date().toISOString().slice(0, 16),
            });
            renderRelationsTable();
            renderLogs();
            closeConfirm();
            showToast({ title: '已解绑（示例）', desc: '关联人已移除' });
          },
        });
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      tdActions.appendChild(actions);

      tr.appendChild(tdSel);
      tr.appendChild(tdName);
      tr.appendChild(tdType);
      tr.appendChild(tdContact);
      tr.appendChild(tdTags);
      tr.appendChild(tdNote);
      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  function renderComms() {
    var wrap = $('[data-customer-comms-list]');
    var empty = document.getElementById('customerCommsEmpty');
    if (!wrap || !empty) return;

    wrap.innerHTML = '';

    var comms = state.store && Array.isArray(state.store.comms) ? state.store.comms : [];
    var filtered = comms.filter(function (c) {
      if (state.commFilter === 'internal') return String(c.visibility) === 'internal';
      if (state.commFilter === 'customer') return String(c.visibility) === 'customer';
      return true;
    });

    setVisible(empty, filtered.length === 0);
    if (!filtered.length) return;

    var line = document.createElement('div');
    line.className = 'relative pl-6 border border-[var(--border)] rounded-2xl p-5 md:p-6 bg-[var(--surface)]';
    var axis = document.createElement('div');
    axis.className = 'absolute left-7 top-6 bottom-6 w-px bg-[var(--border)]';
    line.appendChild(axis);

    filtered
      .slice()
      .sort(function (a, b) { return String(b.occurredAt || '').localeCompare(String(a.occurredAt || '')); })
      .forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'relative pl-6 py-4';
        var dot = document.createElement('div');
        dot.className = 'absolute left-4 top-6 w-3 h-3 rounded-full border border-[var(--border)] bg-white';
        row.appendChild(dot);

        var header = document.createElement('div');
        header.className = 'flex flex-wrap items-center justify-between gap-2';
        var left = document.createElement('div');
        left.className = 'min-w-0';
        var title = document.createElement('div');
        title.className = 'text-[13px] font-extrabold text-[var(--apple-text-main)]';
        title.textContent = String(item.summary || '—');
        var meta = document.createElement('div');
        meta.className = 'mt-1 text-[12px] text-[var(--apple-text-tert)] font-semibold';
        meta.textContent = formatDateTime(item.occurredAt) + ' · ' + getCommTypeLabel(item.type) + ' · ' + (item.actor ? String(item.actor) : '—');
        left.appendChild(title);
        left.appendChild(meta);

        var right = document.createElement('div');
        right.className = 'flex items-center gap-2 shrink-0';
        var typeChip = document.createElement('span');
        typeChip.className = 'chip';
        typeChip.textContent = getCommTypeLabel(item.type);
        var visChip = document.createElement('span');
        visChip.className =
          String(item.visibility) === 'customer'
            ? 'chip bg-[rgba(0,113,227,0.08)] border-[rgba(0,113,227,0.18)] text-[var(--apple-blue)]'
            : 'chip';
        visChip.textContent = getVisibilityLabel(item.visibility);
        right.appendChild(typeChip);
        right.appendChild(visChip);

        header.appendChild(left);
        header.appendChild(right);
        row.appendChild(header);

        if (item.detail) {
          var detail = document.createElement('div');
          detail.className = 'mt-2 text-[13px] text-[var(--muted)] font-semibold leading-relaxed';
          detail.textContent = String(item.detail);
          row.appendChild(detail);
        }

        if (item.nextAction) {
          var naWrap = document.createElement('div');
          naWrap.className = 'mt-2 flex items-start gap-1.5';
          var naIcon = document.createElement('span');
          naIcon.className = 'mt-0.5 text-[11px] font-extrabold text-[var(--apple-blue)] shrink-0 uppercase tracking-wide';
          naIcon.textContent = '→ 下一步';
          var naText = document.createElement('span');
          naText.className = 'text-[13px] text-[var(--apple-blue)] font-semibold leading-relaxed';
          naText.textContent = String(item.nextAction);
          naWrap.appendChild(naIcon);
          naWrap.appendChild(naText);
          row.appendChild(naWrap);
        }

        var actions = document.createElement('div');
        actions.className = 'mt-2 flex items-center justify-end gap-2';
        var editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'btn-secondary px-3 py-2 text-[13px]';
        editBtn.textContent = '编辑';
        editBtn.addEventListener('click', function () {
          openCommModal(item.id, editBtn);
        });
        var delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'btn-secondary px-3 py-2 text-[13px]';
        delBtn.textContent = '删除';
        delBtn.addEventListener('click', function () {
          openConfirm({
            title: '删除沟通记录？',
            desc: '该操作仅为原型演示，会写入本地记录。',
            okText: '删除',
            cancelText: '取消',
            triggerEl: delBtn,
            onOk: function () {
              if (!state.store) return;
              var id = String(item.id || '');
              state.store.comms = (state.store.comms || []).filter(function (x) { return String(x.id) !== id; });
              persistStore();
              addLogEntry({
                type: 'comm',
                actor: 'Admin',
                message: '删除沟通记录：' + String(item.summary || '') + '（' + String(id) + '）',
                at: new Date().toISOString().slice(0, 16),
              });
              renderComms();
              renderLogs();
              closeConfirm();
              showToast({ title: '已删除（示例）', desc: '沟通记录已移除' });
            },
          });
        });
        actions.appendChild(editBtn);
        actions.appendChild(delBtn);
        row.appendChild(actions);

        line.appendChild(row);
      });

    wrap.appendChild(line);
  }

  function syncCommFilterUI() {
    var buttons = $$('[data-comm-filter]');
    buttons.forEach(function (btn) {
      var key = btn.getAttribute('data-comm-filter');
      var isActive = key === state.commFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function setCommFilter(filter) {
    state.commFilter = filter || 'all';
    syncCommFilterUI();
    renderComms();
  }

  function syncLogFilterUI() {
    var buttons = $$('[data-log-filter]');
    buttons.forEach(function (btn) {
      var key = btn.getAttribute('data-log-filter');
      var isActive = key === state.logFilter;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function getFilteredLogs() {
    var logs = state.store && Array.isArray(state.store.logs) ? state.store.logs : [];
    if (state.logFilter === 'all') return logs.slice();
    return logs.filter(function (l) { return String(l.type) === String(state.logFilter); });
  }

  function clampLogPage(p, totalPages) {
    var next = Number(p) || 1;
    if (next < 1) next = 1;
    if (totalPages && next > totalPages) next = totalPages;
    return next;
  }

  function renderLogs() {
    var tbody = $('[data-customer-log-body]');
    if (!tbody) return;
    tbody.innerHTML = '';

    var list = getFilteredLogs()
      .slice()
      .sort(function (a, b) { return String(b.at || '').localeCompare(String(a.at || '')); });

    var total = list.length;
    var pages = Math.max(1, Math.ceil(total / state.logPageSize));
    state.logPage = clampLogPage(state.logPage, pages);

    setText('[data-log-total]', String(total));
    setText('[data-log-page]', String(state.logPage));
    setText('[data-log-pages]', String(pages));

    var prevBtn = document.getElementById('customerLogPrevBtn');
    var nextBtn = document.getElementById('customerLogNextBtn');
    setDisabled(prevBtn, state.logPage <= 1);
    setDisabled(nextBtn, state.logPage >= pages);

    if (!total) {
      var trEmpty = document.createElement('tr');
      var td = document.createElement('td');
      td.colSpan = 4;
      td.className = 'px-6 py-10 text-center text-[13px] text-[var(--muted-2)] font-semibold';
      td.textContent = '暂无操作日志';
      trEmpty.appendChild(td);
      tbody.appendChild(trEmpty);
      return;
    }

    var start = (state.logPage - 1) * state.logPageSize;
    var pageItems = list.slice(start, start + state.logPageSize);

    pageItems.forEach(function (item) {
      var tr = document.createElement('tr');
      tr.className = 'transition-colors hover:bg-[var(--surface-2)]';

      var tdAt = document.createElement('td');
      tdAt.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      tdAt.textContent = formatDateTime(item.at);

      var tdType = document.createElement('td');
      tdType.className = 'px-4 py-3';
      var chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent =
        String(item.type) === 'relation'
          ? '关系变更'
          : String(item.type) === 'case'
            ? '案件'
            : String(item.type) === 'comm'
              ? '沟通'
              : '信息变更';
      tdType.appendChild(chip);

      var tdMsg = document.createElement('td');
      tdMsg.className = 'px-4 py-3 text-[var(--muted)] font-semibold';
      tdMsg.textContent = String(item.message || '—');

      var tdActor = document.createElement('td');
      tdActor.className = 'px-4 py-3 text-[var(--muted)] font-semibold whitespace-nowrap';
      tdActor.textContent = String(item.actor || '—');

      tr.appendChild(tdAt);
      tr.appendChild(tdType);
      tr.appendChild(tdMsg);
      tr.appendChild(tdActor);
      tbody.appendChild(tr);
    });
  }

  function setLogFilter(filter) {
    state.logFilter = filter || 'all';
    state.logPage = 1;
    syncLogFilterUI();
    renderLogs();
  }

  function openRelationModal(relationId, triggerEl) {
    var modalEl = document.getElementById('customerRelationDialog');
    if (!modalEl) return;
    var titleEl = document.getElementById('customerRelationDialogTitle');
    var errEl = document.getElementById('customerRelationError');
    if (errEl) errEl.classList.add('hidden');

    state.editingRelationId = relationId ? String(relationId) : '';
    var isEdit = Boolean(state.editingRelationId);
    if (titleEl) titleEl.textContent = isEdit ? '编辑关联人' : '新增关联人';

    var rel = null;
    if (isEdit && state.store && Array.isArray(state.store.relations)) {
      rel = state.store.relations.find(function (r) { return String(r.id) === state.editingRelationId; }) || null;
    }

    setValue('customerRelationFieldName', rel ? rel.name : '');
    setValue('customerRelationFieldKana', rel ? rel.kana : '');
    setValue('customerRelationFieldType', rel ? rel.relationType : '');
    setValue('customerRelationFieldPhone', rel ? rel.phone : '');
    setValue('customerRelationFieldEmail', rel ? rel.email : '');
    setValue('customerRelationFieldTags', rel && Array.isArray(rel.tags) ? rel.tags.join(', ') : '');
    setValue('customerRelationFieldNote', rel ? rel.note : '');

    openBackdropModal(modalEl, triggerEl);
  }

  function closeRelationModal() {
    var modalEl = document.getElementById('customerRelationDialog');
    closeBackdropModal(modalEl);
    state.editingRelationId = null;
  }

  function saveRelation() {
    if (!state.store) return;
    var errEl = document.getElementById('customerRelationError');
    if (errEl) errEl.classList.add('hidden');

    var name = String(getValue('customerRelationFieldName') || '').trim();
    var kana = String(getValue('customerRelationFieldKana') || '').trim();
    var relationType = String(getValue('customerRelationFieldType') || '').trim();
    var phone = String(getValue('customerRelationFieldPhone') || '').trim();
    var email = String(getValue('customerRelationFieldEmail') || '').trim();
    var tags = uniq(parseTags(getValue('customerRelationFieldTags')));
    var note = String(getValue('customerRelationFieldNote') || '').trim();

    if (!name) {
      if (errEl) {
        errEl.textContent = '请填写姓名';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (!phone && !email) {
      if (errEl) {
        errEl.textContent = '电话/邮箱至少填写一项';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (!relationType) {
      if (errEl) {
        errEl.textContent = '请选择关系';
        errEl.classList.remove('hidden');
      }
      return;
    }

    var now = new Date().toISOString().slice(0, 16);
    var isEdit = Boolean(state.editingRelationId);
    var id = isEdit ? state.editingRelationId : 'REL-' + String(Date.now());

    var item = {
      id: id,
      name: name,
      kana: kana,
      relationType: relationType,
      phone: phone,
      email: email,
      tags: tags,
      note: note,
    };

    if (!Array.isArray(state.store.relations)) state.store.relations = [];
    if (isEdit) {
      state.store.relations = state.store.relations.map(function (r) { return String(r.id) === id ? item : r; });
      addLogEntry({ type: 'relation', actor: 'Admin', message: '编辑关联人：' + name + '（' + id + '）', at: now });
      showToast({ title: '已保存（示例）', desc: '关联人信息已更新' });
    } else {
      state.store.relations = [item].concat(state.store.relations);
      addLogEntry({ type: 'relation', actor: 'Admin', message: '新增关联人：' + name + '（' + id + '）', at: now });
      showToast({ title: '已新增（示例）', desc: '关联人已添加到列表' });
    }

    persistStore();
    closeRelationModal();
    renderRelationsTable();
    renderLogs();
  }

  function openCommModal(commId, triggerEl) {
    var modalEl = document.getElementById('customerCommDialog');
    if (!modalEl) return;
    var titleEl = document.getElementById('customerCommDialogTitle');
    var errEl = document.getElementById('customerCommError');
    if (errEl) errEl.classList.add('hidden');

    state.editingCommId = commId ? String(commId) : '';
    var isEdit = Boolean(state.editingCommId);
    if (titleEl) titleEl.textContent = isEdit ? '编辑沟通记录' : '记录沟通';

    var item = null;
    if (isEdit && state.store && Array.isArray(state.store.comms)) {
      item = state.store.comms.find(function (c) { return String(c.id) === state.editingCommId; }) || null;
    }

    var d = new Date();
    var yyyy = d.getFullYear();
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    var hh = String(d.getHours()).padStart(2, '0');
    var mi = String(d.getMinutes()).padStart(2, '0');
    var now = yyyy + '-' + mm + '-' + dd + 'T' + hh + ':' + mi;

    setValue('customerCommFieldType', item ? item.type : 'wechat');
    setValue('customerCommFieldOccurredAt', item ? item.occurredAt : now);
    setValue('customerCommFieldVisibility', item ? item.visibility : 'internal');
    setValue('customerCommFieldActor', item ? item.actor : getOwnerLabel(state.store && state.store.customer ? state.store.customer.owner : '') || 'Admin');
    setValue('customerCommFieldSummary', item ? item.summary : '');
    var detailEl = document.getElementById('customerCommFieldDetail');
    if (detailEl) detailEl.value = item ? String(item.detail || '') : '';
    setValue('customerCommFieldNextAction', item ? (item.nextAction || '') : '');

    openBackdropModal(modalEl, triggerEl);
  }

  function closeCommModal() {
    var modalEl = document.getElementById('customerCommDialog');
    closeBackdropModal(modalEl);
    state.editingCommId = null;
  }

  function saveComm() {
    if (!state.store) return;
    var errEl = document.getElementById('customerCommError');
    if (errEl) errEl.classList.add('hidden');

    var type = String(getValue('customerCommFieldType') || '').trim();
    var occurredAt = String(getValue('customerCommFieldOccurredAt') || '').trim();
    var visibility = String(getValue('customerCommFieldVisibility') || '').trim();
    var actor = String(getValue('customerCommFieldActor') || '').trim();
    var summary = String(getValue('customerCommFieldSummary') || '').trim();
    var detailEl = document.getElementById('customerCommFieldDetail');
    var detail = detailEl ? String(detailEl.value || '').trim() : '';
    var nextAction = String(getValue('customerCommFieldNextAction') || '').trim();

    if (!type) {
      if (errEl) {
        errEl.textContent = '请选择渠道';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (!occurredAt) {
      if (errEl) {
        errEl.textContent = '请填写时间';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (!visibility) {
      if (errEl) {
        errEl.textContent = '请选择可见范围';
        errEl.classList.remove('hidden');
      }
      return;
    }
    if (!summary) {
      if (errEl) {
        errEl.textContent = '请填写摘要';
        errEl.classList.remove('hidden');
      }
      return;
    }

    var isEdit = Boolean(state.editingCommId);
    var id = isEdit ? state.editingCommId : 'COM-' + String(Date.now());
    var item = { id: id, type: type, visibility: visibility, occurredAt: occurredAt, summary: summary, detail: detail, nextAction: nextAction, actor: actor || 'Admin' };

    if (!Array.isArray(state.store.comms)) state.store.comms = [];
    if (isEdit) {
      state.store.comms = state.store.comms.map(function (c) { return String(c.id) === id ? item : c; });
      addLogEntry({ type: 'comm', actor: item.actor, message: '编辑沟通记录：' + summary + '（' + id + '）', at: new Date().toISOString().slice(0, 16) });
      showToast({ title: '已保存（示例）', desc: '沟通记录已更新' });
    } else {
      state.store.comms = [item].concat(state.store.comms);
      addLogEntry({ type: 'comm', actor: item.actor, message: '新增沟通记录：' + getCommTypeLabel(type) + ' · ' + summary + '（' + (visibility === 'customer' ? '客户可见' : '内部') + '）', at: new Date().toISOString().slice(0, 16) });
      showToast({ title: '已新增（示例）', desc: '沟通记录已添加到时间线' });
    }

    var customer = state.store.customer;
    if (customer) {
      customer.lastContact = { date: toDateOnly(occurredAt), channel: getCommTypeLabel(type) };
      state.store.customer = customer;
      persistStore();
      applyHeader(customer);
    } else {
      persistStore();
    }

    closeCommModal();
    renderComms();
    renderLogs();
  }

  function initActions() {
    var store = state.store;
    var customer = store ? store.customer : null;

    var createBtns = [document.getElementById('customerCreateCaseBtn')].concat($$('[data-create-case]')).filter(Boolean);
    var batchBtns = [document.getElementById('customerBatchCreateBtn')].concat($$('[data-batch-case]')).filter(Boolean);
    var editBtn = document.getElementById('customerEditToggleBtn');
    var saveBtn = document.getElementById('customerSaveBtn');
    var cancelBtn = document.getElementById('customerCancelBtn');
    var addRelationBtn = document.getElementById('customerAddRelationBtn');
    var batchRelBtn = document.getElementById('customerRelationsBatchCreateBtn');
    var addCommBtn = document.getElementById('customerAddCommBtn');

    function setBtnEnabled(btns, enabled) {
      (btns || []).forEach(function (btn) {
        if (!btn) return;
        if (enabled) {
          btn.removeAttribute('disabled');
          btn.setAttribute('aria-disabled', 'false');
          btn.classList.remove('opacity-60', 'cursor-not-allowed');
        } else {
          btn.setAttribute('disabled', 'true');
          btn.setAttribute('aria-disabled', 'true');
          btn.classList.add('opacity-60', 'cursor-not-allowed');
        }
      });
    }

    setBtnEnabled(createBtns, Boolean(customer));
    setBtnEnabled(batchBtns, Boolean(customer));
    setBtnEnabled([editBtn], Boolean(customer));
    setBtnEnabled([addRelationBtn], Boolean(customer));
    setBtnEnabled([addCommBtn], Boolean(customer));

    createBtns.forEach(function (btn) {
      btn.onclick = function () {
        if (!customer) return;
        window.location.href = buildCreateCaseUrl(customer, 'single');
      };
    });

    batchBtns.forEach(function (btn) {
      btn.onclick = function () {
        if (!customer) return;
        window.location.href = buildCreateCaseUrl(customer, 'batch');
      };
    });

    if (editBtn) {
      editBtn.onclick = function () {
        if (!customer) return;
        setFormEditing(true);
      };
    }

    if (cancelBtn) {
      cancelBtn.onclick = function () {
        if (!customer) return;
        fillBasicForm(customer);
        setFormEditing(false);
      };
    }

    if (saveBtn) {
      saveBtn.onclick = function () {
        if (!customer || !state.store) return;

        var values = getBasicFormSnapshot();
        var validation = validateBasicForm(values);
        if (!validation.ok) {
          showToast({ title: '无法保存', desc: validation.message });
          if (validation.focusId) {
            var el = document.getElementById(validation.focusId);
            if (el && typeof el.focus === 'function') el.focus();
          }
          return;
        }

        var prev = clone(customer) || {};
        state.store.customer = Object.assign({}, customer, values);
        persistStore();
        applyHeader(state.store.customer);
        setFormEditing(false);

        var changed = [];
        if (String(prev.owner || '') !== String(values.owner || '')) changed.push('负责人');
        if (String(prev.group || '') !== String(values.group || '')) changed.push('分组');
        if (String(prev.phone || '') !== String(values.phone || '')) changed.push('电话');
        if (String(prev.email || '') !== String(values.email || '')) changed.push('邮箱');
        if (String(prev.displayName || '') !== String(values.displayName || '')) changed.push('识别名');
        if (String(prev.legalName || '') !== String(values.legalName || '')) changed.push('姓名');
        if (String(prev.nationality || '') !== String(values.nationality || '')) changed.push('国籍');

        addLogEntry({
          type: 'info',
          actor: 'Admin',
          message: changed.length ? '更新基础信息：' + changed.join('、') : '更新基础信息：无字段变化',
          at: new Date().toISOString().slice(0, 16),
        });

        var hint = document.getElementById('customerSaveHint');
        if (hint) hint.classList.remove('hidden');
        showToast({ title: '已保存', desc: '基础信息已更新，并写入操作日志（示例）' });
        renderOverview();
        renderLogs();
      };
    }

    if (addRelationBtn) {
      addRelationBtn.addEventListener('click', function () {
        if (!customer) return;
        openRelationModal('', addRelationBtn);
      });
    }

    if (batchRelBtn) {
      batchRelBtn.addEventListener('click', function () {
        var ids = Object.keys(state.relationsSelected || {}).filter(function (k) { return Boolean(state.relationsSelected[k]); });
        if (!ids.length) return;
        showToast({ title: '批量建案（示例）', desc: '已选择 ' + String(ids.length) + ' 位关联人' });
      });
    }

    if (addCommBtn) {
      addCommBtn.addEventListener('click', function () {
        if (!customer) return;
        openCommModal('', addCommBtn);
      });
    }
  }

  function initTabs() {
    var tabs = $$('[data-customer-tab]');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        requestTabChange(tab.getAttribute('data-customer-tab'), tab);
      });
    });

    var tablist = $('[role="tablist"][aria-label="客户详情 Tabs"]');
    if (tablist) {
      tablist.addEventListener('keydown', function (e) {
        var current = document.activeElement;
        if (!current || current.getAttribute('role') !== 'tab') return;
        var keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (keys.indexOf(e.key) === -1) return;
        e.preventDefault();

        var items = tabs;
        var idx = items.indexOf(current);
        if (idx < 0) idx = 0;
        var nextIdx = idx;

        if (e.key === 'ArrowLeft') nextIdx = Math.max(0, idx - 1);
        if (e.key === 'ArrowRight') nextIdx = Math.min(items.length - 1, idx + 1);
        if (e.key === 'Home') nextIdx = 0;
        if (e.key === 'End') nextIdx = items.length - 1;

        var next = items[nextIdx];
        if (next) {
          next.focus();
          requestTabChange(next.getAttribute('data-customer-tab'), next);
        }
      });
    }
  }

  function initCasesFilter() {
    var buttons = $$('[data-case-filter]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setCaseFilter(btn.getAttribute('data-case-filter'));
      });
    });
    syncCaseFilterUI();
  }

  function initRelations() {
    var search = document.getElementById('customerRelationSearchInput');
    if (search) {
      search.addEventListener('input', function () {
        state.relationsSearch = String(search.value || '');
        renderRelationsTable();
      });
    }

    var selectAll = document.getElementById('customerSelectAllRelations');
    if (selectAll) {
      selectAll.addEventListener('change', function () {
        var relations = state.store && Array.isArray(state.store.relations) ? state.store.relations : [];
        var q = String(state.relationsSearch || '').trim().toLowerCase();
        var filtered = relations.filter(function (r) {
          if (!q) return true;
          var hay = [
            r.name,
            r.kana,
            r.phone,
            r.email,
            (Array.isArray(r.tags) ? r.tags.join(' ') : ''),
            r.note,
          ]
            .join(' ')
            .toLowerCase();
          return hay.indexOf(q) >= 0;
        });
        filtered.forEach(function (r) {
          state.relationsSelected[String(r.id)] = selectAll.checked;
        });
        renderRelationsTable();
      });
    }
  }

  function initComms() {
    var buttons = $$('[data-comm-filter]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setCommFilter(btn.getAttribute('data-comm-filter'));
      });
    });
    syncCommFilterUI();
  }

  function initLogs() {
    var buttons = $$('[data-log-filter]');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setLogFilter(btn.getAttribute('data-log-filter'));
      });
    });
    syncLogFilterUI();

    var prevBtn = document.getElementById('customerLogPrevBtn');
    var nextBtn = document.getElementById('customerLogNextBtn');
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        state.logPage = Math.max(1, (state.logPage || 1) - 1);
        renderLogs();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        state.logPage = (state.logPage || 1) + 1;
        renderLogs();
      });
    }
  }

  function initConfirmDialog() {
    var modalEl = document.getElementById('customerConfirmDialog');
    if (!modalEl) return;
    setupModalDismiss(modalEl, ['customerConfirmCloseBtn', 'customerConfirmCancelBtn']);
    var okBtn = document.getElementById('customerConfirmOkBtn');
    if (okBtn) {
      okBtn.addEventListener('click', function () {
        var pending = state.pendingConfirm;
        if (pending && typeof pending.onOk === 'function') pending.onOk();
        else closeConfirm();
      });
    }
  }

  function initRelationDialog() {
    var modalEl = document.getElementById('customerRelationDialog');
    if (!modalEl) return;
    setupModalDismiss(modalEl, ['customerRelationCloseBtn', 'customerRelationCancelBtn']);
    var saveBtn = document.getElementById('customerRelationSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveRelation);
  }

  function initCommDialog() {
    var modalEl = document.getElementById('customerCommDialog');
    if (!modalEl) return;
    setupModalDismiss(modalEl, ['customerCommCloseBtn', 'customerCommCancelBtn']);
    var saveBtn = document.getElementById('customerCommSaveBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveComm);
  }

  function init() {
    var params = new URLSearchParams(window.location.search || '');
    var id = params.get('id');

    state.customerId = String(id || '').trim();
    state.store = state.customerId ? loadStore(state.customerId) : null;

    applyHeader(state.store ? state.store.customer : null);

    var config = getConfig();
    populateSelectOptions('customerFieldGroup', Array.isArray(config.GROUPS) ? config.GROUPS : [], '请选择 Group');
    populateSelectOptions('customerFieldOwner', Array.isArray(config.OWNERS) ? config.OWNERS : [], '请选择负责人');
    populateDetailSelects();

    if (state.store && state.store.customer) fillBasicForm(state.store.customer);
    setFormEditing(false);

    renderOverview();
    initCasePopover();

    initTabs();
    initCasesFilter();
    renderCasesTable();
    initActions();
    initRelations();
    initComms();
    initLogs();
    initConfirmDialog();
    initRelationDialog();
    initCommDialog();

    renderRelationsTable();
    renderComms();
    renderLogs();

    setActiveTab(state.activeTab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
