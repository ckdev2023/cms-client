(function () {
  'use strict';

  var app = window.LeadsDetailPage;
  if (!app) return;

  function bindTabs() {
    app.dom.tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.activateTab(btn.getAttribute('data-tab'));
      });
    });
  }

  function bindLogFilter() {
    app.dom.logCategoryBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var category = btn.getAttribute('data-log-cat');

        app.dom.logCategoryBtns.forEach(function (item) {
          var isActive = item === btn;
          item.classList.toggle('active', isActive);
          item.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });

        app.$$('#logTimelineList .timeline-item').forEach(function (item) {
          if (category === 'all') {
            item.style.display = '';
            return;
          }
          item.style.display = item.getAttribute('data-log-type') === category ? '' : 'none';
        });
      });
    });
  }

  function bindSampleSwitcher() {
    if (!app.dom.sampleSelect) return;
    app.dom.sampleSelect.addEventListener('change', function () {
      app.renderSample(app.dom.sampleSelect.value);
    });
  }

  function prefillConvertCustomerModal() {
    var sample = app.getSample();
    if (!sample) return;

    var info = sample.info || {};
    var el;

    el = app.$('modalCusName');
    if (el) el.value = info.name || '';
    el = app.$('modalCusPhone');
    if (el) el.value = info.phone || '';
    el = app.$('modalCusEmail');
    if (el) el.value = info.email || '';
    el = app.$('modalCusGroup');
    if (el) el.value = sample.groupLabel || '';
  }

  function prefillConvertCaseModal() {
    var sample = app.getSample();
    if (!sample) return;

    var info = sample.info || {};
    var el;

    el = app.$('modalCaseApplicant');
    if (el) el.value = info.name || '';
    el = app.$('modalCaseType');
    if (el) el.value = info.businessType || '';
    el = app.$('modalCaseOwner');
    if (el) el.value = sample.ownerLabel || '';
    el = app.$('modalCaseGroup');
    if (el) el.value = sample.groupLabel || '';
  }

  function bindActionButtons() {
    var cfg = app.getConfig();

    if (app.dom.btnEditInfo) {
      app.dom.btnEditInfo.addEventListener('click', function () {
        app.showToast(cfg.DETAIL_TOASTS.infoUpdated.title, cfg.DETAIL_TOASTS.infoUpdated.desc);
      });
    }

    var btnEditInfoTab = app.$('btnEditInfoTab');
    if (btnEditInfoTab) {
      btnEditInfoTab.addEventListener('click', function () {
        app.showToast(cfg.DETAIL_TOASTS.infoUpdated.title, cfg.DETAIL_TOASTS.infoUpdated.desc);
      });
    }

    if (app.dom.btnChangeStatus) {
      app.dom.btnChangeStatus.addEventListener('click', function () {
        app.showToast(cfg.DETAIL_TOASTS.statusChanged.title, '已从当前状态更新（demo-only）');
      });
    }

    if (app.dom.btnMarkLost) {
      app.dom.btnMarkLost.addEventListener('click', function () {
        app.showToast(cfg.DETAIL_TOASTS.markedLost.title, cfg.DETAIL_TOASTS.markedLost.desc);
      });
    }

    if (app.dom.btnConvertCustomer) {
      app.dom.btnConvertCustomer.addEventListener('click', function () {
        var sample = app.getSample();
        var matrix = cfg.HEADER_BUTTONS[sample ? sample.buttons : 'normal'] || {};

        if (matrix.convertCustomer === 'view-customer') {
          window.location.href = '../customers/index.html';
          return;
        }

        prefillConvertCustomerModal();
        app.openModal('convertCustomerModal');
      });
    }

    var btnConvertCustomerTab = app.$('btnConvertCustomerTab');
    if (btnConvertCustomerTab) {
      btnConvertCustomerTab.addEventListener('click', function () {
        prefillConvertCustomerModal();
        app.openModal('convertCustomerModal');
      });
    }

    if (app.dom.btnConvertCase) {
      app.dom.btnConvertCase.addEventListener('click', function () {
        var sample = app.getSample();
        var matrix = cfg.HEADER_BUTTONS[sample ? sample.buttons : 'normal'] || {};

        if (matrix.convertCase === 'view-case') {
          window.location.href = '../case/detail.html';
          return;
        }

        prefillConvertCaseModal();
        app.openModal('convertCaseModal');
      });
    }

    var btnConvertCaseTab = app.$('btnConvertCaseTab');
    if (btnConvertCaseTab) {
      btnConvertCaseTab.addEventListener('click', function () {
        prefillConvertCaseModal();
        app.openModal('convertCaseModal');
      });
    }
  }

  function bindConversionModals() {
    var cfg = app.getConfig();
    var confirmConvertCustomer = app.$('confirmConvertCustomer');
    var confirmConvertCase = app.$('confirmConvertCase');

    if (confirmConvertCustomer) {
      confirmConvertCustomer.addEventListener('click', function () {
        app.closeModal('convertCustomerModal');
        var sample = app.getSample();
        var name = sample ? sample.name : '';
        app.showToast(
          cfg.DETAIL_TOASTS.convertCustomer.title,
          cfg.DETAIL_TOASTS.convertCustomer.desc.replace('{name}', name)
        );
      });
    }

    if (confirmConvertCase) {
      confirmConvertCase.addEventListener('click', function () {
        app.closeModal('convertCaseModal');
        var sample = app.getSample();
        var title = sample ? sample.name + ' ' + (sample.info ? sample.info.businessType : '') : '';
        app.showToast(
          cfg.DETAIL_TOASTS.convertCase.title,
          cfg.DETAIL_TOASTS.convertCase.desc.replace('{title}', title)
        );
      });
    }

    app.dom.modalCloseBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.closeModal(btn.getAttribute('data-modal-close'));
      });
    });

    app.dom.modalBackdrops.forEach(function (backdrop) {
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) backdrop.classList.remove('show');
      });
    });
  }

  function bindWarningBannerAction() {
    var warningConvertBtn = app.$('warningConvertBtn');
    if (!warningConvertBtn) return;

    warningConvertBtn.addEventListener('click', function () {
      app.activateTab('conversion');
    });
  }

  function bindFollowupForm() {
    var cfg = app.getConfig();
    var submitFollowup = app.$('submitFollowup');
    if (!submitFollowup) return;

    submitFollowup.addEventListener('click', function () {
      var channelEl = app.$('fuChannel');
      var summaryEl = app.$('fuSummary');

      if (!channelEl || !channelEl.value) {
        app.showToast('请选择渠道', '');
        return;
      }

      if (!summaryEl || !summaryEl.value.trim()) {
        app.showToast('请填写跟进摘要', '');
        return;
      }

      var channel = cfg.FOLLOWUP_CHANNELS.filter(function (item) {
        return item.value === channelEl.value;
      })[0];
      var channelLabel = channel ? channel.label : channelEl.value;

      app.showToast(
        cfg.DETAIL_TOASTS.followUpAdded.title,
        cfg.DETAIL_TOASTS.followUpAdded.desc.replace('{channel}', channelLabel)
      );

      channelEl.value = '';
      summaryEl.value = '';

      var conclusionEl = app.$('fuConclusion');
      if (conclusionEl) conclusionEl.value = '';
      var nextActionEl = app.$('fuNextAction');
      if (nextActionEl) nextActionEl.value = '';
      var nextFollowUpEl = app.$('fuNextFollowUp');
      if (nextFollowUpEl) nextFollowUpEl.value = '';
    });
  }

  function bindDelegatedActions() {
    var cfg = app.getConfig();

    document.addEventListener('click', function (event) {
      var btn = event.target.closest('[data-action="convert-task"]');
      if (!btn) return;
      app.showToast(cfg.DETAIL_TOASTS.taskCreated.title, cfg.DETAIL_TOASTS.taskCreated.desc);
    });
  }

  function bindDedupActions() {
    var dedupContinue = app.$('dedupContinueBtn');
    if (dedupContinue) {
      dedupContinue.addEventListener('click', function () {
        app.showToast('已确认继续创建（示例）', '去重确认操作完成');
      });
    }

    var dedupView = app.$('dedupViewBtn');
    if (dedupView) {
      dedupView.addEventListener('click', function () {
        app.showToast('查看已有记录（示例）', '将跳转至匹配记录详情页');
      });
    }
  }

  app.bindEvents = function () {
    bindTabs();
    bindLogFilter();
    bindSampleSwitcher();
    bindActionButtons();
    bindConversionModals();
    bindWarningBannerAction();
    bindFollowupForm();
    bindDelegatedActions();
    bindDedupActions();
  };

  app.init = function () {
    if (app.state.isInitialized) return;
    if (!app.getConfig()) return;

    app.cacheDom();
    app.state.isInitialized = true;
    app.bindEvents();
    app.renderSample(app.state.currentSampleKey);
  };
})();
