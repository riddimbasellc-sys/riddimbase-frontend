import { supabase } from '../lib/supabaseClient'

// Supabase-backed producer profile service.
// Expects 'profiles' table with columns: id (UUID), display_name, avatar_url, role, youtube_url.

export async function getProducerProfile(producerId) {
  if (!producerId) return null
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, youtube_url')
    .eq('id', producerId)
    .maybeSingle()
  if (error) {
    console.warn('[producerProfileService] fetch error', error.message)
    return null
  }
  if (!data) return null
  return {
    userId: data.id,
    displayName: data.display_name || data.id,
    avatarUrl: data.avatar_url || null,
    role: data.role,
    youtubeUrl: data.youtube_url || null
  }
}

export async function setProducerProfile(producerId, patch) {
  if (!producerId) return null
  const send = { id: producerId }
  if (patch.displayName || patch.display_name) send.display_name = patch.displayName || patch.display_name
  if (patch.avatarUrl || patch.avatar_url) send.avatar_url = patch.avatarUrl || patch.avatar_url
  if (patch.role) send.role = patch.role
  if (patch.youtubeUrl || patch.youtube_url) send.youtube_url = patch.youtubeUrl || patch.youtube_url
  const { data, error } = await supabase
    .from('profiles')
    .upsert(send)
    .select('id, display_name, avatar_url, role, youtube_url')
    .maybeSingle()
  if (error) {
    console.warn('[producerProfileService] upsert error', error.message)
    return null
  }
  if (!data) return null
  return {
    userId: data.id,
    displayName: data.display_name || data.id,
    avatarUrl: data.avatar_url || null,
    role: data.role,
    youtubeUrl: data.youtube_url || null
  }
}

export async function ensureSampleProfile(producerId) {
  const existing = await getProducerProfile(producerId)
  if (!existing || !existing.youtubeUrl) {
    await setProducerProfile(producerId, { youtubeUrl: 'https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw' })
  }
}
