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

  app.BADGE_CLASS_MAP = {
    new: 'lead-badge-new',
    following: 'lead-badge-following',
    pending_sign: 'lead-badge-pending_sign',
    signed: 'lead-badge-signed',
    lost: 'lead-badge-lost',
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
    status: '状态变更',
    owner: '人员变更',
    group: 'Group 变更',
  };

  app.LOG_TYPE_CHIP = {
    status: 'bg-sky-100 text-sky-700',
    owner: 'bg-emerald-100 text-emerald-700',
    group: 'bg-violet-100 text-violet-700',
  };

  app.LOG_DOT_COLOR = {
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
    }, 2800);
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
    });

    app.dom.tabPanels.forEach(function (panel) {
      panel.classList.toggle('is-active', panel.id === 'tab-' + key);
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

  app.applyBtnState = function (btn, state, defaultLabel, viewLabel) {
    if (!btn) return;

    btn.style.display = state === 'hidden' ? 'none' : '';
    btn.disabled = state === 'disabled';
    btn.style.opacity = state === 'disabled' ? '0.4' : '';
    btn.classList.toggle('btn-highlight', state === 'highlighted');

    if (state === 'view-customer' || state === 'view-case') {
      btn.textContent = viewLabel;
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');
      return;
    }

    btn.textContent = defaultLabel;
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  };
})();
