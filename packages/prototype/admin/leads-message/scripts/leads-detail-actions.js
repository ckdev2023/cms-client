(function () {
  'use strict';

  var app = window.LeadsDetailPage;
  if (!app) return;

  function bindTabs() {
    app.dom.tabBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        app.activateTab(btn.getAttribute('data-tab'));
      });

      btn.addEventListener('keydown', function (e) {
        var tabs = app.dom.tabBtns;
        var idx = tabs.indexOf(btn);
        var next = -1;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          next = (idx + 1) % tabs.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          next = (idx - 1 + tabs.length) % tabs.length;
        } else if (e.key === 'Home') {
          next = 0;
        } else if (e.key === 'End') {
          next = tabs.length - 1;
        }

        if (next >= 0) {
          e.preventDefault();
          var target = tabs[next];
          app.activateTab(target.getAttribute('data-tab'));
          target.focus();
        }
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
    if (el) {
      el.value = sample.groupLabel || '';
      el.setAttribute('data-default-group', sample.groupLabel || '');
    }
    el = app.$('modalCusGroupReason');
    if (el) el.value = '';
    toggleReasonWrap('modalCusGroup', 'modalCusGroupReasonWrap', 'modalCusGroupReason');
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
    if (el) {
      el.value = sample.groupLabel || '';
      el.setAttribute('data-default-group', sample.groupLabel || '');
    }
    el = app.$('modalCaseGroupReason');
    if (el) el.value = '';
    toggleReasonWrap('modalCaseGroup', 'modalCaseGroupReasonWrap', 'modalCaseGroupReason');

    if (app.applyConversionCopy) {
      app.applyConversionCopy(sample);
    }
  }

  function prefillStatusChangeModal() {
    var sample = app.getSample();
    var nextValue = app.$('statusNextValue');
    var reason = app.$('statusChangeReason');
    if (!sample || !nextValue) return;

    nextValue.value = sample.status === 'converted_case' ? 'signed' : (sample.status || 'following');
    if (reason) reason.value = '';
  }

  function getEditOptions() {
    var cfg = app.getConfig();
    return cfg && cfg.DETAIL_EDIT_OPTIONS ? cfg.DETAIL_EDIT_OPTIONS : {
      sources: [],
      businessTypes: [],
      languages: [],
      owners: [],
      groups: [],
    };
  }

  function setSelectOptions(selectId, items, placeholderLabel) {
    var select = app.$(selectId);
    if (!select) return;

    var html = '';
    if (placeholderLabel) {
      html += '<option value="">' + app.esc(placeholderLabel) + '</option>';
    }

    (items || []).forEach(function (item) {
      var value = typeof item === 'string' ? item : item.value;
      var label = typeof item === 'string' ? item : item.label;
      html += '<option value="' + app.esc(value) + '">' + app.esc(label) + '</option>';
    });

    select.innerHTML = html;
  }

  function populateEditInfoOptions() {
    var options = getEditOptions();
    setSelectOptions('editLeadSource', options.sources, '请选择来源');
    setSelectOptions('editLeadBusinessType', options.businessTypes, '请选择业务类型');
    setSelectOptions('editLeadLanguage', options.languages, '请选择语言');
    setSelectOptions('editLeadOwner', options.owners);
    setSelectOptions('editLeadGroup', options.groups);
  }

  function findOwnerOptionById(ownerId) {
    return getEditOptions().owners.filter(function (item) {
      return item.value === ownerId;
    })[0] || null;
  }

  function findOwnerOptionByLabel(ownerLabel) {
    return getEditOptions().owners.filter(function (item) {
      return item.label === ownerLabel;
    })[0] || null;
  }

  function findGroupOptionById(groupId) {
    return getEditOptions().groups.filter(function (item) {
      return item.value === groupId;
    })[0] || null;
  }

  function findGroupOptionByLabel(groupLabel) {
    return getEditOptions().groups.filter(function (item) {
      return item.label === groupLabel;
    })[0] || null;
  }

  function prefillEditInfoModal() {
    var sample = app.getSample();
    if (!sample) return;

    var info = sample.info || {};
    var ownerOption = findOwnerOptionById(sample.ownerId) || findOwnerOptionByLabel(sample.ownerLabel);
    var groupOption = findGroupOptionById(sample.groupId) || findGroupOptionByLabel(sample.groupLabel);
    var el;

    el = app.$('editLeadName');
    if (el) el.value = info.name || sample.name || '';
    el = app.$('editLeadPhone');
    if (el) el.value = info.phone || '';
    el = app.$('editLeadEmail');
    if (el) el.value = info.email || '';
    el = app.$('editLeadSource');
    if (el) el.value = info.source || '';
    el = app.$('editLeadReferrer');
    if (el) el.value = info.referrer || '';
    el = app.$('editLeadBusinessType');
    if (el) el.value = info.businessType || '';
    el = app.$('editLeadLanguage');
    if (el) el.value = info.language || '';
    el = app.$('editLeadOwner');
    if (el) el.value = ownerOption ? ownerOption.value : '';
    el = app.$('editLeadGroup');
    if (el) {
      el.value = groupOption ? groupOption.value : '';
      el.setAttribute('data-default-group', groupOption ? groupOption.value : '');
    }
    el = app.$('editLeadNote');
    if (el) el.value = info.note || '';
    el = app.$('editLeadGroupReason');
    if (el) el.value = '';

    toggleReasonWrap('editLeadGroup', 'editLeadGroupReasonWrap', 'editLeadGroupReason');
  }

  function transitionAfterConversion(nextSampleKey, toast) {
    var cfg = app.getConfig();
    if (cfg && cfg.DETAIL_SAMPLES && cfg.DETAIL_SAMPLES[nextSampleKey]) {
      app.renderSample(nextSampleKey);
      app.activateTab('conversion');
    }

    app.showToast(toast.title, toast.desc);
  }

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function toggleReasonWrap(inputId, wrapId, reasonId) {
    var input = app.$(inputId);
    var wrap = app.$(wrapId);
    var reason = app.$(reasonId);
    if (!input || !wrap) return false;

    var defaultGroup = (input.getAttribute('data-default-group') || '').trim();
    var currentValue = (input.value || '').trim();
    var changed = !!currentValue && currentValue !== defaultGroup;

    wrap.classList.toggle('hidden', !changed);
    if (!changed && reason) reason.value = '';
    return changed;
  }

  function bindGroupReasonToggle(inputId, wrapId, reasonId) {
    var input = app.$(inputId);
    if (!input) return;
    input.addEventListener('input', function () {
      toggleReasonWrap(inputId, wrapId, reasonId);
    });
  }

  function getStatusLabel(statusKey) {
    var cfg = app.getConfig();
    return cfg && cfg.DETAIL_STATUSES && cfg.DETAIL_STATUSES[statusKey]
      ? cfg.DETAIL_STATUSES[statusKey].label
      : statusKey;
  }

  function buildEntityId(prefix, leadId) {
    var suffix = (leadId || '').split('-').pop() || '0000';
    return prefix + '-2026-' + suffix;
  }

  function buildDateLabel(timeLabel) {
    return String(timeLabel || '').split(' ')[0];
  }

  function buildOwnerInitials(ownerLabel) {
    if (!ownerLabel) return '';
    return ownerLabel.length > 2 ? ownerLabel.slice(0, 2) : ownerLabel.charAt(0);
  }

  function buildStatusLog(operator, timeLabel, fromValue, toValue) {
    return {
      type: 'status',
      operator: operator,
      time: timeLabel,
      fromValue: fromValue,
      toValue: toValue,
      chipClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  function buildGroupLog(operator, timeLabel, fromValue, toValue, reason) {
    return {
      type: 'group',
      operator: operator,
      time: timeLabel,
      fromValue: fromValue,
      toValue: reason ? toValue + '（原因：' + reason + '）' : toValue,
      chipClass: 'bg-violet-100 text-violet-700',
    };
  }

  function buildOwnerLog(operator, timeLabel, fromValue, toValue) {
    return {
      type: 'owner',
      operator: operator,
      time: timeLabel,
      fromValue: fromValue,
      toValue: toValue,
      chipClass: 'bg-emerald-100 text-emerald-700',
    };
  }

  function buildInfoLog(operator, timeLabel, fields) {
    return {
      type: 'info',
      operator: operator,
      time: timeLabel,
      fromValue: '基础信息',
      toValue: '已更新：' + fields.join('、'),
      chipClass: 'bg-amber-100 text-amber-700',
    };
  }

  function createCustomerConversionRecord(sample, groupLabel, timeLabel, operator, reason) {
    return {
      id: buildEntityId('CUS', sample.id),
      name: sample.name,
      group: groupLabel,
      link: '../customers/index.html',
      convertedAt: buildDateLabel(timeLabel),
      convertedBy: operator,
      auditNote: reason ? '改组原因：' + reason : '',
    };
  }

  function createCaseConversionRecord(sample, caseType, groupLabel, timeLabel, operator, reason) {
    return {
      id: buildEntityId('CAS', sample.id),
      title: sample.name + ' ' + caseType,
      type: caseType,
      group: groupLabel,
      link: '../case/detail.html',
      convertedAt: buildDateLabel(timeLabel),
      convertedBy: operator,
      auditNote: reason ? '改组原因：' + reason : '',
    };
  }

  function buildConversionSample(kind, sourceSample, formState) {
    var nextSample = deepClone(sourceSample);
    var nextGroup = formState.group || sourceSample.groupLabel || '';
    var operator = formState.owner || sourceSample.ownerLabel || '系统';
    var timeLabel = formatNow();
    var groupChanged = nextGroup && nextGroup !== sourceSample.groupLabel;
    var reason = formState.reason || '';
    var hadCustomer = !!(sourceSample.conversion && sourceSample.conversion.convertedCustomer);
    var baseLogs = deepClone(sourceSample.log || []);
    var newLogs = [];
    var conversions = [];
    var customerRecord = hadCustomer
      ? deepClone(sourceSample.conversion.convertedCustomer)
      : createCustomerConversionRecord(sourceSample, nextGroup, timeLabel, operator, kind === 'customer' ? reason : '');
    var caseRecord = sourceSample.conversion && sourceSample.conversion.convertedCase
      ? deepClone(sourceSample.conversion.convertedCase)
      : null;
    var caseType = formState.caseType || (sourceSample.info && sourceSample.info.businessType) || '案件';

    nextSample.banner = null;
    nextSample.readonly = false;
    nextSample.groupLabel = nextGroup;
    nextSample.ownerLabel = operator;
    nextSample.ownerInitials = buildOwnerInitials(operator);
    nextSample.info = nextSample.info || {};
    nextSample.info.group = nextGroup;
    nextSample.info.owner = operator;

    if (groupChanged) {
      newLogs.push(buildGroupLog(operator, timeLabel, sourceSample.groupLabel || '—', nextGroup, reason));
    }

    if (kind === 'customer') {
      nextSample.status = 'signed';
      nextSample.buttons = 'convertedCustomer';
      customerRecord.group = nextGroup;
      customerRecord.convertedAt = buildDateLabel(timeLabel);
      customerRecord.convertedBy = operator;
      customerRecord.auditNote = reason ? '改组原因：' + reason : '';
      conversions.push({
        type: 'customer',
        id: customerRecord.id,
        label: nextSample.name + ' → 建立客户档案',
        time: customerRecord.convertedAt,
        operator: operator,
        note: customerRecord.auditNote,
      });
      newLogs.push(buildStatusLog(operator, timeLabel, getStatusLabel(sourceSample.status), '已建客户档案（' + customerRecord.id + '）'));
      nextSample.conversion = {
        dedupResult: null,
        convertedCustomer: customerRecord,
        convertedCase: null,
        conversions: conversions,
      };
      nextSample.info.note = sourceSample.info.note;
      nextSample.log = newLogs.concat(baseLogs);
      return nextSample;
    }

    nextSample.status = 'converted_case';
    nextSample.buttons = 'convertedCase';
    customerRecord.group = nextGroup;
    customerRecord.convertedBy = customerRecord.convertedBy || operator;
    customerRecord.auditNote = reason ? '改组原因：' + reason : (customerRecord.auditNote || '');

    if (!hadCustomer) {
      customerRecord.convertedAt = buildDateLabel(timeLabel);
      customerRecord.convertedBy = operator;
      conversions.push({
        type: 'customer',
        id: customerRecord.id,
        label: nextSample.name + ' → 建立客户档案',
        time: customerRecord.convertedAt,
        operator: operator,
        note: customerRecord.auditNote,
      });
      newLogs.push(buildStatusLog(operator, timeLabel, getStatusLabel(sourceSample.status), '已建客户档案（' + customerRecord.id + '）'));
    } else if (sourceSample.conversion && sourceSample.conversion.conversions) {
      conversions = deepClone(sourceSample.conversion.conversions);
    }

    caseRecord = createCaseConversionRecord(sourceSample, caseType, nextGroup, timeLabel, operator, reason);
    conversions.push({
      type: 'case',
      id: caseRecord.id,
      label: caseRecord.title + ' → 创建案件',
      time: caseRecord.convertedAt,
      operator: operator,
      note: caseRecord.auditNote,
    });
    newLogs.push(
      buildStatusLog(
        operator,
        timeLabel,
        hadCustomer ? '已建客户档案（' + customerRecord.id + '）' : '已签约',
        '已创建案件（' + caseRecord.id + '）'
      )
    );

    nextSample.conversion = {
      dedupResult: null,
      convertedCustomer: customerRecord,
      convertedCase: caseRecord,
      conversions: conversions,
    };
    nextSample.info.businessType = caseType;
    nextSample.info.note = sourceSample.info.note;
    nextSample.log = newLogs.concat(baseLogs);
    return nextSample;
  }

  function collectConversionFormState(kind, sourceSample) {
    var groupInputId = kind === 'customer' ? 'modalCusGroup' : 'modalCaseGroup';
    var reasonInputId = kind === 'customer' ? 'modalCusGroupReason' : 'modalCaseGroupReason';
    var groupInput = app.$(groupInputId);
    var reasonInput = app.$(reasonInputId);
    var state = {
      group: groupInput && groupInput.value.trim() ? groupInput.value.trim() : (sourceSample.groupLabel || ''),
      reason: reasonInput && reasonInput.value.trim() ? reasonInput.value.trim() : '',
      owner: kind === 'case' && app.$('modalCaseOwner') ? app.$('modalCaseOwner').value.trim() : sourceSample.ownerLabel,
      caseType: kind === 'case' && app.$('modalCaseType') ? app.$('modalCaseType').value.trim() : (sourceSample.info ? sourceSample.info.businessType : ''),
    };

    if (state.group !== (sourceSample.groupLabel || '') && !state.reason) {
      app.showToast('请填写改组原因', '调整所属组时需要记录原因，便于后续留痕与审计');
      return null;
    }

    if (kind === 'case' && !state.caseType) {
      app.showToast('请填写案件类型', '建档前需要确认案件类型/签证类型');
      return null;
    }

    return state;
  }

  function collectEditInfoFormState(sample) {
    var ownerInput = app.$('editLeadOwner');
    var groupInput = app.$('editLeadGroup');
    var reasonInput = app.$('editLeadGroupReason');
    var ownerOption =
      (ownerInput && findOwnerOptionById(ownerInput.value)) ||
      findOwnerOptionById(sample.ownerId) ||
      findOwnerOptionByLabel(sample.ownerLabel) || {
        value: sample.ownerId || '',
        label: sample.ownerLabel || '—',
        initials: buildOwnerInitials(sample.ownerLabel || ''),
        avatarClass: sample.ownerAvatarClass || '',
      };
    var groupOption =
      (groupInput && findGroupOptionById(groupInput.value)) ||
      findGroupOptionById(sample.groupId) ||
      findGroupOptionByLabel(sample.groupLabel) || {
        value: sample.groupId || '',
        label: sample.groupLabel || '—',
      };
    var state = {
      name: app.$('editLeadName') ? app.$('editLeadName').value.trim() : '',
      phone: app.$('editLeadPhone') ? app.$('editLeadPhone').value.trim() : '',
      email: app.$('editLeadEmail') ? app.$('editLeadEmail').value.trim() : '',
      source: app.$('editLeadSource') ? app.$('editLeadSource').value.trim() : '',
      referrer: app.$('editLeadReferrer') ? app.$('editLeadReferrer').value.trim() : '',
      businessType: app.$('editLeadBusinessType') ? app.$('editLeadBusinessType').value.trim() : '',
      language: app.$('editLeadLanguage') ? app.$('editLeadLanguage').value.trim() : '',
      note: app.$('editLeadNote') ? app.$('editLeadNote').value.trim() : '',
      owner: ownerOption,
      group: groupOption,
      groupReason: reasonInput && reasonInput.value.trim() ? reasonInput.value.trim() : '',
    };

    if (!state.name) {
      app.showToast('请填写姓名', '保存基础信息前需要补全线索姓名');
      return null;
    }

    if (state.group.label !== (sample.groupLabel || '') && !state.groupReason) {
      app.showToast('请填写改组原因', '修改所属组时需要记录原因，便于后续留痕与审计');
      return null;
    }

    return state;
  }

  function applyInfoEdit() {
    var cfg = app.getConfig();
    var sample = app.getSample();
    if (!cfg || !sample || sample.readonly) return;

    var state = collectEditInfoFormState(sample);
    var info = sample.info || {};
    var changedInfoLabels = [];
    var nextSample;
    var timeLabel;
    var nextLogs = [];
    var operator = '管理员';
    var ownerChanged;
    var groupChanged;
    var infoFieldMap;

    if (!state) return;

    infoFieldMap = [
      { key: 'name', label: '姓名', current: info.name || sample.name || '', next: state.name },
      { key: 'phone', label: '电话', current: info.phone || '', next: state.phone },
      { key: 'email', label: '邮箱', current: info.email || '', next: state.email },
      { key: 'source', label: '来源', current: info.source || '', next: state.source },
      { key: 'referrer', label: '介绍人', current: info.referrer || '', next: state.referrer },
      { key: 'businessType', label: '意向业务类型', current: info.businessType || '', next: state.businessType },
      { key: 'language', label: '首选语言', current: info.language || '', next: state.language },
      { key: 'note', label: '备注', current: info.note || '', next: state.note },
    ];

    infoFieldMap.forEach(function (field) {
      if (field.current !== field.next) changedInfoLabels.push(field.label);
    });

    ownerChanged = state.owner.label !== (sample.ownerLabel || '');
    groupChanged = state.group.label !== (sample.groupLabel || '');

    if (!changedInfoLabels.length && !ownerChanged && !groupChanged) {
      app.showToast('未检测到变更', '基础信息未修改，无需保存');
      return;
    }

    nextSample = deepClone(sample);
    timeLabel = formatNow();
    nextSample.name = state.name;
    nextSample.info = nextSample.info || {};
    nextSample.info.name = state.name;
    nextSample.info.phone = state.phone;
    nextSample.info.email = state.email;
    nextSample.info.source = state.source;
    nextSample.info.referrer = state.referrer;
    nextSample.info.businessType = state.businessType;
    nextSample.info.language = state.language;
    nextSample.info.note = state.note;

    nextSample.ownerId = state.owner.value || sample.ownerId || '';
    nextSample.ownerLabel = state.owner.label || sample.ownerLabel || '';
    nextSample.ownerInitials = state.owner.initials || buildOwnerInitials(nextSample.ownerLabel);
    nextSample.ownerAvatarClass = state.owner.avatarClass || sample.ownerAvatarClass || '';
    nextSample.info.owner = nextSample.ownerLabel;

    nextSample.groupId = state.group.value || sample.groupId || '';
    nextSample.groupLabel = state.group.label || sample.groupLabel || '';
    nextSample.info.group = nextSample.groupLabel;

    if (nextSample.conversion && nextSample.conversion.convertedCustomer) {
      nextSample.conversion.convertedCustomer.name = nextSample.name;
      nextSample.conversion.convertedCustomer.group = nextSample.groupLabel;
    }

    if (nextSample.conversion && nextSample.conversion.convertedCase) {
      nextSample.conversion.convertedCase.group = nextSample.groupLabel;
      nextSample.conversion.convertedCase.title =
        nextSample.name + ' ' + (nextSample.conversion.convertedCase.type || nextSample.info.businessType || '案件');
    }

    if (nextSample.conversion && nextSample.conversion.conversions) {
      nextSample.conversion.conversions.forEach(function (item) {
        if (item.type === 'customer') {
          item.label = nextSample.name + ' → 建立客户档案';
          return;
        }

        if (item.type === 'case') {
          var caseType = nextSample.conversion.convertedCase
            ? nextSample.conversion.convertedCase.type
            : (nextSample.info.businessType || '案件');
          item.label = nextSample.name + ' ' + caseType + ' → 创建案件';
        }
      });
    }

    if (changedInfoLabels.length) {
      nextLogs.push(buildInfoLog(operator, timeLabel, changedInfoLabels));
    }
    if (ownerChanged) {
      nextLogs.push(buildOwnerLog(operator, timeLabel, sample.ownerLabel || '—', nextSample.ownerLabel || '—'));
    }
    if (groupChanged) {
      nextLogs.push(buildGroupLog(operator, timeLabel, sample.groupLabel || '—', nextSample.groupLabel || '—', state.groupReason));
    }

    nextSample.log = nextLogs.concat(deepClone(sample.log || []));
    cfg.DETAIL_SAMPLES[app.state.currentSampleKey] = nextSample;
    app.closeModal('editInfoModal');
    app.renderSample(app.state.currentSampleKey);
    app.showToast(cfg.DETAIL_TOASTS.infoUpdated.title, cfg.DETAIL_TOASTS.infoUpdated.desc);
  }

  function upsertRuntimeSample(targetKey, sample) {
    var cfg = app.getConfig();
    if (!cfg || !cfg.DETAIL_SAMPLES) return false;
    cfg.DETAIL_SAMPLES[targetKey] = sample;
    return true;
  }

  function applyStatusChange() {
    var cfg = app.getConfig();
    var sample = app.getSample();
    var nextValueEl = app.$('statusNextValue');
    var reasonEl = app.$('statusChangeReason');
    if (!cfg || !sample || !nextValueEl || !reasonEl) return;

    var nextStatus = nextValueEl.value;
    var reason = reasonEl.value.trim();
    if (!reason) {
      app.showToast('请填写状态原因', '状态推进需要记录原因，便于事务所内部追踪');
      return;
    }

    var nextSample = deepClone(sample);
    var timeLabel = formatNow();
    nextSample.status = nextStatus;
    nextSample.readonly = nextStatus === 'lost';
    nextSample.banner = nextStatus === 'lost' ? 'lost' : (nextStatus === 'signed' && !nextSample.conversion.convertedCase ? 'signedNotConverted' : null);
    nextSample.buttons = nextStatus === 'lost'
      ? 'lost'
      : (nextSample.conversion && nextSample.conversion.convertedCase
          ? 'convertedCase'
          : (nextSample.conversion && nextSample.conversion.convertedCustomer ? 'convertedCustomer' : (nextStatus === 'signed' ? 'signedNotConverted' : 'normal')));
    nextSample.log = [
      buildStatusLog(sample.ownerLabel || '系统', timeLabel, getStatusLabel(sample.status), getStatusLabel(nextStatus) + '（原因：' + reason + '）'),
    ].concat(deepClone(sample.log || []));

    cfg.DETAIL_SAMPLES[app.state.currentSampleKey] = nextSample;
    app.closeModal('changeStatusModal');
    app.renderSample(app.state.currentSampleKey);
    app.showToast(cfg.DETAIL_TOASTS.statusChanged.title, cfg.DETAIL_TOASTS.statusChanged.desc.replace('{from}', getStatusLabel(sample.status)).replace('{to}', getStatusLabel(nextStatus)));
  }

  function bindActionButtons() {
    var cfg = app.getConfig();

    if (app.dom.btnEditInfo) {
      app.dom.btnEditInfo.addEventListener('click', function () {
        var sample = app.getSample();
        if (!sample || sample.readonly) return;
        prefillEditInfoModal();
        app.openModal('editInfoModal');
      });
    }

    if (app.dom.btnEditInfoTab) {
      app.dom.btnEditInfoTab.addEventListener('click', function () {
        var sample = app.getSample();
        if (!sample || sample.readonly) return;
        prefillEditInfoModal();
        app.openModal('editInfoModal');
      });
    }

    if (app.dom.btnChangeStatus) {
      app.dom.btnChangeStatus.addEventListener('click', function () {
        prefillStatusChangeModal();
        app.openModal('changeStatusModal');
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
    var confirmEditInfo = app.$('confirmEditInfo');
    var confirmConvertCustomer = app.$('confirmConvertCustomer');
    var confirmConvertCase = app.$('confirmConvertCase');
    var confirmStatusChange = app.$('confirmStatusChange');

    if (confirmEditInfo) {
      confirmEditInfo.addEventListener('click', applyInfoEdit);
    }

    if (confirmConvertCustomer) {
      confirmConvertCustomer.addEventListener('click', function () {
        var sample = app.getSample();
        var formState = sample ? collectConversionFormState('customer', sample) : null;
        var nextSample = sample && formState ? buildConversionSample('customer', sample, formState) : null;
        if (!sample || !formState || !nextSample) return;
        upsertRuntimeSample('converted-customer', nextSample);
        app.closeModal('convertCustomerModal');
        transitionAfterConversion('converted-customer', {
          title: cfg.DETAIL_TOASTS.convertCustomer.title,
          desc: cfg.DETAIL_TOASTS.convertCustomer.desc.replace('{name}', sample.name),
        });
      });
    }

    if (confirmConvertCase) {
      confirmConvertCase.addEventListener('click', function () {
        var sample = app.getSample();
        var formState = sample ? collectConversionFormState('case', sample) : null;
        var nextSample = sample && formState ? buildConversionSample('case', sample, formState) : null;
        var toastKey = sample && sample.buttons === 'signedNotConverted' ? 'convertCaseWithCustomer' : 'convertCase';
        if (!sample || !formState || !nextSample) return;
        upsertRuntimeSample('converted-case', nextSample);
        app.closeModal('convertCaseModal');
        transitionAfterConversion('converted-case', {
          title: cfg.DETAIL_TOASTS[toastKey].title,
          desc: cfg.DETAIL_TOASTS[toastKey].desc.replace('{title}', nextSample.name + ' ' + (nextSample.conversion.convertedCase ? nextSample.conversion.convertedCase.type : '')),
        });
      });
    }

    if (confirmStatusChange) {
      confirmStatusChange.addEventListener('click', applyStatusChange);
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
      prefillConvertCaseModal();
      app.openModal('convertCaseModal');
    });
  }

  function buildFollowupItemHtml(followup) {
    var dotColor = app.CHANNEL_DOT_COLOR[followup.channel] || 'bg-gray-400';
    var chipClass = app.CHANNEL_CHIP_BG[followup.channel] || '';

    return (
      '<div class="timeline-item">' +
      '<div class="timeline-dot ' + dotColor + '"></div>' +
      '<div class="apple-card p-4"><div class="flex items-start justify-between gap-3"><div class="flex-1">' +
      '<div class="flex items-center gap-2 mb-2">' +
      '<span class="channel-chip ' + chipClass + '">' + app.esc(followup.channelLabel) + '</span>' +
      '<span class="text-[12px] text-[var(--muted-2)] font-semibold">' + app.esc(followup.time) + '</span>' +
      '<span class="text-[12px] text-[var(--muted-2)]">· ' + app.esc(followup.operator) + '</span></div>' +
      '<div class="text-[13px] text-[var(--text)] font-semibold leading-relaxed">' + app.esc(followup.summary) + '</div>' +
      '<div class="mt-2 text-[12px] text-[var(--muted-2)] space-y-0.5">' +
      (followup.conclusion ? '<div><span class="font-bold">结论：</span>' + app.esc(followup.conclusion) + '</div>' : '') +
      (followup.nextAction ? '<div><span class="font-bold">下一步：</span>' + app.esc(followup.nextAction) + '</div>' : '') +
      (followup.nextFollowUp ? '<div><span class="font-bold">下次跟进：</span>' + app.esc(followup.nextFollowUp) + '</div>' : '') +
      '</div></div>' +
      '<button class="btn-secondary px-2 py-1 text-[11px] flex-shrink-0 whitespace-nowrap" type="button" data-action="convert-task" title="一键转任务（示例功能）">' +
      '<svg class="w-3 h-3 mr-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>转任务</button>' +
      '</div></div></div>'
    );
  }

  function formatNow() {
    var d = new Date();
    var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '/' + pad(d.getMonth() + 1) + '/' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function bindModalFieldBehaviors() {
    populateEditInfoOptions();
    bindGroupReasonToggle('editLeadGroup', 'editLeadGroupReasonWrap', 'editLeadGroupReason');
    bindGroupReasonToggle('modalCusGroup', 'modalCusGroupReasonWrap', 'modalCusGroupReason');
    bindGroupReasonToggle('modalCaseGroup', 'modalCaseGroupReasonWrap', 'modalCaseGroupReason');
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

      var conclusionEl = app.$('fuConclusion');
      var nextActionEl = app.$('fuNextAction');
      var nextFollowUpEl = app.$('fuNextFollowUp');
      var sample = app.getSample();

      var newItem = {
        channel: channelEl.value,
        channelLabel: channelLabel,
        summary: summaryEl.value.trim(),
        conclusion: conclusionEl ? conclusionEl.value.trim() : '',
        nextAction: nextActionEl ? nextActionEl.value.trim() : '',
        nextFollowUp: nextFollowUpEl ? nextFollowUpEl.value : '',
        time: formatNow(),
        operator: sample ? sample.ownerLabel : '系统',
      };

      var timelineEl = app.$('followupTimelineList');
      if (timelineEl) {
        var html = buildFollowupItemHtml(newItem);
        timelineEl.insertAdjacentHTML('afterbegin', html);
      }

      var emptyEl = app.$('followupEmptyState');
      if (emptyEl) emptyEl.classList.add('hidden');

      app.showToast(
        cfg.DETAIL_TOASTS.followUpAdded.title,
        cfg.DETAIL_TOASTS.followUpAdded.desc.replace('{channel}', channelLabel)
      );

      channelEl.value = '';
      summaryEl.value = '';
      if (conclusionEl) conclusionEl.value = '';
      if (nextActionEl) nextActionEl.value = '';
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
        var sample = app.getSample();
        var msgEl = app.$('dedupConfirmMessage');
        if (msgEl && sample && sample.conversion && sample.conversion.dedupResult) {
          var dr = sample.conversion.dedupResult;
          msgEl.textContent =
            '系统检测到' +
            (dr.type === 'lead' ? '重复线索' : '重复客户') +
            '（' + (dr.matchedRecord ? dr.matchedRecord.name || dr.matchedRecord.id : '') + '）。' +
            '确认继续创建后，命中对象、确认人、确认时间将被记录留痕。';
        }
        app.openModal('dedupConfirmModal');
      });
    }

    var confirmDedupContinue = app.$('confirmDedupContinue');
    if (confirmDedupContinue) {
      confirmDedupContinue.addEventListener('click', function () {
        app.closeModal('dedupConfirmModal');
        app.showToast('已确认继续创建（示例）', '去重确认操作已留痕：命中对象、确认人、确认时间');
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
    bindModalFieldBehaviors();
    bindWarningBannerAction();
    bindFollowupForm();
    bindDelegatedActions();
    bindDedupActions();
  };

  app.init = function () {
    if (app.state.isInitialized) return;
    if (!app.getConfig()) return;

    app.cacheDom();
    if (typeof app.resolveInitialSampleKey === 'function') {
      app.setCurrentSampleKey(app.resolveInitialSampleKey());
    }
    app.state.isInitialized = true;
    app.bindEvents();
    app.renderSample(app.state.currentSampleKey);
  };
})();
