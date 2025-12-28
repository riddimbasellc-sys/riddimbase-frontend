import { supabase } from '../lib/supabaseClient'

const TABLE = 'soundkits'

export async function listSoundkits({ search, category, genre, sort } = {}) {
  try {
    let q = supabase.from(TABLE).select('*')

    if (category && category !== 'all') {
      q = q.eq('category', category)
    }
    if (genre && genre !== 'all') {
      q = q.eq('genre', genre)
    }
    if (search && String(search).trim()) {
      const term = `%${String(search).trim()}%`
      q = q.or(
        `title.ilike.${term},description.ilike.${term}`,
      )
    }

    // Basic sort options; "trending" currently aliases to "newest"
    if (sort === 'newest' || sort === 'trending' || !sort) {
      q = q.order('created_at', { ascending: false })
    } else if (sort === 'price-low') {
      q = q.order('price', { ascending: true })
    } else if (sort === 'price-high') {
      q = q.order('price', { ascending: false })
    }

    const { data, error } = await q
    if (error) {
      console.warn('[soundkitsRepository] listSoundkits error', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('[soundkitsRepository] listSoundkits exception', e?.message)
    return []
  }
}

export async function listSoundkitsForUser(userId) {
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[soundkitsRepository] listSoundkitsForUser error', error.message)
      return []
    }
    return data || []
  } catch (e) {
    console.warn('[soundkitsRepository] listSoundkitsForUser exception', e?.message)
    return []
  }
}

export async function createSoundkit(payload) {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('*')
      .single()

    if (error) {
      console.warn('[soundkitsRepository] createSoundkit error', error.message)
      return null
    }
    return data
  } catch (e) {
    console.warn('[soundkitsRepository] createSoundkit exception', e?.message)
    return null
  }
}
