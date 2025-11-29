import { supabase } from '../lib/supabaseClient'

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || window.location.origin || ''

function friendlyApiError(resStatus, payload) {
  if (payload?.error) return payload.error
  if (resStatus === 401) return 'Invalid email or password.'
  if (resStatus >= 500) return 'Server error. Please try again later.'
  return 'Request failed. Please try again.'
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(friendlyApiError(res.status, payload))
  }

  // Set Supabase session so existing hooks keep working
  if (payload.access_token && payload.refresh_token) {
    try {
      await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      })
    } catch (err) {
      console.warn('[authService] setSession failed', err.message)
    }
  }

  return payload
}

export async function signup(email, password, fullName) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, fullName }),
  })

  const payload = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(friendlyApiError(res.status, payload))
  }

  return payload
}

