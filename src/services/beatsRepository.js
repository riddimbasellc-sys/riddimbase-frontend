import { supabase } from '../lib/supabaseClient'

const TABLE = 'beats'

export async function fetchBeats() {
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false })
  if (error) {
    console.warn('[beatsRepository] fetch error', error.message)
    return []
  }
  return data || []
}

export async function fetchBeat(id) {
  const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
  if (error) {
    console.warn('[beatsRepository] fetchBeat error', error.message)
    return null
  }
  return data
}

export async function createBeat(payload) {
  const { data, error } = await supabase
    .from(TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single()
  if (error) {
    console.warn('[beatsRepository] create error', error.message)
    return null
  }
  return data
}
