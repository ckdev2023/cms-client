(function () {
  'use strict';

  var pageHelpers = typeof window !== 'undefined' ? (window.CaseCreateHelpers || {}) : {};

  if (typeof window !== 'undefined') {
    window.CaseCreatePageUtils = {
      buildAdditionalPartiesViewModel: pageHelpers.buildAdditionalPartiesViewModel,
      buildCaseListFlashPayload: pageHelpers.buildCaseListFlashPayload,
      buildCaseCreateSummaryViewModel: pageHelpers.buildCaseCreateSummaryViewModel,
      buildChecklistSummary: pageHelpers.buildChecklistSummary,
      buildDynamicCopyViewModel: pageHelpers.buildDynamicCopyViewModel,
      buildFamilyScenarioViewModel: pageHelpers.buildFamilyScenarioViewModel,
      buildRequirementsViewModel: pageHelpers.buildRequirementsViewModel,
      buildCreatedCaseRecord: pageHelpers.buildCreatedCaseRecord,
      buildFamilyDraftParty: pageHelpers.buildFamilyDraftParty,
      buildPrimaryCustomerViewModel: pageHelpers.buildPrimaryCustomerViewModel,
      buildWorkScenarioViewModel: pageHelpers.buildWorkScenarioViewModel,
      buildSubmitHint: pageHelpers.buildSubmitHint,
      buildSuccessBannerCopy: pageHelpers.buildSuccessBannerCopy,
      buildSummaryPartiesText: pageHelpers.buildSummaryPartiesText,
      createEmptyWorkDetails: pageHelpers.createEmptyWorkDetails,
      getFilledWorkFields: pageHelpers.getFilledWorkFields,
      mergeCreatedDraftCases: pageHelpers.mergeCreatedDraftCases,
      persistCreatedCaseArtifacts: pageHelpers.persistCreatedCaseArtifacts,
      buildWorkScenarioStatus: pageHelpers.buildWorkScenarioStatus,
      buildWorkSummary: pageHelpers.buildWorkSummary,
      buildWorkMaterialSummary: pageHelpers.buildWorkMaterialSummary,
      sanitizeWorkDetails: pageHelpers.sanitizeWorkDetails,
    };
  }

  document.addEventListener('DOMContentLoaded', function () {
    var config = window.CaseCreateConfig;
    var helpers = window.CaseCreateHelpers || {};
    var buildCaseTitle = helpers.buildCaseTitle;
    var buildAdditionalPartiesViewModel = helpers.buildAdditionalPartiesViewModel;
    var buildCaseCreateSummaryViewModel = helpers.buildCaseCreateSummaryViewModel;
    var buildCreatedCaseDrafts = helpers.buildCreatedCaseDrafts;
    var buildDynamicCopyViewModel = helpers.buildDynamicCopyViewModel;
    var buildFamilyScenarioViewModel = helpers.buildFamilyScenarioViewModel;
    var buildPrimaryCustomerViewModel = helpers.buildPrimaryCustomerViewModel;
    var buildRequirementsViewModel = helpers.buildRequirementsViewModel;
    var buildFamilyDraftParty = helpers.buildFamilyDraftParty;
    var persistCreatedCaseArtifacts = helpers.persistCreatedCaseArtifacts;
    var buildSubmitHint = helpers.buildSubmitHint;
    var buildWorkScenarioViewModel = helpers.buildWorkScenarioViewModel;
    var createEmptyWorkDetails = helpers.createEmptyWorkDetails;
    var getOptionLabel = helpers.getOptionLabel;
    if (!config || !buildCaseTitle || !buildAdditionalPartiesViewModel || !buildCaseCreateSummaryViewModel || !buildCreatedCaseDrafts
      || !buildDynamicCopyViewModel || !buildFamilyScenarioViewModel || !buildPrimaryCustomerViewModel || !buildRequirementsViewModel
      || !buildFamilyDraftParty || !persistCreatedCaseArtifacts || !buildSubmitHint || !buildWorkScenarioViewModel
      || !createEmptyWorkDetails || !getOptionLabel) return;
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
      sourceLeadName: '',
      sourceCustomerId: '',
      sourceCustomerName: '',
      sourceCustomerGroupLabel: '',
      familyBulkMode: window.location.hash === '#family-bulk',
      familyBulkSeeded: false,
      primaryCustomer: null,
      additionalParties: [],
      workDetails: createEmptyWorkDetails(),
    };

    var steps = Array.prototype.slice.call(document.querySelectorAll('[data-step-panel]'));
    var stepIndicators = Array.prototype.slice.call(document.querySelectorAll('[data-step-indicator]'));

    var elements = {
      templateCards: Array.prototype.slice.call(document.querySelectorAll('[data-template-card]')),
      applicationTypeSelect: document.getElementById('applicationTypeSelect'),
      sourceContextBar: document.getElementById('sourceContextBar'),
      sourceContextTitle: document.getElementById('sourceContextTitle'),
      sourceLeadCard: document.getElementById('sourceLeadCard'),
      sourceLeadLabel: document.getElementById('sourceLeadLabel'),
      sourceLeadValue: document.getElementById('sourceLeadValue'),
      sourceCustomerLabel: document.getElementById('sourceCustomerLabel'),
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
      additionalPartyBtn: document.getElementById('additionalPartyBtn'),
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
      workCompanyName: document.getElementById('workCompanyName'),
      workPositionTitle: document.getElementById('workPositionTitle'),
      workAnnualSalary: document.getElementById('workAnnualSalary'),
      workContactEmail: document.getElementById('workContactEmail'),
      workContactPhone: document.getElementById('workContactPhone'),
      workScenarioStatus: document.getElementById('workScenarioStatus'),
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

    elements.workDetailInputs = [
      elements.workCompanyName,
      elements.workPositionTitle,
      elements.workAnnualSalary,
      elements.workContactEmail,
      elements.workContactPhone,
    ].filter(Boolean);

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

    function getWorkDetails() {
      return Object.assign(createEmptyWorkDetails(), state.workDetails || {});
    }

    function readWorkDetailsFromForm() {
      state.workDetails = {
        companyName: elements.workCompanyName ? elements.workCompanyName.value : '',
        positionTitle: elements.workPositionTitle ? elements.workPositionTitle.value : '',
        annualSalary: elements.workAnnualSalary ? elements.workAnnualSalary.value : '',
        contactEmail: elements.workContactEmail ? elements.workContactEmail.value : '',
        contactPhone: elements.workContactPhone ? elements.workContactPhone.value : '',
      };
    }

    function getGroupLabel(value) {
      return getOptionLabel(config.groups, value);
    }

    function getOwnerLabel(value) {
      return getOptionLabel(config.owners, value);
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
      var hasLeadContext = !!state.sourceLeadId;
      elements.sourceContextBar.classList.toggle('hidden', !hasContext);
      if (!hasContext) return;

      var sourceCustomer = getCustomerById(state.sourceCustomerId);
      if (elements.sourceLeadCard) {
        elements.sourceLeadCard.classList.toggle('hidden', !hasLeadContext);
      }
      if (elements.sourceLeadLabel) {
        elements.sourceLeadLabel.textContent = '来源咨询';
      }
      if (elements.sourceLeadValue) {
        elements.sourceLeadValue.textContent = state.sourceLeadName
          ? state.sourceLeadName + (state.sourceLeadId ? '（' + state.sourceLeadId + '）' : '')
          : (state.sourceLeadId || '—');
      }
      if (elements.sourceCustomerLabel) {
        elements.sourceCustomerLabel.textContent = state.sourceCustomerId ? '当前客户' : '待建客户';
      }
      if (elements.sourceCustomerValue) {
        elements.sourceCustomerValue.textContent = sourceCustomer
          ? sourceCustomer.name + '（' + sourceCustomer.id + '）'
          : (state.sourceCustomerName
            ? state.sourceCustomerName + (state.sourceCustomerId ? '（' + state.sourceCustomerId + '）' : '')
            : (state.sourceCustomerId || '待创建'));
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

    function buildCaseName() {
      return buildCaseTitle(
        state.primaryCustomer ? state.primaryCustomer.name : '',
        getTemplate().label,
        state.applicationType,
        isFamilyBulkScenario()
      );
    }

    function ensureFamilyBulkSeeded() {
      if (!isFamilyBulkScenario() || state.familyBulkSeeded || state.additionalParties.length) return;
      state.additionalParties = (getFamilyScenario().defaultDraftParties || []).map(function (item, index) {
        return buildFamilyDraftParty(item, index, {
          group: state.group,
          groupLabel: getGroupLabel(state.group),
        });
      });
      state.familyBulkSeeded = true;
    }

    function renderDynamicCopy() {
      var copyViewModel = buildDynamicCopyViewModel({
        isFamilyBulk: isFamilyBulkScenario(),
        isWorkTemplate: getTemplate().id === 'work',
        hasSourceLead: !!state.sourceLeadId,
        hasSourceCustomer: !!state.sourceCustomerId,
        sourceLeadName: state.sourceLeadName,
        sourceCustomerName: state.sourceCustomerName || (state.primaryCustomer && state.primaryCustomer.name) || '',
        sourceCustomerGroupLabel: state.sourceCustomerGroupLabel || (state.primaryCustomer && state.primaryCustomer.groupLabel) || '',
      });

      if (elements.caseNameLabel) {
        elements.caseNameLabel.textContent = copyViewModel.caseNameLabel;
      }
      if (elements.caseNameHint) {
        elements.caseNameHint.textContent = copyViewModel.caseNameHint;
      }
      if (elements.relatedStepHint) {
        elements.relatedStepHint.textContent = copyViewModel.relatedStepHint;
      }
      if (elements.primaryCustomerSelectLabel) {
        elements.primaryCustomerSelectLabel.textContent = copyViewModel.primaryCustomerSelectLabel;
      }
      if (elements.primaryCustomerCardLabel) {
        elements.primaryCustomerCardLabel.textContent = copyViewModel.primaryCustomerCardLabel;
      }
      if (elements.primaryModalBtn) {
        elements.primaryModalBtn.textContent = copyViewModel.primaryModalButtonText;
        elements.primaryModalBtn.setAttribute('data-default-role', copyViewModel.primaryModalDefaultRole);
      }
      if (elements.relatedModalBtn) {
        elements.relatedModalBtn.textContent = copyViewModel.relatedModalButtonText;
        elements.relatedModalBtn.setAttribute('data-default-role', copyViewModel.relatedModalDefaultRole);
      }
      if (elements.additionalPartyBtn) {
        elements.additionalPartyBtn.textContent = copyViewModel.additionalPartyButtonText;
        elements.additionalPartyBtn.setAttribute('data-default-role', copyViewModel.additionalPartyDefaultRole);
      }
      if (elements.supportingPartyBtn) {
        elements.supportingPartyBtn.classList.toggle('hidden', !copyViewModel.showSupportingPartyButton);
      }
      if (elements.additionalPartiesTitle) {
        elements.additionalPartiesTitle.textContent = copyViewModel.additionalPartiesTitle;
      }
      if (elements.additionalPartiesHint) {
        elements.additionalPartiesHint.textContent = copyViewModel.additionalPartiesHint;
      }
      if (elements.sourceContextTitle) {
        elements.sourceContextTitle.textContent = copyViewModel.sourceContextTitle;
      }
      if (elements.sourceContextHint) {
        elements.sourceContextHint.textContent = copyViewModel.sourceContextHint;
      }
      if (elements.sourceContextDedupHint) {
        elements.sourceContextDedupHint.textContent = copyViewModel.sourceContextDedupHint;
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

      var primaryCustomerViewModel = buildPrimaryCustomerViewModel({
        primaryCustomer: state.primaryCustomer,
        isFamilyBulk: isFamilyBulkScenario(),
      });
      elements.primaryCustomerName.textContent = primaryCustomerViewModel.name;
      elements.primaryCustomerMeta.textContent = primaryCustomerViewModel.meta;
      elements.primaryCustomerContact.textContent = primaryCustomerViewModel.contact;
      if (primaryCustomerViewModel.shouldSyncInheritedGroup) syncInheritedGroup(false);
    }

    function renderAdditionalParties() {
      var parties = isFamilyBulkScenario()
        ? getFamilyApplicants()
        : state.additionalParties.map(function (item, index) {
          return Object.assign({ originalIndex: index }, item);
        });
      var additionalPartiesViewModel = buildAdditionalPartiesViewModel({
        parties: parties,
        isFamilyBulk: isFamilyBulkScenario(),
      });
      elements.additionalParties.innerHTML = additionalPartiesViewModel.additionalPartiesHtml;
    }

    function renderRequirements() {
      var requirements = buildRequirementsViewModel({
        template: getTemplate(),
        applicantCount: getFamilyApplicants().length,
        isFamilyBulk: isFamilyBulkScenario(),
      });

      elements.requirementsMeta.textContent = requirements.requirementsMeta;
      elements.requirementsList.innerHTML = requirements.requirementsListHtml;
      elements.requirementsProgress.textContent = requirements.requirementsProgress;
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
        var familyScenarioViewModel = buildFamilyScenarioViewModel({
          title: familyScenario.title,
          summary: familyScenario.summary,
          roles: familyScenario.roles,
          gateChecks: familyScenario.gateChecks,
          reuseNotes: familyScenario.reuseNotes,
          applicants: applicants,
          supporters: supporters,
          familyBulkMode: state.familyBulkMode,
          templateLabel: template.label,
          applicationType: state.applicationType,
          groupLabel: getGroupLabel(state.group),
          ownerLabel: getOwnerLabel(state.owner),
        });

        elements.familyScenarioTitle.textContent = familyScenarioViewModel.familyScenarioTitle;
        elements.familyScenarioSummary.textContent = familyScenarioViewModel.familyScenarioSummary;
        elements.familyRoleChips.innerHTML = familyScenarioViewModel.familyRoleChipsHtml;
        elements.familyDependents.innerHTML = familyScenarioViewModel.familyDependentsHtml;
        if (elements.enableFamilyBulkBtn) {
          elements.enableFamilyBulkBtn.textContent = familyScenarioViewModel.enableFamilyBulkButtonText;
          elements.enableFamilyBulkBtn.disabled = state.familyBulkMode;
          elements.enableFamilyBulkBtn.classList.toggle('opacity-60', state.familyBulkMode);
          elements.enableFamilyBulkBtn.classList.toggle('cursor-not-allowed', state.familyBulkMode);
        }

        if (isFamilyBulkScenario()) {
          elements.familyKeyPartyList.innerHTML = familyScenarioViewModel.familyKeyPartyListHtml;
          elements.familyGateNotes.innerHTML = familyScenarioViewModel.familyGateNotesHtml;
          elements.familyCaseMatrix.innerHTML = familyScenarioViewModel.familyCaseMatrixHtml;
          elements.familyCreationSummary.textContent = familyScenarioViewModel.familyCreationSummary;
          elements.familyCreationTasks.innerHTML = familyScenarioViewModel.familyCreationTasksHtml;
        }
      } else {
        var workScenarioViewModel = buildWorkScenarioViewModel({
          fields: workScenario.fields,
          workDetails: getWorkDetails(),
        });
        elements.workFieldList.innerHTML = workScenarioViewModel.workFieldListHtml;
        if (elements.workScenarioStatus) {
          elements.workScenarioStatus.textContent = workScenarioViewModel.workScenarioStatus;
        }
      }
    }

    function renderSummary() {
      var applicants = getFamilyApplicants();
      var supporters = getFamilySupportingParties();
      var summary = buildCaseCreateSummaryViewModel({
        templateLabel: getTemplate().label,
        applicationType: state.applicationType,
        primaryCustomerName: state.primaryCustomer ? state.primaryCustomer.name : '',
        applicants: applicants,
        supporters: supporters,
        additionalParties: state.additionalParties,
        isFamilyBulk: isFamilyBulkScenario(),
        isWorkTemplate: getTemplate().id === 'work',
        workDetails: getWorkDetails(),
        ownerLabel: getOwnerLabel(state.owner),
        groupLabel: getGroupLabel(state.group),
        dueDate: state.dueDate,
        amount: state.amount,
        createChecklist: elements.createChecklist.checked,
        createTasks: elements.createTasks.checked,
      });
      elements.summaryTemplate.textContent = summary.summaryTemplate;
      elements.summaryCustomer.textContent = summary.summaryCustomer;
      elements.summaryParties.textContent = summary.summaryParties;
      elements.summaryOwner.textContent = summary.summaryOwner;
      elements.summaryDueDate.textContent = summary.summaryDueDate;
      elements.summaryAmount.textContent = summary.summaryAmount;
      elements.summaryChecklist.textContent = summary.summaryChecklist;

      if (elements.successBannerTitle && elements.successBannerDesc) {
        elements.successBannerTitle.textContent = summary.successBannerTitle;
        elements.successBannerDesc.textContent = summary.successBannerDesc;
      }

      var viewDetailBtn = document.getElementById('viewCaseDetailBtn');
      if (viewDetailBtn) {
        viewDetailBtn.textContent = summary.viewDetailButtonText;
      }

      if (elements.viewCreatedCasesBtn) {
        elements.viewCreatedCasesBtn.textContent = summary.viewCreatedCasesButtonText;
      }
    }

    function persistCreatedCases() {
      var createdAt = Date.now();
      var supporters = getFamilySupportingParties();
      var template = getTemplate();
      var draftCases = buildCreatedCaseDrafts({
        createdAt: createdAt,
        familyApplicants: getFamilyApplicants(),
        supporters: supporters,
        primaryCustomer: state.primaryCustomer,
        additionalParties: state.additionalParties,
        dueDate: state.dueDate || template.defaultDueDate,
        templateLabel: template.label,
        applicationType: state.applicationType,
        groupId: state.group,
        groupLabel: getGroupLabel(state.group),
        ownerId: state.owner,
        amount: state.amount,
        isFamilyBulk: isFamilyBulkScenario(),
        isWorkTemplate: template.id === 'work',
        workDetails: getWorkDetails(),
      });

      if (!draftCases.length) return [];

      return persistCreatedCaseArtifacts({
        storage: window.sessionStorage,
        draftsKey: CASE_LIST_DRAFTS_KEY,
        flashKey: CASE_LIST_FLASH_KEY,
        draftCases: draftCases,
        templateLabel: template.label,
        applicationType: state.applicationType,
        primaryName: state.primaryCustomer ? state.primaryCustomer.name : '',
        isFamilyBulk: isFamilyBulkScenario(),
      });
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
        var nextText = [
          '下一步：确认主申请人与资料',
          '下一步：确认承接与期限',
          '下一步：复核并开始办案',
        ][state.currentStep] || '下一步';
        elements.btnNext.textContent = nextText;
        elements.btnNext.disabled = !canProceed(state.currentStep);
      }

      elements.btnSubmit.disabled = !canProceed(2);
      elements.submitHint.textContent = buildSubmitHint({
        applicantCount: getFamilyApplicants().length,
        isFamilyBulk: isFamilyBulkScenario(),
        isWorkTemplate: getTemplate().id === 'work',
      });
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
      if (elements.workCompanyName) elements.workCompanyName.value = getWorkDetails().companyName;
      if (elements.workPositionTitle) elements.workPositionTitle.value = getWorkDetails().positionTitle;
      if (elements.workAnnualSalary) elements.workAnnualSalary.value = getWorkDetails().annualSalary;
      if (elements.workContactEmail) elements.workContactEmail.value = getWorkDetails().contactEmail;
      if (elements.workContactPhone) elements.workContactPhone.value = getWorkDetails().contactPhone;
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
      readWorkDetailsFromForm();
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

    [elements.groupSelect, elements.ownerSelect, elements.dueDateInput, elements.amountInput, elements.crossGroupReason, elements.createChecklist, elements.createTasks].concat(elements.workDetailInputs).forEach(function (element) {
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

    var createContext = helpers.parseCreateContext
      ? helpers.parseCreateContext(window.location.search || '', config.customers || [])
      : { sourceLeadId: '', customerId: '' };
    if (createContext.sourceLeadId) state.sourceLeadId = createContext.sourceLeadId;
    if (createContext.sourceLeadName) state.sourceLeadName = createContext.sourceLeadName;
    if (createContext.customerId) {
      state.sourceCustomerId = createContext.customerId;
      state.customerId = createContext.customerId;
    }
    if (createContext.customerName) state.sourceCustomerName = createContext.customerName;
    if (createContext.customerGroupLabel) state.sourceCustomerGroupLabel = createContext.customerGroupLabel;

    applyHashMode();
    state.primaryCustomer = config.customers.find(function (item) { return item.id === state.customerId; }) || config.customers[0];
    syncInheritedGroup(true);
    syncFormValues();
    refresh();
  });
})();
