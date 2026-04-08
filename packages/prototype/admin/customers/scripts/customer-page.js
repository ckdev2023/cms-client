(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    var config = window.CustomerConfig;
    var modal = window.CustomerModal;
    var drafts = window.CustomerDrafts;
    var bulk = window.CustomerBulkActions;

    var toastEl = document.getElementById('toast');
    var toastTitle = document.getElementById('toastTitle');
    var toastDesc = document.getElementById('toastDesc');

    var showToast = ({ title, desc }) => {
      toastTitle.textContent = title;
      toastDesc.textContent = desc;
      toastEl.classList.remove('hidden');
      window.clearTimeout(showToast._t);
      showToast._t = window.setTimeout(() => toastEl.classList.add('hidden'), 2200);
    };

    modal.setup();
    bulk.setup(showToast);

    var createBtn = document.getElementById('createCustomerBtn');
    var saveDraftBtn = document.getElementById('saveDraftBtn');
    var customersTbody = document.querySelector('table.apple-table tbody');

    createBtn.addEventListener('click', () => {
      if (modal.currentDraftId) {
        drafts.removeDraft(modal.currentDraftId);
        var row = document.getElementById(`${config.DRAFT_ROW_ID_PREFIX}${modal.currentDraftId}`);
        if (row) row.remove();
        modal.currentDraftId = null;
      }
      showToast(config.TOAST.customerCreated);
      modal.closeModal();
    });

    saveDraftBtn.addEventListener('click', () => {
      var state = modal.serializeState();
      var draftId = modal.currentDraftId ?? `d_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      var name = state.legalName?.trim() || '未命名';
      var contact = state.phone?.trim() || state.email?.trim() || '—';
      var draft = {
        id: draftId,
        status: '草稿',
        updatedAt: Date.now(),
        updatedAtLabel: drafts.getNowLabel(),
        displayName: name,
        displayContact: contact,
        state,
      };
      drafts.upsertDraft(draft);
      drafts.renderDraftRow(draft);
      modal.currentDraftId = draftId;
      showToast(config.TOAST.draftSaved);
      modal.closeModal();
    });

    if (customersTbody) {
      customersTbody.addEventListener('click', (e) => {
        var btn = e.target.closest('[data-action="resume-draft"]');
        if (!btn) return;
        var draftId = btn.getAttribute('data-draft-id');
        if (!draftId) return;
        var draft = drafts.getDrafts().find((d) => d.id === draftId);
        if (!draft) return;
        modal.currentDraftId = draftId;
        modal.applyState(draft.state);
        modal.openModal();
        showToast(config.TOAST.draftLoaded);
      });
    }

    if (window.location.hash === '#new') {
      modal.currentDraftId = null;
      modal.resetForm();
      modal.openModal();
    }

    var scopeBtns = document.querySelectorAll('[data-scope-btn]');
    scopeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        scopeBtns.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-pressed', 'true');
      });
    });

    document.addEventListener('click', (e) => {
      var resetBtn = e.target.closest('[data-action="reset-filters"]');
      if (!resetBtn) return;
      var filtersContainer = resetBtn.closest('.flex.flex-col');
      if (!filtersContainer) return;
      filtersContainer
        .querySelectorAll('select')
        .forEach((sel) => { sel.selectedIndex = 0; });
      var searchInput = filtersContainer.querySelector('.search-input');
      if (searchInput) searchInput.value = '';
      scopeBtns.forEach((b) => {
        var isDefault = b.getAttribute('data-scope-btn') === 'mine';
        b.classList.toggle('active', isDefault);
        b.setAttribute('aria-pressed', String(isDefault));
      });
    });

    modal.updateCreateEnabled();
    drafts.renderAllDrafts();
    bulk.updateBulkState();
  });
})();
