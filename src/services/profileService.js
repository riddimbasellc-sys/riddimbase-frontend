import { supabase } from '../lib/supabaseClient'

// Fetch minimal producer profile contact info.
export async function getProducerContact(producerId) {
  if (!producerId) return null
  try {
    const { data, error } = await supabase.from('profiles').select('id,email,phone').eq('id', producerId).maybeSingle()
    if (error) throw error
    if (!data) return null
    return { email: data.email || null, phone: data.phone || null }
  } catch (e) {
    return null
  }
}
// In-memory profile service. Replace with persistent Supabase table later.
// accountType: 'producer' | 'artist' | 'hybrid'
const profiles = new Map()

function defaultProfile(user) {
  return {
    userId: user.id,
    displayName: user.email.split('@')[0],
    avatarUrl: null,
    accountType: 'producer'
  }
}

export function getProfile(userId, userObj) {
  if (!userId) return null
  if (!profiles.has(userId) && userObj) {
    profiles.set(userId, defaultProfile(userObj))
  }
  return profiles.get(userId) || null
}

export function upsertProfile(userId, patch) {
  if (!userId) return null
  const current = profiles.get(userId) || { userId, displayName: '', avatarUrl: null, accountType: 'producer' }
  const next = { ...current, ...patch }
  profiles.set(userId, next)
  return next
}
