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

export async function getSocialLinks() {
  if (!API_BASE) {
    return DEFAULT_SOCIALS
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/social-links`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return DEFAULT_SOCIALS
    }
    const data = await res.json().catch(() => DEFAULT_SOCIALS)
    if (Array.isArray(data) && data.length) {
      return data
    }
    return DEFAULT_SOCIALS
  } catch {
    return DEFAULT_SOCIALS
  }
}

export async function saveSocialLinks(list) {
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
  if (!API_BASE) return DEFAULT_SOCIALS
  try {
    const res = await fetch(`${API_BASE}/api/site/social-links`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ links: DEFAULT_SOCIALS }),
    })
    if (!res.ok) return DEFAULT_SOCIALS
    const data = await res.json().catch(() => DEFAULT_SOCIALS)
    if (Array.isArray(data) && data.length) {
      return data
    }
    return DEFAULT_SOCIALS
  } catch {
    return DEFAULT_SOCIALS
  }
}
