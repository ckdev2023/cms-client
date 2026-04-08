(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var config = window.CaseCreateConfig;
    if (!config) return;

    var templatesById = {};
    config.templates.forEach(function (template) {
      templatesById[template.id] = template;
    });

    var state = {
      currentStep: 0,
      templateId: config.defaultState.templateId,
      applicationType: config.defaultState.applicationType,
      group: config.defaultState.group,
      owner: config.defaultState.owner,
      dueDate: config.defaultState.dueDate,
      amount: config.defaultState.amount,
      customerId: config.defaultState.customerId,
      familyBulkMode: window.location.hash === '#family-bulk',
      primaryCustomer: null,
      additionalParties: [],
    };

    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step-panel]'));
    var stepIndicators = Array.prototype.slice.call(document.querySelectorAll('[data-step-indicator]'));

    var elements = {
      templateCards: Array.prototype.slice.call(document.querySelectorAll('[data-template-card]')),
      applicationTypeSelect: document.getElementById('applicationTypeSelect'),
      groupSelect: document.getElementById('groupSelect'),
      ownerSelect: document.getElementById('ownerSelect'),
      dueDateInput: document.getElementById('dueDateInput'),
      amountInput: document.getElementById('amountInput'),
      caseNameInput: document.getElementById('caseNameInput'),
      primaryCustomerSelect: document.getElementById('primaryCustomerSelect'),
      primaryCustomerName: document.getElementById('primaryCustomerName'),
      primaryCustomerMeta: document.getElementById('primaryCustomerMeta'),
      primaryCustomerContact: document.getElementById('primaryCustomerContact'),
      additionalParties: document.getElementById('additionalParties'),
      requirementsMeta: document.getElementById('requirementsMeta'),
      requirementsList: document.getElementById('requirementsList'),
      requirementsProgress: document.getElementById('requirementsProgress'),
      familyScenarioPanel: document.getElementById('familyScenarioPanel'),
      familyScenarioTitle: document.getElementById('familyScenarioTitle'),
      familyScenarioSummary: document.getElementById('familyScenarioSummary'),
      familyDependents: document.getElementById('familyDependents'),
      familyRoleChips: document.getElementById('familyRoleChips'),
      workScenarioPanel: document.getElementById('workScenarioPanel'),
      workFieldList: document.getElementById('workFieldList'),
      crossGroupReasonRow: document.getElementById('crossGroupReasonRow'),
      crossGroupReason: document.getElementById('crossGroupReason'),
      createChecklist: document.getElementById('createChecklist'),
      createTasks: document.getElementById('createTasks'),
      btnPrev: document.getElementById('btnPrevStep'),
      btnNext: document.getElementById('btnNextStep'),
      btnSubmit: document.getElementById('btnSubmitCase'),
      submitHint: document.getElementById('submitHint'),
      successBanner: document.getElementById('successBanner'),
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

    function getGroupLabel(value) {
      var match = config.groups.find(function (item) { return item.value === value; });
      return match ? match.label : value;
    }

    function getOwnerLabel(value) {
      var match = config.owners.find(function (item) { return item.value === value; });
      return match ? match.label : value;
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

    function buildCaseName() {
      var baseName = state.primaryCustomer ? state.primaryCustomer.name : '未选择客户';
      return baseName + ' - ' + getTemplate().label + state.applicationType;
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

      if (!state.primaryCustomer) return;

      elements.primaryCustomerName.textContent = state.primaryCustomer.name;
      elements.primaryCustomerMeta.textContent =
        state.primaryCustomer.kana + ' / ' + state.primaryCustomer.groupLabel + ' / ' + state.primaryCustomer.roleHint;
      elements.primaryCustomerContact.textContent =
        state.primaryCustomer.summary + ' · ' + state.primaryCustomer.contact;
    }

    function renderAdditionalParties() {
      if (!state.additionalParties.length) {
        elements.additionalParties.innerHTML =
          '<div class="empty-state">当前还没有新增关联人。家族签可添加配偶/子女，工作类可补充雇主联系人。</div>';
        return;
      }

      elements.additionalParties.innerHTML = state.additionalParties.map(function (item, index) {
        return [
          '<div class="party-card">',
          '<div class="party-avatar">' + item.initials + '</div>',
          '<div class="party-copy">',
          '<div class="party-title">' + item.name + ' <span class="chip">' + item.role + '</span></div>',
          '<div class="meta-text">' + item.groupLabel + ' · ' + item.contact + '</div>',
          (item.note ? '<div class="meta-text">' + item.note + '</div>' : ''),
          '</div>',
          '<button class="table-icon-btn" type="button" data-remove-party="' + index + '" aria-label="移除关联人">',
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

      elements.requirementsProgress.textContent = '默认生成 ' + required + ' / ' + total + ' 个必交资料项';
    }

    function renderFamilyScenario() {
      var template = getTemplate();
      var isFamily = template.id === 'family';
      var familyScenario = template.familyScenario || {};
      var workScenario = template.workScenario || {};

      elements.familyScenarioPanel.classList.toggle('hidden', !isFamily);
      elements.workScenarioPanel.classList.toggle('hidden', isFamily);

      if (isFamily) {
        elements.familyScenarioTitle.textContent = familyScenario.title || '家族签批量建案';
        elements.familyScenarioSummary.textContent = familyScenario.summary || '';
        elements.familyRoleChips.innerHTML = (familyScenario.roles || []).map(function (role) {
          return '<span class="chip">' + role + '</span>';
        }).join('');
        elements.familyDependents.innerHTML = (familyScenario.defaultDependents || []).map(function (item) {
          return '<div class="summary-box"><div class="summary-label">' + item.role + '</div><div class="summary-value">' + item.name + '</div><div class="meta-text">' + item.relation + '</div></div>';
        }).join('');
      } else {
        elements.workFieldList.innerHTML = (workScenario.fields || []).map(function (field) {
          return '<span class="chip">' + field + '</span>';
        }).join('');
      }
    }

    function renderSummary() {
      elements.summaryTemplate.textContent = getTemplate().label + ' / ' + state.applicationType;
      elements.summaryCustomer.textContent = state.primaryCustomer ? state.primaryCustomer.name : '未选择';
      elements.summaryParties.textContent = state.additionalParties.length
        ? state.additionalParties.map(function (item) { return item.name + '（' + item.role + '）'; }).join('，')
        : (state.familyBulkMode ? '批量模式已开启，待补充办理对象' : '无');
      elements.summaryOwner.textContent = getOwnerLabel(state.owner) + ' / ' + getGroupLabel(state.group);
      elements.summaryDueDate.textContent = state.dueDate || '未设置';
      elements.summaryAmount.textContent = state.amount ? '¥' + Number(state.amount).toLocaleString() : '未设置';
      elements.summaryChecklist.textContent = [
        elements.createChecklist.checked ? '自动生成资料清单' : '不自动生成资料清单',
        elements.createTasks.checked ? '创建跟进任务' : '不创建跟进任务',
      ].join(' / ');
    }

    function canProceed(stepIndex) {
      if (stepIndex === 0) {
        return !!state.templateId && !!state.applicationType && !!elements.caseNameInput.value.trim();
      }
      if (stepIndex === 1) {
        return !!state.primaryCustomer;
      }
      if (stepIndex === 2) {
        if (!state.owner || !state.dueDate || !state.amount) return false;
        if (state.group !== config.defaultState.group && !elements.crossGroupReason.value.trim()) return false;
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
      elements.submitHint.textContent = state.familyBulkMode
        ? '当前为家族签批量模式，创建后应继续补 CaseParty 与资料复用关系。'
        : '创建后进入 S1 建档，并按模板生成资料清单与初始任务。';
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
      elements.crossGroupReasonRow.classList.toggle('hidden', state.group === config.defaultState.group);
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

      syncFormValues();
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
          state.group = customer.group;
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
        state.familyBulkMode = true;
        window.location.hash = 'family-bulk';
        refresh();
        return;
      }
    });

    elements.primaryCustomerSelect.addEventListener('change', function () {
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
      elements.successBanner.classList.remove('hidden');
      showToast(config.toast.created.title, config.toast.created.desc);
    });

    applyHashMode();
    state.primaryCustomer = config.customers.find(function (item) { return item.id === state.customerId; }) || config.customers[0];
    syncFormValues();
    refresh();
  });
})();
