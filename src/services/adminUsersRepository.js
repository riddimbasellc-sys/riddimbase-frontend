const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path
}

export async function fetchAdminUsers() {
  const res = await fetch(buildUrl('/admin/users'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to load users')
  }
  const data = await res.json().catch(() => [])
  return Array.isArray(data) ? data : []
}

export async function banAdminUser(id) {
  const res = await fetch(buildUrl(`/admin/users/${id}/ban`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to ban user')
  }
  return res.json().catch(() => ({}))
}

export async function approveAdminProducer(id) {
  const res = await fetch(buildUrl(`/admin/users/${id}/producer`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to approve producer')
  }
  return res.json().catch(() => ({}))
}

export async function resetAdminPassword(id) {
  const res = await fetch(buildUrl(`/admin/users/${id}/reset-password`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to reset password')
  }
  return res.json().catch(() => ({}))
}
