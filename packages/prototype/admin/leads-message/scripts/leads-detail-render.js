(function () {
  'use strict';

  var app = window.LeadsDetailPage;
  if (!app) return;

  app.resolveConversionCopy = function (sample) {
    var isSignedFlow = !!(sample && sample.buttons === 'signedNotConverted');

    return {
      warningText: isSignedFlow
        ? '该咨询已签约，请直接开始建档并创建首个案件。'
        : '该咨询已签约，请尽快建立客户档案并创建案件。',
      warningActionLabel: '立即开始建档',
      headerCustomerLabel: isSignedFlow ? '仅建客户档案' : '建立客户档案',
      headerCaseLabel: isSignedFlow ? '签约并开始建档' : '创建案件',
      customerCardTitle: isSignedFlow ? '仅建立客户档案' : '建立客户档案',
      customerCardDesc: isSignedFlow ? '如暂时不建案，可先建立客户档案' : '根据当前咨询建立客户档案',
      customerButtonLabel: isSignedFlow ? '仅建立客户档案' : '建立客户档案',
      caseCardTitle: isSignedFlow ? '签约并开始建档' : '创建案件',
      caseCardDesc: isSignedFlow ? '系统会先建立客户档案，再继续创建首个案件' : '为当前咨询创建案件',
      caseButtonLabel: isSignedFlow ? '签约并开始建档' : '创建案件',
      caseModalTitle: isSignedFlow ? '签约并开始建档' : '创建案件',
      caseModalDesc: isSignedFlow
        ? '会先建立客户档案，再为当前咨询创建首个案件。主申请人信息将自动带入。'
        : '为当前咨询创建案件。主申请人信息将自动带入。',
      caseModalConfirmLabel: isSignedFlow ? '确认并开始建档' : '确认创建案件',
    };
  };

  app.applyConversionCopy = function (sample) {
    var copy = app.resolveConversionCopy(sample);

    app.setText('warningBannerText', copy.warningText);
    app.setText('convertCustomerTitle', copy.customerCardTitle);
    app.setText('convertCustomerDesc', copy.customerCardDesc);
    app.setText('convertCaseTitle', copy.caseCardTitle);
    app.setText('convertCaseDesc', copy.caseCardDesc);
    app.setText('convertCaseModalTitle', copy.caseModalTitle);
    app.setText('convertCaseModalDesc', copy.caseModalDesc);

    if (app.dom.btnConvertCustomer) app.dom.btnConvertCustomer.textContent = copy.headerCustomerLabel;
    if (app.dom.btnConvertCase) app.dom.btnConvertCase.textContent = copy.headerCaseLabel;

    var warningButton = app.$('warningConvertBtn');
    if (warningButton) warningButton.textContent = copy.warningActionLabel;

    var customerButton = app.$('btnConvertCustomerTab');
    if (customerButton) customerButton.textContent = copy.customerButtonLabel;

    var caseButton = app.$('btnConvertCaseTab');
    if (caseButton) caseButton.textContent = copy.caseButtonLabel;

    var confirmCaseButton = app.$('confirmConvertCase');
    if (confirmCaseButton) confirmCaseButton.textContent = copy.caseModalConfirmLabel;
  };

  app.renderBanners = function (sample) {
    app.applyConversionCopy(sample);

    if (app.dom.readonlyBanner) {
      app.dom.readonlyBanner.classList.toggle('is-visible', sample.banner === 'lost');
    }
    if (app.dom.warningBanner) {
      app.dom.warningBanner.classList.toggle('is-visible', sample.banner === 'signedNotConverted');
    }
  };

  app.renderHeaderButtons = function (sample) {
    var cfg = app.getConfig();
    var matrix = cfg.HEADER_BUTTONS[sample.buttons] || cfg.HEADER_BUTTONS.normal;
    var copy = app.resolveConversionCopy(sample);

    app.applyBtnState(app.dom.btnConvertCustomer, matrix.convertCustomer, copy.headerCustomerLabel, '查看客户', 'btn-secondary');
    app.applyBtnState(app.dom.btnConvertCase, matrix.convertCase, copy.headerCaseLabel, '查看案件', 'btn-primary');

    if (app.dom.btnMarkLost) {
      app.dom.btnMarkLost.style.display = matrix.markLost === 'hidden' ? 'none' : '';
      app.dom.btnMarkLost.disabled = matrix.markLost === 'disabled';
      app.dom.btnMarkLost.style.opacity = matrix.markLost === 'disabled' ? '0.4' : '';
    }

    if (app.dom.btnEditInfo) {
      app.dom.btnEditInfo.disabled = matrix.editInfo === 'disabled';
      app.dom.btnEditInfo.style.opacity = matrix.editInfo === 'disabled' ? '0.4' : '';
    }

    if (app.dom.btnEditInfoTab) {
      app.dom.btnEditInfoTab.disabled = matrix.editInfo === 'disabled';
      app.dom.btnEditInfoTab.style.opacity = matrix.editInfo === 'disabled' ? '0.4' : '';
    }

    if (app.dom.btnChangeStatus) {
      app.dom.btnChangeStatus.style.display = matrix.changeStatus === 'hidden' ? 'none' : '';
    }
  };

  app.renderInfo = function (sample) {
    var info = sample.info || {};
    app.setText('infoId', info.id);
    app.setText('infoName', info.name);
    app.setText('infoPhone', info.phone || '—');
    app.setText('infoEmail', info.email || '—');
    app.setText('infoSource', info.source || '—');
    app.setText('infoReferrer', info.referrer || '—');
    app.setText('infoBusinessType', info.businessType || '—');
    app.setText('infoLanguage', info.language || '—');
    app.setText('infoNote', info.note || '—');

    var infoGroup = app.$('infoGroup');
    if (infoGroup) {
      infoGroup.innerHTML = '<span class="chip">' + app.esc(info.group || '—') + '</span>';
    }

    var infoOwner = app.$('infoOwner');
    if (infoOwner) {
      infoOwner.innerHTML =
        '<span class="w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ' +
        app.esc(sample.ownerAvatarClass || '') +
        '">' +
        app.esc(sample.ownerInitials || '') +
        '</span> ' +
        app.esc(info.owner || '—');
    }

    var refField = app.$('infoReferrer');
    if (refField) {
      var refWrap = refField.closest('div');
      if (refWrap && refWrap.parentElement) {
        refWrap.style.display = info.referrer ? '' : 'none';
      }
    }
  };

  app.renderFollowups = function (sample) {
    var list = sample.followups || [];
    var timelineEl = app.$('followupTimelineList');
    var emptyEl = app.$('followupEmptyState');
    var formCard = app.$('followupFormCard');

    if (!timelineEl) return;

    if (list.length === 0) {
      timelineEl.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (formCard) formCard.classList.remove('hidden');
      return;
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    if (formCard) formCard.classList.toggle('hidden', !!sample.readonly);

    var html = '';
    list.forEach(function (followup) {
      var dotColor = app.CHANNEL_DOT_COLOR[followup.channel] || 'bg-gray-400';
      var chipClass = app.CHANNEL_CHIP_BG[followup.channel] || '';

      html +=
        '<div class="timeline-item">' +
        '<div class="timeline-dot ' +
        dotColor +
        '"></div>' +
        '<div class="apple-card p-4"><div class="flex items-start justify-between gap-3"><div class="flex-1">' +
        '<div class="flex items-center gap-2 mb-2">' +
        '<span class="channel-chip ' +
        chipClass +
        '">' +
        app.esc(followup.channelLabel) +
        '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)] font-semibold">' +
        app.esc(followup.time) +
        '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)]">· ' +
        app.esc(followup.operator) +
        '</span></div>' +
        '<div class="text-[13px] text-[var(--text)] font-semibold leading-relaxed">' +
        app.esc(followup.summary) +
        '</div>' +
        '<div class="mt-2 text-[12px] text-[var(--muted-2)] space-y-0.5">' +
        (followup.conclusion ? '<div><span class="font-bold">结论：</span>' + app.esc(followup.conclusion) + '</div>' : '') +
        (followup.nextAction ? '<div><span class="font-bold">下一步：</span>' + app.esc(followup.nextAction) + '</div>' : '') +
        (followup.nextFollowUp ? '<div><span class="font-bold">下次跟进：</span>' + app.esc(followup.nextFollowUp) + '</div>' : '') +
        '</div></div>' +
        (sample.readonly
          ? ''
          : '<button class="btn-secondary px-2 py-1 text-[11px] flex-shrink-0 whitespace-nowrap" type="button" data-action="convert-task" title="一键转任务（示例功能）">' +
            '<svg class="w-3 h-3 mr-0.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>转任务</button>') +
        '</div></div></div>';
    });

    timelineEl.innerHTML = html;
  };

  app.renderConversion = function (sample) {
    app.applyConversionCopy(sample);

    var conversion = sample.conversion || {};
    var noMatch = app.$('dedupNoMatch');
    var hitPanel = app.$('dedupHitPanel');

    if (conversion.dedupResult) {
      if (noMatch) noMatch.classList.add('hidden');
      if (hitPanel) {
        hitPanel.classList.remove('hidden');
        app.setText('dedupHitMessage', conversion.dedupResult.message);

        var matchedRecord = conversion.dedupResult.matchedRecord || {};
        app.setText('dedupMatchName', matchedRecord.name || matchedRecord.id || '—');

        var meta = [];
        if (matchedRecord.id) meta.push(matchedRecord.id);
        if (matchedRecord.phone) meta.push(matchedRecord.phone);
        if (matchedRecord.email) meta.push(matchedRecord.email);
        if (matchedRecord.group) meta.push(matchedRecord.group);
        if (matchedRecord.statusLabel) meta.push(matchedRecord.statusLabel);
        if (matchedRecord.summary) meta.push(matchedRecord.summary);
        app.setText('dedupMatchMeta', meta.join(' · '));

        app.setText(
          'dedupHitTitle',
          conversion.dedupResult.type === 'lead' ? '发现重复咨询（按电话匹配）' : '发现重复客户档案（按邮箱匹配）'
        );
      }
    } else {
      if (noMatch) noMatch.classList.remove('hidden');
      if (hitPanel) hitPanel.classList.add('hidden');
    }

    var convertedRecords = app.$('convertedRecords');
    var customerCard = app.$('convertedCustomerCard');
    var caseCard = app.$('convertedCaseCard');
    var historyWrap = app.$('conversionHistory');
    var hasConverted = conversion.convertedCustomer || conversion.convertedCase;

    if (convertedRecords) convertedRecords.classList.toggle('hidden', !hasConverted);

    if (customerCard) {
      if (conversion.convertedCustomer) {
        customerCard.classList.remove('hidden');
        app.setText('convertedCusName', conversion.convertedCustomer.name + ' (' + conversion.convertedCustomer.id + ')');
        app.setText(
          'convertedCusMeta',
          '所属组 ' +
            conversion.convertedCustomer.group +
            ' · 创建于 ' +
            conversion.convertedCustomer.convertedAt +
            ' · ' +
            conversion.convertedCustomer.convertedBy +
            (conversion.convertedCustomer.auditNote ? ' · ' + conversion.convertedCustomer.auditNote : '')
        );
      } else {
        customerCard.classList.add('hidden');
      }
    }

    if (caseCard) {
      if (conversion.convertedCase) {
        caseCard.classList.remove('hidden');
        app.setText('convertedCaseName', conversion.convertedCase.title + ' (' + conversion.convertedCase.id + ')');
        app.setText(
          'convertedCaseMeta',
          conversion.convertedCase.type +
            ' · 所属组 ' +
            conversion.convertedCase.group +
            ' · 创建于 ' +
            conversion.convertedCase.convertedAt +
            ' · ' +
            conversion.convertedCase.convertedBy +
            (conversion.convertedCase.auditNote ? ' · ' + conversion.convertedCase.auditNote : '')
        );
      } else {
        caseCard.classList.add('hidden');
      }
    }

    if (historyWrap) {
      var conversions = conversion.conversions || [];
      if (conversions.length > 0) {
        historyWrap.classList.remove('hidden');
        var listEl = app.$('conversionHistoryList');
        if (listEl) {
          var historyHtml = '';
          conversions.forEach(function (item) {
            historyHtml +=
              '<div class="flex items-center gap-3 text-[13px] py-2 border-b border-[var(--border)] last:border-0">' +
              '<span class="chip text-[11px]">' +
              (item.type === 'customer' ? '客户档案' : '案件') +
              '</span>' +
              '<span class="font-semibold text-[var(--text)]">' +
              app.esc(item.label) +
              (item.note ? '<span class="text-[12px] text-[var(--muted-2)]"> · ' + app.esc(item.note) + '</span>' : '') +
              '</span>' +
              '<span class="text-[var(--muted-2)] text-[12px] ml-auto">' +
              app.esc(item.time) +
              ' · ' +
              app.esc(item.operator) +
              '</span>' +
              '</div>';
          });
          listEl.innerHTML = historyHtml;
        }
      } else {
        historyWrap.classList.add('hidden');
      }
    }

    var actionsEl = app.$('conversionActions');
    var customerActionCard = app.$('convertCustomerCard');
    var caseActionCard = app.$('convertCaseCard');

    if (customerActionCard) {
      customerActionCard.classList.toggle('hidden', !!sample.readonly || !!conversion.convertedCustomer);
    }
    if (caseActionCard) {
      caseActionCard.classList.toggle('hidden', !!sample.readonly || !!conversion.convertedCase);
    }
    if (actionsEl) {
      var bothConverted = !!conversion.convertedCustomer && !!conversion.convertedCase;
      actionsEl.classList.toggle('hidden', !!sample.readonly || bothConverted);
    }

    var dedupSection = app.$('dedupPanel');
    if (dedupSection) {
      dedupSection.classList.toggle('hidden', !!hasConverted);
    }
  };

  app.renderLog = function (sample) {
    var list = sample.log || [];
    var timelineEl = app.$('logTimelineList');
    if (!timelineEl) return;

    var html = '';
    list.forEach(function (log) {
      var chipClass = log.chipClass || app.LOG_TYPE_CHIP[log.type] || '';
      var dotClass = app.LOG_DOT_COLOR[log.type] || 'bg-gray-400';
      var label = app.LOG_TYPE_LABEL[log.type] || log.type;

      html +=
        '<div class="timeline-item" data-log-type="' +
        app.esc(log.type) +
        '">' +
        '<div class="timeline-dot ' +
        dotClass +
        '"></div>' +
        '<div class="apple-card p-4">' +
        '<div class="flex items-center gap-2 flex-wrap mb-1">' +
        '<span class="log-type-chip ' +
        chipClass +
        '">' +
        app.esc(label) +
        '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)] font-semibold">' +
        app.esc(log.time) +
        '</span>' +
        '<span class="text-[12px] text-[var(--muted-2)]">· ' +
        app.esc(log.operator) +
        '</span></div>' +
        '<div class="text-[13px] text-[var(--text)] font-semibold">' +
        '<span class="text-[var(--muted-2)]">' +
        app.esc(log.fromValue) +
        '</span>' +
        '<svg class="w-3 h-3 inline mx-1 text-[var(--muted-2)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>' +
        '<span>' +
        app.esc(log.toValue) +
        '</span></div></div></div>';
    });
    timelineEl.innerHTML = html;

    app.dom.logCategoryBtns.forEach(function (btn) {
      var isAll = btn.getAttribute('data-log-cat') === 'all';
      btn.classList.toggle('active', isAll);
      btn.setAttribute('aria-pressed', isAll ? 'true' : 'false');
    });
  };

  app.renderSample = function (key) {
    var cfg = app.getConfig();
    var sample = app.getSample(key);
    if (!cfg || !sample) return;

    app.setCurrentSampleKey(key);
    if (typeof app.syncLocationForSampleKey === 'function') {
      app.syncLocationForSampleKey(key);
    }

    var status = cfg.DETAIL_STATUSES[sample.status] || {};

    if (app.dom.breadcrumbName) app.dom.breadcrumbName.textContent = sample.name;
    if (app.dom.detailTitle) app.dom.detailTitle.textContent = sample.name;
    if (app.dom.detailLeadId) app.dom.detailLeadId.textContent = sample.id;

    if (app.dom.detailStatusBadge) {
      app.dom.detailStatusBadge.className = 'lead-badge text-[13px] ' + (status.badgeClass || app.getStatusBadgeClass(sample.status));
      app.dom.detailStatusBadge.textContent = status.label || sample.status;
    }

    if (app.dom.detailOwnerAvatar) {
      app.dom.detailOwnerAvatar.textContent = sample.ownerInitials;
      app.dom.detailOwnerAvatar.className =
        'w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ' + (sample.ownerAvatarClass || '');
    }

    if (app.dom.detailOwnerName) app.dom.detailOwnerName.textContent = sample.ownerLabel;
    if (app.dom.detailGroup) app.dom.detailGroup.textContent = sample.groupLabel;
    if (app.dom.sampleSelect) app.dom.sampleSelect.value = key;

    app.renderBanners(sample);
    app.renderHeaderButtons(sample);
    app.renderInfo(sample);
    app.renderFollowups(sample);
    app.renderConversion(sample);
    app.renderLog(sample);

    if (app.dom.mainEl) {
      app.dom.mainEl.classList.toggle('detail-readonly', !!sample.readonly);
    }

    app.activateTab('info');
  };
})();
