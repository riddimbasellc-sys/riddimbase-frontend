const STORAGE_KEY = 'rb_social_links_v1'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

const DEFAULT_SOCIALS = [
  { id: 'instagram', network: 'instagram', url: '' },
  { id: 'youtube', network: 'youtube', url: '' },
  { id: 'tiktok', network: 'tiktok', url: '' },
  { id: 'twitter', network: 'twitter', url: '' },
  { id: 'facebook', network: 'facebook', url: '' },
  { id: 'soundcloud', network: 'soundcloud', url: '' },
  { id: 'spotify', network: 'spotify', url: '' },
]

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOCIALS))
      return DEFAULT_SOCIALS
    }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOCIALS))
      return DEFAULT_SOCIALS
    }
    return parsed
  } catch {
    return DEFAULT_SOCIALS
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export async function getSocialLinks() {
  if (!API_BASE) {
    return readLocal()
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/social-links`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => DEFAULT_SOCIALS)
    if (Array.isArray(data) && data.length) {
      writeLocal(data)
      return data
    }
    return readLocal()
  } catch {
    return readLocal()
  }
}

export async function saveSocialLinks(list) {
  writeLocal(list)
  if (!API_BASE) return list
  try {
    const res = await fetch(`${API_BASE}/api/site/social-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: list }),
    })
    if (!res.ok) {
      return list
    }
    const data = await res.json().catch(() => list)
    if (Array.isArray(data) && data.length) {
      writeLocal(data)
      return data
    }
    return list
  } catch {
    return list
  }
}

export async function updateSocialLink(id, patch) {
  const list = await getSocialLinks()
  const updated = list.map((item) =>
    item.id === id ? { ...item, ...patch } : item,
  )
  return saveSocialLinks(updated)
}

export async function resetSocialLinks() {
  writeLocal(DEFAULT_SOCIALS)
  if (!API_BASE) return DEFAULT_SOCIALS
  try {
    const res = await fetch(`${API_BASE}/api/site/social-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: DEFAULT_SOCIALS }),
    })
    if (!res.ok) return DEFAULT_SOCIALS
    const data = await res.json().catch(() => DEFAULT_SOCIALS)
    writeLocal(data)
    return data
  } catch {
    return DEFAULT_SOCIALS
  }
}
