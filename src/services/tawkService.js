// Lightweight helper for loading and controlling the Tawk.to widget.
// Set VITE_TAWK_PROPERTY_ID and VITE_TAWK_WIDGET_ID in your .env.

const PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID || ''
const WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID || ''

let injected = false

export function loadTawk() {
  if (injected || !PROPERTY_ID || !WIDGET_ID) return
  injected = true

  window.Tawk_API = window.Tawk_API || {}
  window.Tawk_LoadStart = new Date()

  const api = window.Tawk_API

  // When the widget loads, immediately hide the default launcher
  // so only our custom "Get help" bubble is visible.
  const prevOnLoad = api.onLoad
  api.onLoad = function () {
    if (typeof prevOnLoad === 'function') {
      try {
        prevOnLoad()
      } catch {
        // ignore handler errors
      }
    }
    if (typeof api.hideWidget === 'function') {
      api.hideWidget()
    }

    // Whenever the chat is minimized, hide the widget again so
    // Tawk's own bubble never sits on top of our UI.
    api.onChatMinimized = function () {
      if (typeof api.hideWidget === 'function') {
        api.hideWidget()
      }
    }
  }

  const s1 = document.createElement('script')
  const s0 = document.getElementsByTagName('script')[0]
  s1.async = true
  s1.src = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`
  s1.charset = 'UTF-8'
  s1.setAttribute('crossorigin', '*')
  s0.parentNode.insertBefore(s1, s0)
}

export function openTawk() {
  // Ensure the script is injected
  loadTawk()

  const api = (window.Tawk_API = window.Tawk_API || {})

  const openNow = () => {
    if (typeof api.showWidget === 'function') {
      api.showWidget()
    }
    if (typeof api.maximize === 'function') {
      api.maximize()
    }
  }

  // If the widget API is ready, open immediately
  if (typeof api.maximize === 'function') {
    openNow()
    return
  }

  // Otherwise, register an onLoad handler so it opens as soon
  // as the Tawk script finishes loading.
  const previousOnLoad = api.onLoad
  api.onLoad = function () {
    if (typeof previousOnLoad === 'function') {
      try {
        previousOnLoad()
      } catch {
        // ignore handler errors
      }
    }
    openNow()
  }
}
