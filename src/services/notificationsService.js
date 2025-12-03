// Simple localStorage-backed notifications service (fallback for guests)
const KEY = 'rb_notifications'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch { return [] }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0,250))) } catch {}
}

export function getNotifications() { return load().sort((a,b)=> b.ts - a.ts) }
export function getUnreadCount() { return load().filter(n=> !n.read).length }
export function addNotification(type, data) {
  const list = load()
  list.unshift({ id: crypto.randomUUID(), type, data, ts: Date.now(), read: false })
  save(list)
}
export function markAllRead() {
  const list = load().map(n => ({ ...n, read: true }))
  save(list)
}
