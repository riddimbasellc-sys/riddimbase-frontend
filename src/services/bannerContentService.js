// Banner content (text + styling) with Supabase-backed API + local cache.

const STORAGE_KEY = 'rb_banner_content_v2'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export const DEFAULT_BANNER_CONTENT = {
  headline: 'Platform Spotlight',
  headlineBold: true,
  headlineItalic: false,
  headlineSize: 'text-2xl',
  headlineFont: 'font-display',
  body: 'Discover authentic Caribbean production. Browse fresh beats & riddims uploaded daily by emerging producers.',
  bodyBold: false,
  bodyItalic: false,
  bodySize: 'text-sm',
  bodyFont: 'font-sans',
}

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BANNER_CONTENT
    const obj = JSON.parse(raw)
    return { ...DEFAULT_BANNER_CONTENT, ...obj }
  } catch {
    return DEFAULT_BANNER_CONTENT
  }
}

function writeLocal(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export async function getBannerContent() {
  if (!API_BASE) {
    return readLocal()
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banner-content`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => DEFAULT_BANNER_CONTENT)
    const merged = { ...DEFAULT_BANNER_CONTENT, ...data }
    writeLocal(merged)
    return merged
  } catch {
    return readLocal()
  }
}

export async function setBannerContent(patch) {
  const current = await getBannerContent()
  const updated = { ...current, ...patch }
  writeLocal(updated)
  if (!API_BASE) return updated
  try {
    const res = await fetch(`${API_BASE}/api/site/banner-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updated }),
    })
    if (!res.ok) {
      return updated
    }
    const data = await res.json().catch(() => updated)
    const merged = { ...DEFAULT_BANNER_CONTENT, ...data }
    writeLocal(merged)
    return merged
  } catch {
    return updated
  }
}

export async function resetBannerContent() {
  writeLocal(DEFAULT_BANNER_CONTENT)
  if (!API_BASE) return DEFAULT_BANNER_CONTENT
  try {
    const res = await fetch(`${API_BASE}/api/site/banner-content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: DEFAULT_BANNER_CONTENT }),
    })
    if (!res.ok) return DEFAULT_BANNER_CONTENT
    const data = await res.json().catch(() => DEFAULT_BANNER_CONTENT)
    const merged = { ...DEFAULT_BANNER_CONTENT, ...data }
    writeLocal(merged)
    return merged
  } catch {
    return DEFAULT_BANNER_CONTENT
  }
}
