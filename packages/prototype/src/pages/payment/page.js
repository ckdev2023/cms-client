const btn = document.querySelector('[data-action="pay"]')
const success = document.querySelector('[data-view="success"]')
const pay = document.querySelector('[data-view="pay"]')

if (btn && success && pay) {
  btn.addEventListener('click', () => {
    pay.hidden = true
    success.hidden = false
  })
}

