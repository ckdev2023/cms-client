/**
 * Case Detail — overview/info/tasks/deadlines renderers.
 *
 * Depends on:
 * - data/case-detail-config.js
 * - scripts/case-detail-runtime.js
 */
(function () {
  'use strict';

  var ns = window.CaseDetailPage = window.CaseDetailPage || {};

  function applyProviderProgress(providers) {
    if (!providers) return;

    var rows = document.querySelectorAll('.provider-row');
    providers.forEach(function (provider, index) {
      if (!rows[index]) return;

      var pct = provider.total > 0 ? Math.round((provider.done / provider.total) * 100) : 0;
      var fill = rows[index].querySelector('.provider-bar-fill');
      var count = rows[index].querySelector('.provider-count');

      if (fill) fill.style.width = pct + '%';
      if (count) count.textContent = provider.done + '/' + provider.total;
    });
  }

  function applyRiskSummary(risk) {
    if (!risk) return;

    ns.setText('riskBlockingCount', risk.blockingCount);
    ns.setText('riskBlockingDetail', risk.blockingDetail);
    ns.setText('riskArrearsStatus', risk.arrearsStatus);
    ns.setText('riskArrearsDetail', risk.arrearsDetail);
    ns.setText('riskDeadlineAlert', risk.deadlineAlert);
    ns.setText('riskDeadlineAlertDetail', risk.deadlineAlertDetail);
    ns.setText('riskLastValidation', risk.lastValidation);
    ns.setText('riskReviewStatus', risk.reviewStatus);
  }

  function countBlockingItems(sample) {
    if (!sample || !sample.validation || !sample.validation.blocking) return 0;
    return sample.validation.blocking.length;
  }

  function hasArrearsRisk(sample) {
    var risk = sample && sample.risk;
    return !!(risk && risk.arrearsStatus && risk.arrearsStatus.indexOf('欠款') !== -1);
  }

  function resolveOverviewStageMeta(sample) {
    if (!sample) return '';

    var blockingCount = countBlockingItems(sample);
    if (blockingCount > 0) {
      return '还有 ' + blockingCount + ' 项必须先处理的问题';
    }

    if (hasArrearsRisk(sample) && sample.riskConfirmationRecord) {
      return '欠款风险已确认，可继续安排提交';
    }

    return sample.stageMeta || '';
  }

  function resolveOverviewCopy(sample) {
    if (!sample) {
      return { nextAction: '', validationHint: '' };
    }

    var blockingCount = countBlockingItems(sample);

    if (sample.readonly) {
      return {
        nextAction: sample.nextAction || '案件已归档，如需追溯请查看提交记录、收费与处理日志。',
        validationHint: sample.validationHint || '案件已归档，当前只建议查看历史记录。',
      };
    }

    if (blockingCount > 0) {
      return {
        nextAction: '先处理这 ' + blockingCount + ' 项当前卡点，再重新检查是否可以提交。',
        validationHint: '先到提交前检查里确认卡点，再去资料区或任务区逐项补齐。',
      };
    }

    if (hasArrearsRisk(sample) && sample.riskConfirmationRecord) {
      return {
        nextAction: '欠款风险确认已完成，可按决定生成提交包并安排提交。',
        validationHint: '资料已通过检查，当前主要关注是否现在提交，以及尾款跟进。',
      };
    }

    return {
      nextAction: sample.nextAction || '',
      validationHint: sample.validationHint || '',
    };
  }

  function resolveOverviewAction(action, fallback) {
    return {
      label: action && action.label ? action.label : fallback.label,
      tab: action && action.tab ? action.tab : fallback.tab,
    };
  }

  function applyOverviewAction(buttonId, labelId, action, fallback) {
    var button = document.getElementById(buttonId);
    if (!button) return;

    var resolved = resolveOverviewAction(action, fallback);
    var label = document.getElementById(labelId);

    if (label) label.textContent = resolved.label;

    if (resolved.tab) {
      button.setAttribute('data-target-tab', resolved.tab);
    } else {
      button.removeAttribute('data-target-tab');
    }
  }

  function applyOverviewHints(sample) {
    var copy = resolveOverviewCopy(sample);

    ns.setText('overviewNextActionText', copy.nextAction);
    ns.setText('overviewValidationHint', copy.validationHint);

    var actions = sample.overviewActions || {};

    applyOverviewAction('overviewPrimaryAction', 'overviewPrimaryActionLabel', actions.primary, {
      label: '查看校验与提交包',
      tab: 'validation',
    });
    applyOverviewAction('overviewSecondaryAction', 'overviewSecondaryActionLabel', actions.secondary, {
      label: '查看资料清单',
      tab: 'documents',
    });
  }

  function applyTimeline(timeline) {
    var container = document.querySelector('#tab-overview .border-l-2.border-\\[var\\(--border\\)\\]');
    if (!container || !timeline) return;

    container.innerHTML = timeline.map(function (item, index) {
      var dotColor = item.color === 'primary'
        ? 'var(--primary)'
        : item.color === 'warning'
          ? 'var(--warning)'
          : item.color === 'success'
            ? 'var(--success)'
            : item.color === 'danger'
              ? 'var(--danger)'
              : 'var(--border)';

      var textCls = index === timeline.length - 1 ? 'text-[var(--muted)]' : 'text-[var(--text)]';

      return [
        '<div class="relative pl-6' + (index < timeline.length - 1 ? ' pb-6' : '') + '">',
        '  <div class="timeline-dot" style="background:' + dotColor + '"></div>',
        '  <div class="text-[14px] font-semibold ' + textCls + '">' + ns.esc(item.text) + '</div>',
        '  <div class="text-[12px] text-[var(--muted-2)] mt-1">' + ns.esc(item.meta) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  function applyTeam(team) {
    var container = null;
    var teamCards = document.querySelectorAll('#tab-overview .apple-card');

    for (var i = 0; i < teamCards.length; i++) {
      var heading = teamCards[i].querySelector('h3');
      if (heading && heading.textContent.trim() === '案件团队') {
        container = teamCards[i];
        break;
      }
    }

    if (!container || !team) return;

    var listEl = container.querySelector('.space-y-3');
    if (!listEl) return;

    listEl.innerHTML = team.map(function (member) {
      var roleChip = member.role
        ? ' <span class="chip text-[10px] py-0 px-1.5">' + ns.esc(member.role) + '</span>'
        : '';

      return [
        '<div class="flex items-center justify-between p-2 -mx-2 rounded-xl hover:bg-[var(--surface-2)] transition-colors">',
        '  <div class="flex items-center gap-3">',
        '    <div class="w-9 h-9 rounded-full bg-gradient-to-br ' + (member.gradient || 'from-[var(--primary)] to-[var(--primary-hover)]') + ' text-white flex items-center justify-center text-[13px] font-bold">' + ns.esc(member.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)] flex items-center gap-2">' + ns.esc(member.name) + roleChip + '</div>',
        '      <div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(member.subtitle) + '</div>',
        '    </div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');
  }

  function applyInfoFields(sample) {
    var infoCaseId = document.getElementById('infoCaseId');
    if (infoCaseId) infoCaseId.value = sample.id;

    var infoCaseType = document.getElementById('infoCaseType');
    if (infoCaseType) {
      for (var i = 0; i < infoCaseType.options.length; i++) {
        if (infoCaseType.options[i].text === sample.caseType) {
          infoCaseType.selectedIndex = i;
          break;
        }
      }
    }

    var infoApplicationType = document.getElementById('infoApplicationType');
    if (infoApplicationType) {
      for (var j = 0; j < infoApplicationType.options.length; j++) {
        if (infoApplicationType.options[j].text === sample.applicationType) {
          infoApplicationType.selectedIndex = j;
          break;
        }
      }
    }

    var infoAcceptedDate = document.getElementById('infoAcceptedDate');
    if (infoAcceptedDate) infoAcceptedDate.value = sample.acceptedDate || '';

    var infoTargetDate = document.getElementById('infoTargetDate');
    if (infoTargetDate) infoTargetDate.value = sample.targetDate || '';

    var infoJurisdiction = document.getElementById('infoJurisdiction');
    if (infoJurisdiction) infoJurisdiction.value = sample.agency || '';
  }

  function applyRelatedParties(parties) {
    var container = document.getElementById('relatedParties');
    if (!container || !parties) return;

    container.innerHTML = parties.map(function (party) {
      var bgCls = party.avatarStyle === 'gradient'
        ? 'bg-gradient-to-br from-[var(--primary)] to-[var(--primary-hover)] text-white'
        : 'bg-[var(--surface-2)] text-[var(--text)]';

      return [
        '<div class="p-3 rounded-xl border border-[var(--border)] hover:border-[var(--primary)]/30 transition-colors">',
        '  <div class="flex items-center gap-3 mb-2">',
        '    <div class="w-8 h-8 rounded-full ' + bgCls + ' flex items-center justify-center text-[11px] font-bold">' + ns.esc(party.initials) + '</div>',
        '    <div>',
        '      <div class="text-[13px] font-bold text-[var(--text)]">' + ns.esc(party.name) + '</div>',
        '      <div class="text-[11px] text-[var(--muted-2)]">' + ns.esc(party.role) + '</div>',
        '    </div>',
        '  </div>',
        '  <div class="text-[12px] text-[var(--muted)] pl-11">' + ns.esc(party.detail) + '</div>',
        '</div>',
      ].join('');
    }).join('');
  }

  function taskAvatarColor(color) {
    if (color === 'success') return 'bg-[var(--success)] text-white';
    if (color === 'warning') return 'bg-[var(--warning)] text-white';
    if (color === 'danger') return 'bg-[var(--danger)] text-white';
    return 'bg-[var(--primary)] text-white';
  }

  function taskDueBadge(due, dueColor) {
    var cls = 'text-[12px] font-semibold px-2 py-1 rounded-md ';
    if (dueColor === 'danger') cls += 'text-[var(--danger)] bg-red-50';
    else if (dueColor === 'warning') cls += 'text-[var(--warning)] bg-amber-50';
    else cls += 'text-[var(--muted-2)] bg-[var(--surface-2)]';

    return '<span class="' + cls + '">' + ns.esc(due) + '</span>';
  }

  function badgeToneClass(tone) {
    if (tone === 'success') return 'bg-green-50 text-green-700 border-green-200';
    if (tone === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (tone === 'danger') return 'bg-red-50 text-red-700 border-red-200';
    if (tone === 'primary') return 'bg-blue-50 text-[var(--primary)] border-blue-200';
    return 'bg-[var(--surface-2)] text-[var(--muted-2)] border-[var(--border)]';
  }

  function defaultForms() {
    return {
      templates: [
        { name: '在留資格変更・更新許可申請書', meta: '入管局指定様式 · PDF/Excel', actionLabel: '生成' },
        { name: '申請理由書', meta: '事務所内部様式 · Word', actionLabel: '生成' },
      ],
      generated: [
        { name: '在留資格変更・更新許可申請書_CAS-2026-0142.pdf', meta: 'v2 · 生成于 2026/04/06 14:20 · Suzuki', tone: 'success', exportLabel: '导出', historyLabel: '版本历史' },
        { name: '申請理由書_Draft.docx', meta: 'v1 · 草稿 · 生成于 2026/04/05 09:00 · Tanaka', tone: 'warning', exportLabel: '导出', historyLabel: '版本历史' },
      ],
    };
  }

  function applyForms(forms) {
    var templateList = document.getElementById('formsTemplateList');
    var generatedList = document.getElementById('formsGeneratedList');
    var resolved = forms || defaultForms();

    if (templateList) {
      templateList.innerHTML = (resolved.templates || []).map(function (item) {
        return [
          '<div class="doc-item px-6 py-3 flex items-center justify-between">',
          '  <div class="flex items-center gap-3">',
          '    <svg class="w-5 h-5 text-[var(--primary)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>',
          '    <div>',
          '      <div class="text-[14px] font-semibold text-[var(--text)]">' + ns.esc(item.name) + '</div>',
          '      <div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(item.meta) + '</div>',
          '    </div>',
          '  </div>',
          '  <button class="btn-pill text-[12px] py-1 px-3" type="button">' + ns.esc(item.actionLabel || '生成') + '</button>',
          '</div>',
        ].join('');
      }).join('');
    }

    if (generatedList) {
      generatedList.innerHTML = (resolved.generated || []).map(function (item, index, items) {
        var borderCls = index === items.length - 1 ? ' border-b-0' : '';
        var dotCls = item.tone === 'success'
          ? 'bg-[var(--success)]'
          : item.tone === 'warning'
            ? 'bg-[var(--warning)]'
            : item.tone === 'danger'
              ? 'bg-[var(--danger)]'
              : 'bg-[var(--primary)]';
        var statusChip = item.statusLabel
          ? '<span class="chip text-[10px] py-0 px-1.5 ' + badgeToneClass(item.tone) + '">' + ns.esc(item.statusLabel) + '</span>'
          : '';

        return [
          '<div class="doc-item px-6 py-3 flex items-center justify-between' + borderCls + '">',
          '  <div class="flex items-center gap-3">',
          '    <span class="w-2.5 h-2.5 rounded-full shrink-0 ' + dotCls + '"></span>',
          '    <div>',
          '      <div class="text-[14px] font-semibold text-[var(--text)] flex items-center gap-2">' + ns.esc(item.name) + statusChip + '</div>',
          '      <div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(item.meta) + '</div>',
          '    </div>',
          '  </div>',
          '  <div class="flex items-center gap-2">',
          '    <button class="btn-pill text-[12px] py-1 px-3 flex items-center gap-1" type="button">',
          '      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>',
          '      ' + ns.esc(item.exportLabel || '导出'),
          '    </button>',
          '    <button class="text-[12px] text-[var(--primary)] hover:underline font-semibold" type="button">' + ns.esc(item.historyLabel || '版本历史') + '</button>',
          '  </div>',
          '</div>',
        ].join('');
      }).join('');
    }
  }

  function applyTasks(tasks) {
    var panel = document.getElementById('tab-tasks');
    if (!panel || !tasks) return;

    var card = panel.querySelector('.apple-card');
    if (!card) return;

    var header = card.querySelector('.px-6.py-5.border-b');
    var headerHtml = header ? header.outerHTML : '';

    var itemsHtml = tasks.map(function (task) {
      var textCls = task.done
        ? 'text-[14px] text-[var(--muted)] line-through'
        : 'text-[14px] font-semibold text-[var(--text)]';
      var checked = task.done ? ' checked' : '';

      return [
        '<div class="doc-item px-6 py-4 flex items-center justify-between">',
        '  <div class="flex items-center gap-3 flex-1">',
        '    <input type="checkbox" class="w-4 h-4 rounded-full border-[var(--border)] task-toggle"' + checked + '>',
        '    <span class="' + textCls + '">' + ns.esc(task.label) + '</span>',
        '  </div>',
        '  <div class="flex items-center gap-4">',
        '    ' + taskDueBadge(task.due, task.dueColor),
        '    <div class="w-7 h-7 rounded-full ' + taskAvatarColor(task.color) + ' flex items-center justify-center text-[11px] font-bold">' + ns.esc(task.assignee) + '</div>',
        '  </div>',
        '</div>',
      ].join('');
    }).join('');

    var addHtml = [
      '<div class="px-6 py-4 border-t-0">',
      '  <button class="w-full text-left flex items-center gap-3 py-1 text-[var(--muted-2)] hover:text-[var(--text)] transition-colors add-task-btn" type="button">',
      '    <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>',
      '    <span class="text-[14px] font-semibold">添加新任务...</span>',
      '  </button>',
      '</div>',
    ].join('');

    card.innerHTML = headerHtml + itemsHtml + addHtml;
  }

  function applyDeadlines(deadlines) {
    if (!deadlines) return;

    deadlines.forEach(function (deadline) {
      var el = document.getElementById('deadline' + deadline.id);
      if (!el) return;

      var borderColor = ns.severityColor(deadline.severity);

      var stripe = el.querySelector('.absolute.left-0');
      if (stripe) stripe.style.background = borderColor;

      var titleEl = el.querySelector('[id$="Title"]') || el.querySelector('.text-\\[15px\\]');
      var descEl = el.querySelector('[id$="Desc"]') || el.querySelectorAll('.text-\\[13px\\]')[0];
      var dateEl = el.querySelector('[id$="Date"]') || el.querySelector('.text-\\[18px\\]');
      var remainEl = el.querySelector('[id$="Remaining"]') || el.querySelector('.text-\\[12px\\].font-bold');

      if (titleEl) titleEl.textContent = deadline.title;
      if (descEl) descEl.textContent = deadline.desc;
      if (dateEl) {
        dateEl.textContent = deadline.date;
        dateEl.style.color = borderColor;
      }
      if (remainEl) {
        remainEl.textContent = deadline.remaining;
        remainEl.style.color = borderColor;
        remainEl.className = 'text-[12px] font-bold mt-1 px-2 py-0.5 rounded-md inline-block ' + ns.severityBgClass(deadline.severity);
      }
    });
  }

  function applyResidencePeriod(period) {
    var container = document.getElementById('residencePeriodSummary');
    if (!container) return;

    if (!period) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)]">当前样例尚未录入新在留有效期间</div>';
      return;
    }

    container.innerHTML = [
      '<div class="flex items-center justify-between gap-3 mb-4">',
      '  <div>',
      '    <div class="section-kicker !text-[var(--primary)]">下签后留痕</div>',
      '    <div class="text-[15px] font-bold text-[var(--text)]">新在留有效期间</div>',
      '  </div>',
      '  <span class="chip text-[10px] py-0 px-1.5 ' + badgeToneClass(period.tone || 'primary') + '">' + ns.esc(period.statusLabel || '已记录') + '</span>',
      '</div>',
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[12px]">',
      '  <div class="rounded-lg bg-white border border-[var(--border)] p-3"><div class="text-[var(--muted-2)] mb-1">在留资格</div><div class="font-semibold text-[var(--text)]">' + ns.esc(period.residenceStatus || '—') + '</div></div>',
      '  <div class="rounded-lg bg-white border border-[var(--border)] p-3"><div class="text-[var(--muted-2)] mb-1">有效期间</div><div class="font-semibold text-[var(--text)]">' + ns.esc(period.startDate || '—') + ' 〜 ' + ns.esc(period.endDate || '—') + '</div></div>',
      '</div>',
      '<div class="text-[12px] text-[var(--muted)] mt-3">记录信息：' + ns.esc(period.recordMeta || '—') + '</div>',
    ].join('');
  }

  function applyReminderSchedule(schedule) {
    var container = document.getElementById('reminderScheduleSummary');
    if (!container) return;

    if (!schedule) {
      container.innerHTML = '<div class="text-[13px] text-[var(--muted-2)]">当前样例尚未设置到期前提醒</div>';
      return;
    }

    var items = (schedule.items || []).map(function (item) {
      return [
        '<div class="flex items-center justify-between gap-3 py-2 border-b border-[var(--border)] last:border-b-0">',
        '  <div>',
        '    <div class="text-[13px] font-semibold text-[var(--text)]">' + ns.esc(item.label) + '</div>',
        '    <div class="text-[12px] text-[var(--muted-2)]">' + ns.esc(item.date) + '</div>',
        '  </div>',
        '  <span class="chip text-[10px] py-0 px-1.5 ' + badgeToneClass(item.tone || 'primary') + '">' + ns.esc(item.statusLabel) + '</span>',
        '</div>',
      ].join('');
    }).join('');

    container.innerHTML = [
      '<div class="flex items-center justify-between gap-3 mb-4">',
      '  <div>',
      '    <div class="section-kicker !text-[var(--warning)]">续签提醒</div>',
      '    <div class="text-[15px] font-bold text-[var(--text)]">到期前提醒计划</div>',
      '  </div>',
      '  <span class="chip text-[10px] py-0 px-1.5 ' + badgeToneClass(schedule.tone || 'warning') + '">' + ns.esc(schedule.statusLabel || '待设置') + '</span>',
      '</div>',
      '<div class="text-[12px] text-[var(--muted)] mb-3">负责人：' + ns.esc(schedule.owner || '—') + '</div>',
      '<div>' + items + '</div>',
    ].join('');
  }

  ns.applyProviderProgress = applyProviderProgress;
  ns.applyRiskSummary = applyRiskSummary;
  ns.applyOverviewHints = applyOverviewHints;
  ns.resolveOverviewCopy = resolveOverviewCopy;
  ns.resolveOverviewStageMeta = resolveOverviewStageMeta;
  ns.resolveOverviewAction = resolveOverviewAction;
  ns.badgeToneClass = badgeToneClass;
  ns.applyForms = applyForms;
  ns.applyTimeline = applyTimeline;
  ns.applyTeam = applyTeam;
  ns.applyInfoFields = applyInfoFields;
  ns.applyRelatedParties = applyRelatedParties;
  ns.taskAvatarColor = taskAvatarColor;
  ns.taskDueBadge = taskDueBadge;
  ns.applyTasks = applyTasks;
  ns.applyDeadlines = applyDeadlines;
  ns.applyResidencePeriod = applyResidencePeriod;
  ns.applyReminderSchedule = applyReminderSchedule;
})();
