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

  const s1 = document.createElement('script')
  const s0 = document.getElementsByTagName('script')[0]
  s1.async = true
  s1.src = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`
  s1.charset = 'UTF-8'
  s1.setAttribute('crossorigin', '*')
  s0.parentNode.insertBefore(s1, s0)
}

export function openTawk() {
  if (window.Tawk_API && typeof window.Tawk_API.maximize === 'function') {
    window.Tawk_API.maximize()
  }
}

