(function () {
  'use strict';

  var app = window.CustomerDetailPage;
  if (!app) return;

  var BMV_CHANNEL_LABELS = {
    email: '邮箱',
    line: 'LINE',
    wechat: '微信',
  };

  function getCustomer() {
    return app.state.store ? app.state.store.customer : null;
  }

  function getNowStamp() {
    return new Date().toISOString().slice(0, 16);
  }

  function getActorName(customer) {
    return customer ? app.getOwnerLabel(customer.owner) : 'Admin';
  }

  function ensureBmvProfile(customer) {
    if (!customer) return null;
    customer.bmvProfile = app.createBmvProfile(customer.bmvProfile);
    customer.bmvProfile.intakeStatus = app.resolveBmvIntakeStatus(customer.bmvProfile);
    if (!customer.bmvProfile.nextStep) customer.bmvProfile.nextStep = app.resolveBmvNextStep(customer.bmvProfile);
    return customer.bmvProfile;
  }

  function updateBmvLastContact(nextCustomer, channelLabel) {
    nextCustomer.lastContact = Object.assign({}, nextCustomer.lastContact || {}, {
      date: getNowStamp().slice(0, 10),
      channel: channelLabel,
    });
  }

  function getBmvEventId(prefix, customer) {
    var customerId = customer ? String(customer.id || 'CUS') : 'CUS';
    return prefix + '-' + customerId + '-' + String(Date.now()).slice(-6);
  }

  function appendBmvComm(nextCustomer, profile, summary, detail, nextAction, visibility, type) {
    app.pushCommRecord({
      id: getBmvEventId('COM-BMV', nextCustomer),
      type: type || app.getBmvCommType(profile),
      visibility: visibility || 'customer',
      occurredAt: getNowStamp(),
      actor: getActorName(nextCustomer),
      summary: summary,
      detail: detail,
      nextAction: nextAction,
    });
  }

  function appendBmvLog(nextCustomer, type, message) {
    app.addLogEntry({
      id: getBmvEventId('LOG-BMV', nextCustomer),
      type: type || 'info',
      actor: getActorName(nextCustomer),
      at: getNowStamp(),
      message: message,
    });
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

  app.createBmvProfile = function (input) {
    return Object.assign(
      {
        questionnaireName: '《2025M_C经管签信息表》',
        questionnaireStatus: 'not_sent',
        quoteStatus: 'pending',
        signStatus: 'pending',
        sourceLeadId: '',
        visaPlan: '4年 + 1年经营计划',
        quoteAmount: '',
        nextStep: '',
        deliveryChannel: 'email',
      },
      input || {}
    );
  };

  app.getBmvProfile = function (customer) {
    var profile = customer && customer.bmvProfile;
    return profile && typeof profile === 'object' ? app.createBmvProfile(profile) : null;
  };

  app.isBmvCustomer = function (customer) {
    return Boolean(app.getBmvProfile(customer));
  };

  app.getBmvChannelLabel = function (value) {
    return BMV_CHANNEL_LABELS[String(value || 'email')] || '邮箱';
  };

  app.getBmvCommType = function (profile) {
    var channel = String((profile && profile.deliveryChannel) || 'email');
    return channel === 'line' || channel === 'wechat' ? channel : 'email';
  };

  app.getBmvQuestionnaireStatusLabel = function (value) {
    if (String(value || '') === 'sent') return '已发送';
    if (String(value || '') === 'returned') return '已回收';
    return '未发送';
  };

  app.getBmvQuoteStatusLabel = function (value) {
    if (String(value || '') === 'generated') return '已生成';
    if (String(value || '') === 'confirmed') return '已确认';
    return '待生成';
  };

  app.getBmvSignStatusLabel = function (value) {
    return String(value || '') === 'signed' ? '已签约' : '待签约';
  };

  app.resolveBmvIntakeStatus = function (profile) {
    var item = app.createBmvProfile(profile);
    if (String(item.signStatus || '') === 'signed') return 'ready';
    if (String(item.quoteStatus || '') === 'generated' || String(item.quoteStatus || '') === 'confirmed') return 'contract_pending';
    if (String(item.questionnaireStatus || '') === 'returned') return 'quote_pending';
    return 'questionnaire_pending';
  };

  app.getBmvIntakeStatusLabel = function (profile) {
    var stage = app.resolveBmvIntakeStatus(profile);
    if (stage === 'ready') return '可建案';
    if (stage === 'contract_pending') return '待签约';
    if (stage === 'quote_pending') return '报价待确认';
    return '问卷准备中';
  };

  app.resolveBmvNextStep = function (profile) {
    var item = app.createBmvProfile(profile);
    if (String(item.signStatus || '') === 'signed') return '转正式案件并生成资料清单';
    if (String(item.quoteStatus || '') === 'generated' || String(item.quoteStatus || '') === 'confirmed') return '与客户确认签约时间';
    if (String(item.questionnaireStatus || '') === 'returned') return '生成报价并推进签约';
    if (String(item.questionnaireStatus || '') === 'sent') return '等待客户回收问卷';
    return '发送问卷并等待客户回填';
  };

  app.getBmvRecipientHint = function (customer, profile) {
    var item = app.createBmvProfile(profile);
    var channel = String(item.deliveryChannel || 'email');
    var email = String((customer && customer.email) || '').trim();
    var phone = String((customer && customer.phone) || '').trim();
    if (channel === 'email') return email ? '将发送到邮箱：' + email : '客户暂无邮箱，请先补录邮箱或切换到 LINE / 微信';
    if (channel === 'line') return phone ? '将通过 LINE 发送链接（示意），联系号码：' + phone : '客户暂无电话，请先补录电话或切换到邮箱';
    return phone ? '将通过微信发送链接（示意），联系号码：' + phone : '客户暂无电话，请先补录电话或切换到邮箱';
  };

  app.getBmvSendBlockedMessage = function (customer, profile) {
    if (!customer) return '请先选择客户';
    if (!app.isBmvCustomer(customer)) return '当前客户无经营管理签前置流程';
    var item = app.createBmvProfile(profile);
    if (String(item.signStatus || '') === 'signed') return '客户已签约，无需再次发送问卷';
    if (String(item.deliveryChannel || '') === 'email' && !String(customer.email || '').trim()) return '客户缺少邮箱，请先补录邮箱或改用 LINE / 微信';
    if ((String(item.deliveryChannel || '') === 'line' || String(item.deliveryChannel || '') === 'wechat') && !String(customer.phone || '').trim()) {
      return '客户缺少电话，请先补录电话或改用邮箱';
    }
    return '';
  };

  app.getBmvQuoteBlockedMessage = function (profile) {
    var item = app.createBmvProfile(profile);
    if (String(item.signStatus || '') === 'signed') return '客户已签约，无需再次生成报价';
    if (String(item.questionnaireStatus || '') === 'not_sent') return '请先发送问卷';
    return '';
  };

  app.getBmvSignBlockedMessage = function (profile) {
    var item = app.createBmvProfile(profile);
    if (String(item.signStatus || '') === 'signed') return '客户已签约，可直接转正式案件';
    if (String(item.quoteStatus || '') !== 'generated' && String(item.quoteStatus || '') !== 'confirmed') return '请先生成报价';
    return '';
  };

  app.buildCreateCaseUrl = function (customer, mode) {
    var customerId = customer ? String(customer.id || '') : '';
    if (!customerId) return '../case/create.html';

    var url = '../case/create.html?customer_id=' + encodeURIComponent(customerId);
    if (customer && customer.group) url += '&group=' + encodeURIComponent(String(customer.group));
    if (mode) url += '&mode=' + encodeURIComponent(String(mode));
    return url;
  };

  app.canCreateCaseFromCustomer = function (customer) {
    return Boolean(customer) && (!app.isBmvCustomer(customer) || String(app.getBmvProfile(customer).signStatus || '') === 'signed');
  };

  app.getCreateCaseBlockedMessage = function (customer) {
    if (!customer) return '请先选择客户';
    if (app.isBmvCustomer(customer) && String(app.getBmvProfile(customer).signStatus || '') !== 'signed') return '经营管理签需先完成签约';
    return '';
  };

  app.commitCustomerStore = function (mutate) {
    if (!app.state.store) return null;

    var nextCustomer = app.clone(getCustomer()) || {};
    mutate(nextCustomer);
    app.state.store.customer = nextCustomer;
    app.persistStore();
    app.applyHeader(nextCustomer);
    if (!app.state.isEditing) app.fillBasicForm(nextCustomer);
    app.renderOverview();
    if (app.renderBmvIntake) app.renderBmvIntake();
    app.updateActionAvailability();
    if (app.renderComms) app.renderComms();
    if (app.renderLogs) app.renderLogs();
    return nextCustomer;
  };

  app.pushCommRecord = function (item) {
    if (!app.state.store) return;
    if (!Array.isArray(app.state.store.comms)) app.state.store.comms = [];
    app.state.store.comms = [item].concat(app.state.store.comms);
  };

  app.renderBmvIntake = function () {
    var customer = getCustomer();
    var card = document.getElementById('customerBmvIntakeCard');
    if (!card) return;

    var profile = app.getBmvProfile(customer);
    app.setVisible(card, Boolean(profile));
    if (!profile) return;

    var current = ensureBmvProfile(customer) || profile;
    var sendBtn = document.getElementById('customerBmvSendBtn');
    var quoteBtn = document.getElementById('customerBmvQuoteBtn');
    var signBtn = document.getElementById('customerBmvSignBtn');
    var channelSelect = document.getElementById('customerBmvChannelSelect');
    var gateHint = document.getElementById('customerBmvGateHint');

    app.setText('#customerBmvIntakeStatus', app.getBmvIntakeStatusLabel(current));
    app.setText('#customerBmvQuestionnaireStatus', app.getBmvQuestionnaireStatusLabel(current.questionnaireStatus));
    app.setText('#customerBmvQuoteStatus', app.getBmvQuoteStatusLabel(current.quoteStatus));
    app.setText('#customerBmvSignStatus', app.getBmvSignStatusLabel(current.signStatus));
    app.setText('#customerBmvQuestionnaireName', current.questionnaireName || '—');
    app.setText('#customerBmvSourceLead', current.sourceLeadId || '—');
    app.setText('#customerBmvVisaPlan', current.visaPlan || '—');
    app.setText('#customerBmvQuoteAmount', current.quoteAmount || '待生成');
    app.setText('#customerBmvNextStep', current.nextStep || app.resolveBmvNextStep(current));
    app.setText('#customerBmvRecipientHint', app.getBmvRecipientHint(customer, current));

    if (channelSelect) channelSelect.value = String(current.deliveryChannel || 'email');
    if (sendBtn) sendBtn.textContent = String(current.questionnaireStatus || '') === 'not_sent' ? '发送问卷' : '重新发送问卷';
    if (gateHint) {
      gateHint.textContent = app.canCreateCaseFromCustomer(customer) ? '已完成签约，可转正式案件' : '签约前不可建案；请先完成问卷、报价、签约';
    }

    app.setDisabled(sendBtn, Boolean(app.getBmvSendBlockedMessage(customer, current)));
    app.setDisabled(quoteBtn, Boolean(app.getBmvQuoteBlockedMessage(current)));
    app.setDisabled(signBtn, Boolean(app.getBmvSignBlockedMessage(current)));
  };

  app.updateActionAvailability = function () {
    var customer = getCustomer();
    var hasCustomer = Boolean(customer);
    var canCreateCase = app.canCreateCaseFromCustomer(customer);
    var blocked = app.getCreateCaseBlockedMessage(customer);
    var editBtn = document.getElementById('customerEditToggleBtn');
    var addRelationBtn = document.getElementById('customerAddRelationBtn');
    var addCommBtn = document.getElementById('customerAddCommBtn');

    [document.getElementById('customerCreateCaseBtn')].concat(app.$$('[data-create-case]')).filter(Boolean).forEach(function (button) {
      app.setDisabled(button, !hasCustomer || !canCreateCase);
      button.title = blocked || '开始办案';
    });

    [document.getElementById('customerBatchCreateBtn')].concat(app.$$('[data-batch-case]')).filter(Boolean).forEach(function (button) {
      app.setDisabled(button, !hasCustomer || !canCreateCase);
      button.title = blocked || '批量开始办案';
    });

    app.setDisabled(editBtn, !hasCustomer);
    app.setDisabled(addRelationBtn, !hasCustomer);
    app.setDisabled(addCommBtn, !hasCustomer);
  };

	  app.getLatestCaseCreatedAt = function (cases) {
	    return (cases || []).reduce(function (latest, item) {
	      var next = app.toDateOnly(item && (item.createdAt || item.updatedAt));
	      if (!next) return latest;
	      return !latest || next > latest ? next : latest;
	    }, '');
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
	    var latestCreatedAt = app.getLatestCaseCreatedAt(cases);

    app.setText('[data-cases-total]', String(total));
    app.setText('[data-cases-active]', String(active));
    app.setText('[data-cases-archived]', String(archived));
	    app.setText('[data-cases-last-created]', latestCreatedAt || '—');

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

    createBtns.forEach(function (button) {
      button.onclick = function () {
        var customer = getCustomer();
        var blocked = app.getCreateCaseBlockedMessage(customer);
        if (blocked) {
          app.showToast({ title: '无法建案', desc: blocked });
          return;
        }
        window.location.href = app.buildCreateCaseUrl(customer, 'single');
      };
    });

    batchBtns.forEach(function (button) {
      button.onclick = function () {
        var customer = getCustomer();
        var blocked = app.getCreateCaseBlockedMessage(customer);
        if (blocked) {
          app.showToast({ title: '无法建案', desc: blocked });
          return;
        }
        window.location.href = app.buildCreateCaseUrl(customer, 'batch');
      };
    });

    app.updateActionAvailability();

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
        app.renderBmvIntake();
        app.updateActionAvailability();
        if (app.renderLogs) app.renderLogs();
      };
    }

    var bmvChannelSelect = document.getElementById('customerBmvChannelSelect');
    if (bmvChannelSelect) {
      bmvChannelSelect.addEventListener('change', function () {
        var customer = getCustomer();
        if (!app.isBmvCustomer(customer)) return;
        app.commitCustomerStore(function (nextCustomer) {
          var profile = ensureBmvProfile(nextCustomer);
          profile.deliveryChannel = String(bmvChannelSelect.value || 'email');
          profile.nextStep = profile.nextStep || app.resolveBmvNextStep(profile);
        });
      });
    }

    var bmvSendBtn = document.getElementById('customerBmvSendBtn');
    if (bmvSendBtn) {
      bmvSendBtn.addEventListener('click', function () {
        var customer = getCustomer();
        var profile = app.getBmvProfile(customer);
        var blocked = app.getBmvSendBlockedMessage(customer, profile);
        if (blocked) {
          app.showToast({ title: '无法发送', desc: blocked });
          return;
        }

        app.commitCustomerStore(function (nextCustomer) {
          var nextProfile = ensureBmvProfile(nextCustomer);
          var channelLabel = app.getBmvChannelLabel(nextProfile.deliveryChannel);
          var recipient = app.getBmvRecipientHint(nextCustomer, nextProfile)
            .replace(/^将发送到邮箱：/, '')
            .replace(/^将通过 LINE 发送链接（示意），联系号码：/, '')
            .replace(/^将通过微信发送链接（示意），联系号码：/, '');
          nextProfile.questionnaireStatus = 'sent';
          nextProfile.intakeStatus = app.resolveBmvIntakeStatus(nextProfile);
          nextProfile.nextStep = '等待客户回收问卷';
          updateBmvLastContact(nextCustomer, channelLabel);
          appendBmvComm(
            nextCustomer,
            nextProfile,
            '发送经营管理签问卷',
            '已通过' + channelLabel + '发送“' + String(nextProfile.questionnaireName || '') + '”，收件目标：' + recipient + '。',
            '等待客户回填问卷后生成报价',
            'customer'
          );
          appendBmvLog(nextCustomer, 'comm', '发送经营管理签问卷（' + channelLabel + '）');
        });
        app.showToast({ title: '问卷已发送（示例）', desc: '已记录发送渠道，并写入沟通记录与最近联系' });
      });
    }

    var bmvQuoteBtn = document.getElementById('customerBmvQuoteBtn');
    if (bmvQuoteBtn) {
      bmvQuoteBtn.addEventListener('click', function () {
        var customer = getCustomer();
        var profile = app.getBmvProfile(customer);
        var blocked = app.getBmvQuoteBlockedMessage(profile);
        if (blocked) {
          app.showToast({ title: '无法生成报价', desc: blocked });
          return;
        }

        app.commitCustomerStore(function (nextCustomer) {
          var nextProfile = ensureBmvProfile(nextCustomer);
          nextProfile.questionnaireStatus = 'returned';
          nextProfile.quoteStatus = 'generated';
          if (!String(nextProfile.quoteAmount || '').trim()) nextProfile.quoteAmount = '¥350,000';
          if (!String(nextProfile.visaPlan || '').trim()) nextProfile.visaPlan = '4年 + 1年经营计划';
          nextProfile.intakeStatus = app.resolveBmvIntakeStatus(nextProfile);
          nextProfile.nextStep = '与客户确认报价并推进签约';
          updateBmvLastContact(nextCustomer, '报价跟进');
          appendBmvComm(
            nextCustomer,
            nextProfile,
            '问卷已回收并生成报价',
            '已确认客户回收问卷，生成经营管理签报价 ' + nextProfile.quoteAmount + '（' + nextProfile.visaPlan + '）。',
            '确认签约时间并准备转正式案件',
            'customer',
            app.getBmvCommType(nextProfile)
          );
          appendBmvLog(nextCustomer, 'info', '经营管理签报价已生成：' + nextProfile.quoteAmount + ' / ' + nextProfile.visaPlan);
        });
        app.showToast({ title: '报价已生成（示例）', desc: '问卷状态已更新为已回收，并沉淀报价记录' });
      });
    }

    var bmvSignBtn = document.getElementById('customerBmvSignBtn');
    if (bmvSignBtn) {
      bmvSignBtn.addEventListener('click', function () {
        var customer = getCustomer();
        var profile = app.getBmvProfile(customer);
        var blocked = app.getBmvSignBlockedMessage(profile);
        if (blocked) {
          app.showToast({ title: '无法确认签约', desc: blocked });
          return;
        }

        app.commitCustomerStore(function (nextCustomer) {
          var nextProfile = ensureBmvProfile(nextCustomer);
          nextProfile.signStatus = 'signed';
          nextProfile.quoteStatus = 'confirmed';
          nextProfile.intakeStatus = app.resolveBmvIntakeStatus(nextProfile);
          nextProfile.nextStep = '可转正式案件并生成资料清单';
          updateBmvLastContact(nextCustomer, '合同签署');
          appendBmvComm(
            nextCustomer,
            nextProfile,
            '确认经营管理签签约',
            '已完成签约确认，报价转为已确认，可进入正式建案阶段。',
            '点击“转正式案件”进入办案创建页',
            'internal',
            'meeting'
          );
          appendBmvLog(nextCustomer, 'case', '经营管理签已签约，开放转正式案件入口');
        });
        app.showToast({ title: '已确认签约（示例）', desc: '建案门禁已解除，可转正式案件' });
      });
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
    app.renderBmvIntake();
    app.updateActionAvailability();
    app.initTabs();
    app.initActions();
  });
})();
