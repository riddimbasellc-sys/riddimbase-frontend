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

export async function fetchAdminRecordingLabMetrics() {
  const res = await fetch(buildUrl('/admin/recording-lab'), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to load Recording Lab metrics')
  }
  return res.json()
}

export async function fetchAdminRecordingLabUser(userId) {
  if (!userId) throw new Error('userId is required')
  const res = await fetch(buildUrl(`/admin/recording-lab/user/${userId}`), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    throw new Error('Failed to load Recording Lab user data')
  }
  return res.json()
}

export async function addAdminRecordingLabCredits({ userId, amount, reason }) {
  const payload = { userId, amount, reason }
  const res = await fetch(buildUrl('/admin/recording-lab/credits/add'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to add credits')
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

