// Banner service for homepage hero/banner replacement.
// Uses Supabase-backed API with localStorage cache fallback.
// Banner: { id, dataUrl, active, createdAt, kind?: 'image'|'video', contentType?: string }

import { uploadArtwork } from './storageService'

const STORAGE_KEY = 'rb_banners_v2'
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}

function writeLocal(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // ignore
  }
}

export async function listBanners() {
  if (!API_BASE) {
    return readLocal()
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => [])
    if (Array.isArray(data)) {
      writeLocal(data)
      return data
    }
    return readLocal()
  } catch {
    return readLocal()
  }
}

export async function uploadBanner(file) {
  if (!file) return null
  // Upload asset to S3 (banners folder behaves like artwork)
  let publicUrl = ''
  try {
    const { publicUrl: uploadedUrl } = await uploadArtwork(file)
    publicUrl = uploadedUrl
  } catch (err) {
    console.error('[bannerService] artwork upload failed', err)
    throw err
  }

  const mime = file.type || ''
  const kind = mime.startsWith('video') ? 'video' : 'image'

  if (!API_BASE) {
    // Fallback: store in localStorage only
    const list = readLocal()
    const id = 'b_' + Date.now()
    const banner = {
      id,
      dataUrl: publicUrl,
      active: false,
      createdAt: Date.now(),
      kind,
      contentType: mime,
    }
    const next = [...list, banner]
    writeLocal(next)
    return banner
  }

  const res = await fetch(`${API_BASE}/api/site/banners`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl: publicUrl, kind, contentType: mime }),
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(txt || 'Failed to save banner')
  }

  const banner = await res.json().catch(() => null)
  if (banner) {
    const list = readLocal()
    writeLocal([...list, banner])
  }
  return banner
}

export async function setActiveBanner(id) {
  if (!id) return []
  if (!API_BASE) {
    const list = readLocal().map((b) => ({
      ...b,
      active: b.id === id,
    }))
    writeLocal(list)
    return list
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners/${id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => [])
    if (Array.isArray(data)) {
      writeLocal(data)
      return data
    }
    return readLocal()
  } catch {
    return readLocal()
  }
}

export async function deleteBanner(id) {
  if (!id) return []
  if (!API_BASE) {
    const filtered = readLocal().filter((b) => b.id !== id)
    writeLocal(filtered)
    return filtered
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return readLocal()
    }
    const data = await res.json().catch(() => [])
    if (Array.isArray(data)) {
      writeLocal(data)
      return data
    }
    return readLocal()
  } catch {
    return readLocal()
  }
}

export async function getActiveBanner() {
  const list = await listBanners()
  return list.find((b) => b.active) || null
}
