function init() {
  const viewButtons = Array.from(document.querySelectorAll('[data-documents-view]'))
  const viewContainers = Array.from(document.querySelectorAll('[data-documents-view-container]'))

  const modalBackdrop = document.querySelector('[data-documents-modal="backdrop"]')
  const openModalBtn = document.querySelector('[data-documents-action="open-upload-modal"]')
  const closeModalButtons = Array.from(document.querySelectorAll('[data-documents-action="close-upload-modal"]'))

  const dropZone = modalBackdrop?.querySelector('[data-documents-drop-zone]')
  const modalCloseBtn = modalBackdrop?.querySelector('[data-documents-action="close-upload-modal"]')

  if (
    viewButtons.length === 0 ||
    viewContainers.length === 0 ||
    !modalBackdrop ||
    !openModalBtn ||
    closeModalButtons.length === 0 ||
    !dropZone
  ) {
    return
  }

  const isModalOpen = () => modalBackdrop.getAttribute('data-open') === 'true'

  const setView = (nextView) => {
    const view = nextView === 'grid' ? 'grid' : 'list'

    viewButtons.forEach((btn) => {
      const btnView = btn.getAttribute('data-documents-view')
      const active = btnView === view
      btn.classList.toggle('active', active)
      btn.setAttribute('aria-selected', active ? 'true' : 'false')
    })

    viewContainers.forEach((container) => {
      const containerView = container.getAttribute('data-documents-view-container')
      const active = containerView === view
      container.classList.toggle('is-active', active)
      container.toggleAttribute('hidden', !active)
    })
  }

  const openModal = () => {
    modalBackdrop.setAttribute('data-open', 'true')
    modalBackdrop.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    ;(modalCloseBtn || dropZone).focus?.()
  }

  let dragDepth = 0
  const unhighlightDropZone = () => {
    dragDepth = 0
    dropZone.classList.remove('dragover')
  }

  const closeModal = () => {
    if (!isModalOpen()) return
    modalBackdrop.setAttribute('data-open', 'false')
    modalBackdrop.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
    unhighlightDropZone()
    openModalBtn.focus?.()
  }

  viewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-documents-view') || 'list'
      setView(view)
    })
  })

  openModalBtn.addEventListener('click', openModal)
  closeModalButtons.forEach((btn) => btn.addEventListener('click', closeModal))

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target !== modalBackdrop) return
    closeModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (!isModalOpen()) return
    closeModal()
  })

  const preventDefaults = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const highlight = () => {
    dropZone.classList.add('dragover')
  }

  dropZone.addEventListener('dragenter', (e) => {
    preventDefaults(e)
    dragDepth += 1
    highlight()
  })

  dropZone.addEventListener('dragover', (e) => {
    preventDefaults(e)
    highlight()
  })

  dropZone.addEventListener('dragleave', (e) => {
    preventDefaults(e)
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0) dropZone.classList.remove('dragover')
  })

  dropZone.addEventListener('drop', (e) => {
    preventDefaults(e)
    unhighlightDropZone()
  })

  const activeBtn = viewButtons.find((btn) => btn.classList.contains('active'))
  setView(activeBtn?.getAttribute('data-documents-view') || 'list')
}

init()
