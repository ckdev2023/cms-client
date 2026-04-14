(function () {
  'use strict';

  var config = window.CustomerConfig;
  var ns = (window.CustomerDrafts = {});

  var escapeHtml = (value) => {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => {
      if (ch === '&') return '&amp;';
      if (ch === '<') return '&lt;';
      if (ch === '>') return '&gt;';
      if (ch === '"') return '&quot;';
      return '&#39;';
    });
  };

  ns.getNowLabel = () => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  ns.getDrafts = () => {
    try {
      const raw = window.localStorage.getItem(config.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((d) => d.kind !== 'family');
    } catch {
      return [];
    }
  };

  ns.setDrafts = (drafts) => {
    window.localStorage.setItem(config.STORAGE_KEY, JSON.stringify(drafts));
  };

  ns.upsertDraft = (draft) => {
    const drafts = ns.getDrafts();
    const idx = drafts.findIndex((d) => d.id === draft.id);
    const next = idx === -1 ? [draft, ...drafts] : drafts.map((d) => (d.id === draft.id ? draft : d));
    ns.setDrafts(next);
    return next;
  };

  ns.removeDraft = (draftId) => {
    const drafts = ns.getDrafts().filter((d) => d.id !== draftId);
    ns.setDrafts(drafts);
    return drafts;
  };

  ns.renderDraftRow = (draft) => {
    const tbody = document.querySelector('table.apple-table tbody');
    if (!tbody) return;
    const existing = document.getElementById(`${config.DRAFT_ROW_ID_PREFIX}${draft.id}`);
    if (existing) existing.remove();

    const name = escapeHtml(draft.displayName ?? '未命名草稿');
    const contactPrimary = escapeHtml(draft.displayContact ?? '—');
    const statusText = escapeHtml(draft.status ?? '草稿');
    const updatedAt = escapeHtml(draft.updatedAtLabel ?? '刚刚');
    const kana = escapeHtml(draft?.state?.quick?.kana ?? draft?.state?.kana ?? '—');
    const referrer = escapeHtml(draft?.state?.quick?.referrer ?? draft?.state?.referrer ?? '—');
    const groupId = draft?.state?.quick?.group ?? draft?.state?.group ?? '';
    const groupLabel = escapeHtml(config.GROUP_LABEL_MAP[groupId] ?? '—');
    const searchText = escapeHtml(
      [name, contactPrimary, kana, referrer, groupLabel]
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    );

    const tr = document.createElement('tr');
    tr.id = `${config.DRAFT_ROW_ID_PREFIX}${draft.id}`;
    tr.setAttribute('data-customer-row', '');
    tr.setAttribute('data-row-kind', 'draft');
    tr.setAttribute('data-customer-id', draft.id);
    tr.setAttribute('data-customer-group', String(groupId || ''));
    tr.setAttribute('data-customer-owner', 'admin');
    tr.setAttribute('data-active-cases', '0');
    tr.setAttribute('data-customer-search', searchText);
    tr.setAttribute('data-bmv-template', '');
    tr.setAttribute('data-bmv-intake-status', '');
    tr.setAttribute('data-can-create-case', 'false');
    tr.innerHTML = `
      <td class="text-center">
        <input type="checkbox" class="accent-[var(--apple-blue)] table-checkbox opacity-40" data-customer-select disabled aria-label="草稿不可批量操作" />
      </td>
      <td>
        <div class="flex items-center">
          <div class="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-medium mr-3 flex-shrink-0">草</div>
          <div>
            <div class="font-medium text-[var(--apple-text-main)] flex items-center">
              ${name}
              <span class="badge badge-gray ml-2 scale-[0.8] origin-left">${statusText}</span>
            </div>
            <div class="text-xs text-gray-500">草稿 · ${updatedAt} · ${contactPrimary}</div>
          </div>
        </div>
      </td>
      <td class="hidden md:table-cell text-sm text-gray-400">${kana}</td>
      <td class="text-center whitespace-nowrap"><span class="text-sm text-[var(--apple-text-sec)]">累计 — · 活跃 —</span></td>
      <td class="hidden md:table-cell">
        <div class="text-sm text-[var(--apple-text-main)]">${updatedAt.split(' ')[0] ?? '—'}</div>
        <div class="text-[12px] text-gray-500 mt-0.5">草稿保存</div>
      </td>
      <td class="hidden md:table-cell">
        <div class="flex items-center text-sm">
          <div class="w-5 h-5 rounded-full bg-gray-200 text-xs flex items-center justify-center mr-2 flex-shrink-0">AD</div>
          Admin
        </div>
      </td>
      <td class="hidden lg:table-cell text-sm text-gray-400">${referrer}</td>
      <td class="hidden lg:table-cell"><span class="chip">${groupLabel}</span></td>
      <td class="text-right whitespace-nowrap">
        <div class="table-actions">
          <button class="table-icon-btn" title="继续" type="button" data-action="resume-draft" data-draft-id="${draft.id}">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path>
            </svg>
          </button>
        </div>
      </td>
    `;
    tbody.prepend(tr);
  };

  ns.renderAllDrafts = () => {
    const drafts = ns.getDrafts();
    drafts.forEach(ns.renderDraftRow);
  };
})();
