// Banner service for homepage hero/banner replacement.
// Supabase-backed API only; no localStorage cache.
// Banner: { id, dataUrl, active, createdAt, kind?: 'image'|'video', contentType?: string }

import { uploadArtwork } from './storageService'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function listBanners() {
  if (!API_BASE) {
    return []
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return []
    }
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
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
    throw new Error('Banner API is not configured')
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
  return banner
}

export async function setActiveBanner(id) {
  if (!id) return []
  if (!API_BASE) {
    return []
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners/${id}/active`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return []
    }
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function deleteBanner(id) {
  if (!id) return []
  if (!API_BASE) {
    return []
  }
  try {
    const res = await fetch(`${API_BASE}/api/site/banners/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return []
    }
    const data = await res.json().catch(() => [])
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export async function getActiveBanner() {
  const list = await listBanners()
  return list.find((b) => b.active) || null
}
