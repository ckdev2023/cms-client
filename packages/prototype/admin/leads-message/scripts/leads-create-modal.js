/**
 * Create-lead modal — open/close, validation, dedup hints, creation feedback.
 * Depends on: data/leads-config.js (window.LeadsConfig)
 */
(function () {
  'use strict';

  var initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;

    var cfg = window.LeadsConfig;
    if (!cfg) return;

  var modal = document.getElementById('createLeadModal');
  var form = document.getElementById('createLeadForm');
  var createBtn = document.getElementById('createLeadBtn');
  var openBtns = [
    document.getElementById('btnAddLead'),
    document.getElementById('topbarAddLead'),
  ].filter(Boolean);
  var closeBtns = modal ? modal.querySelectorAll('[data-lead-modal-close]') : [];

  var dedupHint = document.getElementById('dedupHint');
  var dedupTitle = document.getElementById('dedupHintTitle');
  var dedupMessage = document.getElementById('dedupHintMessage');
  var dedupMatchName = document.getElementById('dedupMatchName');
  var dedupMatchMeta = document.getElementById('dedupMatchMeta');
  var dedupContinueBtn = document.getElementById('dedupContinueBtn');

  var referrerWrap = document.getElementById('referrerFieldWrap');
  var sourceSelect = document.getElementById('leadSource');

  var lastFocusEl = null;

  function showToast(title, desc) {
    if (window.__leadsPage && window.__leadsPage.showToast) {
      window.__leadsPage.showToast(title, desc);
    }
  }

  /* ---- Modal open / close ---- */

  function openModal(triggerEl) {
    if (!modal) return;
    lastFocusEl = triggerEl || document.activeElement;
    modal.classList.add('show');

    var followUp = document.getElementById('leadNextFollowUp');
    if (followUp && !followUp.value) {
      var d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(10, 0, 0, 0);
      var yyyy = d.getFullYear();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      followUp.value = yyyy + '-' + mm + '-' + dd + 'T10:00';
    }

    var first = form ? form.querySelector('input, select, textarea') : null;
    if (first) first.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    if (lastFocusEl && typeof lastFocusEl.focus === 'function') {
      lastFocusEl.focus();
    }
  }

  openBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { openModal(btn); });
  });

  closeBtns.forEach(function (btn) {
    btn.addEventListener('click', closeModal);
  });

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeModal();
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) {
      closeModal();
    }
  });

  /* ---- Source → show/hide referrer field ---- */

  if (sourceSelect && referrerWrap) {
    sourceSelect.addEventListener('change', function () {
      if (sourceSelect.value === 'referral') {
        referrerWrap.classList.remove('hidden');
      } else {
        referrerWrap.classList.add('hidden');
      }
    });
  }

  /* ---- Dedup hint ---- */

  var dedupConfirmed = false;

  function checkDedup() {
    var phone = (document.getElementById('leadPhone') || {}).value || '';
    var email = (document.getElementById('leadEmail') || {}).value || '';
    phone = phone.trim();
    email = email.trim();

    var presets = cfg.DEDUP_PRESETS;
    var match = null;

    if (phone && presets.phoneMatchLead && phone === presets.phoneMatchLead.matchValue) {
      match = presets.phoneMatchLead;
    } else if (email && presets.emailMatchCustomer && email === presets.emailMatchCustomer.matchValue) {
      match = presets.emailMatchCustomer;
    }

    if (match && !dedupConfirmed && dedupHint) {
      if (dedupTitle) dedupTitle.textContent = match.type === 'lead' ? '检测到可能重复的线索' : '检测到可能重复的客户';
      if (dedupMessage) dedupMessage.textContent = match.message;
      if (dedupMatchName) dedupMatchName.textContent = match.matchedRecord.name + ' (' + match.matchedRecord.id + ')';
      if (dedupMatchMeta) {
        var meta = match.matchedRecord.phone || match.matchedRecord.email || '';
        meta += meta ? ' · ' : '';
        meta += match.matchedRecord.group || '';
        dedupMatchMeta.textContent = meta;
      }
      dedupHint.classList.remove('hidden');
      showToast(cfg.TOASTS.dedupHit.title, cfg.TOASTS.dedupHit.desc);
      return true;
    }

    if (dedupHint) dedupHint.classList.add('hidden');
    return false;
  }

  var phoneInput = document.getElementById('leadPhone');
  var emailInput = document.getElementById('leadEmail');
  if (phoneInput) phoneInput.addEventListener('blur', function () { dedupConfirmed = false; checkDedup(); });
  if (emailInput) emailInput.addEventListener('blur', function () { dedupConfirmed = false; checkDedup(); });

  if (dedupContinueBtn) {
    dedupContinueBtn.addEventListener('click', function () {
      dedupConfirmed = true;
      if (dedupHint) dedupHint.classList.add('hidden');
    });
  }

  var dedupViewBtn = document.getElementById('dedupViewBtn');
  if (dedupViewBtn) {
    dedupViewBtn.addEventListener('click', function () {
      showToast('查看已有记录（示例）', '实际环境将跳转到对应详情页');
    });
  }

  /* ---- Create lead ---- */

  if (createBtn) {
    createBtn.addEventListener('click', function () {
      var nameEl = document.getElementById('leadName');
      var phoneEl = document.getElementById('leadPhone');
      var emailEl = document.getElementById('leadEmail');
      var name = nameEl ? nameEl.value.trim() : '';
      var phone = phoneEl ? phoneEl.value.trim() : '';
      var email = emailEl ? emailEl.value.trim() : '';

      if (!name) {
        showToast(cfg.TOASTS.nameMissing.title, cfg.TOASTS.nameMissing.desc);
        if (nameEl) nameEl.focus();
        return;
      }
      if (!phone && !email) {
        showToast(cfg.TOASTS.contactMissing.title, cfg.TOASTS.contactMissing.desc);
        if (phoneEl) phoneEl.focus();
        return;
      }

      if (!dedupConfirmed && checkDedup()) return;

      showToast(cfg.TOASTS.leadCreated.title, cfg.TOASTS.leadCreated.desc);

      if (form) form.reset();
      dedupConfirmed = false;
      if (dedupHint) dedupHint.classList.add('hidden');
      if (referrerWrap) referrerWrap.classList.add('hidden');
      closeModal();
    });
  }

    /* ---- Expose for external triggers ---- */
    window.__leadsModal = { open: openModal, close: closeModal };
  }

  document.addEventListener('prototype:fragments-ready', init);

  if (window.__prototypeFragmentsReady || !document.querySelector('[data-include-html]')) {
    init();
  }
})();
