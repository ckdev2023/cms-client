(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var config = window.CaseCreateConfig;
    var helpers = window.CaseCreateHelpers || {};
    if (!config) return;
    var FAMILY_APPLICANT_ROLES = ['主申请人', '配偶', '子女'];
    var FAMILY_SUPPORTER_ROLES = ['扶养者', '保证人'];
    var CASE_LIST_DRAFTS_KEY = 'prototype.caseListDrafts';
    var CASE_LIST_FLASH_KEY = 'prototype.caseListFlash';

    var templatesById = {};
    config.templates.forEach(function (template) {
      templatesById[template.id] = template;
    });

    var state = {
      currentStep: 0,
      templateId: config.defaultState.templateId,
      applicationType: config.defaultState.applicationType,
      group: config.defaultState.group,
      inheritedGroup: config.defaultState.group,
      owner: config.defaultState.owner,
      dueDate: config.defaultState.dueDate,
      amount: config.defaultState.amount,
      customerId: config.defaultState.customerId,
      sourceLeadId: '',
      sourceCustomerId: '',
      familyBulkMode: window.location.hash === '#family-bulk',
      familyBulkSeeded: false,
      primaryCustomer: null,
      additionalParties: [],
    };

    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step-panel]'));
    var stepIndicators = Array.prototype.slice.call(document.querySelectorAll('[data-step-indicator]'));

    var elements = {
      templateCards: Array.prototype.slice.call(document.querySelectorAll('[data-template-card]')),
      applicationTypeSelect: document.getElementById('applicationTypeSelect'),
      sourceContextBar: document.getElementById('sourceContextBar'),
      sourceLeadValue: document.getElementById('sourceLeadValue'),
      sourceCustomerValue: document.getElementById('sourceCustomerValue'),
      sourceContextHint: document.getElementById('sourceContextHint'),
      sourceContextDedupHint: document.getElementById('sourceContextDedupHint'),
      groupSelect: document.getElementById('groupSelect'),
      groupInheritanceValue: document.getElementById('groupInheritanceValue'),
      groupInheritanceHint: document.getElementById('groupInheritanceHint'),
      ownerSelect: document.getElementById('ownerSelect'),
      dueDateInput: document.getElementById('dueDateInput'),
      amountInput: document.getElementById('amountInput'),
      caseNameLabel: document.getElementById('caseNameLabel'),
      caseNameInput: document.getElementById('caseNameInput'),
      caseNameHint: document.getElementById('caseNameHint'),
      relatedStepHint: document.getElementById('relatedStepHint'),
      primaryCustomerSelectLabel: document.getElementById('primaryCustomerSelectLabel'),
      primaryModalBtn: document.getElementById('primaryModalBtn'),
      relatedModalBtn: document.getElementById('relatedModalBtn'),
      supportingPartyBtn: document.getElementById('supportingPartyBtn'),
      primaryCustomerCardLabel: document.getElementById('primaryCustomerCardLabel'),
      primaryCustomerSelect: document.getElementById('primaryCustomerSelect'),
      primaryCustomerName: document.getElementById('primaryCustomerName'),
      primaryCustomerMeta: document.getElementById('primaryCustomerMeta'),
      primaryCustomerContact: document.getElementById('primaryCustomerContact'),
      additionalPartiesTitle: document.getElementById('additionalPartiesTitle'),
      additionalPartiesHint: document.getElementById('additionalPartiesHint'),
      additionalParties: document.getElementById('additionalParties'),
      requirementsMeta: document.getElementById('requirementsMeta'),
      requirementsList: document.getElementById('requirementsList'),
      requirementsProgress: document.getElementById('requirementsProgress'),
      familyScenarioPanel: document.getElementById('familyScenarioPanel'),
      familyScenarioTitle: document.getElementById('familyScenarioTitle'),
      familyScenarioSummary: document.getElementById('familyScenarioSummary'),
      familyDependents: document.getElementById('familyDependents'),
      familyRoleChips: document.getElementById('familyRoleChips'),
      familyKeyPartyPanel: document.getElementById('familyKeyPartyPanel'),
      familyKeyPartyList: document.getElementById('familyKeyPartyList'),
      familyGateNotes: document.getElementById('familyGateNotes'),
      familyCaseMatrixPanel: document.getElementById('familyCaseMatrixPanel'),
      familyCaseMatrix: document.getElementById('familyCaseMatrix'),
      enableFamilyBulkBtn: document.querySelector('[data-action="enable-family-bulk"]'),
      workScenarioPanel: document.getElementById('workScenarioPanel'),
      workFieldList: document.getElementById('workFieldList'),
      crossGroupReasonRow: document.getElementById('crossGroupReasonRow'),
      crossGroupReason: document.getElementById('crossGroupReason'),
      createChecklist: document.getElementById('createChecklist'),
      createTasks: document.getElementById('createTasks'),
      familyCreationPanel: document.getElementById('familyCreationPanel'),
      familyCreationSummary: document.getElementById('familyCreationSummary'),
      familyCreationTasks: document.getElementById('familyCreationTasks'),
      btnPrev: document.getElementById('btnPrevStep'),
      btnNext: document.getElementById('btnNextStep'),
      btnSubmit: document.getElementById('btnSubmitCase'),
      submitHint: document.getElementById('submitHint'),
      successBanner: document.getElementById('successBanner'),
      successBannerTitle: document.getElementById('successBannerTitle'),
      successBannerDesc: document.getElementById('successBannerDesc'),
      viewCreatedCasesBtn: document.getElementById('viewCreatedCasesBtn'),
      summaryTemplate: document.getElementById('summaryTemplate'),
      summaryCustomer: document.getElementById('summaryCustomer'),
      summaryParties: document.getElementById('summaryParties'),
      summaryOwner: document.getElementById('summaryOwner'),
      summaryDueDate: document.getElementById('summaryDueDate'),
      summaryAmount: document.getElementById('summaryAmount'),
      summaryChecklist: document.getElementById('summaryChecklist'),
      toast: document.getElementById('toast'),
      toastTitle: document.getElementById('toastTitle'),
      toastDesc: document.getElementById('toastDesc'),
    };

    function getTemplate() {
      return templatesById[state.templateId] || config.templates[0];
    }

    function isFamilyBulkScenario() {
      return state.familyBulkMode && getTemplate().id === 'family';
    }

    function getFamilyScenario() {
      return getTemplate().familyScenario || {};
    }

    function getFamilyApplicants() {
      if (!isFamilyBulkScenario()) return [];
      return state.additionalParties
        .map(function (item, index) {
          return Object.assign({ originalIndex: index }, item);
        })
        .filter(function (item) {
          return FAMILY_APPLICANT_ROLES.indexOf(item.role) >= 0;
        });
    }

    function getFamilySupportingParties() {
      if (!isFamilyBulkScenario()) return [];

      var parties = [];
      if (state.primaryCustomer) {
        parties.push({
          name: state.primaryCustomer.name,
          role: state.primaryCustomer.roleHint || '扶养者',
          contact: state.primaryCustomer.contact,
          note: state.primaryCustomer.summary,
          groupLabel: state.primaryCustomer.groupLabel,
          source: 'primary',
        });
      }

      state.additionalParties.forEach(function (item, index) {
        if (FAMILY_SUPPORTER_ROLES.indexOf(item.role) >= 0) {
          parties.push(Object.assign({ originalIndex: index, source: 'related' }, item));
        }
      });

      return parties;
    }

    function getGroupLabel(value) {
      var match = config.groups.find(function (item) { return item.value === value; });
      return match ? match.label : value;
    }

    function getOwnerLabel(value) {
      var match = config.owners.find(function (item) { return item.value === value; });
      return match ? match.label : value;
    }

    function parseCreateContext() {
      if (typeof helpers.parseCreateContext === 'function') {
        return helpers.parseCreateContext(window.location.search || '', config.customers || []);
      }
      var params = new window.URLSearchParams(window.location.search || '');
      return {
        sourceLeadId: params.get('sourceLeadId') || '',
        customerId: params.get('customerId') || '',
      };
    }

    function getCustomerById(customerId) {
      return config.customers.find(function (item) { return item.id === customerId; }) || null;
    }

    function getInheritedGroupValue() {
      var sourceCustomer = getCustomerById(state.sourceCustomerId || state.customerId);
      if (typeof helpers.getInheritedGroup === 'function') {
        return helpers.getInheritedGroup(config.defaultState.group, state.primaryCustomer || sourceCustomer);
      }
      if (state.primaryCustomer && state.primaryCustomer.group) return state.primaryCustomer.group;
      if (sourceCustomer && sourceCustomer.group) return sourceCustomer.group;
      return config.defaultState.group;
    }

    function syncInheritedGroup(force) {
      var nextInheritedGroup = getInheritedGroupValue();
      if (force || !state.group || state.group === state.inheritedGroup) {
        state.group = nextInheritedGroup;
      }
      state.inheritedGroup = nextInheritedGroup;
    }

    function renderSourceContext() {
      if (!elements.sourceContextBar) return;
      var hasContext = !!(state.sourceLeadId || state.sourceCustomerId);
      elements.sourceContextBar.classList.toggle('hidden', !hasContext);
      if (!hasContext) return;

      var sourceCustomer = getCustomerById(state.sourceCustomerId);
      if (elements.sourceLeadValue) elements.sourceLeadValue.textContent = state.sourceLeadId || '—';
      if (elements.sourceCustomerValue) {
        elements.sourceCustomerValue.textContent = sourceCustomer
          ? sourceCustomer.name + '（' + sourceCustomer.id + '）'
          : (state.sourceCustomerId || '待创建');
      }
      if (elements.sourceContextHint) {
        elements.sourceContextHint.textContent = state.sourceCustomerId
          ? 'Step 2 已按转化链路预填主申请人，Step 3 默认继承该 Customer 的 Group。'
          : '当前为从 Lead 进入的建案流程；如先创建 Customer，Step 3 将默认继承新客户 Group。';
      }
      if (elements.sourceContextDedupHint) {
        elements.sourceContextDedupHint.textContent = 'P0：命中重复客户时仅提示，不自动复用；继续创建需填写原因、二次确认并留痕。';
      }
    }

    function renderGroupInheritance() {
      if (elements.groupInheritanceValue) {
        elements.groupInheritanceValue.textContent = getGroupLabel(state.inheritedGroup);
      }
      if (elements.groupInheritanceHint) {
        elements.groupInheritanceHint.textContent = state.group === state.inheritedGroup
          ? '当前沿用主申请人 / Customer 的默认 Group，无需额外留痕。'
          : '当前已改为非默认 Group；必须填写跨组建案原因并留痕。';
      }
    }

    function showToast(title, desc) {
      if (!elements.toast) return;
      elements.toastTitle.textContent = title;
      elements.toastDesc.textContent = desc;
      elements.toast.classList.remove('hidden');
      window.clearTimeout(showToast._timer);
      showToast._timer = window.setTimeout(function () {
        elements.toast.classList.add('hidden');
      }, 2600);
    }

    function readSessionJson(key) {
      try {
        var raw = window.sessionStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch (error) {
        return null;
      }
    }

    function writeSessionJson(key, value) {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        return;
      }
    }

    function buildCaseName() {
      var baseName = state.primaryCustomer ? state.primaryCustomer.name : '未选择客户';
      if (isFamilyBulkScenario()) {
        return baseName + ' - ' + getTemplate().label + state.applicationType + '批次';
      }
      return baseName + ' - ' + getTemplate().label + state.applicationType;
    }

    function buildFamilyDraftParty(item, index) {
      return {
        id: 'family-draft-' + index,
        mode: 'related',
        name: item.name,
        role: item.role,
        group: state.group,
        groupLabel: getGroupLabel(state.group),
        contact: item.contact || '待补充联系方式',
        note: item.note || '',
        relation: item.relation || '',
        reuseDocs: item.reuseDocs || [],
        staleDocWarning: item.staleDocWarning || '',
        initials: item.name.replace(/\s+/g, '').slice(0, 2).toUpperCase() || '家',
      };
    }

    function ensureFamilyBulkSeeded() {
      if (!isFamilyBulkScenario() || state.familyBulkSeeded || state.additionalParties.length) return;
      state.additionalParties = (getFamilyScenario().defaultDraftParties || []).map(buildFamilyDraftParty);
      state.familyBulkSeeded = true;
    }

    function renderDynamicCopy() {
      var isFamilyBulk = isFamilyBulkScenario();

      if (elements.caseNameLabel) {
        elements.caseNameLabel.textContent = isFamilyBulk ? '批量建案批次名称' : '案件标题';
      }
      if (elements.caseNameHint) {
        elements.caseNameHint.textContent = isFamilyBulk
          ? '默认由“扶养者/保证人 + 模板 + 申请类型 + 批次”生成；每位办理对象仍会各自生成独立 Case。'
          : '默认由“主申请人 + 模板 + 申请类型”生成，也支持手动改名。';
      }
      if (elements.relatedStepHint) {
        elements.relatedStepHint.textContent = isFamilyBulk
          ? '先锁定扶养者 / 保证人，再为多个配偶 / 子女按每人一案批量创建。'
          : '先选择主申请人，再按案件类型补充关联人。';
      }
      if (elements.primaryCustomerSelectLabel) {
        elements.primaryCustomerSelectLabel.textContent = isFamilyBulk ? '选择扶养者 / 保证人' : '选择主申请人';
      }
      if (elements.primaryCustomerCardLabel) {
        elements.primaryCustomerCardLabel.textContent = isFamilyBulk ? '关键关系人' : '主申请人';
      }
      if (elements.primaryModalBtn) {
        elements.primaryModalBtn.textContent = isFamilyBulk ? '新建扶养者 / 保证人' : '新建主申请人';
        elements.primaryModalBtn.setAttribute('data-default-role', isFamilyBulk ? '扶养者' : '主申请人');
      }
      if (elements.relatedModalBtn) {
        elements.relatedModalBtn.textContent = isFamilyBulk ? '添加办理对象' : '新增关联人';
        elements.relatedModalBtn.setAttribute('data-default-role', '配偶');
      }
      if (elements.supportingPartyBtn) {
        elements.supportingPartyBtn.classList.toggle('hidden', !isFamilyBulk);
      }
      if (elements.additionalPartiesTitle) {
        elements.additionalPartiesTitle.textContent = isFamilyBulk ? '办理对象（每人一案）' : '关联人';
      }
      if (elements.additionalPartiesHint) {
        elements.additionalPartiesHint.textContent = isFamilyBulk
          ? '每位配偶 / 子女都会生成独立 Case，并自动继承 Group、来源与默认负责人。'
          : '家族签可补充配偶/子女，工作类可补充雇主联系人。';
      }
    }

    function renderTemplateCards() {
      elements.templateCards.forEach(function (card) {
        var isActive = card.getAttribute('data-template-card') === state.templateId;
        card.classList.toggle('is-active', isActive);
      });
    }

    function renderApplicationTypes() {
      var template = getTemplate();
      elements.applicationTypeSelect.innerHTML = template.applicationTypes.map(function (item) {
        return '<option value="' + item + '">' + item + '</option>';
      }).join('');
      elements.applicationTypeSelect.value = state.applicationType;
    }

    function renderPrimaryCustomer() {
      if (!state.primaryCustomer && elements.primaryCustomerSelect.value) {
        var selected = config.customers.find(function (item) { return item.id === elements.primaryCustomerSelect.value; });
        state.primaryCustomer = selected || null;
      }

      if (!state.primaryCustomer) {
        elements.primaryCustomerName.textContent = isFamilyBulkScenario() ? '未选择扶养者 / 保证人' : '未选择主申请人';
        elements.primaryCustomerMeta.textContent = isFamilyBulkScenario()
          ? '先锁定关键关系人，后续每个案件都会自动绑定到 CaseParty。'
          : '请选择当前案件的主申请人。';
        elements.primaryCustomerContact.textContent = '-';
        return;
      }

      elements.primaryCustomerName.textContent = state.primaryCustomer.name;
      if (isFamilyBulkScenario()) {
        elements.primaryCustomerMeta.textContent =
          (state.primaryCustomer.roleHint || '扶养者') + ' / ' + state.primaryCustomer.groupLabel + ' / 既有客户档案已复用';
        elements.primaryCustomerContact.textContent =
          state.primaryCustomer.summary + ' · ' + state.primaryCustomer.contact;
        return;
      }

      elements.primaryCustomerMeta.textContent =
        state.primaryCustomer.kana + ' / ' + state.primaryCustomer.groupLabel + ' / ' + state.primaryCustomer.roleHint;
      elements.primaryCustomerContact.textContent =
        state.primaryCustomer.summary + ' · ' + state.primaryCustomer.contact;
      syncInheritedGroup(false);
    }

    function renderAdditionalParties() {
      var parties = isFamilyBulkScenario()
        ? getFamilyApplicants()
        : state.additionalParties.map(function (item, index) {
          return Object.assign({ originalIndex: index }, item);
        });

      if (!parties.length) {
        elements.additionalParties.innerHTML =
          '<div class="empty-state">' + (
            isFamilyBulkScenario()
              ? '当前还没有办理对象。请继续添加配偶 / 子女，系统会按每人一案生成 Case 草稿。'
              : '当前还没有新增关联人。家族签可添加配偶/子女，工作类可补充雇主联系人。'
          ) + '</div>';
        return;
      }

      elements.additionalParties.innerHTML = parties.map(function (item) {
        return [
          '<div class="party-card">',
          '<div class="party-avatar">' + item.initials + '</div>',
          '<div class="party-copy">',
          '<div class="party-title">' + item.name + ' <span class="chip">' + item.role + '</span></div>',
          '<div class="meta-text">' + item.groupLabel + ' · ' + item.contact + '</div>',
          (item.relation ? '<div class="meta-text">' + item.relation + '</div>' : ''),
          (item.note ? '<div class="meta-text">' + item.note + '</div>' : ''),
          (item.staleDocWarning ? '<div class="meta-text text-amber-700">' + item.staleDocWarning + '</div>' : ''),
          '</div>',
          '<button class="table-icon-btn" type="button" data-remove-party="' + item.originalIndex + '" aria-label="移除关联人">',
          '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
          '</button>',
          '</div>',
        ].join('');
      }).join('');
    }

    function renderRequirements() {
      var template = getTemplate();
      var total = 0;
      var required = 0;
      var applicantCount = getFamilyApplicants().length;

      elements.requirementsMeta.textContent = template.requirementSummary + ' · ' + template.helper;

      elements.requirementsList.innerHTML = template.sections.map(function (section) {
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
      }).join('');

      if (isFamilyBulkScenario()) {
        elements.requirementsProgress.textContent = applicantCount
          ? '预计为 ' + applicantCount + ' 个办理对象分别生成资料清单；每案默认 ' + required + ' / ' + total + ' 个必交项，扶养者材料按共享附件版本引用。'
          : '先添加办理对象后，系统会按每人一案生成资料清单，并自动复用扶养者 / 保证人材料。';
        return;
      }

      elements.requirementsProgress.textContent = '默认生成 ' + required + ' / ' + total + ' 个必交资料项';
    }

    function renderFamilyScenario() {
      var template = getTemplate();
      var isFamily = template.id === 'family';
      var familyScenario = template.familyScenario || {};
      var workScenario = template.workScenario || {};
      var applicants = getFamilyApplicants();
      var supporters = getFamilySupportingParties();

      elements.familyScenarioPanel.classList.toggle('hidden', !isFamily);
      elements.familyKeyPartyPanel.classList.toggle('hidden', !isFamilyBulkScenario());
      elements.familyCaseMatrixPanel.classList.toggle('hidden', !isFamilyBulkScenario());
      elements.workScenarioPanel.classList.toggle('hidden', isFamily);
      elements.familyCreationPanel.classList.toggle('hidden', !isFamilyBulkScenario());

      if (isFamily) {
        elements.familyScenarioTitle.textContent = state.familyBulkMode
          ? (familyScenario.title || '家族签批量建案') + '（已开启）'
          : (familyScenario.title || '家族签批量建案');
        elements.familyScenarioSummary.textContent = state.familyBulkMode
          ? '已切换到批量模式：先锁定关键关系人，再为多个办理对象按每人一案生成 Case。'
          : (familyScenario.summary || '');
        elements.familyRoleChips.innerHTML = (familyScenario.roles || []).map(function (role) {
          return '<span class="chip">' + role + '</span>';
        }).join('');
        elements.familyDependents.innerHTML = [
          '<div class="summary-box"><div class="summary-label">待创建案件</div><div class="summary-value">' + applicants.length + ' 个</div><div class="meta-text">每位办理对象独立成案</div></div>',
          '<div class="summary-box"><div class="summary-label">CaseParty 关键关系人</div><div class="summary-value">' + supporters.length + ' 位</div><div class="meta-text">扶养者 / 保证人自动绑定</div></div>',
          '<div class="summary-box"><div class="summary-label">资料复用</div><div class="summary-value">共享附件版本</div><div class="meta-text">跨案复用在留卡、纳税证明等材料</div></div>',
          '<div class="summary-box"><div class="summary-label">补齐策略</div><div class="summary-value">先建档建案</div><div class="meta-text">缺失字段转为后续补齐任务</div></div>',
        ].join('');
        if (elements.enableFamilyBulkBtn) {
          elements.enableFamilyBulkBtn.textContent = state.familyBulkMode ? '批量模式已开启' : '切换到批量模式';
          elements.enableFamilyBulkBtn.disabled = state.familyBulkMode;
          elements.enableFamilyBulkBtn.classList.toggle('opacity-60', state.familyBulkMode);
          elements.enableFamilyBulkBtn.classList.toggle('cursor-not-allowed', state.familyBulkMode);
        }

        if (isFamilyBulkScenario()) {
          elements.familyKeyPartyList.innerHTML = supporters.length
            ? supporters.map(function (item) {
              var action = item.source === 'related'
                ? '<button class="table-icon-btn" type="button" data-remove-party="' + item.originalIndex + '" aria-label="移除关联人"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>'
                : '<span class="chip">已复用客户档案</span>';
              return [
                '<div class="party-card">',
                '<div class="party-avatar">' + item.name.slice(0, 2) + '</div>',
                '<div class="party-copy">',
                '<div class="party-title">' + item.name + ' <span class="chip">' + item.role + '</span></div>',
                '<div class="meta-text">' + item.groupLabel + ' · ' + item.contact + '</div>',
                (item.note ? '<div class="meta-text">' + item.note + '</div>' : ''),
                '</div>',
                action,
                '</div>',
              ].join('');
            }).join('')
            : '<div class="empty-state">请先选择扶养者 / 保证人，系统会将其作为 CaseParty 关键关系人自动绑定到每个案件。</div>';

          elements.familyGateNotes.innerHTML = (familyScenario.gateChecks || []).map(function (note) {
            return '<div class="meta-text">• ' + note + '</div>';
          }).join('');

          elements.familyCaseMatrix.innerHTML = applicants.length
            ? applicants.map(function (item) {
              var sponsorNames = supporters.length
                ? supporters.map(function (party) { return party.name + '（' + party.role + '）'; }).join(' / ')
                : '待补充';
              var reuseDocs = (item.reuseDocs || []).length ? item.reuseDocs.join('、') : '在留卡、纳税证明';
              return [
                '<div class="summary-box">',
                '<div class="summary-label">Case 草稿</div>',
                '<div class="summary-value">' + item.name + ' - ' + template.label + state.applicationType + '</div>',
                '<div class="meta-text mt-2">CaseParty：主申请人 = ' + item.name + ' / 关键关系人 = ' + sponsorNames + '</div>',
                '<div class="meta-text mt-2">资料复用：' + reuseDocs + '</div>',
                (item.staleDocWarning ? '<div class="meta-text mt-2 text-amber-700">' + item.staleDocWarning + '</div>' : ''),
                '</div>',
              ].join('');
            }).join('')
            : '<div class="empty-state">添加办理对象后，这里会展示每个 Case 的创建预览、CaseParty 绑定与材料复用提示。</div>';

          elements.familyCreationSummary.textContent = applicants.length
            ? '提交后将一次创建 ' + applicants.length + ' 个 Case，并自动继承 ' + getGroupLabel(state.group) + ' / ' + getOwnerLabel(state.owner) + '。'
            : '先添加办理对象后，系统会在此显示本次批量建案的实际创建数量。';
          elements.familyCreationTasks.innerHTML = (familyScenario.reuseNotes || []).map(function (note) {
            return '<div class="meta-text">• ' + note + '</div>';
          }).join('');
        }
      } else {
        elements.workFieldList.innerHTML = (workScenario.fields || []).map(function (field) {
          return '<span class="chip">' + field + '</span>';
        }).join('');
      }
    }

    function renderSummary() {
      var applicants = getFamilyApplicants();
      var supporters = getFamilySupportingParties();
      elements.summaryTemplate.textContent = getTemplate().label + ' / ' + state.applicationType;
      elements.summaryCustomer.textContent = state.primaryCustomer
        ? state.primaryCustomer.name + (isFamilyBulkScenario() ? '（关键关系人）' : '')
        : '未选择';
      elements.summaryParties.textContent = isFamilyBulkScenario()
        ? (
          applicants.length
            ? '办理对象：' + applicants.map(function (item) { return item.name + '（' + item.role + '）'; }).join('，') + '；CaseParty：' + supporters.map(function (item) {
              return item.name + '（' + item.role + '）';
            }).join('，')
            : '批量模式已开启，待补充办理对象'
        )
        : (
          state.additionalParties.length
            ? state.additionalParties.map(function (item) { return item.name + '（' + item.role + '）'; }).join('，')
            : '无'
        );
      elements.summaryOwner.textContent = getOwnerLabel(state.owner) + ' / ' + getGroupLabel(state.group);
      elements.summaryDueDate.textContent = state.dueDate || '未设置';
      elements.summaryAmount.textContent = state.amount ? '¥' + Number(state.amount).toLocaleString() : '未设置';
      elements.summaryChecklist.textContent = [
        elements.createChecklist.checked ? '自动生成资料清单' : '不自动生成资料清单',
        elements.createTasks.checked ? '创建跟进任务' : '不创建跟进任务',
        isFamilyBulkScenario() ? '自动绑定 CaseParty 与补齐任务' : '',
      ].filter(Boolean).join(' / ');

      if (elements.successBannerTitle && elements.successBannerDesc) {
        if (isFamilyBulkScenario()) {
          elements.successBannerTitle.textContent = applicants.length
            ? '已创建 ' + applicants.length + ' 个家族案件草稿'
            : '家族批量建案已创建';
          elements.successBannerDesc.textContent = applicants.length
            ? '已同步绑定 ' + supporters.length + ' 位关键关系人，资料清单与补齐任务已按每人一案生成。'
            : '已生成批量建案草稿，可继续补充办理对象与资料。';
        } else {
          elements.successBannerTitle.textContent = '案件已创建';
          elements.successBannerDesc.textContent = '已生成案件记录与资料登记清单草稿，可返回列表继续补录或分派任务。';
        }
      }

      var viewDetailBtn = document.getElementById('viewCaseDetailBtn');
      if (viewDetailBtn) {
        viewDetailBtn.textContent = isFamilyBulkScenario()
          ? '查看首个案件详情'
          : '查看案件详情';
      }

      if (elements.viewCreatedCasesBtn) {
        elements.viewCreatedCasesBtn.textContent = isFamilyBulkScenario() && applicants.length
          ? '查看案件列表中的 ' + applicants.length + ' 个结果'
          : '查看案件列表结果';
      }
    }

    function buildCreatedCaseRecord(item, index, options) {
      var createdAt = options.createdAt;
      var supporters = options.supporters || [];
      var dueDate = state.dueDate || getTemplate().defaultDueDate;
      var dueLabel = dueDate ? dueDate.slice(5) : '-';
      var createdAtLabel = '刚刚创建';
      var typeLabel = getTemplate().label + ' / ' + state.applicationType;
      var supporterSummary = supporters.length
        ? supporters.map(function (party) { return party.name + '（' + party.role + '）'; }).join('，')
        : '待补充';

      return {
        id: 'CAS-DEMO-' + String(createdAt).slice(-6) + '-' + String(index + 1).padStart(2, '0'),
        name: item.name + ' ' + getTemplate().label + state.applicationType,
        type: typeLabel,
        applicant: item.name,
        groupId: state.group,
        groupLabel: getGroupLabel(state.group),
        stageId: 'S1',
        stageLabel: 'S1 建档',
        ownerId: state.owner,
        completionPercent: 0,
        completionLabel: '0 / 0 初始生成',
        validationStatus: 'pending',
        validationLabel: 'pending',
        blockerCount: 0,
        unpaidAmount: Number(state.amount || 0),
        updatedAtLabel: createdAtLabel,
        dueDate: dueDate,
        dueDateLabel: dueLabel,
        riskStatus: 'normal',
        riskLabel: '正常',
        visibleScopes: ['mine', 'group', 'all'],
        batchLabel: isFamilyBulkScenario() ? '家族批量建案' : '新建案件',
        casePartySummary: supporters.length ? 'CaseParty：' + supporterSummary : 'CaseParty 待补充',
        materialSummary: isFamilyBulkScenario()
          ? '资料清单已生成，扶养者 / 保证人材料按共享附件版本引用'
          : '资料清单已生成，可继续补录关联人与材料',
        isDraft: true,
      };
    }

    function persistCreatedCases() {
      var createdAt = Date.now();
      var supporters = getFamilySupportingParties();
      var draftCases = [];

      if (isFamilyBulkScenario()) {
        draftCases = getFamilyApplicants().map(function (item, index) {
          return buildCreatedCaseRecord(item, index, {
            createdAt: createdAt,
            supporters: supporters,
          });
        });
      } else if (state.primaryCustomer) {
        draftCases = [buildCreatedCaseRecord({
          name: state.primaryCustomer.name,
        }, 0, {
          createdAt: createdAt,
          supporters: state.additionalParties.map(function (item) {
            return { name: item.name, role: item.role };
          }),
        })];
      }

      if (!draftCases.length) return [];

      var existingDrafts = readSessionJson(CASE_LIST_DRAFTS_KEY);
      var mergedDrafts = Array.isArray(existingDrafts) ? draftCases.concat(existingDrafts) : draftCases;
      writeSessionJson(CASE_LIST_DRAFTS_KEY, mergedDrafts);
      writeSessionJson(CASE_LIST_FLASH_KEY, {
        caseIds: draftCases.map(function (item) { return item.id; }),
        count: draftCases.length,
        templateLabel: getTemplate().label,
        applicationType: state.applicationType,
        primaryName: state.primaryCustomer ? state.primaryCustomer.name : '',
        isFamilyBulk: isFamilyBulkScenario(),
      });

      return draftCases;
    }

    function canProceed(stepIndex) {
      if (stepIndex === 0) {
        return !!state.templateId && !!state.applicationType && !!elements.caseNameInput.value.trim();
      }
      if (stepIndex === 1) {
        if (isFamilyBulkScenario()) {
          return !!state.primaryCustomer && getFamilyApplicants().length > 0;
        }
        return !!state.primaryCustomer;
      }
      if (stepIndex === 2) {
        if (!state.owner || !state.dueDate || !state.amount) return false;
        if ((typeof helpers.shouldRequireCrossGroupReason === 'function'
          ? helpers.shouldRequireCrossGroupReason(state.group, state.inheritedGroup)
          : state.group !== state.inheritedGroup) && !elements.crossGroupReason.value.trim()) return false;
      }
      return true;
    }

    function syncButtons() {
      elements.btnPrev.classList.toggle('hidden', state.currentStep === 0);
      elements.btnNext.classList.toggle('hidden', state.currentStep === steps.length - 1);
      elements.btnSubmit.classList.toggle('hidden', state.currentStep !== steps.length - 1);

      if (!elements.btnNext.classList.contains('hidden')) {
        var nextText = state.currentStep === 0 ? '下一步：关联人与资料模板' : '下一步：分派与复核';
        elements.btnNext.textContent = nextText;
        elements.btnNext.disabled = !canProceed(state.currentStep);
      }

      elements.btnSubmit.disabled = !canProceed(2);
      elements.submitHint.textContent = isFamilyBulkScenario()
        ? (
          getFamilyApplicants().length
            ? '提交后会一次创建 ' + getFamilyApplicants().length + ' 个 Case，并同步生成 CaseParty、资料清单与补齐任务。'
            : '当前为家族签批量模式，请先补充至少 1 位办理对象。'
        )
        : '创建后会自动生成资料清单与初始任务。';
    }

    function renderSteps() {
      steps.forEach(function (step, index) {
        step.classList.toggle('hidden', index !== state.currentStep);
      });

      stepIndicators.forEach(function (item, index) {
        item.classList.toggle('is-active', index === state.currentStep);
        item.classList.toggle('is-complete', index < state.currentStep);
      });

      if (state.currentStep === 3) renderSummary();
      syncButtons();
    }

    function syncFormValues() {
      syncInheritedGroup(false);
      elements.groupSelect.value = state.group;
      elements.ownerSelect.value = state.owner;
      elements.dueDateInput.value = state.dueDate;
      elements.amountInput.value = state.amount;
      renderApplicationTypes();
      elements.applicationTypeSelect.value = state.applicationType;
      elements.primaryCustomerSelect.innerHTML = config.customers.map(function (customer) {
        return '<option value="' + customer.id + '">' + customer.name + ' / ' + customer.groupLabel + '</option>';
      }).join('');
      elements.primaryCustomerSelect.value = state.customerId;
      if (!elements.caseNameInput.dataset.manual) {
        elements.caseNameInput.value = buildCaseName();
      }
      elements.crossGroupReasonRow.classList.toggle(
        'hidden',
        !(typeof helpers.shouldRequireCrossGroupReason === 'function'
          ? helpers.shouldRequireCrossGroupReason(state.group, state.inheritedGroup)
          : state.group !== state.inheritedGroup)
      );
      renderSourceContext();
      renderGroupInheritance();
    }

    function applyHashMode() {
      state.familyBulkMode = window.location.hash === '#family-bulk';
      if (state.familyBulkMode) {
        state.templateId = 'family';
        state.customerId = 'CUS-2026-0187';
      }
    }

    function refresh() {
      state.group = elements.groupSelect.value;
      state.owner = elements.ownerSelect.value;
      state.dueDate = elements.dueDateInput.value;
      state.amount = elements.amountInput.value;
      state.applicationType = elements.applicationTypeSelect.value || state.applicationType;
      state.customerId = elements.primaryCustomerSelect.value;
      state.primaryCustomer = config.customers.find(function (item) { return item.id === state.customerId; }) || state.primaryCustomer;
      syncInheritedGroup(false);

      ensureFamilyBulkSeeded();
      syncFormValues();
      renderDynamicCopy();
      renderTemplateCards();
      renderPrimaryCustomer();
      renderAdditionalParties();
      renderRequirements();
      renderFamilyScenario();
      renderSteps();
      if (state.currentStep !== 3) renderSummary();
    }

    window.CaseCreatePageApi = {
      addCustomer: function (customer) {
        if (customer.mode === 'primary') {
          state.primaryCustomer = {
            id: customer.id,
            name: customer.name,
            kana: customer.role,
            group: customer.group,
            groupLabel: customer.groupLabel,
            roleHint: customer.role,
            summary: customer.note || '新建客户',
            contact: customer.contact,
          };
          config.customers.unshift(state.primaryCustomer);
          state.customerId = customer.id;
          syncInheritedGroup(true);
          state.currentStep = Math.max(state.currentStep, 1);
        } else {
          state.additionalParties.push(customer);
        }

        showToast(config.toast.customerAdded.title, config.toast.customerAdded.desc);
        refresh();
      },
    };

    document.addEventListener('click', function (event) {
      var templateCard = event.target.closest('[data-template-card]');
      if (templateCard) {
        state.templateId = templateCard.getAttribute('data-template-card');
        state.applicationType = templatesById[state.templateId].applicationTypes[0];
        state.dueDate = templatesById[state.templateId].defaultDueDate;
        if (!elements.caseNameInput.dataset.manual) elements.caseNameInput.value = buildCaseName();
        refresh();
        return;
      }

      var removeButton = event.target.closest('[data-remove-party]');
      if (removeButton) {
        state.additionalParties.splice(Number(removeButton.getAttribute('data-remove-party')), 1);
        refresh();
        return;
      }

      if (event.target.closest('[data-action="enable-family-bulk"]')) {
        if (state.familyBulkMode) return;
        state.familyBulkMode = true;
        state.familyBulkSeeded = false;
        state.templateId = 'family';
        window.location.hash = 'family-bulk';
        showToast('已切换到批量模式', '现在可以连续补充多个办理对象，并沿用家族签资料模板。');
        refresh();
        return;
      }
    });

    elements.primaryCustomerSelect.addEventListener('change', function () {
      state.customerId = elements.primaryCustomerSelect.value;
      state.primaryCustomer = config.customers.find(function (item) { return item.id === state.customerId; }) || null;
      syncInheritedGroup(false);
      if (!elements.caseNameInput.dataset.manual) elements.caseNameInput.value = buildCaseName();
      refresh();
    });

    elements.applicationTypeSelect.addEventListener('change', function () {
      if (!elements.caseNameInput.dataset.manual) elements.caseNameInput.value = buildCaseName();
      refresh();
    });

    [elements.groupSelect, elements.ownerSelect, elements.dueDateInput, elements.amountInput, elements.crossGroupReason, elements.createChecklist, elements.createTasks].forEach(function (element) {
      element.addEventListener('input', refresh);
      element.addEventListener('change', refresh);
    });

    elements.caseNameInput.addEventListener('input', function () {
      elements.caseNameInput.dataset.manual = elements.caseNameInput.value.trim() ? 'true' : '';
      syncButtons();
    });

    window.addEventListener('hashchange', function () {
      applyHashMode();
      refresh();
    });

    elements.btnPrev.addEventListener('click', function () {
      state.currentStep = Math.max(0, state.currentStep - 1);
      renderSteps();
    });

    elements.btnNext.addEventListener('click', function () {
      if (!canProceed(state.currentStep)) return;
      state.currentStep = Math.min(steps.length - 1, state.currentStep + 1);
      renderSteps();
    });

    elements.btnSubmit.addEventListener('click', function () {
      if (!canProceed(2)) return;
      persistCreatedCases();
      elements.successBanner.classList.remove('hidden');
      showToast(config.toast.created.title, config.toast.created.desc);
    });

    var viewCaseDetailBtn = document.getElementById('viewCaseDetailBtn');
    if (viewCaseDetailBtn) {
      viewCaseDetailBtn.addEventListener('click', function () {
        window.location.href = 'detail.html';
      });
    }

    var viewCaseDocumentsBtn = document.getElementById('viewCaseDocumentsBtn');
    if (viewCaseDocumentsBtn) {
      viewCaseDocumentsBtn.addEventListener('click', function () {
        window.location.href = 'detail.html#documents';
      });
    }

    if (elements.viewCreatedCasesBtn) {
      elements.viewCreatedCasesBtn.addEventListener('click', function () {
        window.location.href = 'index.html';
      });
    }

    var createContext = parseCreateContext();
    if (createContext.sourceLeadId) state.sourceLeadId = createContext.sourceLeadId;
    if (createContext.customerId) {
      state.sourceCustomerId = createContext.customerId;
      state.customerId = createContext.customerId;
    }

    applyHashMode();
    state.primaryCustomer = config.customers.find(function (item) { return item.id === state.customerId; }) || config.customers[0];
    syncInheritedGroup(true);
    syncFormValues();
    refresh();
  });
})();
