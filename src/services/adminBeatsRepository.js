const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path
}

export async function adminHideBeat(id) {
  if (!id) throw new Error('Missing beat id')
  const res = await fetch(buildUrl(`/admin/beats/${id}/hide`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to hide beat')
  }
  return res.json().catch(() => ({}))
}

export async function adminFlagBeat(id) {
  if (!id) throw new Error('Missing beat id')
  const res = await fetch(buildUrl(`/admin/beats/${id}/flag`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to flag beat')
  }
  return res.json().catch(() => ({}))
}

export async function adminDeleteBeat(id) {
  if (!id) throw new Error('Missing beat id')
  const res = await fetch(buildUrl(`/admin/beats/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to delete beat')
  }
  return res.json().catch(() => ({}))
}

