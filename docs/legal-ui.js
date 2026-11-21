(function () {
  var root = document.documentElement

  function applyTheme(dark) {
    root.dataset.theme = dark ? 'dark' : 'light'
    var toggle = document.getElementById('theme-toggle')
    if (toggle) toggle.setAttribute('aria-pressed', dark ? 'true' : 'false')
  }

  try {
    var saved = localStorage.getItem('wdg-theme')
    var initialDark =
      saved === 'dark' ||
      (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
    applyTheme(initialDark)
  } catch (e) {}

  function bindToggle() {
    var toggle = document.getElementById('theme-toggle')
    if (!toggle) return
    toggle.setAttribute('aria-pressed', root.dataset.theme === 'dark' ? 'true' : 'false')
    toggle.addEventListener('click', function () {
      var nextDark = root.dataset.theme !== 'dark'
      applyTheme(nextDark)
      try {
        localStorage.setItem('wdg-theme', nextDark ? 'dark' : 'light')
      } catch (e) {}
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggle)
  } else {
    bindToggle()
  }
})()
