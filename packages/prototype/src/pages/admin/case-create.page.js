export const caseCreateDraftStorageKey = 'gyosei_os_case_create_draft_v1'

export function getText(contact) {
  const nameNative = contact?.nameNative ? `（${contact.nameNative}）` : ''
  return `${contact?.displayName ?? ''}${nameNative}`.trim()
}

export function safeJsonParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function getQueryParams() {
  try {
    return new URLSearchParams(window.location.search || '')
  } catch {
    return new URLSearchParams()
  }
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error('fetch_failed')
  return await res.json()
}

function init() {
  const root = document.querySelector('[data-case-create="root"]')
  if (!root) return

  const stepItems = Array.from(root.querySelectorAll('[data-case-create-step-item]'))
  const stepPanels = Array.from(root.querySelectorAll('[data-case-create-step-panel]'))
  const progress = root.querySelector('[data-case-create="progress"]')

  const btnPrev = root.querySelector('[data-case-create-action="prev"]')
  const btnNext = root.querySelector('[data-case-create-action="next"]')
  const btnSave = document.querySelector('[data-case-create-action="save"]')

  const inputTitle = root.querySelector('[data-case-create-field="title"]')
  const selectVisaType = root.querySelector('[data-case-create-field="visaTypeId"]')

  const customerSearch = root.querySelector('[data-case-create-field="customerSearch"]')
  const customerSuggest = root.querySelector('[data-case-create="customerSuggest"]')
  const customerPicked = root.querySelector('[data-case-create="customerPicked"]')

  const selectAssignee = root.querySelector('[data-case-create-field="assigneeId"]')
  const inputDeadline = root.querySelector('[data-case-create-field="deadline"]')
  const inputAmount = root.querySelector('[data-case-create-field="amount"]')
  const textareaNote = root.querySelector('[data-case-create-field="note"]')

  const summaryEls = Array.from(root.querySelectorAll('[data-case-create-summary]'))
  const jumpButtons = Array.from(root.querySelectorAll('[data-case-create-action="jump"]'))

  if (
    stepItems.length === 0 ||
    stepPanels.length === 0 ||
    !btnPrev ||
    !btnNext ||
    !inputTitle ||
    !selectVisaType ||
    !customerSearch ||
    !customerSuggest ||
    !customerPicked ||
    !selectAssignee ||
    !inputDeadline ||
    !inputAmount ||
    !textareaNote
  ) {
    return
  }

  const query = getQueryParams()

  const state = {
    stepIndex: 0,
    visaTypeId: '',
    title: '',
    customerId: '',
    customerText: '',
    assigneeId: '',
    deadline: '',
    amount: '',
    note: '',
  }

  const loadDraft = () => {
    const raw = window.localStorage.getItem(caseCreateDraftStorageKey)
    if (!raw) return
    const parsed = safeJsonParse(raw)
    if (!parsed || typeof parsed !== 'object') return
    state.visaTypeId = typeof parsed.visaTypeId === 'string' ? parsed.visaTypeId : state.visaTypeId
    state.title = typeof parsed.title === 'string' ? parsed.title : state.title
    state.customerId = typeof parsed.customerId === 'string' ? parsed.customerId : state.customerId
    state.customerText = typeof parsed.customerText === 'string' ? parsed.customerText : state.customerText
    state.assigneeId = typeof parsed.assigneeId === 'string' ? parsed.assigneeId : state.assigneeId
    state.deadline = typeof parsed.deadline === 'string' ? parsed.deadline : state.deadline
    state.amount = typeof parsed.amount === 'string' ? parsed.amount : state.amount
    state.note = typeof parsed.note === 'string' ? parsed.note : state.note
  }

  const saveDraft = () => {
    window.localStorage.setItem(
      caseCreateDraftStorageKey,
      JSON.stringify({
        visaTypeId: state.visaTypeId,
        title: state.title,
        customerId: state.customerId,
        customerText: state.customerText,
        assigneeId: state.assigneeId,
        deadline: state.deadline,
        amount: state.amount,
        note: state.note,
      }),
    )
  }

  const setCustomerPicked = ({ id, text }) => {
    state.customerId = id
    state.customerText = text
    customerPicked.textContent = text || '未选择'
    updateSummary()
    updateNextEnabled()
  }

  let visaTypes = []
  let contacts = []
  let customers = []
  let staff = []

  const renderVisaTypeOptions = () => {
    if (!Array.isArray(visaTypes) || visaTypes.length === 0) return
    selectVisaType.innerHTML = ''
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = '请选择业务类型'
    selectVisaType.appendChild(placeholder)
    visaTypes.forEach((t) => {
      const opt = document.createElement('option')
      opt.value = t.id
      opt.textContent = t.nameZh || t.shortCode || t.id
      selectVisaType.appendChild(opt)
    })
  }

  const renderAssigneeOptions = () => {
    if (!Array.isArray(staff) || staff.length === 0) return
    selectAssignee.innerHTML = ''
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = '请选择负责人'
    selectAssignee.appendChild(placeholder)
    staff.forEach((c) => {
      const opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = getText(c)
      selectAssignee.appendChild(opt)
    })
  }

  const clearSuggest = () => {
    customerSuggest.innerHTML = ''
    customerSuggest.setAttribute('hidden', 'true')
  }

  const renderSuggest = (items) => {
    customerSuggest.innerHTML = ''
    if (items.length === 0) {
      clearSuggest()
      return
    }
    items.slice(0, 8).forEach((c) => {
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = 'case-create-suggest-item'
      btn.setAttribute('data-customer-id', c.id)
      btn.textContent = getText(c)
      customerSuggest.appendChild(btn)
    })
    customerSuggest.removeAttribute('hidden')
  }

  const updateSuggest = () => {
    const q = String(customerSearch.value || '').trim().toLowerCase()
    if (q.length === 0) {
      clearSuggest()
      return
    }
    const matched = customers.filter((c) => {
      const hay = `${c.displayName ?? ''} ${c.nameNative ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
    renderSuggest(matched)
  }

  const validateStep = (stepIndex) => {
    if (stepIndex === 0) return state.title.trim().length > 0 && !!state.visaTypeId
    if (stepIndex === 1) return !!state.customerId
    if (stepIndex === 2) return !!state.assigneeId && state.deadline.trim().length > 0
    return true
  }

  const updateProgress = () => {
    if (!progress) return
    const total = Math.max(1, stepPanels.length - 1)
    const pct = (state.stepIndex / total) * 100
    progress.style.width = `${pct}%`
  }

  const renderSteps = () => {
    stepPanels.forEach((p) => {
      const idx = Number(p.getAttribute('data-case-create-step-panel') || '0')
      const isActive = idx === state.stepIndex
      p.toggleAttribute('hidden', !isActive)
      p.classList.toggle('is-active', isActive)
    })
    stepItems.forEach((it) => {
      const idx = Number(it.getAttribute('data-case-create-step-item') || '0')
      it.classList.toggle('is-active', idx === state.stepIndex)
      it.classList.toggle('is-complete', idx < state.stepIndex)
    })
    updateProgress()
  }

  const updateNextLabel = () => {
    if (state.stepIndex === 0) btnNext.textContent = '下一步：客户关联'
    else if (state.stepIndex === 1) btnNext.textContent = '下一步：分派与期限'
    else if (state.stepIndex === 2) btnNext.textContent = '下一步：确认创建'
    else btnNext.textContent = '创建并进入详情'
  }

  const updateNextEnabled = () => {
    btnNext.disabled = !validateStep(state.stepIndex)
  }

  const updatePrevVisibility = () => {
    btnPrev.toggleAttribute('hidden', state.stepIndex === 0)
  }

  const setStep = (nextIndex) => {
    state.stepIndex = Math.max(0, Math.min(stepPanels.length - 1, nextIndex))
    renderSteps()
    updatePrevVisibility()
    updateNextLabel()
    updateNextEnabled()
  }

  const updateSummary = () => {
    const visaTypeLabel =
      selectVisaType.options[selectVisaType.selectedIndex]?.textContent ||
      visaTypes.find((t) => t.id === state.visaTypeId)?.nameZh ||
      ''
    const assigneeLabel =
      selectAssignee.options[selectAssignee.selectedIndex]?.textContent ||
      staff.find((c) => c.id === state.assigneeId)?.displayName ||
      ''

    summaryEls.forEach((el) => {
      const key = el.getAttribute('data-case-create-summary')
      if (key === 'title') el.textContent = state.title || '未填写'
      if (key === 'visaType') el.textContent = visaTypeLabel || '未选择'
      if (key === 'customer') el.textContent = state.customerText || '未选择'
      if (key === 'assignee') el.textContent = assigneeLabel || '未选择'
      if (key === 'deadline') el.textContent = state.deadline || '未填写'
      if (key === 'amount') el.textContent = state.amount ? `¥${state.amount}` : '未填写'
      if (key === 'note') el.textContent = state.note || '—'
    })
  }

  const applyStateToForm = () => {
    inputTitle.value = state.title
    selectVisaType.value = state.visaTypeId
    customerSearch.value = ''
    customerPicked.textContent = state.customerText || '未选择'
    selectAssignee.value = state.assigneeId
    inputDeadline.value = state.deadline
    inputAmount.value = state.amount
    textareaNote.value = state.note
  }

  const applyQueryDefaults = () => {
    const visaTypeId = query.get('visaTypeId')
    const customerId = query.get('customerId')
    if (visaTypeId) state.visaTypeId = visaTypeId
    if (customerId) state.customerId = customerId
  }

  const hydrateCustomerTextFromId = () => {
    if (!state.customerId) return
    const c = customers.find((x) => x.id === state.customerId)
    if (!c) return
    state.customerText = getText(c)
  }

  const bootstrapData = async () => {
    try {
      const [visasData, commData] = await Promise.all([fetchJson('/data/visas.json'), fetchJson('/data/communications.json')])
      visaTypes = Array.isArray(visasData?.visaTypes) ? visasData.visaTypes : []
      contacts = Array.isArray(commData?.contacts) ? commData.contacts : []
      customers = contacts.filter((c) => Array.isArray(c.tags) && c.tags.includes('customer'))
      staff = contacts.filter((c) => Array.isArray(c.tags) && c.tags.includes('staff'))
      renderVisaTypeOptions()
      renderAssigneeOptions()
      hydrateCustomerTextFromId()
      applyStateToForm()
      updateSummary()
      updateNextEnabled()
    } catch {
      updateSummary()
      updateNextEnabled()
    }
  }

  inputTitle.addEventListener('input', () => {
    state.title = String(inputTitle.value || '')
    updateSummary()
    updateNextEnabled()
  })

  selectVisaType.addEventListener('change', () => {
    state.visaTypeId = String(selectVisaType.value || '')
    updateSummary()
    updateNextEnabled()
  })

  customerSearch.addEventListener('input', () => {
    updateSuggest()
  })

  customerSearch.addEventListener('focus', () => {
    updateSuggest()
  })

  customerSearch.addEventListener('blur', () => {
    window.setTimeout(clearSuggest, 120)
  })

  customerSuggest.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-customer-id]')
    if (!btn) return
    const id = btn.getAttribute('data-customer-id') || ''
    const c = customers.find((x) => x.id === id)
    if (!c) return
    setCustomerPicked({ id: c.id, text: getText(c) })
    clearSuggest()
  })

  selectAssignee.addEventListener('change', () => {
    state.assigneeId = String(selectAssignee.value || '')
    updateSummary()
    updateNextEnabled()
  })

  inputDeadline.addEventListener('change', () => {
    state.deadline = String(inputDeadline.value || '')
    updateSummary()
    updateNextEnabled()
  })

  inputAmount.addEventListener('input', () => {
    const raw = String(inputAmount.value || '')
    state.amount = raw.replace(/[^\d]/g, '').slice(0, 10)
    inputAmount.value = state.amount
    updateSummary()
  })

  textareaNote.addEventListener('input', () => {
    state.note = String(textareaNote.value || '')
    updateSummary()
  })

  btnPrev.addEventListener('click', () => {
    setStep(state.stepIndex - 1)
  })

  btnNext.addEventListener('click', () => {
    if (!validateStep(state.stepIndex)) return
    if (state.stepIndex < stepPanels.length - 1) {
      setStep(state.stepIndex + 1)
      return
    }
    saveDraft()
    window.location.href = 'case-detail.html'
  })

  jumpButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const s = Number(btn.getAttribute('data-case-create-step') || '0')
      setStep(s)
    })
  })

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      saveDraft()
    })
  }

  loadDraft()
  applyQueryDefaults()
  setStep(0)
  bootstrapData()
  updateSummary()
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
}
