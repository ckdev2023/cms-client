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
    var dedupMatchBadge = document.getElementById('dedupMatchBadge');
    var dedupContinueBtn = document.getElementById('dedupContinueBtn');

    var referrerWrap = document.getElementById('referrerFieldWrap');
    var referrerInput = document.getElementById('leadReferrer');
    var sourceSelect = document.getElementById('leadSource');

    var nameError = document.getElementById('leadNameError');
    var contactHint = document.getElementById('leadContactHint');
    var contactError = document.getElementById('leadContactError');

    var lastFocusEl = null;

    function showToast(title, desc) {
      if (window.__leadsPage && window.__leadsPage.showToast) {
        window.__leadsPage.showToast(title, desc);
      }
    }

    /* ---- Field error helpers ---- */

    function setFieldError(el, errorEl) {
      if (el) {
        el.classList.add('field-invalid');
        el.setAttribute('aria-invalid', 'true');
      }
      if (errorEl) errorEl.classList.remove('hidden');
    }

    function clearFieldError(el, errorEl) {
      if (el) {
        el.classList.remove('field-invalid');
        el.removeAttribute('aria-invalid');
      }
      if (errorEl) errorEl.classList.add('hidden');
    }

    function clearAllErrors() {
      var nameEl = document.getElementById('leadName');
      var phoneEl = document.getElementById('leadPhone');
      var emailEl = document.getElementById('leadEmail');
      clearFieldError(nameEl, nameError);
      clearFieldError(phoneEl, contactError);
      clearFieldError(emailEl, null);
      if (contactHint) contactHint.classList.remove('hidden');
    }

    /* ---- Input listeners to clear errors on typing ---- */

    var nameInput = document.getElementById('leadName');
    if (nameInput) {
      nameInput.addEventListener('input', function () {
        if (nameInput.value.trim()) clearFieldError(nameInput, nameError);
      });
    }

    var phoneInput = document.getElementById('leadPhone');
    var emailInput = document.getElementById('leadEmail');

    function clearContactErrorOnInput() {
      var p = phoneInput ? phoneInput.value.trim() : '';
      var e = emailInput ? emailInput.value.trim() : '';
      if (p || e) {
        clearFieldError(phoneInput, contactError);
        clearFieldError(emailInput, null);
        if (contactHint) contactHint.classList.remove('hidden');
      }
    }

    if (phoneInput) phoneInput.addEventListener('input', clearContactErrorOnInput);
    if (emailInput) emailInput.addEventListener('input', clearContactErrorOnInput);

    /* ---- Modal open / close ---- */

    function openModal(triggerEl) {
      if (!modal) return;
      lastFocusEl = triggerEl || document.activeElement;
      clearAllErrors();
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
          if (referrerInput) referrerInput.value = '';
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
        if (dedupTitle) {
          dedupTitle.textContent = match.type === 'lead'
            ? '检测到可能重复的线索'
            : '检测到可能重复的客户';
        }
        if (dedupMessage) dedupMessage.textContent = match.message;
        if (dedupMatchName) {
          dedupMatchName.textContent = match.matchedRecord.name + ' (' + match.matchedRecord.id + ')';
        }
        if (dedupMatchBadge) {
          if (match.type === 'lead' && match.matchedRecord.statusLabel) {
            dedupMatchBadge.textContent = match.matchedRecord.statusLabel;
            dedupMatchBadge.className = 'text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-700';
            dedupMatchBadge.classList.remove('hidden');
          } else if (match.type === 'customer') {
            dedupMatchBadge.textContent = '已有客户';
            dedupMatchBadge.className = 'text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700';
            dedupMatchBadge.classList.remove('hidden');
          } else {
            dedupMatchBadge.classList.add('hidden');
          }
        }
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
        var t = cfg.TOASTS.dedupViewRecord;
        showToast(t.title, t.desc);
      });
    }

    /* ---- Append demo row to table ---- */

    function appendDemoRow(name, phone, email, source, bizType, group, owner) {
      var tbody = document.getElementById('leadsTableBody');
      if (!tbody) return;

      var rowCount = tbody.querySelectorAll('tr[data-lead-id]').length;
      var newId = 'LEAD-2026-' + String(50 + rowCount).padStart(4, '0');

      var groupLabel = cfg.GROUP_LABEL_MAP[group] || group || '—';
      var ownerObj = cfg.OWNER_MAP[owner] || null;
      var ownerLabel = ownerObj ? ownerObj.label : (owner || '—');
      var ownerInitials = ownerObj ? ownerObj.initials : '?';
      var ownerAvatar = ownerObj ? ownerObj.avatarClass : 'bg-gray-100 text-gray-600';

      var sourceLabel = source || '—';
      cfg.LEAD_SOURCES.forEach(function (s) { if (s.value === source) sourceLabel = s.label; });
      var bizLabel = bizType || '—';
      cfg.BUSINESS_TYPES.forEach(function (b) { if (b.value === bizType) bizLabel = b.label; });

      var now = new Date();
      var mm = String(now.getMonth() + 1).padStart(2, '0');
      var dd = String(now.getDate()).padStart(2, '0');
      var hh = String(now.getHours()).padStart(2, '0');
      var mi = String(now.getMinutes()).padStart(2, '0');
      var timeLabel = '今天 ' + hh + ':' + mi;

      var tr = document.createElement('tr');
      tr.setAttribute('data-lead-id', newId);
      tr.setAttribute('data-status', 'new');
      tr.setAttribute('data-owner', owner || '');
      tr.setAttribute('data-group', group || '');
      tr.setAttribute('data-business-type', bizType || '');
      tr.setAttribute('data-next-follow-up', '');
      tr.className = 'border-b border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors';

      tr.innerHTML =
        '<td class="px-3 py-3 w-10"><input type="checkbox" class="accent-[var(--primary)] w-4 h-4 rounded" data-lead-select /></td>' +
        '<td class="px-3 py-3">' +
          '<div class="flex items-start gap-2.5">' +
            '<div class="w-7 h-7 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-[11px] font-bold flex-shrink-0">' + escapeHtml((name || '?').slice(0, 1)) + '</div>' +
            '<div>' +
              '<div class="text-[14px] font-semibold text-[var(--text)]">' + escapeHtml(name) + '</div>' +
              '<div class="text-[12px] text-[var(--muted-2)] font-mono mt-0.5">' + newId + '</div>' +
            '</div>' +
          '</div>' +
        '</td>' +
        '<td class="px-3 py-3 text-[13px] text-[var(--text)]">' +
          '<div>' + escapeHtml(phone || '—') + '</div>' +
          '<div class="text-[12px] text-[var(--muted-2)]">' + escapeHtml(email || '—') + '</div>' +
          '<div class="text-[12px] text-[var(--muted-2)] mt-1">' + escapeHtml(bizLabel) + ' · ' + escapeHtml(sourceLabel) + '</div>' +
        '</td>' +
        '<td class="px-3 py-3 whitespace-nowrap"><span class="lead-badge lead-badge-new"><span class="lead-dot" style="background:var(--warning)"></span>新咨询</span></td>' +
        '<td class="px-3 py-3">' +
          '<div class="flex items-center text-sm"><span class="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold mr-2 ' + ownerAvatar + '">' + ownerInitials + '</span><span>' + escapeHtml(ownerLabel) + '</span></div>' +
          '<div class="text-[12px] text-[var(--muted-2)] mt-1">' + escapeHtml(groupLabel) + '</div>' +
        '</td>' +
        '<td class="px-3 py-3 text-[13px] text-[var(--text)]">' +
          '<div class="text-[var(--muted)]">—</div>' +
          '<div class="text-[12px] text-[var(--muted-2)] mt-1">下次跟进：—</div>' +
        '</td>' +
        '<td class="px-3 py-3 text-[13px] text-[var(--muted-2)] whitespace-nowrap">' + timeLabel + '</td>';

      tbody.insertBefore(tr, tbody.firstChild);

      var newCheck = tr.querySelector('[data-lead-select]');
      if (newCheck) {
        newCheck.addEventListener('change', function () {
          if (window.__leadsPage && window.__leadsPage.updateBulkBar) {
            window.__leadsPage.updateBulkBar();
          }
        });
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    /* ---- Create lead ---- */

    if (createBtn) {
      createBtn.addEventListener('click', function () {
        clearAllErrors();

        var nameEl = document.getElementById('leadName');
        var phoneEl = document.getElementById('leadPhone');
        var emailEl = document.getElementById('leadEmail');
        var name = nameEl ? nameEl.value.trim() : '';
        var phone = phoneEl ? phoneEl.value.trim() : '';
        var email = emailEl ? emailEl.value.trim() : '';

        var hasError = false;

        if (!name) {
          setFieldError(nameEl, nameError);
          showToast(cfg.TOASTS.nameMissing.title, cfg.TOASTS.nameMissing.desc);
          if (nameEl) nameEl.focus();
          hasError = true;
        }

        if (!phone && !email) {
          setFieldError(phoneEl, contactError);
          setFieldError(emailEl, null);
          if (contactHint) contactHint.classList.add('hidden');
          if (!hasError) {
            showToast(cfg.TOASTS.contactMissing.title, cfg.TOASTS.contactMissing.desc);
            if (phoneEl) phoneEl.focus();
          }
          hasError = true;
        }

        if (hasError) return;

        if (!dedupConfirmed && checkDedup()) return;

        var sourceVal = sourceSelect ? sourceSelect.value : '';
        var bizEl = document.getElementById('leadBusinessType');
        var groupEl = document.getElementById('leadGroup');
        var ownerEl = document.getElementById('leadOwner');

        appendDemoRow(
          name, phone, email,
          sourceVal,
          bizEl ? bizEl.value : '',
          groupEl ? groupEl.value : '',
          ownerEl ? ownerEl.value : ''
        );

        showToast(cfg.TOASTS.leadCreated.title, cfg.TOASTS.leadCreated.desc);

        if (form) form.reset();
        dedupConfirmed = false;
        if (dedupHint) dedupHint.classList.add('hidden');
        if (referrerWrap) referrerWrap.classList.add('hidden');
        closeModal();

        var info = document.getElementById('leadsPaginationInfo');
        if (info) {
          var total = document.querySelectorAll('#leadsTableBody tr[data-lead-id]').length;
          info.textContent = '显示 1 - ' + total + ' 条，共 ' + total + ' 条';
        }
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
