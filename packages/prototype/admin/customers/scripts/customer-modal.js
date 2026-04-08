(function () {
  'use strict';

  var config = window.CustomerConfig;
  var ns = (window.CustomerModal = {});
  ns.currentDraftId = null;

  ns.setup = () => {
    const modal = document.getElementById('addCustomerModal');
    const openBtn = document.getElementById('btnAddCustomer');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelModalBtn');
    const createBtn = document.getElementById('createCustomerBtn');
    const dedupeHint = document.getElementById('dedupeHint');

    const requiredEls = config.CREATE_REQUIRED_IDS.map((id) => document.getElementById(id));
    const contactEls = config.CREATE_CONTACT_IDS.map((id) => document.getElementById(id));
    const dedupeEls = config.DEDUPE_TRIGGER_IDS.map((id) => document.getElementById(id));

    const validationEls = [...new Set([...requiredEls, ...contactEls])].filter(Boolean);

    ns.openModal = () => {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    };

    ns.closeModal = () => {
      modal.classList.remove('show');
      document.body.style.overflow = '';
    };

    ns.resetForm = () => {
      config.SERIALIZE_FIELDS.forEach((field) => {
        const el = document.getElementById(field.id);
        if (!el) return;
        el.value = '';
      });
      const avatarInput = document.getElementById('quickAvatar');
      if (avatarInput) avatarInput.value = '';
      ns.updateDedupeHint();
      ns.updateCreateEnabled();
    };

    ns.updateCreateEnabled = () => {
      const allRequired = requiredEls.every((el) => el && el.value.trim().length > 0);
      const hasContact = contactEls.some((el) => el && el.value.trim().length > 0);
      createBtn.disabled = !(allRequired && hasContact);
    };

    ns.updateDedupeHint = () => {
      const hasContact = dedupeEls.some((el) => el && el.value.trim().length > 0);
      dedupeHint.classList.toggle('hidden', !hasContact);
    };

    ns.serializeState = () => {
      var state = {};
      config.SERIALIZE_FIELDS.forEach((f) => {
        state[f.key] = document.getElementById(f.id)?.value ?? '';
      });
      return state;
    };

    ns.applyState = (state) => {
      if (!state) return;
      var fields = state.quick ?? state;
      config.SERIALIZE_FIELDS.forEach((f) => {
        var el = document.getElementById(f.id);
        if (el) el.value = fields[f.key] ?? '';
      });
      ns.updateDedupeHint();
      ns.updateCreateEnabled();
    };

    openBtn.addEventListener('click', () => {
      ns.currentDraftId = null;
      ns.resetForm();
      ns.openModal();
    });
    closeBtn.addEventListener('click', ns.closeModal);
    cancelBtn.addEventListener('click', ns.closeModal);

    validationEls.forEach((el) => {
      el.addEventListener('input', () => {
        ns.updateDedupeHint();
        ns.updateCreateEnabled();
      });
      el.addEventListener('change', () => {
        ns.updateDedupeHint();
        ns.updateCreateEnabled();
      });
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        ns.closeModal();
      }
    });
  };
})();
