// Simple localStorage-backed notifications service (prototype)
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
export function seedIfEmpty() {
  const list = load()
  if (list.length) return
  const samples = [
    { type:'sale', data:{ beatTitle:'Island Vibes', amount:19.99, currency:'USD' } },
    { type:'like', data:{ beatTitle:'Dub Echoes', user:'jane@music.com' } },
    { type:'follow', data:{ user:'producer_khalil' } },
    { type:'message', data:{ from:'StudioGuy', snippet:'Let\'s collab on...' } },
    { type:'comment', data:{ beatTitle:'Roots Jam', user:'reggaelover', text:'Fire riddim!' } }
  ]
  samples.forEach(s => addNotification(s.type, s.data))
}
