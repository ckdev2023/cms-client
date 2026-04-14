(function (root) {
  'use strict';

  var WORK_FIELDS = [
    { key: 'companyName', label: '公司名称' },
    { key: 'positionTitle', label: '职位名称' },
    { key: 'annualSalary', label: '年薪' },
    { key: 'contactEmail', label: '联系人邮箱' },
    { key: 'contactPhone', label: '联系人电话' },
  ];

  function firstParam(params, keys) {
    for (var i = 0; i < keys.length; i += 1) {
      var value = params.get(keys[i]);
      if (value) return value;
    }
    return '';
  }

  function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function createEmptyWorkDetails() {
    return {
      companyName: '',
      positionTitle: '',
      annualSalary: '',
      contactEmail: '',
      contactPhone: '',
    };
  }

  function getFilledWorkFields(details) {
    var source = Object.assign(createEmptyWorkDetails(), details || {});
    return WORK_FIELDS.map(function (field) {
      var value = normalizeText(source[field.key]);
      return value ? { key: field.key, label: field.label, value: value } : null;
    }).filter(Boolean);
  }

  function buildWorkScenarioStatus(details) {
    var filled = getFilledWorkFields(details);
    if (!filled.length) {
      return '建议至少先补公司名称、职位名称与联系人，便于事务所分派催件。';
    }

    var missing = WORK_FIELDS.filter(function (field) {
      return !normalizeText(details && details[field.key]);
    }).map(function (field) { return field.label; });

    return '已填写 ' + filled.length + ' / ' + WORK_FIELDS.length + ' 项'
      + (missing.length ? '，待补：' + missing.join('、') : '，可继续进入分派与复核。');
  }

  function buildWorkSummary(details, relatedParties) {
    var source = Object.assign(createEmptyWorkDetails(), details || {});
    var summary = [];
    if (normalizeText(source.companyName)) summary.push('公司：' + normalizeText(source.companyName));
    if (normalizeText(source.positionTitle)) summary.push('职位：' + normalizeText(source.positionTitle));
    if (normalizeText(source.annualSalary)) summary.push('年薪：' + normalizeText(source.annualSalary));

    var contacts = [];
    if (Array.isArray(relatedParties) && relatedParties.length) {
      contacts.push('雇主联系人：' + relatedParties.map(function (item) {
        return item.name + '（' + item.role + '）';
      }).join('，'));
    }
    if (normalizeText(source.contactEmail) || normalizeText(source.contactPhone)) {
      contacts.push('联系方式：' + [normalizeText(source.contactEmail), normalizeText(source.contactPhone)].filter(Boolean).join(' / '));
    }

    if (!summary.length && !contacts.length) {
      return '雇主信息待补充（建议至少填写公司名称、职位名称、联系人方式）';
    }

    return summary.concat(contacts).join('；');
  }

  function buildWorkMaterialSummary(details) {
    var source = Object.assign(createEmptyWorkDetails(), details || {});
    var mainBits = [normalizeText(source.companyName), normalizeText(source.positionTitle)].filter(Boolean);
    if (!mainBits.length) return '资料清单已生成，待补录雇主基础信息与材料';
    return '资料清单已生成，可围绕 ' + mainBits.join(' / ') + ' 继续补录雇主资料';
  }

  function sanitizeWorkDetails(details) {
    var source = Object.assign(createEmptyWorkDetails(), details || {});
    return {
      companyName: normalizeText(source.companyName),
      positionTitle: normalizeText(source.positionTitle),
      annualSalary: normalizeText(source.annualSalary),
      contactEmail: normalizeText(source.contactEmail),
      contactPhone: normalizeText(source.contactPhone),
    };
  }

  function findDuplicateCustomers(customers, contact) {
    var phone = normalizePhone(contact && contact.phone);
    var email = normalizeEmail(contact && contact.email);
    if (!phone && !email) return [];

    return (customers || []).filter(function (customer) {
      var customerContact = String(customer.contact || '');
      var customerPhone = normalizePhone(customer.phone || customerContact);
      var customerEmail = normalizeEmail(customer.email || customerContact);
      return (phone && customerPhone && phone === customerPhone) || (email && customerEmail && email === customerEmail);
    });
  }

  function getInheritedGroup(defaultGroup, primaryCustomer) {
    return (primaryCustomer && primaryCustomer.group) || defaultGroup || '';
  }

  function getOptionLabel(options, value) {
    var match = (options || []).find(function (item) { return item.value === value; });
    return match ? match.label : value;
  }

  function buildCaseTitle(primaryName, templateLabel, applicationType, isFamilyBulk) {
    var baseName = normalizeText(primaryName) || '未选择客户';
    return baseName + ' - ' + String(templateLabel || '') + String(applicationType || '') + (isFamilyBulk ? '批次' : '');
  }

  function buildFamilyDraftParty(item, index, options) {
    var source = item || {};
    var name = normalizeText(source.name);
    return {
      id: 'family-draft-' + index,
      mode: 'related',
      name: name,
      role: source.role,
      group: options && options.group ? options.group : '',
      groupLabel: options && options.groupLabel ? options.groupLabel : '',
      contact: normalizeText(source.contact) || '待补充联系方式',
      note: normalizeText(source.note),
      relation: normalizeText(source.relation),
      reuseDocs: Array.isArray(source.reuseDocs) ? source.reuseDocs.slice() : [],
      staleDocWarning: normalizeText(source.staleDocWarning),
      initials: name.replace(/\s+/g, '').slice(0, 2).toUpperCase() || '家',
    };
  }

  function formatPartyList(parties) {
    return (parties || []).map(function (item) {
      return item.name + '（' + item.role + '）';
    }).join('，');
  }

  function buildSummaryPartiesText(options) {
    var source = options || {};
    var applicants = source.applicants || [];
    var supporters = source.supporters || [];
    var additionalParties = source.additionalParties || [];
    if (source.isFamilyBulk) {
      return applicants.length
        ? '办理对象：' + formatPartyList(applicants) + '；关联人：' + formatPartyList(supporters)
        : '批量模式已开启，待补充办理对象';
    }
    if (source.isWorkTemplate) return source.workSummary;
    return additionalParties.length ? formatPartyList(additionalParties) : '无';
  }

  function buildChecklistSummary(options) {
    var source = options || {};
    return [
      source.createChecklist ? '自动生成资料清单' : '不自动生成资料清单',
      source.createTasks ? '创建跟进任务' : '不创建跟进任务',
      source.isWorkTemplate ? '雇主信息随案件沉淀' : '',
      source.isFamilyBulk ? '自动绑定关联人与补齐任务' : '',
    ].filter(Boolean).join(' / ');
  }

  function buildRequirementsViewModel(options) {
    var source = options || {};
    var template = source.template || {};
    var total = 0;
    var required = 0;
    var sections = Array.isArray(template.sections) ? template.sections : [];

    return {
      requirementsMeta: [template.requirementSummary, template.helper].filter(Boolean).join(' · '),
      requirementsListHtml: sections.map(function (section) {
        var items = (section.items || []).map(function (item) {
          total += 1;
          if (item.required) required += 1;
          return [
            '<label class="requirement-item">',
            '<input type="checkbox" ' + (item.required ? 'checked' : '') + ' />',
            '<div>',
            '<div class="requirement-title">' + item.label + '</div>',
            '<div class="meta-text">' + (item.required ? '必交' : '可选') + '</div>',
            '</div>',
            '</label>',
          ].join('');
        }).join('');

        return [
          '<div class="requirement-section">',
          '<div class="requirement-section-title">' + section.title + '</div>',
          '<div class="section-stack">' + items + '</div>',
          '</div>',
        ].join('');
      }).join(''),
      requirementsProgress: source.isFamilyBulk
        ? (source.applicantCount
          ? '预计为 ' + source.applicantCount + ' 个办理对象分别生成资料清单；每案默认 ' + required + ' / ' + total + ' 个必交项，扶养者材料按共享附件版本引用。'
          : '先添加办理对象后，系统会按每人一案生成资料清单，并自动复用扶养者 / 保证人材料。')
        : '默认生成 ' + required + ' / ' + total + ' 个必交资料项',
    };
  }

  function buildSuccessBannerCopy(options) {
    var source = options || {};
    if (source.isFamilyBulk) {
      return {
        title: source.applicantCount
          ? '已开始办理 ' + source.applicantCount + ' 个家族案件'
          : '家族批量开始办案已准备好',
        desc: source.applicantCount
          ? '已同步绑定 ' + source.supporterCount + ' 位关键关系人，资料清单与补齐任务已按每人一案生成。'
          : '已生成批量办案草稿，可继续补充办理对象与资料。',
      };
    }
    if (source.isWorkTemplate) {
      return {
        title: '技人国案件已创建',
        desc: String(source.workMaterialSummary || '资料清单已生成') + '，可返回列表继续补录或分派任务。',
      };
    }
    return {
      title: '案件已创建',
      desc: '已生成案件记录与资料登记清单草稿，可返回列表继续补录或分派任务。',
    };
  }

  function buildSubmitHint(options) {
    var source = options || {};
    if (source.isFamilyBulk) {
      return source.applicantCount
        ? '确认后会一次开始办理 ' + source.applicantCount + ' 个案件，并同步生成关联人、资料清单与补齐任务。'
        : '当前为家族签批量模式，请先补充至少 1 位办理对象。';
    }
    return source.isWorkTemplate
      ? '确认后会自动生成资料清单与初始任务；公司、职位与联系人会随案件一起沉淀。'
      : '确认后会自动生成资料清单与初始任务。';
  }

  function buildCreatedCaseRecord(options) {
    var source = options || {};
    var item = source.item || {};
    var supporters = source.supporters || [];
    var dueDate = source.dueDate || '';
    var dueLabel = dueDate ? dueDate.slice(5) : '-';
    var itemName = normalizeText(item.name);
    var typeLabel = String(source.templateLabel || '') + ' / ' + String(source.applicationType || '');
    var supporterSummary = supporters.length ? formatPartyList(supporters) : '待补充';
    var workDetails = sanitizeWorkDetails(source.workDetails);

    return {
      id: 'CAS-DEMO-' + String(source.createdAt).slice(-6) + '-' + String((source.index || 0) + 1).padStart(2, '0'),
      name: itemName + ' ' + String(source.templateLabel || '') + String(source.applicationType || ''),
      type: typeLabel,
      applicant: itemName,
      groupId: source.groupId,
      groupLabel: source.groupLabel,
      stageId: 'S1',
      stageLabel: '刚开始办案',
      ownerId: source.ownerId,
      completionPercent: 0,
      completionLabel: '0 / 0 初始生成',
      validationStatus: 'pending',
      validationLabel: 'pending',
      blockerCount: 0,
      unpaidAmount: Number(source.amount || 0),
      updatedAtLabel: '刚刚开始办理',
      dueDate: dueDate,
      dueDateLabel: dueLabel,
      riskStatus: 'normal',
      riskLabel: '正常',
      visibleScopes: ['mine', 'group', 'all'],
      batchLabel: source.isFamilyBulk ? '家族批量开始办案' : '刚开始办案',
      casePartySummary: source.isWorkTemplate
        ? buildWorkSummary(workDetails, source.additionalParties)
        : (supporters.length ? '关联人：' + supporterSummary : '关联人待补充'),
      materialSummary: source.isFamilyBulk
        ? '资料清单已生成，扶养者 / 保证人材料按共享附件版本引用'
        : (source.isWorkTemplate
          ? buildWorkMaterialSummary(workDetails)
          : '资料清单已生成，可继续补录关联人与材料'),
      workDetails: source.isWorkTemplate ? workDetails : null,
      isDraft: true,
    };
  }

  function buildCreatedCaseDrafts(options) {
    var source = options || {};
    var additionalParties = Array.isArray(source.additionalParties) ? source.additionalParties : [];
    var commonFields = {
      createdAt: source.createdAt,
      dueDate: source.dueDate,
      templateLabel: source.templateLabel,
      applicationType: source.applicationType,
      groupId: source.groupId,
      groupLabel: source.groupLabel,
      ownerId: source.ownerId,
      amount: source.amount,
      additionalParties: additionalParties,
      workDetails: sanitizeWorkDetails(source.workDetails),
    };

    if (source.isFamilyBulk) {
      var familyApplicants = Array.isArray(source.familyApplicants) ? source.familyApplicants : [];
      var supporters = Array.isArray(source.supporters) ? source.supporters : [];
      return familyApplicants.map(function (item, index) {
        return buildCreatedCaseRecord(Object.assign({}, commonFields, {
          item: item,
          index: index,
          supporters: supporters,
          isFamilyBulk: true,
          isWorkTemplate: false,
        }));
      });
    }

    var primaryCustomer = source.primaryCustomer || null;
    if (!primaryCustomer) return [];

    return [buildCreatedCaseRecord(Object.assign({}, commonFields, {
      item: { name: primaryCustomer.name },
      index: 0,
      supporters: additionalParties.map(function (item) {
        return { name: item.name, role: item.role };
      }),
      isFamilyBulk: false,
      isWorkTemplate: !!source.isWorkTemplate,
    }))];
  }

  function mergeCreatedDraftCases(existingDrafts, draftCases) {
    var existing = Array.isArray(existingDrafts) ? existingDrafts : [];
    var drafts = Array.isArray(draftCases) ? draftCases.slice() : [];
    return drafts.concat(existing);
  }

  function buildCaseListFlashPayload(options) {
    var source = options || {};
    var draftCases = Array.isArray(source.draftCases) ? source.draftCases : [];
    return {
      caseIds: draftCases.map(function (item) { return item.id; }),
      count: draftCases.length,
      templateLabel: String(source.templateLabel || ''),
      applicationType: String(source.applicationType || ''),
      primaryName: normalizeText(source.primaryName),
      isFamilyBulk: !!source.isFamilyBulk,
    };
  }

  function persistCreatedCaseArtifacts(options) {
    var source = options || {};
    var draftCases = Array.isArray(source.draftCases) ? source.draftCases.slice() : [];
    if (!draftCases.length) return [];

    var existingDrafts = readStorageJson(source.storage, source.draftsKey);
    var mergedDrafts = mergeCreatedDraftCases(existingDrafts, draftCases);
    writeStorageJson(source.storage, source.draftsKey, mergedDrafts);
    writeStorageJson(source.storage, source.flashKey, buildCaseListFlashPayload({
      draftCases: draftCases,
      templateLabel: source.templateLabel,
      applicationType: source.applicationType,
      primaryName: source.primaryName,
      isFamilyBulk: source.isFamilyBulk,
    }));

    return draftCases;
  }

  function readStorageJson(storage, key) {
    try {
      var raw = storage && typeof storage.getItem === 'function' ? storage.getItem(key) : null;
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function writeStorageJson(storage, key, value) {
    try {
      if (!storage || typeof storage.setItem !== 'function') return;
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      return;
    }
  }

  function shouldRequireCrossGroupReason(selectedGroup, inheritedGroup) {
    return !!selectedGroup && !!inheritedGroup && selectedGroup !== inheritedGroup;
  }

  function parseCreateContext(search, customers) {
    var params = new URLSearchParams(search || '');
    var customerId = firstParam(params, ['customerId', 'customer_id']);
    var sourceLeadId = firstParam(params, ['sourceLeadId', 'source_lead_id', 'leadId', 'lead_id']);
    var sourceLeadName = firstParam(params, ['sourceLeadName', 'source_lead_name', 'leadName', 'lead_name']);
    var customerName = firstParam(params, ['customerName', 'customer_name']);
    var customerGroup = firstParam(params, ['customerGroup', 'customer_group']);
    var customerGroupLabel = firstParam(params, ['customerGroupLabel', 'customer_group_label']);
    var entry = firstParam(params, ['entry', 'from']);
    var matchedCustomer = (customers || []).find(function (item) { return item.id === customerId; }) || null;

    return {
      entryMode: sourceLeadId || customerId || entry === 'conversion' ? 'conversion' : '',
      sourceLeadId: sourceLeadId,
      sourceLeadName: sourceLeadName,
      customerId: matchedCustomer ? matchedCustomer.id : customerId,
      customerName: (matchedCustomer && matchedCustomer.name) || customerName,
      customerGroup: (matchedCustomer && matchedCustomer.group) || customerGroup,
      customerGroupLabel: (matchedCustomer && matchedCustomer.groupLabel) || customerGroupLabel,
    };
  }

  root.CaseCreateHelpers = {
    buildCaseListFlashPayload: buildCaseListFlashPayload,
    buildCaseTitle: buildCaseTitle,
    buildCreatedCaseDrafts: buildCreatedCaseDrafts,
    buildChecklistSummary: buildChecklistSummary,
    buildRequirementsViewModel: buildRequirementsViewModel,
    buildCreatedCaseRecord: buildCreatedCaseRecord,
    buildFamilyDraftParty: buildFamilyDraftParty,
    buildSubmitHint: buildSubmitHint,
    buildSuccessBannerCopy: buildSuccessBannerCopy,
    buildSummaryPartiesText: buildSummaryPartiesText,
    buildWorkMaterialSummary: buildWorkMaterialSummary,
    buildWorkScenarioStatus: buildWorkScenarioStatus,
    buildWorkSummary: buildWorkSummary,
    createEmptyWorkDetails: createEmptyWorkDetails,
    findDuplicateCustomers: findDuplicateCustomers,
    getFilledWorkFields: getFilledWorkFields,
    getInheritedGroup: getInheritedGroup,
    getOptionLabel: getOptionLabel,
    mergeCreatedDraftCases: mergeCreatedDraftCases,
    normalizeEmail: normalizeEmail,
    normalizePhone: normalizePhone,
    parseCreateContext: parseCreateContext,
    persistCreatedCaseArtifacts: persistCreatedCaseArtifacts,
    readStorageJson: readStorageJson,
    sanitizeWorkDetails: sanitizeWorkDetails,
    shouldRequireCrossGroupReason: shouldRequireCrossGroupReason,
    writeStorageJson: writeStorageJson,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);