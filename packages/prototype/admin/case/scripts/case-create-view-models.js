(function (root) {
  'use strict';

  var helpers = root.CaseCreateHelpers || {};
  var getFilledWorkFields = helpers.getFilledWorkFields;
  var buildWorkScenarioStatus = helpers.buildWorkScenarioStatus;
  var buildWorkMaterialSummary = helpers.buildWorkMaterialSummary;
  var buildSuccessBannerCopy = helpers.buildSuccessBannerCopy;
  var buildSummaryPartiesText = helpers.buildSummaryPartiesText;
  var buildWorkSummary = helpers.buildWorkSummary;
  var buildChecklistSummary = helpers.buildChecklistSummary;

  if (!getFilledWorkFields || !buildWorkScenarioStatus || !buildWorkMaterialSummary
    || !buildSuccessBannerCopy || !buildSummaryPartiesText || !buildWorkSummary || !buildChecklistSummary) return;

  function buildMetaTextListHtml(items) {
    return (items || []).map(function (item) {
      return '<div class="meta-text">• ' + item + '</div>';
    }).join('');
  }

  function buildFamilyScenarioViewModel(options) {
    var source = options || {};
    var applicants = Array.isArray(source.applicants) ? source.applicants : [];
    var supporters = Array.isArray(source.supporters) ? source.supporters : [];
    return {
      familyScenarioTitle: source.familyBulkMode ? String(source.title || '家族签批量开始办案') + '（已开启）' : String(source.title || '家族签批量开始办案'),
      familyScenarioSummary: source.familyBulkMode ? '已切换到批量模式：先锁定关键关系人，再为多个办理对象按每人一案生成案件。' : String(source.summary || ''),
      familyRoleChipsHtml: (source.roles || []).map(function (role) { return '<span class="chip">' + role + '</span>'; }).join(''),
      familyDependentsHtml: [
        '<div class="summary-box"><div class="summary-label">待创建案件</div><div class="summary-value">' + applicants.length + ' 个</div><div class="meta-text">每位办理对象独立成案</div></div>',
        '<div class="summary-box"><div class="summary-label">关键关联人</div><div class="summary-value">' + supporters.length + ' 位</div><div class="meta-text">扶养者 / 保证人自动绑定</div></div>',
        '<div class="summary-box"><div class="summary-label">资料复用</div><div class="summary-value">共享附件版本</div><div class="meta-text">跨案复用在留卡、纳税证明等材料</div></div>',
        '<div class="summary-box"><div class="summary-label">补齐策略</div><div class="summary-value">先开始办案</div><div class="meta-text">缺失字段转为后续补齐任务</div></div>',
      ].join(''),
      familyKeyPartyListHtml: supporters.length ? supporters.map(function (item) {
        var action = item.source === 'related' ? '<button class="table-icon-btn" type="button" data-remove-party="' + item.originalIndex + '" aria-label="移除关联人"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>' : '<span class="chip">已复用客户档案</span>';
        return ['<div class="party-card">', '<div class="party-avatar">' + ((item.name || '').slice(0, 2) || '关') + '</div>', '<div class="party-copy">', '<div class="party-title">' + item.name + ' <span class="chip">' + item.role + '</span></div>', '<div class="meta-text">' + item.groupLabel + ' · ' + item.contact + '</div>', (item.note ? '<div class="meta-text">' + item.note + '</div>' : ''), '</div>', action, '</div>'].join('');
      }).join('') : '<div class="empty-state">请先选择扶养者 / 保证人，系统会将其作为关键关联人自动绑定到每个案件。</div>',
      familyGateNotesHtml: buildMetaTextListHtml(source.gateChecks),
      familyCaseMatrixHtml: applicants.length ? applicants.map(function (item) {
        var sponsorNames = supporters.length ? supporters.map(function (party) { return party.name + '（' + party.role + '）'; }).join(' / ') : '待补充';
        var reuseDocs = (item.reuseDocs || []).length ? item.reuseDocs.join('、') : '在留卡、纳税证明';
        return ['<div class="summary-box">', '<div class="summary-label">案件预览</div>', '<div class="summary-value">' + item.name + ' - ' + String(source.templateLabel || '') + String(source.applicationType || '') + '</div>', '<div class="meta-text mt-2">主申请人：' + item.name + ' / 关联人：' + sponsorNames + '</div>', '<div class="meta-text mt-2">资料复用：' + reuseDocs + '</div>', (item.staleDocWarning ? '<div class="meta-text mt-2 text-amber-700">' + item.staleDocWarning + '</div>' : ''), '</div>'].join('');
      }).join('') : '<div class="empty-state">添加办理对象后，这里会展示每个案件的创建预览、关联人绑定与材料复用提示。</div>',
      familyCreationSummary: applicants.length ? '提交后将一次创建 ' + applicants.length + ' 个案件，并自动继承 ' + String(source.groupLabel || '') + ' / ' + String(source.ownerLabel || '') + '。' : '先添加办理对象后，系统会在此显示本次批量开始办案的实际创建数量。',
      familyCreationTasksHtml: buildMetaTextListHtml(source.reuseNotes),
      enableFamilyBulkButtonText: source.familyBulkMode ? '批量模式已开启' : '切换到批量模式',
    };
  }

  function buildWorkScenarioViewModel(options) {
    var source = options || {};
    var filledLabels = {};
    getFilledWorkFields(source.workDetails).forEach(function (item) { filledLabels[item.label] = true; });
    return {
      workFieldListHtml: (source.fields || []).map(function (field) { return '<span class="chip">' + field + ' · ' + (filledLabels[field] ? '已填' : '待补') + '</span>'; }).join(''),
      workScenarioStatus: buildWorkScenarioStatus(source.workDetails),
    };
  }

  function buildCaseCreateSummaryViewModel(options) {
    var source = options || {};
    var applicants = Array.isArray(source.applicants) ? source.applicants : [];
    var supporters = Array.isArray(source.supporters) ? source.supporters : [];
    var additionalParties = Array.isArray(source.additionalParties) ? source.additionalParties : [];
    var isFamilyBulk = !!source.isFamilyBulk;
    var isWorkTemplate = !!source.isWorkTemplate;
    var workDetails = source.workDetails || {};
    var bannerCopy = buildSuccessBannerCopy({ applicantCount: applicants.length, supporterCount: supporters.length, isFamilyBulk: isFamilyBulk, isWorkTemplate: isWorkTemplate, workMaterialSummary: buildWorkMaterialSummary(workDetails) });
    return {
      summaryTemplate: String(source.templateLabel || '') + ' / ' + String(source.applicationType || ''),
      summaryCustomer: source.primaryCustomerName ? source.primaryCustomerName + (isFamilyBulk ? '（关键关系人）' : '') : '未选择',
      summaryParties: buildSummaryPartiesText({ applicants: applicants, supporters: supporters, additionalParties: additionalParties, isFamilyBulk: isFamilyBulk, isWorkTemplate: isWorkTemplate, workSummary: buildWorkSummary(workDetails, additionalParties) }),
      summaryOwner: String(source.ownerLabel || '') + ' / ' + String(source.groupLabel || ''),
      summaryDueDate: source.dueDate || '未设置',
      summaryAmount: source.amount ? '¥' + Number(source.amount).toLocaleString() : '未设置',
      summaryChecklist: buildChecklistSummary({ createChecklist: !!source.createChecklist, createTasks: !!source.createTasks, isWorkTemplate: isWorkTemplate, isFamilyBulk: isFamilyBulk }),
      successBannerTitle: bannerCopy.title,
      successBannerDesc: bannerCopy.desc,
      viewDetailButtonText: isFamilyBulk ? '查看首个案件详情' : '查看案件详情',
      viewCreatedCasesButtonText: isFamilyBulk && applicants.length ? '查看案件列表中的 ' + applicants.length + ' 个结果' : '查看案件列表结果',
    };
  }

  function buildDynamicCopyViewModel(options) {
    var source = options || {};
    var sourceCustomerName = String(source.sourceCustomerName || '').trim();
    var sourceLeadName = String(source.sourceLeadName || '').trim();
    var sourceGroupLabel = String(source.sourceCustomerGroupLabel || '').trim();
    var sourceContextTitle = '本次已带入来源客户与默认承接信息';
    var sourceContextHint = '从客户或咨询继续开始办案时，系统会自动带入主申请人与默认承接组。';

    if (source.hasSourceLead && source.hasSourceCustomer) {
      sourceContextTitle = '已从已签约咨询继续开始办案';
      sourceContextHint = sourceCustomerName
        ? '系统已带入 ' + sourceCustomerName + ' 作为主申请人，并默认沿用' + (sourceGroupLabel || '当前客户') + '的承接组。'
        : '咨询已转为客户，系统会自动带入主申请人与默认承接组。';
    } else if (source.hasSourceCustomer) {
      sourceContextTitle = '已从客户档案继续开始办案';
      sourceContextHint = sourceCustomerName
        ? '系统已带入 ' + sourceCustomerName + ' 作为主申请人，后续承接组默认沿用' + (sourceGroupLabel || '当前客户归属组') + '。'
        : '系统已自动带入当前客户为主申请人，后续承接组默认沿用客户归属组。';
    } else if (source.hasSourceLead) {
      sourceContextTitle = '当前从咨询进入，先确认客户再继续办案';
      sourceContextHint = sourceLeadName
        ? '咨询“' + sourceLeadName + '”已进入建档链路；确认客户后，系统会自动带入主申请人与默认承接组。'
        : '当前从咨询进入建档链路；确认客户后，系统会自动带入主申请人与默认承接组。';
    }

    return {
      caseNameLabel: source.isFamilyBulk ? '批量办案批次名称' : '案件标题',
      caseNameHint: source.isFamilyBulk ? '默认由“扶养者/保证人 + 模板 + 申请类型 + 批次”生成；每位办理对象仍会各自生成独立案件。' : '默认由“主申请人 + 模板 + 申请类型”生成，也支持手动改名。',
      relatedStepHint: source.isFamilyBulk ? '先锁定扶养者 / 保证人，再为多个配偶 / 子女按每人一案批量创建。' : (source.isWorkTemplate ? '先确认主申请人，再补雇主联系人与基础雇佣信息。' : '先确认主申请人，再按案件类型补充关联人。'),
      primaryCustomerSelectLabel: source.isFamilyBulk ? '选择扶养者 / 保证人' : '确认主申请人',
      primaryCustomerCardLabel: source.isFamilyBulk ? '关键关系人' : '主申请人',
      primaryModalButtonText: source.isFamilyBulk ? '补录扶养者 / 保证人' : '补录主申请人',
      primaryModalDefaultRole: source.isFamilyBulk ? '扶养者' : '主申请人',
      relatedModalButtonText: source.isFamilyBulk ? '添加办理对象' : (source.isWorkTemplate ? '新增雇主联系人' : '新增关联人'),
      relatedModalDefaultRole: source.isWorkTemplate ? '雇主联系人' : '配偶',
      additionalPartyButtonText: source.isFamilyBulk ? '添加办理对象' : (source.isWorkTemplate ? '新增雇主联系人' : '添加办理对象'),
      additionalPartyDefaultRole: source.isWorkTemplate ? '雇主联系人' : '子女',
      showSupportingPartyButton: !!source.isFamilyBulk,
      additionalPartiesTitle: source.isFamilyBulk ? '办理对象（每人一案）' : '关联人',
      additionalPartiesHint: source.isFamilyBulk ? '每位配偶 / 子女都会生成独立案件，并自动继承承接组、来源与默认负责人。' : (source.isWorkTemplate ? '可在此追加雇主联系人；公司、职位与薪酬填写在下方雇主信息沉淀卡。' : '家族签可补充配偶/子女，工作类可补充雇主联系人。'),
      sourceContextTitle: sourceContextTitle,
      sourceContextHint: sourceContextHint,
      sourceContextDedupHint: '如命中疑似重复客户，系统只提示、不自动合并；继续创建时需填写原因并留痕。',
    };
  }

  function buildPrimaryCustomerViewModel(options) {
    var source = options || {};
    var customer = source.primaryCustomer || null;
    if (!customer) {
      return { name: source.isFamilyBulk ? '未选择扶养者 / 保证人' : '未选择主申请人', meta: source.isFamilyBulk ? '先锁定关键关系人，后续每个案件都会自动绑定到关联人。' : '请选择当前案件的主申请人。', contact: '-', shouldSyncInheritedGroup: false };
    }
    return source.isFamilyBulk
      ? { name: customer.name, meta: (customer.roleHint || '扶养者') + ' / ' + customer.groupLabel + ' / 既有客户档案已复用', contact: customer.summary + ' · ' + customer.contact, shouldSyncInheritedGroup: false }
      : { name: customer.name, meta: customer.kana + ' / ' + customer.groupLabel + ' / ' + customer.roleHint, contact: customer.summary + ' · ' + customer.contact, shouldSyncInheritedGroup: true };
  }

  function buildAdditionalPartiesViewModel(options) {
    var source = options || {};
    var parties = Array.isArray(source.parties) ? source.parties : [];
    if (!parties.length) {
      return { additionalPartiesHtml: '<div class="empty-state">' + (source.isFamilyBulk ? '当前还没有办理对象。请继续添加配偶 / 子女，系统会按每人一案生成案件草稿。' : '当前还没有新增关联人。家族签可添加配偶/子女，工作类可补充雇主联系人。') + '</div>' };
    }
    return {
      additionalPartiesHtml: parties.map(function (item) {
        return ['<div class="party-card">', '<div class="party-avatar">' + item.initials + '</div>', '<div class="party-copy">', '<div class="party-title">' + item.name + ' <span class="chip">' + item.role + '</span></div>', '<div class="meta-text">' + item.groupLabel + ' · ' + item.contact + '</div>', (item.relation ? '<div class="meta-text">' + item.relation + '</div>' : ''), (item.note ? '<div class="meta-text">' + item.note + '</div>' : ''), (item.staleDocWarning ? '<div class="meta-text text-amber-700">' + item.staleDocWarning + '</div>' : ''), '</div>', '<button class="table-icon-btn" type="button" data-remove-party="' + item.originalIndex + '" aria-label="移除关联人">', '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>', '</button>', '</div>'].join('');
      }).join(''),
    };
  }

  root.CaseCreateHelpers = Object.assign({}, helpers, {
    buildMetaTextListHtml: buildMetaTextListHtml,
    buildFamilyScenarioViewModel: buildFamilyScenarioViewModel,
    buildWorkScenarioViewModel: buildWorkScenarioViewModel,
    buildCaseCreateSummaryViewModel: buildCaseCreateSummaryViewModel,
    buildDynamicCopyViewModel: buildDynamicCopyViewModel,
    buildPrimaryCustomerViewModel: buildPrimaryCustomerViewModel,
    buildAdditionalPartiesViewModel: buildAdditionalPartiesViewModel,
  });
})(typeof globalThis !== 'undefined' ? globalThis : this);