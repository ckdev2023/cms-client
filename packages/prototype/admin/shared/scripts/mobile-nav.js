(function () {
  var openButtons = document.querySelectorAll('[data-nav-open]');
  var closeButtons = document.querySelectorAll('[data-nav-close]');

  function setOpen(open) {
    document.body.setAttribute('data-nav-open', open ? 'true' : 'false');
  }

  openButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setOpen(true);
    });
  });

  closeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      setOpen(false);
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
})();
