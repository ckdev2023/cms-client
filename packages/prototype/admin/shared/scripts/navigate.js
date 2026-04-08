(function () {
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-navigate]');
    if (!trigger) return;
    var href = trigger.getAttribute('data-navigate');
    if (!href) return;
    e.preventDefault();
    window.location.href = href;
  });
})();
