const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

function buildUrl(path) {
  return API_BASE ? `${API_BASE}${path}` : path
}

export async function fetchAdminMetrics() {
  const res = await fetch(buildUrl('/admin/metrics'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to load admin metrics')
  }
  return res.json()
}

export async function fetchAdminBoostsSummary() {
  const res = await fetch(buildUrl('/api/admin/boosts'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to load boosts')
  }
  const payload = await res.json().catch(() => ({}))
  return Array.isArray(payload.items) ? payload.items : []
}

