const draftsStorageKey = 'gyosei_os_customer_drafts_v1'

function init() {
  const modal = document.querySelector('[data-customer-modal="backdrop"]')
  const openBtn = document.querySelector('[data-customer-action="open-add-customer"]') || document.getElementById('btnAddCustomer')

  const closeBtn = document.getElementById('closeModalBtn')
  const cancelBtn = document.getElementById('cancelModalBtn')
  const saveDraftBtn = document.getElementById('saveDraftBtn')
  const createBtn = document.getElementById('createCustomerBtn')
  const modeQuickBtn = document.getElementById('modeQuickBtn')
  const modeFamilyBtn = document.getElementById('modeFamilyBtn')
  const quickPanel = document.getElementById('customerModeQuick')
  const familyPanel = document.getElementById('customerModeFamily')
  const dedupeHint = document.getElementById('dedupeHint')
  const familyPrevBtn = document.getElementById('familyPrevBtn')
  const familyAddApplicantBtn = document.getElementById('familyAddApplicantBtn')
  const familyApplicants = document.getElementById('familyApplicants')

  const toast = document.getElementById('toast')
  const toastTitle = document.getElementById('toastTitle')
  const toastDesc = document.getElementById('toastDesc')

  const quickLegalName = document.getElementById('quickLegalName')
  const quickGroup = document.getElementById('quickGroup')
  const quickPhone = document.getElementById('quickPhone')
  const quickEmail = document.getElementById('quickEmail')

  const familyStepText = document.getElementById('familyStepText')
  const familyStepIndicator1 = document.getElementById('familyStepIndicator1')
  const familyStepIndicator2 = document.getElementById('familyStepIndicator2')
  const familyStepIndicator3 = document.getElementById('familyStepIndicator3')
  const familySteps = Array.from(document.querySelectorAll('[data-family-step]'))
  const familyConsultantName = document.getElementById('familyConsultantName')
  const familyGroup = document.getElementById('familyGroup')
  const familyConsultantPhone = document.getElementById('familyConsultantPhone')
  const familyConsultantEmail = document.getElementById('familyConsultantEmail')
  const familySource = document.getElementById('familySource')
  const familyIntendedType = document.getElementById('familyIntendedType')
  const familyResidenceType = document.getElementById('familyResidenceType')
  const familyResidenceExpiry = document.getElementById('familyResidenceExpiry')
  const familyResidenceCardFront = document.getElementById('familyResidenceCardFront')
  const familyResidenceCardBack = document.getElementById('familyResidenceCardBack')

  const customersTbody =
    document.querySelector('[data-customer-table-body="customers"]') || document.querySelector('table.apple-table tbody')

  if (
    !modal ||
    !openBtn ||
    !closeBtn ||
    !cancelBtn ||
    !saveDraftBtn ||
    !createBtn ||
    !modeQuickBtn ||
    !modeFamilyBtn ||
    !quickPanel ||
    !familyPanel ||
    !familyPrevBtn ||
    !familyAddApplicantBtn ||
    !familyApplicants ||
    !quickLegalName ||
    !quickGroup ||
    !quickPhone ||
    !quickEmail ||
    !familyStepText ||
    !familyStepIndicator1 ||
    !familyStepIndicator2 ||
    !familyStepIndicator3 ||
    !familyConsultantName ||
    !familyGroup ||
    !familyConsultantPhone ||
    !familyConsultantEmail ||
    !familySource ||
    !familyIntendedType ||
    !familyResidenceType ||
    !familyResidenceExpiry ||
    !familyResidenceCardFront ||
    !familyResidenceCardBack
  ) {
    return
  }

  const showToast = ({ title, desc }) => {
    if (!toast || !toastTitle || !toastDesc) return
    toastTitle.textContent = title
    toastDesc.textContent = desc
    toast.setAttribute('data-open', 'true')
    window.clearTimeout(showToast._t)
    showToast._t = window.setTimeout(() => toast.setAttribute('data-open', 'false'), 2200)
  }

  const openModal = () => {
    modal.setAttribute('data-open', 'true')
    modal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    quickLegalName.focus()
  }

  const closeModal = () => {
    modal.setAttribute('data-open', 'false')
    modal.setAttribute('aria-hidden', 'true')
    document.body.style.overflow = ''
  }

  const setMode = (mode) => {
    const isQuick = mode === 'quick'
    modeQuickBtn.classList.toggle('active', isQuick)
    modeFamilyBtn.classList.toggle('active', !isQuick)
    modeQuickBtn.setAttribute('aria-selected', isQuick ? 'true' : 'false')
    modeFamilyBtn.setAttribute('aria-selected', isQuick ? 'false' : 'true')
    quickPanel.toggleAttribute('hidden', !isQuick)
    familyPanel.toggleAttribute('hidden', isQuick)
    familyPrevBtn.toggleAttribute('hidden', isQuick)
    updateFooterButtons()
    updateCreateEnabled()
  }

  let familyStep = 1
  const setFamilyStep = (nextStep) => {
    familyStep = Math.max(1, Math.min(3, nextStep))
    familySteps.forEach((el) => {
      el.toggleAttribute('hidden', Number(el.getAttribute('data-family-step')) !== familyStep)
    })
    familyStepText.textContent = `Step ${familyStep}/3`
    familyStepIndicator1.classList.toggle('is-active', familyStep === 1)
    familyStepIndicator2.classList.toggle('is-active', familyStep === 2)
    familyStepIndicator3.classList.toggle('is-active', familyStep === 3)
    updateFooterButtons()
    updateCreateEnabled()
  }

  const updateFooterButtons = () => {
    const isQuick = !quickPanel.hasAttribute('hidden')
    if (isQuick) {
      familyPrevBtn.setAttribute('hidden', 'true')
      createBtn.textContent = '创建客户'
      return
    }
    familyPrevBtn.toggleAttribute('hidden', familyStep === 1)
    createBtn.textContent = familyStep === 3 ? '完成建档' : '下一步'
  }

  let applicantSeq = 0
  const fillApplicantCard = (card, applicant) => {
    const setValue = (field, value) => {
      const el = card.querySelector(`[data-field="${field}"]`)
      if (!el) return
      if (el.type === 'checkbox') el.checked = value === true || value === '1'
      else el.value = value ?? ''
    }
    setValue('role', applicant.role ?? 'spouse')
    setValue('name', applicant.name ?? '')
    setValue('kana', applicant.kana ?? '')
    setValue('gender', applicant.gender ?? '')
    setValue('birthDate', applicant.birthDate ?? '')
    setValue('phone', applicant.phone ?? '')
    setValue('email', applicant.email ?? '')
    setValue('minor', applicant.minor ?? false)
    setValue('address', applicant.address ?? '')
  }

  const createApplicantCard = ({ role, applicant }) => {
    applicantSeq += 1
    const card = document.createElement('div')
    card.className = 'customer-applicant-card'
    card.setAttribute('data-applicant-card', String(applicantSeq))
    card.innerHTML = `<div class="customer-inline" style="justify-content:space-between;margin-bottom:10px;"><div class="customer-inline" style="gap:8px;"><div class="label" style="margin:0;">办理对象</div><select class="select" data-field="role" style="padding:8px 10px;border-radius:999px;"><option value="spouse"${role === 'spouse' ? ' selected' : ''}>配偶</option><option value="child"${role === 'child' ? ' selected' : ''}>子女</option><option value="other"${role === 'other' ? ' selected' : ''}>其他</option></select></div><button class="customer-meta" type="button" data-action="remove">删除</button></div><div class="form"><div class="field"><div class="label">姓名 *</div><input type="text" class="input" data-field="name" placeholder="姓名/识别名" /></div><div class="field"><div class="label">假名（片假名） *</div><input type="text" class="input" data-field="kana" placeholder="例如：チェン リ" /></div><div class="customer-grid-2"><div class="field"><div class="label">性别 *</div><select class="select" data-field="gender"><option value="" selected>请选择</option><option value="male">男</option><option value="female">女</option></select></div><div class="field"><div class="label">生年月日 *</div><input type="date" class="input" data-field="birthDate" /></div></div><div class="customer-grid-2"><div class="field"><div class="label">电话</div><input type="tel" class="input" data-field="phone" placeholder="手机/座机" /></div><div class="field"><div class="label">邮箱</div><input type="email" class="input" data-field="email" placeholder="邮箱地址" /></div></div><div class="customer-inline" style="justify-content:space-between;"><div class="hint">未成年人可不填联系方式</div><label class="customer-inline customer-meta" style="cursor:pointer;"><input type="checkbox" data-field="minor" /><span>未成年人</span></label></div><div class="field"><div class="label">住所 *</div><input type="text" class="input" data-field="address" placeholder="例如：东京都..." /></div></div>`
    if (applicant) fillApplicantCard(card, applicant)
    return card
  }

  const resetApplicants = () => {
    familyApplicants.innerHTML = ''
    familyApplicants.appendChild(createApplicantCard({ role: 'spouse' }))
  }

  const isApplicantCardValid = (card) => {
    const getValue = (field) => {
      const el = card.querySelector(`[data-field="${field}"]`)
      if (!el) return ''
      if (el.type === 'checkbox') return el.checked ? '1' : ''
      return String(el.value || '').trim()
    }
    const name = getValue('name')
    const kana = getValue('kana')
    const gender = getValue('gender')
    const birthDate = getValue('birthDate')
    const address = getValue('address')
    const minor = getValue('minor') === '1'
    const phone = getValue('phone')
    const email = getValue('email')
    const hasContact = phone.length > 0 || email.length > 0
    if (!name || !kana || !gender || !birthDate || !address) return false
    if (!minor && !hasContact) return false
    return true
  }

  const validateApplicants = () => {
    const cards = Array.from(familyApplicants.querySelectorAll('[data-applicant-card]'))
    if (cards.length === 0) return false
    return cards.every(isApplicantCardValid)
  }

  const updateCreateEnabled = () => {
    const isQuick = !quickPanel.hasAttribute('hidden')
    if (isQuick) {
      const hasName = quickLegalName.value.trim().length > 0
      const hasGroup = !!quickGroup.value
      const hasContact = quickPhone.value.trim().length > 0 || quickEmail.value.trim().length > 0
      createBtn.disabled = !(hasName && hasGroup && hasContact)
      return
    }

    if (familyStep === 1) {
      const hasContact = familyConsultantPhone.value.trim().length > 0 || familyConsultantEmail.value.trim().length > 0
      const ok =
        familyConsultantName.value.trim().length > 0 &&
        !!familyGroup.value &&
        familySource.value.trim().length > 0 &&
        !!familyIntendedType.value &&
        hasContact
      createBtn.disabled = !ok
      return
    }

    if (familyStep === 2) {
      createBtn.disabled = !validateApplicants()
      return
    }

    if (familyStep === 3) {
      if (familyIntendedType.value !== 'family') {
        createBtn.disabled = false
        return
      }
      const ok =
        !!familyResidenceType.value &&
        familyResidenceExpiry.value.trim().length > 0 &&
        familyResidenceCardFront.files.length > 0 &&
        familyResidenceCardBack.files.length > 0
      createBtn.disabled = !ok
    }
  }

  const updateDedupeHint = () => {
    if (!dedupeHint) return
    const hasContact = quickPhone.value.trim().length > 0 || quickEmail.value.trim().length > 0
    dedupeHint.toggleAttribute('hidden', !hasContact)
  }

  const getDrafts = () => {
    try {
      const raw = window.localStorage.getItem(draftsStorageKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      if (!Array.isArray(parsed)) return []
      return parsed
    } catch {
      return []
    }
  }

  const setDrafts = (drafts) => {
    window.localStorage.setItem(draftsStorageKey, JSON.stringify(drafts))
  }

  const upsertDraft = (draft) => {
    const drafts = getDrafts()
    const idx = drafts.findIndex((d) => d.id === draft.id)
    const next = idx === -1 ? [draft, ...drafts] : drafts.map((d) => (d.id === draft.id ? draft : d))
    setDrafts(next)
    return next
  }

  const removeDraft = (draftId) => {
    const drafts = getDrafts().filter((d) => d.id !== draftId)
    setDrafts(drafts)
    return drafts
  }

  const getNowLabel = () => {
    const d = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const serializeState = () => {
    const isQuick = !quickPanel.hasAttribute('hidden')
    if (isQuick) {
      return {
        mode: 'quick',
        quick: {
          legalName: document.getElementById('quickLegalName')?.value ?? '',
          group: document.getElementById('quickGroup')?.value ?? '',
          birthDate: document.getElementById('quickBirthDate')?.value ?? '',
          nationality: document.getElementById('quickNationality')?.value ?? '',
          phone: document.getElementById('quickPhone')?.value ?? '',
          email: document.getElementById('quickEmail')?.value ?? '',
          address: document.getElementById('quickAddress')?.value ?? '',
          referrer: document.getElementById('quickReferrer')?.value ?? '',
          language: document.getElementById('quickLanguage')?.value ?? '',
          note: document.getElementById('quickNote')?.value ?? '',
        },
      }
    }

    const cards = Array.from(familyApplicants.querySelectorAll('[data-applicant-card]'))
    const applicants = cards.map((card) => {
      const getField = (field) => {
        const el = card.querySelector(`[data-field="${field}"]`)
        if (!el) return ''
        if (el.type === 'checkbox') return el.checked
        return String(el.value ?? '')
      }
      return {
        role: getField('role') || 'spouse',
        name: getField('name'),
        kana: getField('kana'),
        gender: getField('gender'),
        birthDate: getField('birthDate'),
        phone: getField('phone'),
        email: getField('email'),
        minor: Boolean(getField('minor')),
        address: getField('address'),
      }
    })

    return {
      mode: 'family',
      family: {
        step: familyStep,
        consultantName: familyConsultantName.value ?? '',
        group: familyGroup.value ?? '',
        intendedType: familyIntendedType.value ?? '',
        source: familySource.value ?? '',
        phone: familyConsultantPhone.value ?? '',
        email: familyConsultantEmail.value ?? '',
        residenceType: familyResidenceType.value ?? '',
        residenceExpiry: familyResidenceExpiry.value ?? '',
        residenceCardNo: document.getElementById('familyResidenceCardNo')?.value ?? '',
        applicants,
      },
    }
  }

  const applyState = (state) => {
    if (!state || !state.mode) return
    if (state.mode === 'quick') {
      setMode('quick')
      const quick = state.quick ?? {}
      const set = (id, value) => {
        const el = document.getElementById(id)
        if (el) el.value = value ?? ''
      }
      set('quickLegalName', quick.legalName)
      set('quickGroup', quick.group)
      set('quickBirthDate', quick.birthDate)
      set('quickNationality', quick.nationality)
      set('quickPhone', quick.phone)
      set('quickEmail', quick.email)
      set('quickAddress', quick.address)
      set('quickReferrer', quick.referrer)
      set('quickLanguage', quick.language)
      set('quickNote', quick.note)
      updateDedupeHint()
      updateCreateEnabled()
      return
    }

    setMode('family')
    const family = state.family ?? {}
    setFamilyStep(family.step ?? 1)
    familyConsultantName.value = family.consultantName ?? ''
    familyGroup.value = family.group ?? ''
    familyIntendedType.value = family.intendedType ?? 'family'
    familySource.value = family.source ?? ''
    familyConsultantPhone.value = family.phone ?? ''
    familyConsultantEmail.value = family.email ?? ''
    familyResidenceType.value = family.residenceType ?? ''
    familyResidenceExpiry.value = family.residenceExpiry ?? ''
    const residenceCardNo = document.getElementById('familyResidenceCardNo')
    if (residenceCardNo) residenceCardNo.value = family.residenceCardNo ?? ''

    familyApplicants.innerHTML = ''
    const applicants = Array.isArray(family.applicants) ? family.applicants : []
    if (applicants.length === 0) resetApplicants()
    else applicants.forEach((applicant) => familyApplicants.appendChild(createApplicantCard({ role: applicant.role ?? 'spouse', applicant })))
    updateCreateEnabled()
  }

  const escapeHtml = (value) => {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => {
      if (ch === '&') return '&amp;'
      if (ch === '<') return '&lt;'
      if (ch === '>') return '&gt;'
      if (ch === '"') return '&quot;'
      return '&#39;'
    })
  }

  const draftRowIdPrefix = 'draft-row-'
  const renderDraftRow = (draft) => {
    if (!customersTbody) return
    const existing = document.getElementById(`${draftRowIdPrefix}${draft.id}`)
    if (existing) existing.remove()
    const name = escapeHtml(draft.displayName ?? '未命名草稿')
    const contactPrimary = escapeHtml(draft.displayContact ?? '—')
    const typeLabel = escapeHtml(draft.displayType ?? '草稿')
    const statusText = escapeHtml(draft.status ?? '草稿')
    const updatedAt = escapeHtml(draft.updatedAtLabel ?? '刚刚')
    const tr = document.createElement('tr')
    tr.id = `${draftRowIdPrefix}${draft.id}`
    tr.innerHTML = `<td><div style="display:flex;flex-direction:column;gap:4px;"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;"><span class="link-apple">${name}</span><span class="badge">${statusText}</span><span class="badge">${typeLabel}</span></div><div class="muted">草稿 · ${updatedAt} · ${contactPrimary}</div></div></td><td>${contactPrimary}</td><td><span class="badge badge-done">—</span></td><td>AD</td><td>${updatedAt.split(' ')[0] ?? '—'}</td><td><button class="btn-secondary" type="button" data-action="resume-draft" data-draft-id="${draft.id}">继续</button></td>`
    customersTbody.prepend(tr)
  }

  const renderAllDrafts = () => {
    getDrafts().forEach(renderDraftRow)
  }

  let currentDraftId = null

  const handleCreate = () => {
    const isQuick = !quickPanel.hasAttribute('hidden')
    if (isQuick) {
      if (currentDraftId) {
        removeDraft(currentDraftId)
        const row = document.getElementById(`${draftRowIdPrefix}${currentDraftId}`)
        if (row) row.remove()
        currentDraftId = null
      }
      showToast({ title: '客户已创建（示例）', desc: '已生成客户档案，可继续建案' })
      closeModal()
      return
    }
    if (familyStep < 3) {
      setFamilyStep(familyStep + 1)
      return
    }
    if (familyIntendedType.value === 'family') {
      const sponsorOk =
        !!familyResidenceType.value &&
        familyResidenceExpiry.value.trim().length > 0 &&
        familyResidenceCardFront.files.length > 0 &&
        familyResidenceCardBack.files.length > 0
      if (!sponsorOk) {
        showToast({ title: '无法完成建档', desc: '家庭类意向需要补齐扶养者在留信息与在留卡影像' })
        updateCreateEnabled()
        return
      }
    }
    if (currentDraftId) {
      removeDraft(currentDraftId)
      const row = document.getElementById(`${draftRowIdPrefix}${currentDraftId}`)
      if (row) row.remove()
      currentDraftId = null
    }
    showToast({ title: '家庭建档完成（示例）', desc: '已创建咨询人 + 办理对象，并可继续批量建案' })
    closeModal()
  }

  openBtn.addEventListener('click', () => {
    currentDraftId = null
    setMode('quick')
    setFamilyStep(1)
    resetApplicants()
    openModal()
  })

  closeBtn.addEventListener('click', closeModal)
  cancelBtn.addEventListener('click', closeModal)
  modeQuickBtn.addEventListener('click', () => setMode('quick'))
  modeFamilyBtn.addEventListener('click', () => {
    setMode('family')
    setFamilyStep(1)
    resetApplicants()
  })

  familyPrevBtn.addEventListener('click', () => setFamilyStep(familyStep - 1))
  createBtn.addEventListener('click', handleCreate)

  saveDraftBtn.addEventListener('click', () => {
    const isFamily = quickPanel.hasAttribute('hidden')
    if (!isFamily) {
      const state = serializeState()
      const draftId = currentDraftId ?? `d_${Date.now()}_${Math.random().toString(16).slice(2)}`
      const name = state.quick?.legalName?.trim() || '未命名（快速）'
      const contact = state.quick?.phone?.trim() || state.quick?.email?.trim() || '—'
      const draft = { id: draftId, kind: 'quick', status: '草稿', updatedAt: Date.now(), updatedAtLabel: getNowLabel(), displayName: name, displayContact: contact, displayType: '个人', state }
      upsertDraft(draft)
      renderDraftRow(draft)
      currentDraftId = draftId
      showToast({ title: '草稿已保存', desc: '可在客户列表中点击“继续”完成建档' })
      closeModal()
      return
    }

    const needsSponsorGate = familyIntendedType.value === 'family'
    const sponsorOk =
      !!familyResidenceType.value &&
      familyResidenceExpiry.value.trim().length > 0 &&
      familyResidenceCardFront.files.length > 0 &&
      familyResidenceCardBack.files.length > 0
    const state = serializeState()
    const draftId = currentDraftId ?? `d_${Date.now()}_${Math.random().toString(16).slice(2)}`
    const name = state.family?.consultantName?.trim() || '未命名（家庭）'
    const contact = state.family?.phone?.trim() || state.family?.email?.trim() || '—'
    const status = needsSponsorGate && !sponsorOk ? '待补齐' : '草稿'
    const draft = { id: draftId, kind: 'family', status, updatedAt: Date.now(), updatedAtLabel: getNowLabel(), displayName: name, displayContact: contact, displayType: '家庭', state }
    upsertDraft(draft)
    renderDraftRow(draft)
    currentDraftId = draftId
    showToast({ title: status === '待补齐' ? '草稿已保存（待补齐）' : '草稿已保存', desc: status === '待补齐' ? '可继续完善在留信息后完成建档' : '可随时继续补充并完成建档' })
    closeModal()
  })

  ;[quickLegalName, quickGroup, quickPhone, quickEmail].forEach((el) => {
    el.addEventListener('input', () => {
      updateDedupeHint()
      updateCreateEnabled()
    })
    el.addEventListener('change', () => {
      updateDedupeHint()
      updateCreateEnabled()
    })
  })

  ;[familyConsultantName, familyGroup, familyConsultantPhone, familyConsultantEmail, familySource, familyIntendedType, familyResidenceType, familyResidenceExpiry, familyResidenceCardFront, familyResidenceCardBack].forEach((el) => {
    el.addEventListener('input', updateCreateEnabled)
    el.addEventListener('change', updateCreateEnabled)
  })

  familyAddApplicantBtn.addEventListener('click', () => {
    const cards = familyApplicants.querySelectorAll('[data-applicant-card]')
    const nextRole = cards.length === 0 ? 'spouse' : 'child'
    familyApplicants.appendChild(createApplicantCard({ role: nextRole }))
    updateCreateEnabled()
  })

  familyApplicants.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="remove"]')
    if (!btn) return
    const card = btn.closest('[data-applicant-card]')
    if (!card) return
    card.remove()
    updateCreateEnabled()
  })

  familyApplicants.addEventListener('input', (e) => {
    if (!e.target.closest('[data-applicant-card]')) return
    updateCreateEnabled()
  })

  familyApplicants.addEventListener('change', (e) => {
    if (!e.target.closest('[data-applicant-card]')) return
    updateCreateEnabled()
  })

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal()
  })

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return
    if (modal.getAttribute('data-open') !== 'true') return
    closeModal()
  })

  if (customersTbody) {
    customersTbody.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="resume-draft"]')
      if (!btn) return
      const draftId = btn.getAttribute('data-draft-id')
      if (!draftId) return
      const draft = getDrafts().find((d) => d.id === draftId)
      if (!draft) return
      currentDraftId = draftId
      applyState(draft.state)
      openModal()
      showToast({ title: '已载入草稿', desc: '继续完善后即可完成建档' })
    })
  }

  if (window.location.hash === '#new') {
    currentDraftId = null
    setMode('quick')
    setFamilyStep(1)
    resetApplicants()
    openModal()
  } else {
    setMode('quick')
    setFamilyStep(1)
    resetApplicants()
    updateDedupeHint()
    updateCreateEnabled()
    closeModal()
  }

  renderAllDrafts()
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()
