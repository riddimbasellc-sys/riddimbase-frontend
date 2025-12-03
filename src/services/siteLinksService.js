const STORAGE_KEY = 'rb_footer_links_v2'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function defaultLinks() {
  return [
    { id: 'about', label: 'About', to: '/about' },
    { id: 'faq', label: 'FAQ', to: '/faq' },
    { id: 'support', label: 'Support', to: '/support' },
    { id: 'terms', label: 'Terms', to: '/terms' },
    { id: 'privacy', label: 'Privacy', to: '/privacy' },
  ]
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const d = defaultLinks()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
      return d
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const d = defaultLinks()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d))
      return d
    }
    return parsed
  } catch {
    return defaultLinks()
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export async function getFooterLinks() {
  if (!API_BASE) {
    return readLocal()
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/footer-links`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => defaultLinks())
    if (Array.isArray(data) && data.length) {
      const mapped = data.map((row) => ({
        id: row.id,
        label: row.label,
        to: row.path || row.to || '/',
      }))
      writeLocal(mapped)
      return mapped
    }
    return readLocal()
  } catch {
    return readLocal()
  }
}

async function saveRemote(list) {
  writeLocal(list)
  if (!API_BASE) return list
  try {
    const payload = list.map((l, index) => ({
      id: l.id,
      label: l.label,
      path: l.to,
      position: index,
    }))
    const res = await fetch(`${API_BASE}/api/site/footer-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: payload }),
    })
    if (!res.ok) {
      return list
    }
    const data = await res.json().catch(() => [])
    if (Array.isArray(data) && data.length) {
      const mapped = data.map((row) => ({
        id: row.id,
        label: row.label,
        to: row.path,
      }))
      writeLocal(mapped)
      return mapped
    }
    return list
  } catch {
    return list
  }
}

export async function addFooterLink(link) {
  const list = await getFooterLinks()
  const id =
    link.id ||
    `${link.label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`
  const newList = [...list, { id, ...link }]
  return saveRemote(newList)
}

export async function updateFooterLink(id, patch) {
  const list = await getFooterLinks()
  const newList = list.map((l) =>
    l.id === id ? { ...l, ...patch } : l,
  )
  return saveRemote(newList)
}

export async function deleteFooterLink(id) {
  const list = await getFooterLinks()
  const newList = list.filter((l) => l.id !== id)
  return saveRemote(newList)
}

export async function reorderFooterLinks(id, direction) {
  const list = await getFooterLinks()
  const idx = list.findIndex((l) => l.id === id)
  if (idx === -1) return list
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= list.length) return list
  const newList = [...list]
  const [item] = newList.splice(idx, 1)
  newList.splice(targetIdx, 0, item)
  return saveRemote(newList)
}
