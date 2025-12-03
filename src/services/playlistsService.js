import { supabase } from '../lib/supabaseClient'

// Supabase-backed playlists service

function mapPlaylistRow(row, metricsMap, commentsMap) {
  const m = metricsMap.get(row.id) || {}
  const comments = commentsMap.get(row.id) || []
  return {
    id: row.id,
    createdBy: row.created_by || null,
    title: row.title,
    description: row.description || '',
    coverUrl: row.cover_url || '',
    moods: row.moods || [],
    beatIds: row.beat_ids || [],
    likes: m.likes || 0,
    favorites: m.favorites || 0,
    plays: m.plays || 0,
    comments,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : 0,
  }
}

export async function listPlaylists() {
  const { data, error } = await supabase
    .from('playlists')
    .select(
      `id,created_by,title,description,cover_url,moods,created_at,
       playlist_beats:playlist_beats(beat_id,position)`,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('[playlistsService] listPlaylists error', error.message)
    return []
  }

  const ids = (data || []).map((p) => p.id)

  const [metricsRes, commentsRes] = await Promise.all([
    supabase.from('playlist_metrics').select('*').in('playlist_id', ids),
    supabase
      .from('playlist_comments')
      .select('*')
      .in('playlist_id', ids)
      .order('created_at', { ascending: false }),
  ])

  const metricsMap = new Map()
  ;(metricsRes.data || []).forEach((row) => {
    metricsMap.set(row.playlist_id, row)
  })

  const commentsMap = new Map()
  ;(commentsRes.data || []).forEach((row) => {
    const list = commentsMap.get(row.playlist_id) || []
    list.push({
      id: row.id,
      user: row.display_name || 'Listener',
      text: row.body,
      createdAt: new Date(row.created_at).getTime(),
    })
    commentsMap.set(row.playlist_id, list)
  })

  return (data || []).map((row) =>
    mapPlaylistRow(
      {
        ...row,
        beat_ids: (row.playlist_beats || [])
          .sort((a, b) => a.position - b.position)
          .map((pb) => pb.beat_id),
      },
      metricsMap,
      commentsMap,
    ),
  )
}

export async function getPlaylist(id) {
  const list = await listPlaylists()
  return list.find((p) => p.id === id) || null
}

export async function createPlaylist(data, userId) {
  const payload = {
    created_by: userId || null,
    title: data.title || 'Untitled Playlist',
    description: data.description || '',
    cover_url: data.coverUrl || '',
    moods: data.moods || [],
  }
  const { data: row, error } = await supabase
    .from('playlists')
    .insert(payload)
    .select()
    .single()
  if (error) {
    console.warn('[playlistsService] createPlaylist error', error.message)
    return null
  }
  const playlistId = row.id
  const beatIds = data.beatIds || []
  if (beatIds.length) {
    const rows = beatIds.map((bid, idx) => ({
      playlist_id: playlistId,
      beat_id: bid,
      position: idx,
    }))
    await supabase.from('playlist_beats').insert(rows)
  }
  return getPlaylist(playlistId)
}

export async function updatePlaylist(id, patch) {
  const payload = {
    title: patch.title,
    description: patch.description,
    cover_url: patch.coverUrl,
    moods: patch.moods,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from('playlists')
    .update(payload)
    .eq('id', id)
  if (error) {
    console.warn('[playlistsService] updatePlaylist error', error.message)
  }
  const beatIds = patch.beatIds || []
  if (beatIds.length) {
    await supabase.from('playlist_beats').delete().eq('playlist_id', id)
    const rows = beatIds.map((bid, idx) => ({
      playlist_id: id,
      beat_id: bid,
      position: idx,
    }))
    await supabase.from('playlist_beats').insert(rows)
  }
  return getPlaylist(id)
}

export async function deletePlaylist(id) {
  const { error } = await supabase.from('playlists').delete().eq('id', id)
  if (error) {
    console.warn('[playlistsService] deletePlaylist error', error.message)
    return false
  }
  return true
}

async function incrementMetric(playlistId, field, delta) {
  const { data, error } = await supabase
    .from('playlist_metrics')
    .select('*')
    .eq('playlist_id', playlistId)
    .maybeSingle()
  if (error && error.code !== 'PGRST116') {
    console.warn('[playlistsService] metrics select error', error.message)
    return
  }
  if (!data) {
    const insert = {
      playlist_id: playlistId,
      [field]: delta,
      updated_at: new Date().toISOString(),
    }
    await supabase.from('playlist_metrics').insert(insert)
  } else {
    const next = (data[field] || 0) + delta
    await supabase
      .from('playlist_metrics')
      .update({
        [field]: next < 0 ? 0 : next,
        updated_at: new Date().toISOString(),
      })
      .eq('playlist_id', playlistId)
  }
}

export async function togglePlaylistLike(id, userId) {
  if (!userId || !id) return null
  const { data: existing } = await supabase
    .from('playlist_likes')
    .select('id')
    .eq('playlist_id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing?.id) {
    await supabase.from('playlist_likes').delete().eq('id', existing.id)
    await incrementMetric(id, 'likes', -1)
  } else {
    await supabase
      .from('playlist_likes')
      .insert({ playlist_id: id, user_id: userId })
    await incrementMetric(id, 'likes', 1)
  }
  return getPlaylist(id)
}

export async function togglePlaylistFavorite(id, userId) {
  if (!userId || !id) return null
  const { data: existing } = await supabase
    .from('playlist_favorites')
    .select('id')
    .eq('playlist_id', id)
    .eq('user_id', userId)
    .maybeSingle()
  if (existing?.id) {
    await supabase.from('playlist_favorites').delete().eq('id', existing.id)
    await incrementMetric(id, 'favorites', -1)
  } else {
    await supabase
      .from('playlist_favorites')
      .insert({ playlist_id: id, user_id: userId })
    await incrementMetric(id, 'favorites', 1)
  }
  return getPlaylist(id)
}

export async function addCommentToPlaylist(id, { user = 'Listener', text, userId }) {
  if (!id || !text) return null
  const { data, error } = await supabase
    .from('playlist_comments')
    .insert({
      playlist_id: id,
      user_id: userId || null,
      display_name: user,
      body: text,
    })
    .select()
    .single()
  if (error) {
    console.warn('[playlistsService] addCommentToPlaylist error', error.message)
    return null
  }
  await incrementMetric(id, 'comments', 1)
  return {
    id: data.id,
    user: data.display_name || user,
    text: data.body,
    createdAt: new Date(data.created_at).getTime(),
  }
}

export async function recordPlaylistPlay(id) {
  if (!id) return 0
  await incrementMetric(id, 'plays', 1)
  const p = await getPlaylist(id)
  return p?.plays || 0
}

export async function getTrendingPlaylists(limit = 6) {
  const list = await listPlaylists()
  const scored = list.map((p) => ({ ...p, score: computeScore(p) }))
  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function computeScore(p) {
  const plays = p.plays || 0
  const likes = p.likes || 0
  const favs = p.favorites || 0
  const comments = (p.comments || []).length
  return plays + likes * 2 + favs * 1.5 + comments * 1.2
}
