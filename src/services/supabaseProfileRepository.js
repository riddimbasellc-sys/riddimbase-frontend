import { supabase } from '../lib/supabaseClient'

const TABLE = 'profiles'

export async function fetchProfile(userId) {
  if (!userId) return null
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', userId).single()
  if (error) {
    // Not found is okay
    if (error.code === 'PGRST116') return null
    console.warn('[profileRepo] fetch error', error.message)
    return null
  }
  return data
}

export async function upsertProfile(userId, patch) {
  if (!userId) return null
  const payload = { id: userId, ...patch }
  const { data, error } = await supabase.from(TABLE).upsert(payload).select().single()
  if (error) {
    console.warn('[profileRepo] upsert error', error.message)
    return null
  }
  return data
}
