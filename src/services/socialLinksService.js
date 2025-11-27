const STORAGE_KEY = 'rb_social_links_v1'

const DEFAULT_SOCIALS = [
  { id: 'instagram', network: 'instagram', url: '' },
  { id: 'youtube', network: 'youtube', url: '' },
  { id: 'tiktok', network: 'tiktok', url: '' },
  { id: 'twitter', network: 'twitter', url: '' },
  { id: 'facebook', network: 'facebook', url: '' },
  { id: 'soundcloud', network: 'soundcloud', url: '' },
  { id: 'spotify', network: 'spotify', url: '' },
]

export function getSocialLinks() {
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

export function saveSocialLinks(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function updateSocialLink(id, patch) {
  const list = getSocialLinks()
  const updated = list.map((item) => (item.id === id ? { ...item, ...patch } : item))
  return saveSocialLinks(updated)
}

export function resetSocialLinks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SOCIALS))
  return DEFAULT_SOCIALS
}

