function setNavOpen(open) {
  document.body.setAttribute('data-nav-open', open ? 'true' : 'false')
}

function bindMobileNav() {
  const openButtons = document.querySelectorAll('[data-nav-open]')
  const closeButtons = document.querySelectorAll('[data-nav-close]')

  openButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setNavOpen(true)
    })
  })

  closeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setNavOpen(false)
    })
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setNavOpen(false)
  })
}

function applyActiveNav() {
  const active = document.body.dataset.activeNav
  if (!active) return
  document.querySelectorAll('[data-nav-id]').forEach((el) => {
    if (el.getAttribute('data-nav-id') === active) {
      el.setAttribute('aria-current', 'page')
    } else {
      el.removeAttribute('aria-current')
    }
  })
}

bindMobileNav()
applyActiveNav()
