const upload = document.querySelector('[data-action="upload"]')
if (upload) {
  upload.addEventListener('click', () => {
    window.location.href = '/pages/payment/'
  })
}

