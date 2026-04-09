(function () {
  'use strict';

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getShortcutLabel() {
    var isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    return isMac ? '⌘K' : 'Ctrl K';
  }

  function normalizeQuery(query) {
    return String(query || '')
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  var modalState = {
    mounted: false,
    lastFocused: null,
    items: [],
    filtered: [],
    activeIndex: 0,
    refs: null,
  };

  function collectNavItems() {
    var links = Array.prototype.slice.call(document.querySelectorAll('a.nav-item[href]'));
    var seen = {};
    var items = [];

    links.forEach(function (link) {
      var href = link.getAttribute('href');
      var label = (link.textContent || '').replace(/\s+/g, ' ').trim();
      if (!href || !label) return;
      var key = href + '|' + label;
      if (seen[key]) return;
      seen[key] = true;
      items.push({ href: href, label: label });
    });

    return items;
  }

  function ensureGlobalSearchModal() {
    if (modalState.mounted) return;

    var existing = document.getElementById('globalSearchModal');
    if (existing) {
      modalState.mounted = true;
      modalState.refs = {
        backdrop: existing,
        input: existing.querySelector('#globalSearchInput'),
        list: existing.querySelector('#globalSearchList'),
        closeBtn: existing.querySelector('[data-global-search-close]'),
        shortcutChip: existing.querySelector('#globalSearchShortcutChip'),
      };
      if (modalState.refs.shortcutChip) modalState.refs.shortcutChip.textContent = getShortcutLabel();
      return;
    }

    var backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.id = 'globalSearchModal';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', '全局搜索');

    backdrop.innerHTML = [
      '<div class="apple-modal flex flex-col">',
      '  <div class="px-6 py-4 border-b border-[#f2f2f7] flex justify-between items-center bg-white z-10 relative">',
      '    <div class="flex items-center gap-3">',
      '      <div class="text-[17px] font-semibold text-[var(--apple-text-main)]">全局搜索</div>',
      '      <span class="hidden sm:inline-flex chip" id="globalSearchShortcutChip"></span>',
      '    </div>',
      '    <button class="text-gray-400 hover:text-gray-700 transition-colors p-1" type="button" data-global-search-close aria-label="关闭搜索">',
      '      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>',
      '    </button>',
      '  </div>',
      '  <div class="p-6 overflow-y-auto" style="max-height: calc(90vh - 86px);">',
      '    <div class="search" style="min-width: 0;">',
      '      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>',
      '      <input type="search" id="globalSearchInput" placeholder="搜索：客户 / 案件 / 资料 / 文书..." aria-label="搜索输入" autocomplete="off" spellcheck="false" />',
      '    </div>',
      '    <div class="mt-4">',
      '      <div class="text-[12px] font-extrabold tracking-wide text-[var(--muted-2)]">推荐入口</div>',
      '      <div class="mt-2 grid gap-2" id="globalSearchList" role="listbox" aria-label="搜索结果"></div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(backdrop);

    modalState.mounted = true;
    modalState.refs = {
      backdrop: backdrop,
      input: backdrop.querySelector('#globalSearchInput'),
      list: backdrop.querySelector('#globalSearchList'),
      closeBtn: backdrop.querySelector('[data-global-search-close]'),
      shortcutChip: backdrop.querySelector('#globalSearchShortcutChip'),
    };

    if (modalState.refs.shortcutChip) modalState.refs.shortcutChip.textContent = getShortcutLabel();

    backdrop.addEventListener('click', function (e) {
      if (e.target === backdrop) closeGlobalSearch();
    });

    if (modalState.refs.closeBtn) {
      modalState.refs.closeBtn.addEventListener('click', function () {
        closeGlobalSearch();
      });
    }

    if (modalState.refs.input) {
      modalState.refs.input.addEventListener('input', function () {
        modalState.activeIndex = 0;
        renderGlobalSearch();
      });

      modalState.refs.input.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeGlobalSearch();
          return;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          modalState.activeIndex = Math.min(modalState.activeIndex + 1, Math.max(modalState.filtered.length - 1, 0));
          renderGlobalSearch();
          return;
        }

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          modalState.activeIndex = Math.max(modalState.activeIndex - 1, 0);
          renderGlobalSearch();
          return;
        }

        if (e.key === 'Enter') {
          e.preventDefault();
          var target = modalState.filtered[modalState.activeIndex];
          if (target && target.href) {
            window.location.href = target.href;
          }
        }
      });
    }

    if (modalState.refs.list) {
      modalState.refs.list.addEventListener('mousemove', function (e) {
        var row = e.target.closest('[data-gs-index]');
        if (!row) return;
        var idx = Number(row.getAttribute('data-gs-index'));
        if (Number.isNaN(idx)) return;
        if (idx === modalState.activeIndex) return;
        modalState.activeIndex = idx;
        renderGlobalSearch();
      });

      modalState.refs.list.addEventListener('click', function (e) {
        var row = e.target.closest('[data-gs-index]');
        if (!row) return;
        var idx = Number(row.getAttribute('data-gs-index'));
        var item = modalState.filtered[idx];
        if (!item || !item.href) return;
        window.location.href = item.href;
      });
    }
  }

  function isGlobalSearchOpen() {
    return Boolean(modalState.refs && modalState.refs.backdrop && modalState.refs.backdrop.classList.contains('show'));
  }

  function buildListRow(item, index, isActive) {
    var classes = [
      'w-full text-left p-3 rounded-xl border border-[var(--border)] bg-white hover:bg-[#fbfbfd] transition-colors flex items-center justify-between gap-3',
    ];
    if (isActive) {
      classes.push('ring-2 ring-[rgba(14,165,233,0.18)] border-[rgba(14,165,233,0.28)]');
    }

    return [
      '<button type="button" class="',
      classes.join(' '),
      '" data-gs-index="',
      String(index),
      '" role="option" aria-selected="',
      isActive ? 'true' : 'false',
      '">',
      '  <span class="font-extrabold text-[14px] text-[var(--text)]">',
      escapeHtml(item.label),
      '</span>',
      '</button>',
    ].join('');
  }

  function renderGlobalSearch() {
    if (!modalState.refs || !modalState.refs.list || !modalState.refs.input) return;

    var query = normalizeQuery(modalState.refs.input.value);
    var items = modalState.items || [];

    var filtered = query
      ? items.filter(function (item) {
          var haystack = normalizeQuery(item.label);
          return haystack.indexOf(query) !== -1;
        })
      : items.slice(0, 9);

    modalState.filtered = filtered;
    modalState.activeIndex = Math.min(modalState.activeIndex, Math.max(filtered.length - 1, 0));

    if (!filtered.length) {
      modalState.refs.list.innerHTML = '<div class="empty-state">未找到匹配入口，试试输入「客户 / 案件 / 文书 / 设置」</div>';
      return;
    }

    modalState.refs.list.innerHTML = filtered
      .map(function (item, idx) {
        return buildListRow(item, idx, idx === modalState.activeIndex);
      })
      .join('');
  }

  function openGlobalSearch(prefill) {
    ensureGlobalSearchModal();

    modalState.items = collectNavItems();

    if (!modalState.refs || !modalState.refs.backdrop || !modalState.refs.input) return;
    if (isGlobalSearchOpen()) return;

    modalState.lastFocused = document.activeElement;
    modalState.refs.backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';

    modalState.refs.input.value = String(prefill || '');
    modalState.activeIndex = 0;
    renderGlobalSearch();

    window.setTimeout(function () {
      modalState.refs.input.focus();
      modalState.refs.input.select();
    }, 0);
  }

  function closeGlobalSearch() {
    if (!modalState.refs || !modalState.refs.backdrop) return;
    if (!isGlobalSearchOpen()) return;
    modalState.refs.backdrop.classList.remove('show');
    document.body.style.overflow = '';

    var restore = modalState.lastFocused;
    modalState.lastFocused = null;
    if (restore && typeof restore.focus === 'function') {
      window.setTimeout(function () {
        restore.focus();
      }, 0);
    }
  }

  function toggleGlobalSearch() {
    if (isGlobalSearchOpen()) {
      closeGlobalSearch();
      return;
    }
    openGlobalSearch('');
  }

  function isPrintableKey(key) {
    return typeof key === 'string' && key.length === 1 && !/^\s$/.test(key);
  }

  function isTopbarSearchInput(el) {
    return Boolean(el && el.matches && el.matches('.topbar .search input'));
  }

  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-navigate]');
    if (trigger) {
      var href = trigger.getAttribute('data-navigate');
      if (href) {
        e.preventDefault();
        window.location.href = href;
        return;
      }
    }

    var searchTrigger = e.target.closest('.topbar .search');
    if (searchTrigger) {
      e.preventDefault();
      openGlobalSearch('');
    }
  });

  document.addEventListener('focusin', function (e) {
    if (isTopbarSearchInput(e.target)) {
      openGlobalSearch('');
    }
  });

  document.addEventListener('keydown', function (e) {
    var isCmdK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey) && !e.altKey;
    if (isCmdK) {
      e.preventDefault();
      toggleGlobalSearch();
      return;
    }

    if (e.key === 'Escape' && isGlobalSearchOpen()) {
      e.preventDefault();
      closeGlobalSearch();
      return;
    }

    var active = document.activeElement;
    if (isTopbarSearchInput(active) && isPrintableKey(e.key) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      openGlobalSearch(e.key);
    }
  });
})();
