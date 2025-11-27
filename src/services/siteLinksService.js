const STORAGE_KEY = 'rb_footer_links_v1'

function defaultLinks() {
  return [
    { id: 'about', label: 'About', to: '/about' },
    { id: 'faq', label: 'FAQ', to: '/faq' },
    { id: 'support', label: 'Support', to: '/support' },
    { id: 'terms', label: 'Terms', to: '/terms' },
    { id: 'privacy', label: 'Privacy', to: '/privacy' }
  ]
}

export function getFooterLinks() {
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
  } catch (e) {
    return defaultLinks()
  }
}

export function saveFooterLinks(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  return list
}

export function addFooterLink(link) {
  const list = getFooterLinks()
  const id = link.id || link.label.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()
  const newList = [...list, { id, ...link }]
  return saveFooterLinks(newList)
}

export function updateFooterLink(id, patch) {
  const list = getFooterLinks()
  const newList = list.map(l => l.id === id ? { ...l, ...patch } : l)
  return saveFooterLinks(newList)
}

export function deleteFooterLink(id) {
  const list = getFooterLinks()
  const newList = list.filter(l => l.id !== id)
  return saveFooterLinks(newList)
}

export function reorderFooterLinks(id, direction) {
  const list = getFooterLinks()
  const idx = list.findIndex(l => l.id === id)
  if (idx === -1) return list
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1
  if (targetIdx < 0 || targetIdx >= list.length) return list
  const newList = [...list]
  const [item] = newList.splice(idx, 1)
  newList.splice(targetIdx, 0, item)
  return saveFooterLinks(newList)
}
