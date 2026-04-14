(function () {
  'use strict';

  var app = (window.LeadsDetailPage = window.LeadsDetailPage || {});
  if (app.__coreLoaded) return;
  app.__coreLoaded = true;

  app.state = {
    currentSampleKey: 'following',
    isInitialized: false,
  };

  app.$ = function (id) {
    return document.getElementById(id);
  };

  app.$$ = function (selector) {
    return Array.prototype.slice.call(document.querySelectorAll(selector));
  };

  app.getConfig = function () {
    return window.LeadsDetailConfig || null;
  };

  app.getSample = function (key) {
    var cfg = app.getConfig();
    if (!cfg || !cfg.DETAIL_SAMPLES) return null;
    return cfg.DETAIL_SAMPLES[key || app.state.currentSampleKey] || null;
  };

  app.findSampleKeyByLeadId = function (leadId) {
    var cfg = app.getConfig();
    if (!cfg || !cfg.DETAIL_SAMPLES || !leadId) return null;

    return Object.keys(cfg.DETAIL_SAMPLES).find(function (key) {
      var sample = cfg.DETAIL_SAMPLES[key];
      return sample && sample.id === leadId;
    }) || null;
  };

  app.resolveInitialSampleKey = function () {
    var cfg = app.getConfig();
    var fallbackKey = app.state.currentSampleKey;
    if (!cfg || !cfg.DETAIL_SAMPLES) return fallbackKey;

    var search = (window.location && window.location.search) || '';
    var params = new URLSearchParams(search);
    var sampleKey = params.get('sample');
    if (sampleKey && cfg.DETAIL_SAMPLES[sampleKey]) {
      return sampleKey;
    }

    var leadId = params.get('id');
    return app.findSampleKeyByLeadId(leadId) || fallbackKey;
  };

  app.syncLocationForSampleKey = function (key) {
    var sample = app.getSample(key);
    if (!sample || !window.history || typeof window.history.replaceState !== 'function' || !window.location) {
      return;
    }

    var params = new URLSearchParams(window.location.search || '');
    params.set('sample', key);
    params.set('id', sample.id);

    var query = params.toString();
    var nextUrl = window.location.pathname + (query ? '?' + query : '');
    window.history.replaceState(null, '', nextUrl);
  };

  app.setCurrentSampleKey = function (key) {
    app.state.currentSampleKey = key;
  };

  app.cacheDom = function () {
    app.dom = {
      breadcrumbName: app.$('breadcrumbName'),
      detailTitle: app.$('detailTitle'),
      detailStatusBadge: app.$('detailStatusBadge'),
      detailLeadId: app.$('detailLeadId'),
      detailOwnerAvatar: app.$('detailOwnerAvatar'),
      detailOwnerName: app.$('detailOwnerName'),
      detailGroup: app.$('detailGroup'),
      readonlyBanner: app.$('readonlyBanner'),
      warningBanner: app.$('warningBanner'),
      sampleSelect: app.$('leadSampleSelect'),
      tabBtns: app.$$('[data-tab]'),
      tabPanels: app.$$('.tab-panel'),
      btnEditInfo: app.$('btnEditInfo'),
      btnEditInfoTab: app.$('btnEditInfoTab'),
      btnChangeStatus: app.$('btnChangeStatus'),
      btnConvertCustomer: app.$('btnConvertCustomer'),
      btnConvertCase: app.$('btnConvertCase'),
      btnMarkLost: app.$('btnMarkLost'),
      toastEl: app.$('toast'),
      toastTitle: app.$('toastTitle'),
      toastDesc: app.$('toastDesc'),
      logCategoryBtns: app.$$('[data-log-cat]'),
      modalCloseBtns: app.$$('[data-modal-close]'),
      modalBackdrops: app.$$('.modal-backdrop'),
      mainEl: app.$('main'),
    };
  };

  app.getStatusBadgeClass = function (statusKey) {
    var cfg = app.getConfig();
    if (cfg && cfg.DETAIL_STATUSES && cfg.DETAIL_STATUSES[statusKey]) {
      return cfg.DETAIL_STATUSES[statusKey].badgeClass || '';
    }
    return '';
  };

  app.CHANNEL_DOT_COLOR = {
    phone: 'bg-sky-500',
    email: 'bg-emerald-500',
    meeting: 'bg-violet-500',
    im: 'bg-amber-500',
  };

  app.CHANNEL_CHIP_BG = {
    phone: 'bg-sky-100 text-sky-700',
    email: 'bg-emerald-100 text-emerald-700',
    meeting: 'bg-violet-100 text-violet-700',
    im: 'bg-amber-100 text-amber-700',
  };

  app.LOG_TYPE_LABEL = {
    info: '基础信息修改',
    status: '状态变更',
    owner: '人员变更',
    group: '所属组变更',
  };

  app.LOG_TYPE_CHIP = {
    info: 'bg-amber-100 text-amber-700',
    status: 'bg-sky-100 text-sky-700',
    owner: 'bg-emerald-100 text-emerald-700',
    group: 'bg-violet-100 text-violet-700',
  };

  app.LOG_DOT_COLOR = {
    info: 'bg-amber-500',
    status: 'bg-sky-500',
    owner: 'bg-emerald-500',
    group: 'bg-violet-500',
  };

  app.showToast = function (title, desc) {
    if (!app.dom || !app.dom.toastEl || !app.dom.toastTitle || !app.dom.toastDesc) return;
    app.dom.toastTitle.textContent = title;
    app.dom.toastDesc.textContent = desc || '';
    app.dom.toastEl.classList.remove('hidden');
    clearTimeout(app.showToast._timer);
    app.showToast._timer = setTimeout(function () {
      app.dom.toastEl.classList.add('hidden');
    }, 2200);
  };

  app.openModal = function (id) {
    var el = app.$(id);
    if (el) el.classList.add('show');
  };

  app.closeModal = function (id) {
    var el = app.$(id);
    if (el) el.classList.remove('show');
  };

  app.activateTab = function (key) {
    if (!app.dom) return;

    app.dom.tabBtns.forEach(function (btn) {
      var isActive = btn.getAttribute('data-tab') === key;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      btn.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    app.dom.tabPanels.forEach(function (panel) {
      var isActive = panel.id === 'tab-' + key;
      panel.classList.toggle('is-active', isActive);
    });
  };

  app.setText = function (id, value) {
    var el = app.$(id);
    if (!el) return;
    el.textContent = value || '';
    el.classList.toggle('is-empty', !value || value === '—');
  };

  app.esc = function (value) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(String(value || '')));
    return div.innerHTML;
  };

  app.applyBtnState = function (btn, state, defaultLabel, viewLabel, defaultClass) {
    if (!btn) return;

    btn.style.display = state === 'hidden' ? 'none' : '';
    btn.disabled = state === 'disabled';
    btn.style.opacity = state === 'disabled' ? '0.4' : '';
    btn.classList.toggle('btn-highlight', state === 'highlighted');

    if (state === 'view-customer' || state === 'view-case') {
      btn.textContent = viewLabel;
      btn.classList.remove('btn-primary', 'btn-highlight');
      btn.classList.add('btn-secondary');
      return;
    }

    var cls = defaultClass || 'btn-primary';
    var otherCls = cls === 'btn-primary' ? 'btn-secondary' : 'btn-primary';
    btn.textContent = defaultLabel;
    btn.classList.remove(otherCls);
    btn.classList.add(cls);
  };
})();
