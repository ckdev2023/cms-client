function setNavOpen(open) {
  document.body.setAttribute('data-nav-open', open ? 'true' : 'false')
}

function bindMobileNav() {
  const openButtons = document.querySelectorAll('[data-nav-open]')
  const closeButtons = document.querySelectorAll('[data-nav-close]')

  openButtons.forEach((btn) => {
    if (btn === document.body) return
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

function applyActiveNav(activeNav) {
  if (!activeNav) return
  const highlightNavByActiveNav = {
    'case-create': 'cases',
    'case-detail': 'cases',
  }
  const highlightNav = highlightNavByActiveNav[activeNav] ?? activeNav

  document.querySelectorAll('[data-nav-id]').forEach((el) => {
    if (el.getAttribute('data-nav-id') === highlightNav) {
      el.setAttribute('aria-current', 'page')
    } else {
      el.removeAttribute('aria-current')
    }
  })
}

function getActiveNavId() {
  return document.body?.dataset?.activeNav
}

const pageModuleLoaderByActiveNav = {
  customers: () => import('./customers.page.js'),
  documents: () => import('./documents.page.js'),
  'case-create': () => import('./case-create.page.js'),
  'case-detail': () => import('./case-detail.page.js'),
  'admin-prototype': () => import('./admin-prototype.page.js'),
}

async function loadPageModule(activeNav) {
  if (!activeNav) return

  const loader = pageModuleLoaderByActiveNav[activeNav]
  if (!loader) return

  try {
    await loader()
  } catch {
    return
  }
}

async function init() {
  bindMobileNav()

  const activeNav = getActiveNavId()
  applyActiveNav(activeNav)

  await loadPageModule(activeNav)
}

init()
