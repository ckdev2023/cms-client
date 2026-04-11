/**
 * Runtime HTML fragment loader for prototype pages.
 *
 * Replaces any element with `data-include-html="relative/path.html"` by the
 * fetched fragment content, then dispatches `prototype:fragments-ready`.
 */
(function () {
  'use strict';

  function sanitizeFragmentHtml(html) {
    var marker = '<!-- Code injected by live-server -->';
    var sanitized = html;
    var markerIndex = sanitized.indexOf(marker);

    while (markerIndex !== -1) {
      var scriptEndIndex = sanitized.indexOf('</script>', markerIndex);

      if (scriptEndIndex === -1) {
        sanitized = sanitized.slice(0, markerIndex);
        break;
      }

      sanitized = sanitized.slice(0, markerIndex) + sanitized.slice(scriptEndIndex + 9);
      markerIndex = sanitized.indexOf(marker);
    }

    return sanitized.replace(/<script\b[\s\S]*?<\/script>\s*/gi, '');
  }

  function loadFragments() {
    var placeholders = Array.prototype.slice.call(document.querySelectorAll('[data-include-html]'));
    if (placeholders.length === 0) {
      window.__prototypeFragmentsReady = true;
      document.dispatchEvent(new CustomEvent('prototype:fragments-ready'));
      return;
    }

    Promise.all(
      placeholders.map(function (node) {
        var includePath = node.getAttribute('data-include-html');
        return fetch(includePath)
          .then(function (response) {
            if (!response.ok) {
              throw new Error('Failed to load fragment: ' + includePath);
            }
            return response.text();
          })
          .then(function (html) {
            node.outerHTML = sanitizeFragmentHtml(html);
          })
          .catch(function (error) {
            console.error(error);
            node.outerHTML = '<!-- fragment load failed: ' + includePath + ' -->';
          });
      })
    ).finally(function () {
      window.__prototypeFragmentsReady = true;
      document.dispatchEvent(new CustomEvent('prototype:fragments-ready'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFragments, { once: true });
    return;
  }

  loadFragments();
})();
