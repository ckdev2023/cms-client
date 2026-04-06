const links = document.querySelectorAll('a[href="#"]')
for (const el of links) {
  el.addEventListener('click', (e) => e.preventDefault())
}

