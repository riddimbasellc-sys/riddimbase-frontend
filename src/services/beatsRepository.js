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

export async function countBeatsForUser(userId) {
  if (!userId) return 0
  try {
    const { count, error } = await supabase
      .from(TABLE)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (error) {
      console.warn('[beatsRepository] countBeatsForUser error', error.message)
      return 0
    }

    return typeof count === 'number' ? count : 0
  } catch {
    return 0
  }
}

export async function deleteBeat(id) {
  if (!id) return false
  const { error } = await supabase.from(TABLE).delete().eq('id', id)
  if (error) {
    console.warn('[beatsRepository] delete error', error.message)
    return false
  }
  return true
}

export async function fetchBeatsByProducerId(
  producerId,
  { limit = 200, offset = 0, genre, maxPrice, query } = {},
) {
  if (!producerId) return []
  try {
    let q = supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', producerId)
      .order('created_at', { ascending: false })

    if (genre) q = q.eq('genre', genre)
    if (typeof maxPrice === 'number') q = q.lte('price', maxPrice)
    if (query && String(query).trim()) {
      const term = `%${String(query).trim()}%`
      // Attempt title match first; Supabase doesn't support OR easily without RLS bypass, so run two queries if needed
      const titleRes = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', producerId)
        .ilike('title', term)
        .order('created_at', { ascending: false })
        .range(offset, Math.max(offset, offset + limit - 1))
      const genreRes = await supabase
        .from(TABLE)
        .select('*')
        .eq('user_id', producerId)
        .ilike('genre', term)
        .order('created_at', { ascending: false })
        .range(offset, Math.max(offset, offset + limit - 1))
      const merged = [...(titleRes.data || []), ...(genreRes.data || [])]
      // De-duplicate by id
      const map = new Map()
      merged.forEach((b) => map.set(b.id, b))
      return Array.from(map.values())
    }

    const { data, error } = await q.range(offset, Math.max(offset, offset + limit - 1))
    if (error) {
      console.warn('[beatsRepository] fetchBeatsByProducerId error', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('[beatsRepository] fetchBeatsByProducerId exception', e.message)
    return []
  }
}
