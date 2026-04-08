function init() {
  const tabs = Array.from(document.querySelectorAll('nav[aria-label="Tabs"] a[data-tab]'))
  const panels = {
    overview: document.getElementById('tab-overview'),
    info: document.getElementById('tab-info'),
    documents: document.getElementById('tab-documents'),
    validation: document.getElementById('tab-validation'),
    messages: document.getElementById('tab-messages'),
    forms: document.getElementById('tab-forms'),
    tasks: document.getElementById('tab-tasks'),
    deadlines: document.getElementById('tab-deadlines'),
    billing: document.getElementById('tab-billing'),
    log: document.getElementById('tab-log'),
  }

  if (tabs.length === 0) return

  const setActiveTab = (tabKey) => {
    tabs.forEach((t) => {
      const isActive = t.getAttribute('data-tab') === tabKey
      t.classList.toggle('is-active', isActive)
      t.setAttribute('aria-selected', isActive ? 'true' : 'false')
    })
    Object.entries(panels).forEach(([key, panel]) => {
      if (!panel) return
      const isActive = key === tabKey
      panel.toggleAttribute('hidden', !isActive)
    })
    if (typeof window?.history?.replaceState === 'function') {
      window.history.replaceState(null, '', `#${tabKey}`)
    }
  }

  tabs.forEach((t) => {
    t.addEventListener('click', (e) => {
      e.preventDefault()
      const key = t.getAttribute('data-tab') || 'overview'
      setActiveTab(key)
    })
  })

  const hash = (window.location.hash || '').replace('#', '')
  const initial = tabs.find((t) => t.getAttribute('data-tab') === hash) ? hash : 'overview'
  setActiveTab(initial)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
